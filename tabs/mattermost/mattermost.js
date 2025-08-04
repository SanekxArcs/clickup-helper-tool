import { Utils } from '../../shared/utils.js';
import { mattermostAPI } from '../../shared/mattermost-api.js';

export class MattermostTab {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.meetHistory = [];
        this.customStatusPresets = [];
        this.initialize();
    }

    async initialize() {
        try {
            await this.checkAuthentication();
            this.setupEventListeners();
            this.loadSavedSettings();
            
            // Load Google Meet history
            this.loadMeetHistory();
            
            // Load custom status presets
            this.loadCustomStatusPresets();
        } catch (error) {
            console.error('Failed to initialize Mattermost tab:', error);
        }
    }

    setupEventListeners() {
        // Authentication buttons
        document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
        document.getElementById('token-btn')?.addEventListener('click', () => this.handleTokenAuth());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());

        // Quick status buttons
        document.querySelectorAll('.status-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.currentTarget.getAttribute('data-status');
                this.updateStatus(status);
            });
        });

        // Custom status presets
        document.getElementById('create-status-btn')?.addEventListener('click', () => this.showCustomStatusModal());
        document.getElementById('clear-status-btn')?.addEventListener('click', () => this.clearCustomStatus());
        
        // Custom status modal
        document.getElementById('close-status-modal')?.addEventListener('click', () => this.hideCustomStatusModal());
        document.getElementById('cancel-status-modal')?.addEventListener('click', () => this.hideCustomStatusModal());
        document.getElementById('custom-status-form')?.addEventListener('submit', (e) => this.handleCreateCustomStatus(e));

        // Google Meet integration toggle
        document.getElementById('google-meet-integration')?.addEventListener('change', (e) => {
            document.getElementById('meet-settings').classList.toggle('hidden', !e.target.checked);
        });

        // Google Meet History
        document.getElementById('clear-meet-history-btn')?.addEventListener('click', () => this.clearMeetHistory());

        // Settings buttons
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('test-connection-btn')?.addEventListener('click', () => this.testConnection());
        document.getElementById('history-btn')?.addEventListener('click', () => this.showHistoryModal());

        // History modal event listeners
        document.getElementById('close-history-modal')?.addEventListener('click', () => this.hideHistoryModal());
        document.getElementById('clear-history-btn')?.addEventListener('click', () => this.clearAllHistory());
        document.getElementById('close-edit-modal')?.addEventListener('click', () => this.hideEditModal());
        document.getElementById('cancel-edit')?.addEventListener('click', () => this.hideEditModal());
        document.getElementById('edit-history-form')?.addEventListener('submit', (e) => this.handleEditSubmit(e));
        document.getElementById('edit-status')?.addEventListener('change', (e) => this.toggleCustomFields(e.target.value));

        // Close modals when clicking outside
        document.getElementById('history-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'history-modal') this.hideHistoryModal();
        });
        document.getElementById('edit-history-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'edit-history-modal') this.hideEditModal();
        });

        // Enter key handling for login forms
        document.getElementById('login-id')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        document.getElementById('password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        document.getElementById('personal-token')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleTokenAuth();
        });
    }

    async checkAuthentication() {
        try {
            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;

            if (!token) {
                this.showAuthSection();
                this.updateConnectionStatus('disconnected', 'Not connected to Mattermost');
                return;
            }

            // Validate token
            const response = await mattermostAPI.getCurrentUser(token);

            if (response) {
                this.isAuthenticated = true;
                this.currentUser = response;
                this.showMainControls();
                this.updateUserInfo(response, stored.MMAccessToken ? 'token' : 'password');
                this.updateConnectionStatus('connected', `Connected as ${response.username}`);
            }
        } catch (error) {
            console.error('Authentication check failed:', error);
            this.showAuthSection();
            this.updateConnectionStatus('error', 'Authentication failed');
            if (error.authError) {
                await mattermostAPI.clearStoredAuth();
            }
        }
    }

    async handleLogin() {
        const serverUrl = document.getElementById('server-url').value.trim();
        const loginId = document.getElementById('login-id').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorElement = document.getElementById('auth-error');

        if (!serverUrl || !loginId || !password) {
            this.showError('Please enter server URL, email/username and password', errorElement);
            return;
        }

        // Validate server URL format
        try {
            new URL(serverUrl);
        } catch (e) {
            this.showError('Please enter a valid server URL (e.g., https://your-server.com)', errorElement);
            return;
        }

        try {
            this.showMessage('Signing in...', 'info');
            
            // Set the server URL in the API
            mattermostAPI.setServerUrl(serverUrl);
            
            const { token, userData } = await mattermostAPI.loginWithCredentials(loginId, password);

            await mattermostAPI.storeAuth({
                MMAuthToken: token,
                MMUsername: userData.username,
                MMUserId: userData.id,
                serverUrl: serverUrl
            });

            // Also save server URL to settings for easier access from other tabs
            await mattermostAPI.storeSettings({
                ...await mattermostAPI.getSettings(),
                serverUrl: serverUrl
            });

            this.isAuthenticated = true;
            this.currentUser = userData;
            this.showMainControls();
            this.updateUserInfo(userData, 'password');
            this.updateConnectionStatus('connected', `Connected as ${userData.username}`);
            this.showMessage('Successfully signed in!', 'success');
        } catch (error) {
            console.error('Login failed:', error);
            this.showError(error.message || 'Login failed', errorElement);
        }
    }

    async handleTokenAuth() {
        const serverUrl = document.getElementById('token-server-url').value.trim();
        const token = document.getElementById('personal-token').value.trim();
        const errorElement = document.getElementById('auth-error');

        if (!serverUrl || !token) {
            this.showError('Please enter server URL and your personal access token', errorElement);
            return;
        }

        // Validate server URL format
        try {
            new URL(serverUrl);
        } catch (e) {
            this.showError('Please enter a valid server URL (e.g., https://your-server.com)', errorElement);
            return;
        }

        try {
            this.showMessage('Connecting with token...', 'info');
            
            // Set the server URL in the API
            mattermostAPI.setServerUrl(serverUrl);
            
            const userData = await mattermostAPI.getCurrentUser(token);

            await mattermostAPI.storeAuth({
                MMAccessToken: token,
                MMUsername: userData.username,
                MMUserId: userData.id,
                serverUrl: serverUrl
            });

            // Also save server URL to settings for easier access from other tabs
            await mattermostAPI.storeSettings({
                ...await mattermostAPI.getSettings(),
                serverUrl: serverUrl
            });

            this.isAuthenticated = true;
            this.currentUser = userData;
            this.showMainControls();
            this.updateUserInfo(userData, 'token');
            this.updateConnectionStatus('connected', `Connected as ${userData.username}`);
            this.showMessage('Successfully connected with token!', 'success');
        } catch (error) {
            console.error('Token authentication failed:', error);
            this.showError(error.message || 'Token authentication failed', errorElement);
        }
    }

    async handleLogout() {
        try {
            await mattermostAPI.clearStoredAuth();
            this.isAuthenticated = false;
            this.currentUser = null;
            this.showAuthSection();
            this.updateConnectionStatus('disconnected', 'Disconnected from Mattermost');
            this.showMessage('Successfully logged out', 'success');
        } catch (error) {
            console.error('Logout failed:', error);
            this.showMessage('Logout failed', 'error');
        }
    }

    async updateStatus(status) {
        if (!this.isAuthenticated) {
            this.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            await mattermostAPI.updateUserStatus(userId, status, token);
            this.showMessage(`Status updated to ${status}`, 'success');
        } catch (error) {
            console.error('Failed to update status:', error);
            this.showMessage('Failed to update status', 'error');
        }
    }

    async loadCustomStatusPresets() {
        try {
            const result = await chrome.storage.sync.get(['customStatusPresets']);
            this.customStatusPresets = result.customStatusPresets || [];
            this.displayCustomStatusPresets();
        } catch (error) {
            console.error('Failed to load custom status presets:', error);
            this.customStatusPresets = [];
        }
    }

    displayCustomStatusPresets() {
        const listElement = document.getElementById('custom-status-list');
        const emptyElement = document.getElementById('custom-status-empty');
        
        if (!listElement || !emptyElement) return;
        
        if (this.customStatusPresets.length === 0) {
            listElement.innerHTML = '';
            emptyElement.classList.remove('hidden');
            return;
        }
        
        emptyElement.classList.add('hidden');
        listElement.innerHTML = this.customStatusPresets.map(preset => 
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
                        <span class="text-lg">:${preset.emoji}:</span>
                        <div class="font-medium text-gray-800">${Utils.escapeHtml(preset.title)}</div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 text-xs text-gray-500">
                                <span class="px-2 py-1 rounded-full ${availabilityColors[preset.availability]}">
                                    ${preset.availability.toUpperCase()}
                                </span>
                                <span>${durationText}</span>
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
            this.showMessage('Please fill in all required fields', 'error');
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
        
        this.customStatusPresets.push(preset);
        await this.saveCustomStatusPresets();
        this.displayCustomStatusPresets();
        this.hideCustomStatusModal();
        this.showMessage('Custom status preset created successfully', 'success');
    }

    async applyCustomStatusPreset(presetId) {
        if (!this.isAuthenticated) {
            this.showMessage('Please authenticate first', 'error');
            return;
        }
        
        const preset = this.customStatusPresets.find(p => p.id === presetId);
        if (!preset) {
            this.showMessage('Preset not found', 'error');
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
            this.showMessage(message, 'success');
        } catch (error) {
            console.error('Failed to apply custom status preset:', error);
            this.showMessage('Failed to apply preset', 'error');
        }
    }

    async deleteCustomStatusPreset(presetId) {
        if (confirm('Are you sure you want to delete this preset?')) {
            this.customStatusPresets = this.customStatusPresets.filter(p => p.id !== presetId);
            await this.saveCustomStatusPresets();
            this.displayCustomStatusPresets();
            this.showMessage('Preset deleted successfully', 'success');
        }
    }

    async saveCustomStatusPresets() {
        try {
            await chrome.storage.sync.set({ customStatusPresets: this.customStatusPresets });
        } catch (error) {
            console.error('Failed to save custom status presets:', error);
        }
    }

    async clearCustomStatus() {
        if (!this.isAuthenticated) {
            this.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            await mattermostAPI.clearCustomStatus(userId, token);
            // Also reset status to online
            await mattermostAPI.updateUserStatus(userId, 'online', token);

            this.showMessage('Custom status cleared and set to online', 'success');
        } catch (error) {
            console.error('Failed to clear custom status:', error);
            this.showMessage('Failed to clear custom status', 'error');
        }
    }

    async saveSettings() {
        try {
            const settings = {
                emoji: document.getElementById('emoji-input').value.trim() || 'calendar',
                statusText: document.getElementById('status-text-input').value.trim(),
                showMeetingTitle: document.getElementById('show-meeting-title').checked,
                googleMeetIntegration: document.getElementById('google-meet-integration').checked,
                meetingStatus: document.getElementById('meeting-status').value,
                meetingEmoji: document.getElementById('meeting-emoji').value.trim() || 'calendar',
                meetingText: document.getElementById('meeting-text').value.trim() || 'In a meeting'
            };

            // Save status duration separately
            const durationInput = document.getElementById('status-duration-input');
            const statusDuration = durationInput ? parseInt(durationInput.value) || 0 : 0;
            
            await mattermostAPI.storeSettings(settings);
            await chrome.storage.sync.set({ statusDuration });
            
            this.showMessage('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showMessage('Failed to save settings', 'error');
        }
    }

    async loadSavedSettings() {
        try {
            const settings = await mattermostAPI.getSettings();
            const storageData = await chrome.storage.sync.get(['statusDuration']);

            // Load saved values
            if (settings.emoji) document.getElementById('emoji-input').value = settings.emoji;
            if (settings.statusText) document.getElementById('status-text-input').value = settings.statusText;
            if (settings.showMeetingTitle !== undefined) document.getElementById('show-meeting-title').checked = settings.showMeetingTitle;
            if (settings.googleMeetIntegration !== undefined) {
                document.getElementById('google-meet-integration').checked = settings.googleMeetIntegration;
                document.getElementById('meet-settings').classList.toggle('hidden', !settings.googleMeetIntegration);
            }
            if (settings.meetingStatus) document.getElementById('meeting-status').value = settings.meetingStatus;
            if (settings.meetingEmoji) document.getElementById('meeting-emoji').value = settings.meetingEmoji;
            if (settings.meetingText) document.getElementById('meeting-text').value = settings.meetingText;
            
            // Load status duration
            const durationInput = document.getElementById('status-duration-input');
            if (durationInput && storageData.statusDuration !== undefined) {
                durationInput.value = storageData.statusDuration;
            }
        } catch (error) {
            console.error('Failed to load saved settings:', error);
        }
    }

    async testConnection() {
        if (!this.isAuthenticated) {
            this.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            this.showMessage('Testing connection...', 'info');
            
            const result = await mattermostAPI.testConnection();

            if (result.success) {
                this.updateConnectionStatus('connected', `Connection successful - ${result.userData.username}`);
                this.showMessage('Connection test successful!', 'success');
            } else {
                this.updateConnectionStatus('error', 'Connection test failed');
                this.showMessage(`Connection test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.updateConnectionStatus('error', 'Connection test failed');
            this.showMessage('Connection test failed', 'error');
        }
    }

    showAuthSection() {
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-controls').classList.add('hidden');
    }

    showMainControls() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('main-controls').classList.remove('hidden');
    }

    updateConnectionStatus(status, message) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        if (indicator && text) {
            indicator.className = 'w-3 h-3 rounded-full mr-3';
            
            switch (status) {
                case 'connected':
                    indicator.classList.add('bg-green-500');
                    break;
                case 'disconnected':
                    indicator.classList.add('bg-gray-400');
                    break;
                case 'error':
                    indicator.classList.add('bg-red-500');
                    break;
                default:
                    indicator.classList.add('bg-yellow-500');
            }
            
            text.textContent = message;
        }
    }

    updateUserInfo(userData, authMethod) {
        const userInitial = document.getElementById('user-initial');
        const userName = document.getElementById('user-name');
        const authMethodElement = document.getElementById('auth-method');

        if (userInitial) {
            userInitial.textContent = userData.username ? userData.username[0].toUpperCase() : '?';
        }
        if (userName) {
            userName.textContent = userData.username || 'User';
        }
        if (authMethodElement) {
            authMethodElement.textContent = authMethod === 'token' ? 'personal access token' : 'password';
        }
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('status-messages');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `p-3 rounded-md text-sm mb-2 ${this.getMessageClasses(type)}`;
        messageEl.textContent = message;

        container.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    async loadMeetHistory() {
        try {
            const result = await chrome.storage.sync.get(['meetHistory']);
            this.meetHistory = result.meetHistory || [];
            this.displayMeetHistory();
            console.log('Meet history loaded:', this.meetHistory.length, 'entries');
        } catch (error) {
            console.error('Error loading meet history:', error);
            this.meetHistory = [];
        }
    }
    
    displayMeetHistory() {
        const historyList = document.getElementById('meet-history-list');
        const emptyState = document.getElementById('meet-history-empty');
        
        if (!historyList || !emptyState) return;
        
        if (this.meetHistory.length === 0) {
            historyList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        
        // Sort history by startTime (newest first)
        const sortedHistory = [...this.meetHistory].sort((a, b) => b.startTime - a.startTime);
        
        historyList.innerHTML = sortedHistory.map(entry => this.createMeetHistoryEntryHTML(entry)).join('');
        
        // Add event delegation for delete buttons
        historyList.removeEventListener('click', this.handleMeetHistoryClick);
        this.handleMeetHistoryClick = (e) => {
            if (e.target.classList.contains('delete-meet-entry')) {
                const entryId = e.target.getAttribute('data-entry-id');
                this.deleteMeetHistoryEntry(entryId);
            }
        };
        historyList.addEventListener('click', this.handleMeetHistoryClick);
    }
    
    createMeetHistoryEntryHTML(entry) {
        const timestamp = new Date(entry.startTime).toLocaleString();
        const duration = entry.endTime ? this.formatDuration(entry.endTime - entry.startTime) : 'Ongoing';
        
        return `
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center">
                        <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span class="font-medium text-gray-800">${entry.title || 'Google Meet Session'}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-xs text-gray-500">${timestamp}</span>
                        <button class="delete-meet-entry text-red-500 hover:text-red-700 focus:outline-none cursor-pointer p-1 rounded" 
                                data-entry-id="${entry.id}"
                                title="Delete entry"
                                style="pointer-events: auto; z-index: 10;">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="text-sm text-gray-600">
                    <p>Status: ${entry.status || 'Do Not Disturb'}</p>
                    <p>Duration: ${duration}</p>
                    ${entry.roomId ? `<p class="text-xs text-gray-500">Room: ${entry.roomId}</p>` : ''}
                    ${entry.statusText ? `<p>Message: ${entry.statusText}</p>` : ''}
                </div>
            </div>
        `;
    }
    
    formatDuration(milliseconds) {
        const minutes = Math.floor(milliseconds / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    }
    

    
    async saveMeetHistory() {
        try {
            await chrome.storage.sync.set({ 
                meetHistory: this.meetHistory
            });
        } catch (error) {
            console.error('Error saving meet history:', error);
        }
    }
    
    async clearMeetHistory() {
        this.meetHistory = [];
        await chrome.storage.sync.set({ 
            meetHistory: []
        });
        this.displayMeetHistory();
        this.showMessage('Google Meet history cleared', 'success');
    }

    async deleteMeetHistoryEntry(entryId) {
        try {
            // Remove the entry from the local array
            this.meetHistory = this.meetHistory.filter(entry => entry.id !== entryId);
            
            // Update storage
            await chrome.storage.sync.set({ 
                meetHistory: this.meetHistory
            });
            
            // Refresh the display
            this.displayMeetHistory();
            this.showMessage('Meeting history entry deleted', 'success');
        } catch (error) {
            console.error('Error deleting meet history entry:', error);
            this.showMessage('Failed to delete entry', 'error');
        }
    }



    showError(message, errorElement) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        } else {
            this.showMessage(message, 'error');
        }
    }

    getMessageClasses(type) {
        switch (type) {
            case 'success':
                return 'bg-green-50 text-green-700 border border-green-200';
            case 'error':
                return 'bg-red-50 text-red-700 border border-red-200';
            case 'warning':
                return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
            default:
                return 'bg-blue-50 text-blue-700 border border-blue-200';
        }
    }

    // Tab interface methods
    onShow() {
        // Called when tab becomes active
        this.checkAuthentication();
    }

    onHide() {
        // Called when tab becomes inactive
    }

    // Public API for integration with other parts of the extension
    async setMeetingStatus(meetingTitle = '') {
        try {
            // Get meeting settings
            const settings = await chrome.storage.sync.get(['meetingStatus', 'meetingEmoji', 'meetingText', 'showMeetingTitle']);
            const status = settings.meetingStatus || 'dnd';
            const emoji = settings.meetingEmoji || 'calendar';
            let statusText = settings.meetingText || 'In a meeting';
            
            // Add meeting title if enabled and provided
            if (settings.showMeetingTitle && meetingTitle) {
                statusText = `${statusText}: ${meetingTitle}`;
            }
            
            // Set status in Mattermost
            const result = await mattermostAPI.setCustomStatus(status, emoji, statusText);
            
            return result;
        } catch (error) {
            console.error('Error setting meeting status:', error);
            throw error;
        }
    }

    async clearMeetingStatus() {
        try {
            // Clear status in Mattermost
            const result = await mattermostAPI.clearCustomStatus();
            
            return result;
        } catch (error) {
            console.error('Error clearing meeting status:', error);
            throw error;
        }
    }

    // History management methods
    async showHistoryModal() {
        try {
            const history = await mattermostAPI.getStatusHistory();
            this.displayHistory(history);
            document.getElementById('history-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Failed to load history:', error);
            this.showMessage('Failed to load status history', 'error');
        }
    }

    hideHistoryModal() {
        document.getElementById('history-modal').classList.add('hidden');
    }

    displayHistory(history) {
        const historyList = document.getElementById('history-list');
        const historyEmpty = document.getElementById('history-empty');
        const historyCount = document.getElementById('history-count');

        if (!historyList || !historyEmpty || !historyCount) return;

        historyCount.textContent = history.length;

        if (history.length === 0) {
            historyList.innerHTML = '';
            historyEmpty.classList.remove('hidden');
            return;
        }

        historyEmpty.classList.add('hidden');
        
        // Sort history by start time (newest first)
        const sortedHistory = [...history].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
        
        historyList.innerHTML = sortedHistory.map(entry => this.createHistoryEntryHTML(entry)).join('');
        
        // Add event listeners for edit and delete buttons
        historyList.querySelectorAll('.edit-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entryId = e.target.closest('.edit-entry-btn').dataset.entryId;
                this.editHistoryEntry(entryId);
            });
        });
        
        historyList.querySelectorAll('.delete-entry-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const entryId = e.target.closest('.delete-entry-btn').dataset.entryId;
                this.deleteHistoryEntry(entryId);
            });
        });
    }

    createHistoryEntryHTML(entry) {
        const startTime = new Date(entry.startTime);
        const endTime = entry.endTime ? new Date(entry.endTime) : null;
        const isActive = !entry.endTime;
        
        const statusDisplay = this.getStatusDisplay(entry.status, entry.emoji, entry.text);
        const timeDisplay = this.formatTimeDisplay(startTime, endTime, entry.duration);
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        ${statusDisplay.indicator}
                        <div>
                            <div class="font-medium text-gray-800">${statusDisplay.title}</div>
                            ${statusDisplay.subtitle ? `<div class="text-sm text-gray-600">${statusDisplay.subtitle}</div>` : ''}
                        </div>
                        ${isActive ? '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Active</span>' : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="edit-entry-btn text-blue-600 hover:text-blue-700 p-1" data-entry-id="${entry.id}" title="Edit">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button class="delete-entry-btn text-red-600 hover:text-red-700 p-1" data-entry-id="${entry.id}" title="Delete">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="mt-3 text-sm text-gray-500">
                    ${timeDisplay}
                </div>
            </div>
        `;
    }

    getStatusDisplay(status, emoji, text) {
        const statusColors = {
            online: 'bg-green-500',
            away: 'bg-yellow-500',
            dnd: 'bg-red-500',
            offline: 'bg-gray-500',
            custom: 'bg-blue-500'
        };
        
        const statusNames = {
            online: 'Online',
            away: 'Away',
            dnd: 'Do Not Disturb',
            offline: 'Offline',
            custom: 'Custom Status'
        };
        
        const indicator = `<div class="w-3 h-3 rounded-full ${statusColors[status] || 'bg-gray-500'}"></div>`;
        const title = statusNames[status] || status;
        
        let subtitle = '';
        if (status === 'custom' && (emoji || text)) {
            subtitle = `${emoji ? `:${emoji}:` : ''} ${text || ''}`.trim();
        }
        
        return { indicator, title, subtitle };
    }

    formatTimeDisplay(startTime, endTime, duration) {
        const formatTime = (date) => {
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        };
        
        const startDisplay = formatTime(startTime);
        
        if (endTime) {
            const endDisplay = formatTime(endTime);
            return `${startDisplay} → ${endDisplay} (${duration || 'Unknown duration'})`;
        } else {
            const now = new Date();
            const currentDuration = mattermostAPI.calculateDuration(startTime.toISOString(), now.toISOString());
            return `Started: ${startDisplay} (${currentDuration} so far)`;
        }
    }

    async editHistoryEntry(entryId) {
        try {
            const history = await mattermostAPI.getStatusHistory();
            const entry = history.find(e => e.id === entryId);
            
            if (!entry) {
                this.showMessage('History entry not found', 'error');
                return;
            }
            
            // Populate edit form
            document.getElementById('edit-entry-id').value = entryId;
            document.getElementById('edit-status').value = entry.status;
            document.getElementById('edit-emoji').value = entry.emoji || '';
            document.getElementById('edit-text').value = entry.text || '';
            
            this.toggleCustomFields(entry.status);
            document.getElementById('edit-history-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Failed to load entry for editing:', error);
            this.showMessage('Failed to load entry for editing', 'error');
        }
    }

    hideEditModal() {
        document.getElementById('edit-history-modal').classList.add('hidden');
    }

    toggleCustomFields(status) {
        const customFields = document.getElementById('edit-custom-fields');
        if (customFields) {
            customFields.classList.toggle('hidden', status !== 'custom');
        }
    }

    async handleEditSubmit(e) {
        e.preventDefault();
        
        try {
            const entryId = document.getElementById('edit-entry-id').value;
            const status = document.getElementById('edit-status').value;
            const emoji = document.getElementById('edit-emoji').value.trim();
            const text = document.getElementById('edit-text').value.trim();
            
            const updates = { status };
            if (status === 'custom') {
                updates.emoji = emoji;
                updates.text = text;
            } else {
                updates.emoji = '';
                updates.text = '';
            }
            
            const success = await mattermostAPI.updateStatusHistoryEntry(entryId, updates);
            
            if (success) {
                this.hideEditModal();
                this.showMessage('History entry updated successfully', 'success');
                // Refresh the history display
                const history = await mattermostAPI.getStatusHistory();
                this.displayHistory(history);
            } else {
                this.showMessage('Failed to update history entry', 'error');
            }
        } catch (error) {
            console.error('Failed to update history entry:', error);
            this.showMessage('Failed to update history entry', 'error');
        }
    }

    async deleteHistoryEntry(entryId) {
        if (!confirm('Are you sure you want to delete this history entry?')) {
            return;
        }
        
        try {
            const success = await mattermostAPI.deleteStatusHistoryEntry(entryId);
            
            if (success) {
                this.showMessage('History entry deleted successfully', 'success');
                // Refresh the history display
                const history = await mattermostAPI.getStatusHistory();
                this.displayHistory(history);
            } else {
                this.showMessage('Failed to delete history entry', 'error');
            }
        } catch (error) {
            console.error('Failed to delete history entry:', error);
            this.showMessage('Failed to delete history entry', 'error');
        }
    }

    async clearAllHistory() {
        if (!confirm('Are you sure you want to clear all status history? This action cannot be undone.')) {
            return;
        }
        
        try {
            const success = await mattermostAPI.clearStatusHistory();
            
            if (success) {
                this.showMessage('All history cleared successfully', 'success');
                this.displayHistory([]);
            } else {
                this.showMessage('Failed to clear history', 'error');
            }
        } catch (error) {
            console.error('Failed to clear history:', error);
            this.showMessage('Failed to clear history', 'error');
        }
    }
}
