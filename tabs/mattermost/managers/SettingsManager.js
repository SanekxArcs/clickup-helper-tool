import { mattermostAPI } from '../../../shared/mattermost-api.js';

export class SettingsManager {
    constructor(tab) {
        this.tab = tab;
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
            this.tab.showMessage('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.tab.showMessage('Failed to save settings', 'error');
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
        if (!this.tab.isAuthenticated) {
            this.tab.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            this.tab.showMessage('Testing connection...', 'info');
            
            const result = await mattermostAPI.testConnection();

            if (result.success) {
                this.tab.updateConnectionStatus('connected', `Connection successful - ${result.userData.username}`);
                this.tab.showMessage('Connection test successful!', 'success');
            } else {
                this.tab.updateConnectionStatus('error', 'Connection test failed');
                this.tab.showMessage(`Connection test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            this.tab.updateConnectionStatus('error', 'Connection test failed');
            this.tab.showMessage('Connection test failed', 'error');
        }
    }

    async updateStatus(status) {
        if (!this.tab.isAuthenticated) {
            this.tab.showMessage('Please authenticate first', 'error');
            return;
        }

        try {
            const stored = await mattermostAPI.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            await mattermostAPI.updateUserStatus(userId, status, token);
            this.tab.showMessage(`Status updated to ${status}`, 'success');
        } catch (error) {
            console.error('Failed to update status:', error);
            this.tab.showMessage('Failed to update status', 'error');
        }
    }
}
