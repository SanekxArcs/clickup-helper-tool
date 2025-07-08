import { Utils } from '../../shared/utils.js';
import { mattermostAPI } from '../../shared/mattermost-api.js';

export class MattermostTab {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.initialize();
    }

    async initialize() {
        try {
            await this.checkAuthentication();
            this.setupEventListeners();
            this.loadSavedSettings();
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

        // Custom status buttons
        document.getElementById('update-custom-status-btn')?.addEventListener('click', () => this.updateCustomStatus());
        document.getElementById('clear-status-btn')?.addEventListener('click', () => this.clearCustomStatus());

        // Google Meet integration toggle
        document.getElementById('google-meet-integration')?.addEventListener('change', (e) => {
            document.getElementById('meet-settings').classList.toggle('hidden', !e.target.checked);
        });

        // Settings buttons
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('test-connection-btn')?.addEventListener('click', () => this.testConnection());

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

    async updateCustomStatus() {
        if (!this.isAuthenticated) {
            this.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            const emoji = document.getElementById('emoji-input').value.trim() || 'calendar';
            const text = document.getElementById('status-text-input').value.trim();

            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            await mattermostAPI.updateCustomStatus(userId, emoji, text, token);
            this.showMessage('Custom status updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update custom status:', error);
            this.showMessage('Failed to update custom status', 'error');
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
        return await mattermostAPI.setMeetingStatus(meetingTitle);
    }

    async clearMeetingStatus() {
        return await mattermostAPI.clearMeetingStatus();
    }
}
