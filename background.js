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

// Background Pomodoro Timer System - START
class BackgroundPomodoroTimer {
    constructor() {
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.currentPhase = 'focus';
        this.sessionsCompleted = 0;
        this.totalFocusMinutes = 0;
        this.timer = null;
        this.startTime = null;
        
        this.initializeBackgroundTimer();
    }

    initializeBackgroundTimer() {
        // Load timer state from storage
        this.loadTimerState();
        
        // Set up message listeners
        this.setupMessageListeners();
        
        // Check if timer was running when extension was closed
        this.resumeTimerIfNeeded();
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.type) {
                case 'POMODORO_START':
                    this.startTimer(request.settings);
                    sendResponse({ success: true, state: this.getTimerState() });
                    break;
                    
                case 'POMODORO_PAUSE':
                    this.pauseTimer();
                    sendResponse({ success: true, state: this.getTimerState() });
                    break;
                    
                case 'POMODORO_RESET':
                    this.resetTimer();
                    sendResponse({ success: true, state: this.getTimerState() });
                    break;
                    
                case 'POMODORO_NEXT':
                    this.nextPhase();
                    sendResponse({ success: true, state: this.getTimerState() });
                    break;
                    
                case 'POMODORO_GET_STATE':
                    sendResponse({ state: this.getTimerState() });
                    break;
                    
                case 'POMODORO_UPDATE_SETTINGS':
                    this.updateSettings(request.settings);
                    sendResponse({ success: true });
                    break;
            }
            return true; // Keep message channel open for async response
        });
    }

    startTimer(settings) {
        if (!this.isRunning) {
            this.isRunning = true;
            this.startTime = Date.now();
            
            if (this.currentTime === 0) {
                this.setPhaseTime(settings);
            }
            
            this.timer = setInterval(() => {
                this.currentTime--;
                this.saveTimerState();
                
                // Notify popup if it's open
                this.notifyPopup();
                
                if (this.currentTime <= 0) {
                    this.timerComplete(settings);
                }
            }, 1000);
            
            this.saveTimerState();
        }
    }

    pauseTimer() {
        if (this.isRunning) {
            this.isRunning = false;
            clearInterval(this.timer);
            this.saveTimerState();
            this.notifyPopup();
        }
    }

    resetTimer() {
        this.isRunning = false;
        clearInterval(this.timer);
        this.currentTime = 0;
        this.startTime = null;
        this.saveTimerState();
        this.notifyPopup();
    }

    nextPhase() {
        this.timerComplete();
    }

    timerComplete(settings) {
        this.isRunning = false;
        clearInterval(this.timer);
        
        // Show notification
        this.showPhaseCompleteNotification();
        
        // Update progress
        if (this.currentPhase === 'focus') {
            this.sessionsCompleted++;
            const focusMinutes = settings ? settings.focusTime : 25;
            this.totalFocusMinutes += focusMinutes;
            this.savePomodoroProgress();
        }
        
        // Move to next phase
        this.advancePhase(settings);
        this.setPhaseTime(settings);
        this.saveTimerState();
        this.notifyPopup();
    }

    advancePhase(settings) {
        if (this.currentPhase === 'focus') {
            const sessionsUntilLong = settings ? settings.sessionsUntilLongBreak : 4;
            if (this.sessionsCompleted % sessionsUntilLong === 0) {
                this.currentPhase = 'longBreak';
            } else {
                this.currentPhase = 'shortBreak';
            }
        } else {
            this.currentPhase = 'focus';
        }
    }

    setPhaseTime(settings) {
        let minutes;
        switch (this.currentPhase) {
            case 'focus':
                minutes = settings ? settings.focusTime : 25;
                break;
            case 'shortBreak':
                minutes = settings ? settings.shortBreak : 5;
                break;
            case 'longBreak':
                minutes = settings ? settings.longBreak : 15;
                break;
        }
        this.currentTime = minutes * 60;
        this.totalTime = minutes * 60;
    }

    getTimerState() {
        return {
            currentTime: this.currentTime,
            totalTime: this.totalTime,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            sessionsCompleted: this.sessionsCompleted,
            totalFocusMinutes: this.totalFocusMinutes,
            startTime: this.startTime
        };
    }

    saveTimerState() {
        chrome.storage.local.set({
            pomodoroTimerState: {
                ...this.getTimerState(),
                lastSaved: Date.now()
            }
        });
    }

    loadTimerState() {
        chrome.storage.local.get(['pomodoroTimerState'], (result) => {
            if (result.pomodoroTimerState) {
                const state = result.pomodoroTimerState;
                this.currentTime = state.currentTime || 0;
                this.totalTime = state.totalTime || 0;
                this.isRunning = state.isRunning || false;
                this.currentPhase = state.currentPhase || 'focus';
                this.sessionsCompleted = state.sessionsCompleted || 0;
                this.totalFocusMinutes = state.totalFocusMinutes || 0;
                this.startTime = state.startTime;
            }
        });
    }

    resumeTimerIfNeeded() {
        setTimeout(() => {
            chrome.storage.local.get(['pomodoroTimerState'], (result) => {
                if (result.pomodoroTimerState && result.pomodoroTimerState.isRunning) {
                    const state = result.pomodoroTimerState;
                    const elapsed = Math.floor((Date.now() - state.lastSaved) / 1000);
                    
                    if (elapsed < state.currentTime) {
                        // Timer should still be running
                        this.currentTime = state.currentTime - elapsed;
                        this.totalTime = state.totalTime;
                        this.currentPhase = state.currentPhase;
                        this.sessionsCompleted = state.sessionsCompleted;
                        this.totalFocusMinutes = state.totalFocusMinutes;
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
        }, 100); // Small delay to ensure proper initialization
    }

    notifyPopup() {
        // Try to send message to popup (will fail silently if popup is closed)
        chrome.runtime.sendMessage({
            type: 'POMODORO_STATE_UPDATE',
            state: this.getTimerState()
        }).catch(() => {
            // Popup is closed, ignore error
        });
    }

    showPhaseCompleteNotification() {
        const messages = {
            focus: 'Focus session complete! Time for a break.',
            shortBreak: 'Break over! Ready to focus?',
            longBreak: 'Long break finished! Let\'s get back to work.'
        };

        const message = messages[this.currentPhase] || 'Session complete!';
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Pomodoro Timer',
            message: message
        });
    }

    updateSettings(settings) {
        // Save settings for future use
        chrome.storage.local.set({ pomodoroSettings: settings });
    }

    savePomodoroProgress() {
        const progress = {
            sessionsCompleted: this.sessionsCompleted,
            totalFocusMinutes: this.totalFocusMinutes,
            date: new Date().toDateString()
        };
        chrome.storage.local.set({ pomodoroProgress: progress });
    }
}

// Initialize background timer
const backgroundPomodoroTimer = new BackgroundPomodoroTimer();

// Background Pomodoro Timer System - END
