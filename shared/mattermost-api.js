// Shared Mattermost API utilities
// This file contains helper functions for interacting with the Mattermost API

export class MattermostAPI {
    constructor() {
        this.apiBaseUrl = 'https://chat.twntydigital.de/api/v4';
    }

    /**
     * Set the server URL for API calls
     */
    setServerUrl(serverUrl) {
        // Remove trailing slash and add /api/v4
        const cleanUrl = serverUrl.replace(/\/$/, '');
        this.apiBaseUrl = `${cleanUrl}/api/v4`;
    }

    /**
     * Generic API fetch wrapper for Mattermost API calls
     */
    async apiFetch(endpoint, options = {}) {
        const config = {
            method: 'GET',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers,
            },
            credentials: 'omit',
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(`${this.apiBaseUrl}/${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
                message: `Request failed with status ${response.status}` 
            }));
            const error = new Error(errorData.message || 'API request failed');
            error.authError = response.status === 401;
            throw error;
        }

        return response.status === 204 || response.headers.get('Content-Length') === '0' 
            ? { success: true } 
            : response.json();
    }

    /**
     * Authenticate user with email/username and password
     */
    async loginWithCredentials(loginId, password) {
        const response = await fetch(`${this.apiBaseUrl}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                login_id: loginId,
                password: password,
                device_id: 'chrome_extension_' + chrome.runtime.id
            }),
            credentials: 'omit'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Login failed');
        }

        const token = response.headers.get('Token');
        const userData = await response.json();

        if (!token || !userData) {
            throw new Error('Invalid response from server');
        }

        return { token, userData };
    }

    /**
     * Get current user information using a token
     */
    async getCurrentUser(token) {
        return this.apiFetch('users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    /**
     * Update user status (online, away, dnd, offline)
     */
    async updateUserStatus(userId, status, token) {
        if (!userId || !status || !token) {
            throw new Error('Missing userId, status, or token');
        }
        
        if (!['online', 'away', 'dnd', 'offline'].includes(status)) {
            throw new Error('Invalid status value');
        }

        console.log(`Updating user status to: ${status}`);
        
        // Record status change in history before making the API call
        await this.recordStatusHistory(status, '', '');
        
        return this.apiFetch('users/me/status', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
                user_id: userId,
                status: status
            }
        });
    }

    /**
     * Update custom status with emoji and text
     */
    async updateCustomStatus(userId, emoji, text, token) {
        if (!token) {
            throw new Error('Missing token');
        }

        // Validate and clean emoji
        if (emoji) {
            emoji = emoji.trim().toLowerCase();
            if (!/^[a-z0-9_]+$/.test(emoji)) {
                throw new Error('Emoji must contain only lowercase letters, numbers, and underscores');
            }
        }

        console.log(`Updating custom status: "${text}" with emoji: "${emoji}"`);
        
        // Record custom status change in history
        await this.recordStatusHistory('custom', emoji || '', text || '');
        
        return this.apiFetch('users/me/status/custom', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
                emoji: emoji || '',
                text: text || ''
            }
        });
    }

    /**
     * Clear custom status
     */
    async clearCustomStatus(userId, token) {
        if (!token) {
            throw new Error('Missing token');
        }

        console.log('Clearing custom status');
        return this.apiFetch('users/me/status/custom', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    /**
     * Simple method to set custom status (for use from history tab)
     */
    async setCustomStatus(token, emoji, text) {
        if (!token) {
            throw new Error('Missing token');
        }

        try {
            // Validate and clean emoji
            if (emoji) {
                emoji = emoji.trim().toLowerCase();
                if (!/^[a-z0-9_]+$/.test(emoji)) {
                    throw new Error('Emoji must contain only lowercase letters, numbers, and underscores');
                }
            }

            console.log(`Setting custom status: "${text}" with emoji: "${emoji}"`);
            
            await this.apiFetch('users/me/status/custom', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: {
                    emoji: emoji || '',
                    text: text || ''
                }
            });
            
            return true;
        } catch (error) {
            console.error('Failed to set custom status:', error);
            return false;
        }
    }

    /**
     * Get stored authentication data from Chrome storage
     */
    async getStoredAuth() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['MMAuthToken', 'MMAccessToken', 'MMUsername', 'MMUserId'], resolve);
        });
    }

    /**
     * Store authentication data in Chrome storage
     */
    async storeAuth(authData) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(authData, resolve);
        });
    }

    /**
     * Clear stored authentication data
     */
    async clearStoredAuth() {
        return new Promise((resolve) => {
            chrome.storage.sync.remove(['MMAuthToken', 'MMAccessToken', 'MMUsername', 'MMUserId'], resolve);
        });
    }

    /**
     * Get Mattermost settings from Chrome storage
     */
    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['mattermostSettings'], (result) => {
                resolve(result.mattermostSettings || {});
            });
        });
    }

    /**
     * Store Mattermost settings in Chrome storage
     */
    async storeSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ mattermostSettings: settings }, resolve);
        });
    }

    /**
     * Set meeting status based on stored settings
     */
    async setMeetingStatus(meetingTitle = '') {
        try {
            const stored = await this.getStoredAuth();
            const settings = await this.getSettings();
            
            if (!settings.googleMeetIntegration) {
                return false;
            }

            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            if (!token || !userId) {
                throw new Error('Authentication data not found');
            }

            // Prepare meeting status details
            const emoji = settings.meetingEmoji || 'calendar';
            let text = settings.meetingText || 'In a meeting';
            
            if (settings.showMeetingTitle && meetingTitle) {
                text += `: ${meetingTitle}`;
            }
            await this.updateCustomStatus(userId, emoji, text, token);

            // Record meeting status in history
            await this.recordStatusHistory('meeting', emoji, text);

            // Update status (without recording again since we already recorded above)
            await this.apiFetch('users/me/status', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: {
                    user_id: userId,
                    status: settings.meetingStatus || 'dnd'
                }
            });

            // Update custom status (without recording again)
            await this.apiFetch('users/me/status/custom', {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: {
                    emoji: emoji,
                    text: text
                }
            });
            
            return true;
        } catch (error) {
            console.error('Failed to set meeting status:', error);
            return false;
        }
    }

    /**
     * Clear meeting status and return to online
     */
    async clearMeetingStatus() {
        try {
            const stored = await this.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;

            if (!token || !userId) {
                throw new Error('Authentication data not found');
            }

            // Record status change to online in history
            await this.recordStatusHistory('online', '', '');

            // Update status (without recording again since we already recorded above)
            await this.updateUserStatus(userId, 'online', token);
            await this.clearCustomStatus(userId, token);
            
            return true;
        } catch (error) {
            console.error('Failed to clear meeting status:', error);
            return false;
        }
    }

    /**
     * Test the connection to Mattermost API
     */
    async testConnection() {
        try {
            const stored = await this.getStoredAuth();
            const token = stored.MMAccessToken || stored.MMAuthToken;

            if (!token) {
                throw new Error('No authentication token found');
            }

            const userData = await this.getCurrentUser(token);
            return { success: true, userData };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Record a status change in history
     */
    async recordStatusHistory(status, emoji = '', text = '') {
        try {
            const history = await this.getStatusHistory();
            const now = new Date();
            
            // End the previous status if it exists
            if (history.length > 0) {
                const lastEntry = history[history.length - 1];
                if (!lastEntry.endTime) {
                    lastEntry.endTime = now.toISOString();
                    lastEntry.duration = this.calculateDuration(lastEntry.startTime, lastEntry.endTime);
                }
            }
            
            // Add new status entry
            const newEntry = {
                id: Date.now().toString(),
                status: status,
                emoji: emoji,
                text: text,
                startTime: now.toISOString(),
                endTime: null,
                duration: null
            };
            
            history.push(newEntry);
            
            // Keep only last 100 entries to prevent storage bloat
            if (history.length > 100) {
                history.splice(0, history.length - 100);
            }
            
            await this.storeStatusHistory(history);
        } catch (error) {
            console.error('Failed to record status history:', error);
        }
    }

    /**
     * Get status history from storage
     */
    async getStatusHistory() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['mattermostStatusHistory'], (result) => {
                resolve(result.mattermostStatusHistory || []);
            });
        });
    }

    /**
     * Store status history in storage
     */
    async storeStatusHistory(history) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ mattermostStatusHistory: history }, resolve);
        });
    }

    /**
     * Delete a status history entry
     */
    async deleteStatusHistoryEntry(entryId) {
        try {
            const history = await this.getStatusHistory();
            const filteredHistory = history.filter(entry => entry.id !== entryId);
            await this.storeStatusHistory(filteredHistory);
            return true;
        } catch (error) {
            console.error('Failed to delete status history entry:', error);
            return false;
        }
    }

    /**
     * Update a status history entry
     */
    async updateStatusHistoryEntry(entryId, updates) {
        try {
            const history = await this.getStatusHistory();
            const entryIndex = history.findIndex(entry => entry.id === entryId);
            
            if (entryIndex === -1) {
                throw new Error('Entry not found');
            }
            
            history[entryIndex] = { ...history[entryIndex], ...updates };
            await this.storeStatusHistory(history);
            return true;
        } catch (error) {
            console.error('Failed to update status history entry:', error);
            return false;
        }
    }

    /**
     * Calculate duration between two timestamps
     */
    calculateDuration(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const diffMs = end - start;
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Clear all status history
     */
    async clearStatusHistory() {
        try {
            await this.storeStatusHistory([]);
            return true;
        } catch (error) {
            console.error('Failed to clear status history:', error);
            return false;
        }
    }
}

// Create a singleton instance for use throughout the extension
export const mattermostAPI = new MattermostAPI();
