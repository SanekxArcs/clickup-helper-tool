import { Utils } from '../../shared/utils.js';
import { mattermostAPI } from '../../shared/mattermost-api.js';
import { ToastManager } from '../../shared/toast-manager.js';

export class MattermostTab {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.customStatusPresets = [];
        this.filteredRooms = [];
        this.customRoomsConfig = [];
        this.initialize();
    }

    async initialize() {
        try {
            await this.checkAuthentication();
            this.setupEventListeners();
            this.loadSavedSettings();
            
            // Load custom status presets
            this.loadCustomStatusPresets();
            
            // Load filtered rooms
            this.loadFilteredRooms();
            
            // Load custom room configurations
            this.loadCustomRoomsConfig();
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
            const meetSettings = document.getElementById('meet-settings');
            if (meetSettings) {
                meetSettings.classList.toggle('hidden', !e.target.checked);
            }
        });

        // Settings buttons
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('test-connection-btn')?.addEventListener('click', () => this.testConnection());

        // Meet filter
        document.getElementById('add-meet-filter-btn')?.addEventListener('click', () => this.addMeetFilter());
        document.getElementById('meet-room-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addMeetFilter();
        });

        // Meet custom room
        document.getElementById('add-custom-room-btn')?.addEventListener('click', () => this.openCustomRoomModal());
        document.getElementById('custom-room-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.openCustomRoomModal();
        });
        
        // Custom room modal
        document.getElementById('close-custom-room-modal')?.addEventListener('click', () => this.hideCustomRoomModal());
        document.getElementById('cancel-custom-room-modal')?.addEventListener('click', () => this.hideCustomRoomModal());
        document.getElementById('custom-room-form')?.addEventListener('submit', (e) => this.handleSaveCustomRoom(e));

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

    // Meet Filter Methods
    async loadFilteredRooms() {
        try {
            const result = await chrome.storage.sync.get(['filteredRooms']);
            this.filteredRooms = result.filteredRooms || [];
            this.displayFilteredRooms();
        } catch (error) {
            console.error('Failed to load filtered rooms:', error);
            this.filteredRooms = [];
        }
    }

    displayFilteredRooms() {
        const listElement = document.getElementById('meet-filter-list');
        const emptyElement = document.getElementById('meet-filter-empty');
        
        if (!listElement || !emptyElement) return;
        
        if (this.filteredRooms.length === 0) {
            listElement.innerHTML = '';
            emptyElement.classList.remove('hidden');
            return;
        }
        
        emptyElement.classList.add('hidden');
        listElement.innerHTML = this.filteredRooms.map(room => this.createFilteredRoomHTML(room)).join('');
        
        // Add event listeners for delete buttons
        listElement.querySelectorAll('.remove-meet-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomCode = e.currentTarget.getAttribute('data-room-code');
                this.removeMeetFilter(roomCode);
            });
        });
    }

    createFilteredRoomHTML(roomCode) {
        return `
            <div class="flex items-center justify-between p-3 border bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <div>
                        <div class="font-medium text-gray-800">${roomCode}</div>
                        <div class="text-xs text-gray-500">Status will not auto-update in this room</div>
                    </div>
                </div>
                <button class="remove-meet-filter-btn ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors" data-room-code="${roomCode}" title="Remove filter">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
    }

    async addMeetFilter() {
        const input = document.getElementById('meet-room-code-input');
        if (!input) return;
        
        const roomCode = input.value.trim().toLowerCase();
        
        if (!roomCode) {
            this.showMessage('Please enter a room code', 'error');
            return;
        }
        
        if (this.filteredRooms.includes(roomCode)) {
            this.showMessage('This room is already in the filter list', 'warning');
            return;
        }
        
        this.filteredRooms.push(roomCode);
        console.log('📌 [ADD FILTER DEBUG] Added room:', roomCode);
        console.log('📌 [ADD FILTER DEBUG] All filtered rooms:', this.filteredRooms);
        
        await this.saveFilteredRooms();
        
        // Verify save
        const verify = await chrome.storage.sync.get(['filteredRooms']);
        console.log('📌 [ADD FILTER DEBUG] Verified in storage:', verify.filteredRooms);
        
        this.displayFilteredRooms();
        input.value = '';
        this.showMessage(`Room "${roomCode}" added to filter`, 'success');
    }

    async removeMeetFilter(roomCode) {
        if (confirm(`Remove "${roomCode}" from filter?`)) {
            this.filteredRooms = this.filteredRooms.filter(room => room !== roomCode);
            await this.saveFilteredRooms();
            this.displayFilteredRooms();
            this.showMessage(`Room "${roomCode}" removed from filter`, 'success');
        }
    }

    async saveFilteredRooms() {
        try {
            await chrome.storage.sync.set({ filteredRooms: this.filteredRooms });
        } catch (error) {
            console.error('Failed to save filtered rooms:', error);
        }
    }

    isRoomFiltered(roomCode) {
        return this.filteredRooms.some(room => room === roomCode.toLowerCase());
    }

    // ========== Meet Custom Room Methods ==========

    async loadCustomRoomsConfig() {
        try {
            const result = await chrome.storage.sync.get(['customRoomsConfig']);
            this.customRoomsConfig = result.customRoomsConfig || [];
            this.displayCustomRoomsConfig();
        } catch (error) {
            console.error('Failed to load custom rooms config:', error);
            this.customRoomsConfig = [];
        }
    }

    displayCustomRoomsConfig() {
        const listElement = document.getElementById('custom-room-list');
        const emptyElement = document.getElementById('custom-room-empty');
        
        if (!listElement || !emptyElement) return;
        
        if (this.customRoomsConfig.length === 0) {
            listElement.innerHTML = '';
            emptyElement.classList.remove('hidden');
            return;
        }
        
        emptyElement.classList.add('hidden');
        listElement.innerHTML = this.customRoomsConfig.map(config => this.createCustomRoomHTML(config)).join('');
        
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
                    <div class="text-2xl">${Utils.escapeHtml(emoji)}</div>
                    <div>
                        <div class="font-medium text-gray-800">${Utils.escapeHtml(roomCode)}</div>
                        <div class="text-xs text-gray-500">"${Utils.escapeHtml(text)}" • ${availability}</div>
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
            const config = this.customRoomsConfig.find(c => c.roomCode === roomCode);
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
                this.showMessage('Please enter a room code', 'error');
                return;
            }
            
            if (this.customRoomsConfig.some(c => c.roomCode === code)) {
                this.showMessage('This room is already configured', 'warning');
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
            this.showMessage('Please fill in all fields', 'error');
            return;
        }
        
        const form = document.getElementById('custom-room-form');
        const isEditMode = form?.getAttribute('data-edit-mode') === 'true';
        
        if (isEditMode) {
            // Update existing
            const existingIndex = this.customRoomsConfig.findIndex(c => c.roomCode === roomCode);
            if (existingIndex !== -1) {
                this.customRoomsConfig[existingIndex] = { roomCode, emoji, text, availability };
            }
        } else {
            // Add new
            this.customRoomsConfig.push({ roomCode, emoji, text, availability });
        }
        
        await this.saveCustomRoomsConfig();
        this.displayCustomRoomsConfig();
        this.hideCustomRoomModal();
        this.showMessage(`Room "${roomCode}" configuration ${isEditMode ? 'updated' : 'added'}`, 'success');
    }

    editCustomRoom(roomCode) {
        this.openCustomRoomModal(roomCode);
    }

    async removeCustomRoom(roomCode) {
        if (confirm(`Remove custom status configuration for "${roomCode}"?`)) {
            this.customRoomsConfig = this.customRoomsConfig.filter(config => config.roomCode !== roomCode);
            await this.saveCustomRoomsConfig();
            this.displayCustomRoomsConfig();
            this.showMessage(`Configuration for "${roomCode}" removed`, 'success');
        }
    }

    async saveCustomRoomsConfig() {
        try {
            await chrome.storage.sync.set({ customRoomsConfig: this.customRoomsConfig });
        } catch (error) {
            console.error('Failed to save custom rooms config:', error);
            this.showMessage('Failed to save configuration', 'error');
        }
    }

    getCustomRoomConfig(roomCode) {
        return this.customRoomsConfig.find(config => config.roomCode === roomCode.toLowerCase());
    }

    async saveSettings() {
        try {
            const showMeetingTitleInput = document.getElementById('show-meeting-title');
            const googleMeetIntegrationInput = document.getElementById('google-meet-integration');
            const meetingStatusInput = document.getElementById('meeting-status');
            const meetingEmojiInput = document.getElementById('meeting-emoji');
            const meetingTextInput = document.getElementById('meeting-text');
            
            const settings = {
                showMeetingTitle: showMeetingTitleInput ? showMeetingTitleInput.checked : false,
                googleMeetIntegration: googleMeetIntegrationInput ? googleMeetIntegrationInput.checked : false,
                meetingStatus: meetingStatusInput ? meetingStatusInput.value : 'dnd',
                meetingEmoji: meetingEmojiInput ? (meetingEmojiInput.value.trim() || 'calendar') : 'calendar',
                meetingText: meetingTextInput ? (meetingTextInput.value.trim() || 'In a meeting') : 'In a meeting'
            };
            
            await mattermostAPI.storeSettings(settings);
            this.showMessage('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showMessage('Failed to save settings', 'error');
        }
    }

    async loadSavedSettings() {
        try {
            const settings = await mattermostAPI.getSettings();

            // Load saved values with null checks
            const showMeetingTitleInput = document.getElementById('show-meeting-title');
            if (showMeetingTitleInput && settings.showMeetingTitle !== undefined) showMeetingTitleInput.checked = settings.showMeetingTitle;
            
            const googleMeetIntegrationInput = document.getElementById('google-meet-integration');
            const meetSettingsElement = document.getElementById('meet-settings');
            if (googleMeetIntegrationInput && settings.googleMeetIntegration !== undefined) {
                googleMeetIntegrationInput.checked = settings.googleMeetIntegration;
                if (meetSettingsElement) {
                    meetSettingsElement.classList.toggle('hidden', !settings.googleMeetIntegration);
                }
            }
            
            const meetingStatusInput = document.getElementById('meeting-status');
            if (meetingStatusInput && settings.meetingStatus) meetingStatusInput.value = settings.meetingStatus;
            
            const meetingEmojiInput = document.getElementById('meeting-emoji');
            if (meetingEmojiInput && settings.meetingEmoji) meetingEmojiInput.value = settings.meetingEmoji;
            
            const meetingTextInput = document.getElementById('meeting-text');
            if (meetingTextInput && settings.meetingText) meetingTextInput.value = settings.meetingText;
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
        ToastManager.show(message, type);
    }





    showError(message, errorElement) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        } else {
            ToastManager.error(message);
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
}
