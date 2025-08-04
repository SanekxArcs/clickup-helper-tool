// Google Meet integration content script for Mattermost status updates
// Based on the original mattermost-status-updater plugin

class GoogleMeetMattermostIntegration {
    constructor() {
        this.isInMeeting = false;
        this.meetingTitle = '';
        this.currentRoomId = null;
        this.meetingStatusSet = false;
        this.checkInterval = null;
        this.lastMeetingCheck = Date.now();
        this.meetingTimeoutId = null;
        this.beforeUnloadListener = null;
        this.visibilityChangeListener = null;
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

        // Add beforeunload listener for tab/window closing
        this.beforeUnloadListener = () => {
            if (this.isInMeeting) {
                console.log('Tab closing or navigating away, clearing meeting status');
                this.clearMeetingStatusSync();
            }
        };
        window.addEventListener('beforeunload', this.beforeUnloadListener);

        // Add visibility change listener for tab switching/hiding
        this.visibilityChangeListener = () => {
            if (document.visibilityState === 'hidden' && this.isInMeeting) {
                // Set a timeout to check if we're still in the meeting after a delay
                this.meetingTimeoutId = setTimeout(() => {
                    this.checkMeetingStatusAfterHidden();
                }, 5000); // Check after 5 seconds
            } else if (document.visibilityState === 'visible' && this.meetingTimeoutId) {
                // Cancel timeout if tab becomes visible again
                clearTimeout(this.meetingTimeoutId);
                this.meetingTimeoutId = null;
            }
        };
        document.addEventListener('visibilitychange', this.visibilityChangeListener);

        // Add focus/blur listeners as backup
        window.addEventListener('blur', () => {
            if (this.isInMeeting) {
                // Start monitoring for meeting end when window loses focus
                setTimeout(() => {
                    if (!document.hasFocus() && this.isInMeeting) {
                        this.checkMeetingStatus();
                    }
                }, 3000);
            }
        });
    }

