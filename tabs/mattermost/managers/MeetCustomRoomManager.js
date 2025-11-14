import { Utils } from '../../../shared/utils.js';

export class MeetCustomRoomManager {
    constructor(tab) {
        this.tab = tab;
    }

    async loadCustomRoomsConfig() {
        try {
            const result = await chrome.storage.sync.get(['customRoomsConfig']);
            this.tab.customRoomsConfig = result.customRoomsConfig || [];
            this.displayCustomRoomsConfig();
        } catch (error) {
            console.error('Failed to load custom rooms config:', error);
            this.tab.customRoomsConfig = [];
        }
    }

    displayCustomRoomsConfig() {
        const listElement = document.getElementById('custom-room-list');
        const emptyElement = document.getElementById('custom-room-empty');
        
        if (!listElement || !emptyElement) return;
        
        if (this.tab.customRoomsConfig.length === 0) {
            listElement.innerHTML = '';
            emptyElement.classList.remove('hidden');
            return;
        }
        
        emptyElement.classList.add('hidden');
        listElement.innerHTML = this.tab.customRoomsConfig.map(config => this.createCustomRoomHTML(config)).join('');
        
        // Add event listeners for edit and delete buttons
        listElement.querySelectorAll('.edit-custom-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomCode = e.currentTarget.getAttribute('data-room-code');
                this.editCustomRoom(roomCode);
            });
        });
        
        listElement.querySelectorAll('.remove-custom-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomCode = e.currentTarget.getAttribute('data-room-code');
                this.removeCustomRoom(roomCode);
            });
        });
    }

    createCustomRoomHTML(config) {
        const { roomCode, emoji, text, availability } = config;
        return `
            <div class="flex items-center justify-between p-3 border bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center space-x-3">
                    <div>
                        <div class="font-medium text-gray-800">${Utils.escapeHtml(roomCode)}</div>
                        <div class="text-xs text-gray-500">"${Utils.escapeHtml(text)}" • ${availability} • icon: ${Utils.escapeHtml(emoji)}</div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="edit-custom-room-btn p-1 text-blue-500 hover:text-blue-700 transition-colors" data-room-code="${Utils.escapeHtml(roomCode)}" title="Edit configuration">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="remove-custom-room-btn p-1 text-gray-400 hover:text-red-600 transition-colors" data-room-code="${Utils.escapeHtml(roomCode)}" title="Remove configuration">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    openCustomRoomModal(roomCode = null) {
        const input = document.getElementById('custom-room-code-input');
        const modal = document.getElementById('custom-room-modal');
        const form = document.getElementById('custom-room-form');
        const modalRoomCode = document.getElementById('modal-room-code');
        
        if (!modal || !form || !modalRoomCode) return;
        
        if (roomCode) {
            // Edit mode
            const config = this.tab.customRoomsConfig.find(c => c.roomCode === roomCode);
            if (config) {
                modalRoomCode.value = config.roomCode;
                document.getElementById('custom-room-emoji').value = config.emoji;
                document.getElementById('custom-room-text').value = config.text;
                document.getElementById('custom-room-availability').value = config.availability;
                form.setAttribute('data-edit-mode', 'true');
            }
        } else {
            // Add mode
            const code = input?.value.trim().toLowerCase() || '';
            if (!code) {
                this.tab.showMessage('Please enter a room code', 'error');
                return;
            }
            
            if (this.tab.customRoomsConfig.some(c => c.roomCode === code)) {
                this.tab.showMessage('This room is already configured', 'warning');
                return;
            }
            
            // Reset form for new room
            modalRoomCode.value = code;
            document.getElementById('custom-room-emoji').value = '📅';
            document.getElementById('custom-room-text').value = 'In this meeting';
            document.getElementById('custom-room-availability').value = 'dnd';
            form.removeAttribute('data-edit-mode');
        }
        
        modal.classList.remove('hidden');
    }

    hideCustomRoomModal() {
        const modal = document.getElementById('custom-room-modal');
        const form = document.getElementById('custom-room-form');
        if (modal) modal.classList.add('hidden');
        if (form) form.reset();
        const input = document.getElementById('custom-room-code-input');
        if (input) input.value = '';
    }

    async handleSaveCustomRoom(e) {
        e.preventDefault();
        
        const roomCode = (document.getElementById('modal-room-code').value || '').trim().toLowerCase();
        const emoji = (document.getElementById('custom-room-emoji').value || '').trim();
        const text = (document.getElementById('custom-room-text').value || '').trim();
        const availability = document.getElementById('custom-room-availability').value;
        
        if (!roomCode || !emoji || !text) {
            this.tab.showMessage('Please fill in all fields', 'error');
            return;
        }
        
        const form = document.getElementById('custom-room-form');
        const isEditMode = form?.getAttribute('data-edit-mode') === 'true';
        
        if (isEditMode) {
            // Update existing
            const existingIndex = this.tab.customRoomsConfig.findIndex(c => c.roomCode === roomCode);
            if (existingIndex !== -1) {
                this.tab.customRoomsConfig[existingIndex] = { roomCode, emoji, text, availability };
            }
        } else {
            // Add new
            this.tab.customRoomsConfig.push({ roomCode, emoji, text, availability });
        }
        
        await this.saveCustomRoomsConfig();
        this.displayCustomRoomsConfig();
        this.hideCustomRoomModal();
        this.tab.showMessage(`Room "${roomCode}" configuration ${isEditMode ? 'updated' : 'added'}`, 'success');
    }

    editCustomRoom(roomCode) {
        this.openCustomRoomModal(roomCode);
    }

    async removeCustomRoom(roomCode) {
        if (confirm(`Remove custom status configuration for "${roomCode}"?`)) {
            this.tab.customRoomsConfig = this.tab.customRoomsConfig.filter(config => config.roomCode !== roomCode);
            await this.saveCustomRoomsConfig();
            this.displayCustomRoomsConfig();
            this.tab.showMessage(`Configuration for "${roomCode}" removed`, 'success');
        }
    }

    async saveCustomRoomsConfig() {
        try {
            await chrome.storage.sync.set({ customRoomsConfig: this.tab.customRoomsConfig });
        } catch (error) {
            console.error('Failed to save custom rooms config:', error);
            this.tab.showMessage('Failed to save configuration', 'error');
        }
    }

    getCustomRoomConfig(roomCode) {
        return this.tab.customRoomsConfig.find(config => config.roomCode === roomCode.toLowerCase());
    }
}
