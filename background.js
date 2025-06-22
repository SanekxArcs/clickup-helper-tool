// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Branch & Commit Helper extension installed');
    
    // Create context menu
    chrome.contextMenus.create({
        id: 'getBranchAndCommit',
        title: 'Get Branch and Commit',
        contexts: ['page']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'getBranchAndCommit') {
        // Execute content script to extract data
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractAndStoreTaskData
        });
    }
});

// Function to extract task data and store it
function extractAndStoreTaskData() {
    const data = {
        url: window.location.href // Capture current page URL
    };
    
    // Extract task ID
    const taskIdElement = document.querySelector('[data-test="task-view-task-label__taskid-button"]');
    if (taskIdElement) {
        data.id = taskIdElement.textContent.trim();
    }
    
    // Extract title
    const titleElement = document.querySelector('[data-test="task-title__title-overlay"]');
    if (titleElement) {
        data.title = titleElement.textContent.trim();
    }
    
    // Extract description
    const descriptionElement = document.querySelector('.ql-editor');
    if (descriptionElement) {
        // Get text content but preserve some structure
        data.description = descriptionElement.innerText.trim();
    }
    
    // Extract priority - check if task is urgent
    data.isUrgent = false;
    
    // Look for the specific ClickUp urgent priority element
    const priorityElement = document.querySelector('.cu-priorities-view__item-label[data-test="priorities-view__item-label-Urgent"]');
    if (priorityElement && priorityElement.textContent.trim() === 'Urgent') {
        data.isUrgent = true;
    }
    
    // Store the extracted data
    chrome.storage.local.set({ 
        extractedTaskData: data,
        sourceUrl: data.url // Also store URL separately for later use
    }, () => {
        // Show notification or feedback
        if (data.id || data.title) {
            chrome.runtime.sendMessage({
                type: 'TASK_DATA_EXTRACTED',
                data: data
            });
        }
    });
    
    return data;
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TASK_DATA_EXTRACTED') {
        // You can add additional processing here if needed
        console.log('Task data extracted:', request.data);
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    console.log('Command received:', command);
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        switch (command) {
            case 'quick-generate':
                // Auto-fill and generate immediately
                await handleQuickGenerate(tab);
                break;
                
            case 'auto-fill':
                // Auto-fill from current page only
                await handleAutoFill(tab);
                break;
                
            case 'copy-last-branch':
                // Copy last generated branch name
                await handleCopyLastBranch();
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
    }
});

// Quick generate function
async function handleQuickGenerate(tab) {
    try {
        // First auto-fill data
        const data = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractAndStoreTaskData
        });
        
        // Store the extracted data
        if (data && data[0] && data[0].result) {
            const extractedData = data[0].result;
            await chrome.storage.local.set({ 
                extractedTaskData: extractedData,
                sourceUrl: extractedData.url
            });
            
            // Send message to popup to trigger generation
            chrome.runtime.sendMessage({
                type: 'QUICK_GENERATE_TRIGGERED',
                data: extractedData
            });
            
            // Open the popup to show results
            chrome.action.openPopup();
        } else {
            // If no data extracted, just open popup
            chrome.action.openPopup();
        }
    } catch (error) {
        console.error('Quick generate error:', error);
        // Open popup anyway so user can see the error
        chrome.action.openPopup();
    }
}

// Auto-fill only function
async function handleAutoFill(tab) {
    try {
        const data = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: extractAndStoreTaskData
        });
        
        if (data && data[0] && data[0].result) {
            const extractedData = data[0].result;
            await chrome.storage.local.set({ 
                extractedTaskData: extractedData,
                sourceUrl: extractedData.url
            });
            
            // Send message to popup
            chrome.runtime.sendMessage({
                type: 'AUTO_FILL_TRIGGERED',
                data: extractedData
            });
            
            // Open the popup to show the filled data
            chrome.action.openPopup();
        } else {
            chrome.action.openPopup();
        }
    } catch (error) {
        console.error('Auto-fill error:', error);
        chrome.action.openPopup();
    }
}

// Listen for tab updates to enable/disable context menu
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // You can add logic here to enable/disable the context menu
        // based on the current page URL or content
    }
});

// Copy last generated branch name
async function handleCopyLastBranch() {
    try {
        const data = await chrome.storage.local.get(['history']);
        const history = data.history || [];
        
        if (history.length > 0 && history[0].branchName) {
            // Copy to clipboard using the offscreen document method for service workers
            await copyToClipboard(history[0].branchName);
            
            // Show notification
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Branch & Commit Helper',
                message: `Branch name copied: ${history[0].branchName}`
            });
        } else {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: 'Branch & Commit Helper',
                message: 'No branch name found in history'
            });
        }
    } catch (error) {
        console.error('Error copying last branch:', error);
    }
}

// Helper function to copy text to clipboard in service worker
async function copyToClipboard(text) {
    try {
        // For Chrome extensions, we need to use the chrome.action API
        // or create an offscreen document for clipboard access
        await chrome.action.openPopup();
        
        // Send message to popup to handle clipboard
        chrome.runtime.sendMessage({
            type: 'COPY_TO_CLIPBOARD',
            text: text
        });
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
    }
}