    async checkMeetingStatusAfterHidden() {
        // This is called when tab has been hidden for a while
        // Double-check if we're still actually in a meeting
        const actuallyInMeeting = this.detectMeetingState();
        
        if (!actuallyInMeeting && this.isInMeeting) {
            console.log('Meeting ended while tab was hidden, clearing status');
            this.isInMeeting = false;
            this.meetingTitle = '';
            await this.clearMeetingStatus();
        }
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
                console.log('Previous state:', { wasInMeeting, oldMeetingTitle });
                console.log('Current state:', { isInMeeting: this.isInMeeting, meetingTitle: this.meetingTitle });
                
                if (this.isInMeeting) {
                    const currentRoomId = this.extractMeetingRoomId();
                    // Only set meeting status if we haven't already set it for this room
                    if (!this.meetingStatusSet || this.currentRoomId !== currentRoomId) {
                        console.log('Calling setMeetingStatus...');
                        await this.setMeetingStatus();
                        this.meetingStatusSet = true;
                    } else {
                        console.log('Meeting status already set for room:', currentRoomId, 'skipping duplicate call');
                    }
                } else {
                    console.log('Calling clearMeetingStatus...');
                    await this.clearMeetingStatus();
                    this.meetingStatusSet = false;
                }
            }
        } catch (error) {
            console.error('Error checking meeting status:', error);
        }
    }

    detectMeetingState() {
        console.log('Detecting meeting state...');
        
        // Method 1: Check for camera/microphone controls (most reliable)
        const micButton = document.querySelector('[data-tooltip*="microphone" i], [aria-label*="microphone" i], [title*="microphone" i]');
        const cameraButton = document.querySelector('[data-tooltip*="camera" i], [aria-label*="camera" i], [title*="camera" i]');
        
        if (micButton || cameraButton) {
            console.log('Method 1: Found mic/camera controls - in meeting');
            this.lastMeetingCheck = Date.now();
            return true;
        }

        // Method 2: Check for meeting controls bar
        const controlsBar = document.querySelector('[jsname="lbAIIb"], .qqYZIc, .qowsmv, .kXe4ee');
        if (controlsBar && controlsBar.offsetParent !== null) {
            this.lastMeetingCheck = Date.now();
            return true;
        }

        // Method 3: Check for end call button
        const endCallButton = document.querySelector('[data-tooltip*="call" i], [aria-label*="call" i], button[jsname="CQylAd"]');
        if (endCallButton) {
            this.lastMeetingCheck = Date.now();
            return true;
        }

        // Method 4: Check for participant list or video elements
        const participantList = document.querySelector('[data-participant-id], .VfPpkd-rymPhb-ibnC6b, .KvOSCf, .Tmb7Fd');
        const videoElements = document.querySelectorAll('video');
        
        if (participantList || videoElements.length > 0) {
            this.lastMeetingCheck = Date.now();
            return true;
        }

        // Method 5: Check URL pattern and additional elements
        const url = window.location.href;
        const meetingPattern = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/;
        if (meetingPattern.test(url)) {
            // Additional check to see if we're actually in the meeting room
            const meetingContainer = document.querySelector('[jsname="HlFet"], .crqnQb, .T4LgNb, [data-meeting-state]');
            const callStarted = document.querySelector('[data-call-started="true"], .ksKsZd, .oX4ic');
            
            if (meetingContainer || callStarted) {
                this.lastMeetingCheck = Date.now();
                return true;
            }
        }

        // Method 6: Check if we were recently in a meeting (grace period)
        const timeSinceLastCheck = Date.now() - this.lastMeetingCheck;
        if (timeSinceLastCheck < 10000) { // 10 second grace period
            console.log('Method 6: Grace period active - still in meeting');
            return true;
        }

        console.log('No meeting indicators found - not in meeting');
        return false;
    }

    extractMeetingRoomId() {
        try {
            // Extract room ID from Google Meet URL pattern: https://meet.google.com/xxx-xxxx-xxx
            const url = window.location.href;
            const roomIdMatch = url.match(/\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:\?|$)/);
            return roomIdMatch ? roomIdMatch[1] : null;
        } catch (error) {
            console.error('Error extracting meeting room ID:', error);
            return null;
        }
    }

    extractMeetingTitle() {
        try {
            console.log('Extracting meeting title...');
            
            // Method 1: Try to get meeting name from the title bar or meeting info
            let title = document.querySelector('h1[data-meeting-title], .u6vdof, .ouH3xe')?.textContent?.trim();
            console.log('Method 1 (title bar):', title);
            
            // Method 2: Try getting from page title
            if (!title) {
                const pageTitle = document.title;
                console.log('Page title:', pageTitle);
                const titleMatch = pageTitle.match(/^(.+?)\s*[-–]\s*Google Meet$/);
                if (titleMatch) {
                    title = titleMatch[1].trim();
                    console.log('Method 2 (page title match):', title);
                }
            }

            // Method 3: Try getting from meeting details
            if (!title) {
                const meetingInfo = document.querySelector('[jsname="bvWbuf"], .VfPpkd-Bz112c-LgbsSe-OCA6Rb-C6yNHb')?.textContent?.trim();
                console.log('Method 3 (meeting info):', meetingInfo);
                if (meetingInfo && meetingInfo.length < 100) {
                    title = meetingInfo;
                }
            }

            // Method 4: Try getting from URL parameters
            if (!title) {
                const urlParams = new URLSearchParams(window.location.search);
                title = urlParams.get('meeting') || urlParams.get('title');
                console.log('Method 4 (URL params):', title);
            }

            // Method 5: Use room ID as fallback title for quick meetings
            if (!title) {
                const roomId = this.extractMeetingRoomId();
                if (roomId) {
                    title = `Meet ${roomId}`;
                    console.log('Method 5 (room ID fallback):', title);
                }
            }

            // Clean up the title
            if (title) {
                title = title.replace(/\s*[-–]\s*Google Meet$/i, '').trim();
                // Limit title length
                if (title.length > 50) {
                    title = title.substring(0, 47) + '...';
                }
            }

            const finalTitle = title || 'Google Meet';
            console.log('Final extracted title:', finalTitle);
            return finalTitle;
        } catch (error) {
            console.error('Error extracting meeting title:', error);
            return 'Google Meet';
        }
    }

    async setMeetingStatus() {
        try {
            const settings = await this.getSettings();
            if (!settings.googleMeetIntegration) return;

            const roomId = this.extractMeetingRoomId();
            this.currentRoomId = roomId; // Store the room ID for later use
            
            // Send message to background script to update Mattermost status
            chrome.runtime.sendMessage({
                type: 'MATTERMOST_SET_MEETING_STATUS',
                meetingTitle: this.meetingTitle,
                roomId: roomId
            });

            console.log('Meeting status set:', this.meetingTitle, 'Room ID:', roomId);
        } catch (error) {
            console.error('Failed to set meeting status:', error);
        }
    }

    async clearMeetingStatus() {
        try {
            console.log('Content script: clearMeetingStatus called');
            const settings = await this.getSettings();
            if (!settings.googleMeetIntegration) {
                console.log('Google Meet integration disabled, not clearing status');
                return;
            }

            // Use stored room ID instead of trying to extract from page
            const roomId = this.currentRoomId;
            console.log('Content script: Clearing meeting status for room:', roomId);
            
            // Send message to background script to clear Mattermost status
            chrome.runtime.sendMessage({
                type: 'MATTERMOST_CLEAR_MEETING_STATUS',
                roomId: roomId
            });

            console.log('Meeting status cleared for room:', roomId);
            
            // Clear the stored room ID
            this.currentRoomId = null;
        } catch (error) {
            console.error('Failed to clear meeting status:', error);
        }
    }

    // Synchronous version for use in beforeunload
    clearMeetingStatusSync() {
        try {
            // Use stored room ID instead of trying to extract from page
            const roomId = this.currentRoomId;
            
            // Send message to background script to clear Mattermost status
            chrome.runtime.sendMessage({
                type: 'MATTERMOST_CLEAR_MEETING_STATUS',
                roomId: roomId
            });

            console.log('Meeting status cleared synchronously for room:', roomId);
            
            // Clear the stored room ID
            this.currentRoomId = null;
        } catch (error) {
            console.error('Failed to clear meeting status synchronously:', error);
        }
    }

    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        if (this.meetingTimeoutId) {
            clearTimeout(this.meetingTimeoutId);
            this.meetingTimeoutId = null;
        }

        if (this.beforeUnloadListener) {
            window.removeEventListener('beforeunload', this.beforeUnloadListener);
            this.beforeUnloadListener = null;
        }

        if (this.visibilityChangeListener) {
            document.removeEventListener('visibilitychange', this.visibilityChangeListener);
            this.visibilityChangeListener = null;
        }

        // Clear meeting status if we were in a meeting
        if (this.isInMeeting) {
            this.clearMeetingStatusSync();
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

// Enhanced cleanup and monitoring
let pageHidden = false;
let lastActiveTime = Date.now();

// Monitor for page becoming hidden (tab switch, minimize, etc.)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        pageHidden = true;
        // If we were in a meeting and page becomes hidden, start monitoring for meeting end
        if (meetIntegration && meetIntegration.isInMeeting) {
            // Check periodically if the meeting is still active
            const checkInterval = setInterval(() => {
                if (document.visibilityState === 'visible') {
                    clearInterval(checkInterval);
                    pageHidden = false;
                    return;
                }
                
                // If page has been hidden for more than 30 seconds, assume meeting ended
                if (Date.now() - lastActiveTime > 30000) {
                    clearInterval(checkInterval);
                    if (meetIntegration && meetIntegration.isInMeeting) {
                        console.log('Meeting likely ended due to prolonged inactivity');
                        meetIntegration.clearMeetingStatusSync();
                        meetIntegration.isInMeeting = false;
                    }
                }
            }, 5000);
        }
    } else {
        pageHidden = false;
        lastActiveTime = Date.now();
    }
});

