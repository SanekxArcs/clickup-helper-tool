// Google Meet integration content script for Mattermost status updates
// Based on the original mattermost-status-updater plugin

class GoogleMeetMattermostIntegration {
    constructor() {
        this.isInMeeting = false;
        this.meetingTitle = '';
        this.checkInterval = null;
        this.initializeIntegration();
    }

    async initializeIntegration() {
        // Check if Mattermost integration is enabled
        const settings = await this.getSettings();
        if (!settings.googleMeetIntegration) {
            console.log('Google Meet - Mattermost integration is disabled');
            return;
        }

        console.log('Google Meet - Mattermost integration initialized');
        this.startMonitoring();
    }

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['mattermostSettings'], (result) => {
                resolve(result.mattermostSettings || {});
            });
        });
    }

    startMonitoring() {
        // Start checking for meeting status changes
        this.checkInterval = setInterval(() => {
            this.checkMeetingStatus();
        }, 2000);

        // Also check immediately
        this.checkMeetingStatus();

        // Listen for page navigation changes
        let lastUrl = location.href;
        new MutationObserver(() => {
            const currentUrl = location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setTimeout(() => this.checkMeetingStatus(), 1000);
            }
        }).observe(document, { subtree: true, childList: true });
    }

    async checkMeetingStatus() {
        try {
            const wasInMeeting = this.isInMeeting;
            const oldMeetingTitle = this.meetingTitle;

            // Check if we're in a meeting by looking for meeting indicators
            this.isInMeeting = this.detectMeetingState();
            this.meetingTitle = this.extractMeetingTitle();

            // If meeting status changed, update Mattermost
            if (wasInMeeting !== this.isInMeeting || oldMeetingTitle !== this.meetingTitle) {
                console.log(`Meeting status changed: ${this.isInMeeting ? 'joined' : 'left'}`, this.meetingTitle);
                
                if (this.isInMeeting) {
                    await this.setMeetingStatus();
                } else {
                    await this.clearMeetingStatus();
                }
            }
        } catch (error) {
            console.error('Error checking meeting status:', error);
        }
    }

    detectMeetingState() {
        // Method 1: Check for camera/microphone controls (most reliable)
        const micButton = document.querySelector('[data-tooltip*="microphone" i], [aria-label*="microphone" i], [title*="microphone" i]');
        const cameraButton = document.querySelector('[data-tooltip*="camera" i], [aria-label*="camera" i], [title*="camera" i]');
        
        if (micButton || cameraButton) {
            return true;
        }

        // Method 2: Check for meeting controls bar
        const controlsBar = document.querySelector('[jsname="lbAIIb"], .qqYZIc, .qowsmv, .kXe4ee');
        if (controlsBar && controlsBar.offsetParent !== null) {
            return true;
        }

        // Method 3: Check for end call button
        const endCallButton = document.querySelector('[data-tooltip*="call" i], [aria-label*="call" i], button[jsname="CQylAd"]');
        if (endCallButton) {
            return true;
        }

        // Method 4: Check URL pattern (backup method)
        const url = window.location.href;
        const meetingPattern = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;
        if (meetingPattern.test(url)) {
            // Additional check to see if we're actually in the meeting room
            const meetingContainer = document.querySelector('[jsname="HlFet"], .crqnQb, .T4LgNb');
            if (meetingContainer) {
                return true;
            }
        }

        return false;
    }

    extractMeetingTitle() {
        try {
            // Method 1: Try to get meeting name from the title bar or meeting info
            let title = document.querySelector('h1[data-meeting-title], .u6vdof, .ouH3xe')?.textContent?.trim();
            
            // Method 2: Try getting from page title
            if (!title) {
                const pageTitle = document.title;
                const titleMatch = pageTitle.match(/^(.+?)\s*[-–]\s*Google Meet$/);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                }
            }

            // Method 3: Try getting from meeting details
            if (!title) {
                const meetingInfo = document.querySelector('[jsname="bvWbuf"], .VfPpkd-Bz112c-LgbsSe-OCA6Rb-C6yNHb')?.textContent?.trim();
                if (meetingInfo && meetingInfo.length < 100) {
                    title = meetingInfo;
                }
            }

            // Method 4: Try getting from URL parameters
            if (!title) {
                const urlParams = new URLSearchParams(window.location.search);
                title = urlParams.get('meeting') || urlParams.get('title');
            }

            // Clean up the title
            if (title) {
                title = title.replace(/\s*[-–]\s*Google Meet$/i, '').trim();
                // Limit title length
                if (title.length > 50) {
                    title = title.substring(0, 47) + '...';
                }
            }

            return title || '';
        } catch (error) {
            console.error('Error extracting meeting title:', error);
            return '';
        }
    }

    async setMeetingStatus() {
        try {
            const settings = await this.getSettings();
            if (!settings.googleMeetIntegration) return;

            // Send message to background script to update Mattermost status
            chrome.runtime.sendMessage({
                type: 'MATTERMOST_SET_MEETING_STATUS',
                meetingTitle: this.meetingTitle
            });

            console.log('Meeting status set:', this.meetingTitle);
        } catch (error) {
            console.error('Failed to set meeting status:', error);
        }
    }

    async clearMeetingStatus() {
        try {
            const settings = await this.getSettings();
            if (!settings.googleMeetIntegration) return;

            // Send message to background script to clear Mattermost status
            chrome.runtime.sendMessage({
                type: 'MATTERMOST_CLEAR_MEETING_STATUS'
            });

            console.log('Meeting status cleared');
        } catch (error) {
            console.error('Failed to clear meeting status:', error);
        }
    }

    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Initialize the integration when the page loads
let meetIntegration = null;

function initializeMeetIntegration() {
    if (meetIntegration) {
        meetIntegration.cleanup();
    }
    meetIntegration = new GoogleMeetMattermostIntegration();
}

// Wait for page to load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMeetIntegration);
} else {
    initializeMeetIntegration();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (meetIntegration) {
        meetIntegration.cleanup();
    }
});