// Advanced Pomodoro Timer System - START
class AdvancedPomodoroTimer {
    constructor() {
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.currentPhase = 'work'; // 'work', 'break', 'lunch'
        this.timer = null;
        this.startTime = null;
        this.settings = {
            workTimeMinutes: 25,
            breakTimeMinutes: 5
        };
        
        this.initializeBackgroundTimer();
    }

    initializeBackgroundTimer() {
        this.loadTimerState();
        this.setupMessageListeners();
        this.resumeTimerIfNeeded();
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.type) {
                case 'ADVANCED_POMODORO_START':
                    this.startTimer(request.phase, request.duration, request.settings);
                    sendResponse({ success: true, state: this.getTimerState() });
                    break;
                    
                case 'ADVANCED_POMODORO_PAUSE':
                    this.pauseTimer();
                    sendResponse({ success: true, state: this.getTimerState() });
                    break;
                    
                case 'ADVANCED_POMODORO_GET_STATE':
                    sendResponse({ state: this.getTimerState() });
                    break;
                    
                case 'ADVANCED_POMODORO_UPDATE_SETTINGS':
                    this.updateSettings(request.settings);
                    sendResponse({ success: true });
                    break;
            }
            return true;
        });
    }

    startTimer(phase, duration, settings) {
        this.currentPhase = phase;
        this.currentTime = duration;
        this.totalTime = duration;
        this.isRunning = true;
        this.startTime = Date.now();
        this.settings = settings;
        
        this.timer = setInterval(() => {
            this.currentTime--;
            this.saveTimerState();
            this.notifyPopup();
            
            if (this.currentTime <= 0) {
                this.timerComplete();
            }
        }, 1000);
        
        this.saveTimerState();
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timer);
            this.saveTimerState();
            this.notifyPopup();
        }
    }

    timerComplete() {
        this.isRunning = false;
        clearInterval(this.timer);
        
        // Show notification based on phase
        this.showPhaseCompleteNotification();
        
        // Notify popup that timer is complete
        this.notifyPopup(true);
        
        this.saveTimerState();
    }

    getTimerState() {
        return {
            currentTime: this.currentTime,
            totalTime: this.totalTime,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            startTime: this.startTime,
            timerComplete: false
        };
    }

    saveTimerState() {
        chrome.storage.local.set({
            advancedPomodoroTimerState: {
                ...this.getTimerState(),
                lastSaved: Date.now()
            }
        });
    }

    loadTimerState() {
        chrome.storage.local.get(['advancedPomodoroTimerState'], (result) => {
            if (result.advancedPomodoroTimerState) {
                const state = result.advancedPomodoroTimerState;
                this.currentTime = state.currentTime || 0;
                this.totalTime = state.totalTime || 0;
                this.isRunning = state.isRunning || false;
                this.currentPhase = state.currentPhase || 'work';
                this.startTime = state.startTime;
            }
        });
    }

    resumeTimerIfNeeded() {
        setTimeout(() => {
            chrome.storage.local.get(['advancedPomodoroTimerState'], (result) => {
                if (result.advancedPomodoroTimerState && result.advancedPomodoroTimerState.isRunning) {
                    const state = result.advancedPomodoroTimerState;
                    const elapsed = Math.floor((Date.now() - state.lastSaved) / 1000);
                    
                    if (elapsed < state.currentTime) {
                        // Timer should still be running
                        this.currentTime = state.currentTime - elapsed;
                        this.totalTime = state.totalTime;
                        this.currentPhase = state.currentPhase;
                        this.startTime = state.startTime;
                        
                        // Resume timer
                        this.isRunning = true;
                        this.timer = setInterval(() => {
                            this.currentTime--;
                            this.saveTimerState();
                            this.notifyPopup();
                            
                            if (this.currentTime <= 0) {
                                this.timerComplete();
                            }
                        }, 1000);
                    } else {
                        // Timer should have completed while extension was closed
                        this.timerComplete();
                    }
                }
            });
        }, 500);
    }

    notifyPopup(timerComplete = false) {
        const state = this.getTimerState();
        state.timerComplete = timerComplete;
        
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_STATE_UPDATE',
            state: state
        }).catch(() => {
            // Popup is closed, ignore error
        });
    }

    showPhaseCompleteNotification() {
        const messages = {
            work: '🎯 Work session complete! Time for a break!',
            break: '☕ Break over! Ready to get back to work?',
            lunch: '🍽️ Hope you enjoyed your lunch!'
        };

        const message = messages[this.currentPhase] || 'Session complete!';
        
        // Play notification sound
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Advanced Pomodoro Timer',
            message: message,
            requireInteraction: true
        });
        
        // Also try to play a beep sound if possible
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'PLAY_NOTIFICATION_SOUND'}).catch(() => {
                    // Content script not available, ignore
                });
            }
        });
    }

    updateSettings(settings) {
        this.settings = settings;
        chrome.storage.local.set({ advancedPomodoroSettings: settings });
    }
}

// Initialize advanced pomodoro timer
const advancedPomodoroTimer = new AdvancedPomodoroTimer();

// Advanced Pomodoro Timer System - END
