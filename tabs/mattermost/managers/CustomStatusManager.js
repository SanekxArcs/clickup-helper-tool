import { Utils } from '../../../shared/utils.js';
import { mattermostAPI } from '../../../shared/mattermost-api.js';

export class CustomStatusManager {
    constructor(tab) {
        this.tab = tab;
    }

    async loadCustomStatusPresets() {
        try {
            const result = await chrome.storage.sync.get(['customStatusPresets']);
            this.tab.customStatusPresets = result.customStatusPresets || [];
            this.displayCustomStatusPresets();
        } catch (error) {
            console.error('Failed to load custom status presets:', error);
            this.tab.customStatusPresets = [];
        }
    }

    displayCustomStatusPresets() {
        const listElement = document.getElementById('custom-status-list');
        const emptyElement = document.getElementById('custom-status-empty');
        
        if (!listElement || !emptyElement) return;
        
        if (this.tab.customStatusPresets.length === 0) {
            listElement.innerHTML = '';
            emptyElement.classList.remove('hidden');
            return;
        }
        
        emptyElement.classList.add('hidden');
        listElement.innerHTML = this.tab.customStatusPresets.map(preset => 
            this.createCustomStatusPresetHTML(preset)
        ).join('');
        
        // Add event listeners for preset buttons
        listElement.querySelectorAll('.apply-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetId = e.currentTarget.getAttribute('data-preset-id');
                this.applyCustomStatusPreset(presetId);
            });
        });
        
        // Add event listeners for delete buttons
        listElement.querySelectorAll('.delete-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetId = e.currentTarget.getAttribute('data-preset-id');
                this.deleteCustomStatusPreset(presetId);
            });
        });
    }

    createCustomStatusPresetHTML(preset) {
        const availabilityColors = {
            online: 'bg-green-100 text-green-800',
            away: 'bg-yellow-100 text-yellow-800',
            dnd: 'bg-red-100 text-red-800',
            offline: 'bg-gray-100 text-gray-800'
        };
        
        const durationText = preset.duration > 0 ? `${preset.duration}m` : 'No expiry';
        
        return `
            <div class="flex items-center justify-between p-3 border bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <button class="apply-preset-btn flex-1  text-left" data-preset-id="${preset.id}">
                    <div class="flex items-center space-x-3">
                        <div class="font-medium text-gray-800">${Utils.escapeHtml(preset.title)}</div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 text-xs text-gray-500">
                                <span class="px-2 py-1 rounded-full ${availabilityColors[preset.availability]}">
                                    ${preset.availability.toUpperCase()}
                                </span>
                                <span>${durationText}</span>
                                <span>${preset.emoji}</span>

                            </div>
                        </div>
                    </div>
                </button>
                <button class="delete-preset-btn ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors" data-preset-id="${preset.id}" title="Delete preset">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
    }

    showCustomStatusModal() {
        const modal = document.getElementById('custom-status-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Reset form
            document.getElementById('custom-status-form').reset();
            document.getElementById('status-preset-duration').value = '0';
        }
    }

    hideCustomStatusModal() {
        const modal = document.getElementById('custom-status-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    async handleCreateCustomStatus(e) {
        e.preventDefault();
        
        const emoji = document.getElementById('status-preset-emoji').value.trim();
        const title = document.getElementById('status-preset-title').value.trim();
        const duration = parseInt(document.getElementById('status-preset-duration').value) || 0;
        const availability = document.getElementById('status-preset-availability').value;
        
        if (!emoji || !title) {
            this.tab.showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        const preset = {
            id: Date.now().toString(),
            emoji,
            title,
            duration,
            availability,
            createdAt: new Date().toISOString()
        };
        
        this.tab.customStatusPresets.push(preset);
        await this.saveCustomStatusPresets();
        this.displayCustomStatusPresets();
        this.hideCustomStatusModal();
        this.tab.showMessage('Custom status preset created successfully', 'success');
    }

    async applyCustomStatusPreset(presetId) {
        if (!this.tab.isAuthenticated) {
            this.tab.showMessage('Please authenticate first', 'error');
            return;
        }
        
        const preset = this.tab.customStatusPresets.find(p => p.id === presetId);
        if (!preset) {
            this.tab.showMessage('Preset not found', 'error');
            return;
        }
        
        try {
            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;
            
            // Update availability status
            await mattermostAPI.updateUserStatus(userId, preset.availability, token);
            
            // Update custom status
            await mattermostAPI.updateCustomStatus(userId, preset.emoji, preset.title, token, preset.duration);
            
            let message = `Applied preset: ${preset.title}`;
            if (preset.duration > 0) {
                message += ` (Duration: ${preset.duration} minutes)`;
            }
            this.tab.showMessage(message, 'success');
        } catch (error) {
            console.error('Failed to apply custom status preset:', error);
            this.tab.showMessage('Failed to apply preset', 'error');
        }
    }

    async deleteCustomStatusPreset(presetId) {
        if (confirm('Are you sure you want to delete this preset?')) {
            this.tab.customStatusPresets = this.tab.customStatusPresets.filter(p => p.id !== presetId);
            await this.saveCustomStatusPresets();
            this.displayCustomStatusPresets();
            this.tab.showMessage('Preset deleted successfully', 'success');
        }
    }

    async saveCustomStatusPresets() {
        try {
            await chrome.storage.sync.set({ customStatusPresets: this.tab.customStatusPresets });
        } catch (error) {
            console.error('Failed to save custom status presets:', error);
        }
    }

    async clearCustomStatus() {
        if (!this.tab.isAuthenticated) {
            this.tab.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            await mattermostAPI.clearCustomStatus(userId, token);
            // Also reset status to online
            await mattermostAPI.updateUserStatus(userId, 'online', token);

            this.tab.showMessage('Custom status cleared and set to online', 'success');
        } catch (error) {
            console.error('Failed to clear custom status:', error);
            this.tab.showMessage('Failed to clear custom status', 'error');
        }
    }
}