// Monitor for navigation away from meeting
let currentUrl = window.location.href;
const urlCheckInterval = setInterval(() => {
    if (window.location.href !== currentUrl) {
        const oldUrl = currentUrl;
        currentUrl = window.location.href;
        
        // If we navigated away from a meeting URL, clear status
        const wasMeetingUrl = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(oldUrl);
        const isMeetingUrl = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(currentUrl);
        
        if (wasMeetingUrl && !isMeetingUrl && meetIntegration && meetIntegration.isInMeeting) {
            console.log('Navigated away from meeting URL, clearing status');
            meetIntegration.clearMeetingStatusSync();
            meetIntegration.isInMeeting = false;
        }
    }
}, 1000);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    clearInterval(urlCheckInterval);
    if (meetIntegration) {
        meetIntegration.cleanup();
    }
});

// Additional monitoring for common meeting end scenarios
function addMeetingEndDetection() {
    // Monitor for "Call ended" messages
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const text = node.textContent || '';
                    if (text.includes('call ended') || 
                        text.includes('left the meeting') || 
                        text.includes('meeting ended') ||
                        text.includes('disconnected')) {
                        console.log('Meeting end detected via text content');
                        if (meetIntegration && meetIntegration.isInMeeting) {
                            setTimeout(() => {
                                meetIntegration.clearMeetingStatusSync();
                                meetIntegration.isInMeeting = false;
                            }, 2000);
                        }
                    }
                }
            });
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Start enhanced meeting end detection after a short delay
setTimeout(addMeetingEndDetection, 3000);

// Additional periodic check for meeting timeout/disconnection
setInterval(() => {
    if (meetIntegration && meetIntegration.isInMeeting) {
        // Check for disconnection messages or error states
        const disconnectionIndicators = [
            'connection lost',
            'reconnecting',
            'call ended',
            'meeting ended',
            'left the meeting',
            'disconnected',
            'connection failed',
            'network error',
            'unable to connect'
        ];
        
        const bodyText = document.body.textContent.toLowerCase();
        const hasDisconnectionIndicator = disconnectionIndicators.some(indicator => 
            bodyText.includes(indicator)
        );
        
        if (hasDisconnectionIndicator) {
            console.log('Disconnection indicator found, clearing meeting status');
            meetIntegration.clearMeetingStatusSync();
            meetIntegration.isInMeeting = false;
        }
        
        // Check if the current URL is no longer a meeting URL
        const currentUrl = window.location.href;
        const isMeetingUrl = /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/.test(currentUrl);
        
        if (!isMeetingUrl) {
            console.log('No longer on meeting URL, clearing status');
            meetIntegration.clearMeetingStatusSync();
            meetIntegration.isInMeeting = false;
        }
    }
}, 10000); // Check every 10 seconds
