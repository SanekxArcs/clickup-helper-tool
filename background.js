// Background script for Chrome extension
let activeModeTimer = null;

chrome.runtime.onInstalled.addListener(() => {
    console.log('Branch & Commit Helper extension installed');
    
    // Initialize Active Mode settings
    chrome.storage.sync.get(['activeModeEnabled', 'activeModeInterval', 'statusDuration'], (result) => {
        if (result.activeModeEnabled === undefined) {
            chrome.storage.sync.set({
                activeModeEnabled: false,
                activeModeInterval: 5,
                statusDuration: 0
            });
        }
    });
    
    // Create context menu for task extraction
    chrome.contextMenus.create({
        id: 'getBranchAndCommit',
        title: 'Get Branch and Commit',
        contexts: ['page']
    });
    
    // Create context menu for environment switching
    chrome.contextMenus.create({
        id: 'switchEnvironment',
        title: 'Go to Dev Environment',
        contexts: ['page']
    });
    
    // Create submenu items for different environments
    const environments = [
        { id: 'localhost', title: 'localhost:3000', url: 'http://localhost:3000' },
        { id: 'test1', title: 'test1.priwatt.de', url: 'https://test1.priwatt.de' },
        { id: 'test2', title: 'test2.priwatt.de', url: 'https://test2.priwatt.de' },
        { id: 'test3', title: 'test3.priwatt.de', url: 'https://test3.priwatt.de' },
        { id: 'test4', title: 'test4.priwatt.de', url: 'https://test4.priwatt.de' },
        { id: 'test5', title: 'test5.priwatt.de', url: 'https://test5.priwatt.de' }
    ];
    
    environments.forEach(env => {
        chrome.contextMenus.create({
            id: `env_${env.id}`,
            parentId: 'switchEnvironment',
            title: env.title,
            contexts: ['page']
        });
    });
    
    // Create context menu for debugging tools
    chrome.contextMenus.create({
        id: 'debuggingTools',
        title: 'Debugging Tools',
        contexts: ['page']
    });
    
    // Create submenu items for debugging tools
    const debuggingTools = [
        { id: 'toggleAll', title: 'Toggle All Tools' },
        { id: 'separator1', type: 'separator' },
        { id: 'breakpointChecker', title: 'Breakpoint Checker' },
        { id: 'performanceMonitor', title: 'Performance Monitor' },
        { id: 'gridFlexVisualizer', title: 'Grid/Flex Visualizer' },
        { id: 'boxModelVisualizer', title: 'Box Model Visualizer' },
        { id: 'consoleOverlay', title: 'Console Overlay' }
    ];
    
    debuggingTools.forEach(tool => {
        if (tool.type === 'separator') {
            chrome.contextMenus.create({
                id: `debug_${tool.id}`,
                parentId: 'debuggingTools',
                type: 'separator',
                contexts: ['page']
            });
        } else {
            chrome.contextMenus.create({
                id: `debug_${tool.id}`,
                parentId: 'debuggingTools',
                title: tool.title,
                contexts: ['page']
            });
        }
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
    } else if (info.menuItemId.startsWith('env_')) {
        // Handle environment switching
        handleEnvironmentSwitch(info.menuItemId, tab);
    } else if (info.menuItemId.startsWith('debug_')) {
        // Handle debugging tools
        handleDebuggingToolToggle(info.menuItemId, tab);
    }
});

// Function to handle environment switching
function handleEnvironmentSwitch(menuItemId, tab) {
    const environments = {
        'env_localhost': 'http://localhost:3000',
        'env_test1': 'https://test1.priwatt.de',
        'env_test2': 'https://test2.priwatt.de',
        'env_test3': 'https://test3.priwatt.de',
        'env_test4': 'https://test4.priwatt.de',
        'env_test5': 'https://test5.priwatt.de'
    };
    
    const targetBaseUrl = environments[menuItemId];
    if (!targetBaseUrl) return;
    
    const currentUrl = tab.url;
    const currentUrlObj = new URL(currentUrl);
    
    // Extract the path and query parameters from current URL
    const pathAndQuery = currentUrlObj.pathname + currentUrlObj.search + currentUrlObj.hash;
    
    // Construct the new URL with the target environment
    const newUrl = targetBaseUrl + pathAndQuery;
    
    // Open in new tab
    chrome.tabs.create({
        url: newUrl,
        active: true
    });
    
    console.log(`Redirecting from ${currentUrl} to ${newUrl}`);
}

// Function to handle debugging tool toggles
async function handleDebuggingToolToggle(menuItemId, tab) {
    const toolId = menuItemId.replace('debug_', '');
    
    if (toolId === 'toggleAll') {
        // Toggle all debugging tools
        await toggleAllDebuggingTools(tab);
    } else {
        // Toggle individual tool
        await toggleIndividualTool(toolId, tab);
    }
}

// Function to toggle all debugging tools
async function toggleAllDebuggingTools(tab) {
    try {
        // Get current state of all tools
        const result = await chrome.storage.sync.get([
            'breakpointCheckerEnabled',
            'performanceMonitorEnabled', 
            'gridFlexVisualizerEnabled',
            'boxModelVisualizerEnabled',
            'consoleOverlayEnabled'
        ]);
        
        // Determine if we should turn all on or all off
        // If any tool is enabled, turn all off; otherwise turn all on
        const anyEnabled = Object.values(result).some(value => value === true);
        const newState = !anyEnabled;
        
        // Update all tool states
        await chrome.storage.sync.set({
            breakpointCheckerEnabled: newState,
            performanceMonitorEnabled: newState,
            gridFlexVisualizerEnabled: newState,
            boxModelVisualizerEnabled: newState,
            consoleOverlayEnabled: newState
        });
        
        // Notify all content scripts
        chrome.tabs.sendMessage(tab.id, {
            type: 'BREAKPOINT_CHECKER_SETTINGS_UPDATED',
            settings: { enabled: newState }
        });
        
        chrome.tabs.sendMessage(tab.id, {
            type: 'PERFORMANCE_MONITOR_SETTINGS_UPDATED',
            settings: { enabled: newState }
        });
        
        chrome.tabs.sendMessage(tab.id, {
            type: 'GRID_FLEX_VISUALIZER_SETTINGS_UPDATED',
            settings: { enabled: newState }
        });
        
        chrome.tabs.sendMessage(tab.id, {
            type: 'BOX_MODEL_VISUALIZER_SETTINGS_UPDATED',
            settings: { enabled: newState }
        });
        
        chrome.tabs.sendMessage(tab.id, {
            type: 'CONSOLE_OVERLAY_SETTINGS_UPDATED',
            settings: { enabled: newState }
        });
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Debugging Tools',
            message: `All debugging tools ${newState ? 'enabled' : 'disabled'}. Reloading page...`
        });
        
        // Reload the page to apply changes
        setTimeout(() => {
            chrome.tabs.reload(tab.id);
        }, 500);
        
    } catch (error) {
        console.error('Error toggling all debugging tools:', error);
    }
}

// Function to toggle individual debugging tool
async function toggleIndividualTool(toolId, tab) {
    try {
        const settingsMap = {
            'breakpointChecker': {
                key: 'breakpointCheckerEnabled',
                messageType: 'BREAKPOINT_CHECKER_SETTINGS_UPDATED',
                name: 'Breakpoint Checker'
            },
            'performanceMonitor': {
                key: 'performanceMonitorEnabled',
                messageType: 'PERFORMANCE_MONITOR_SETTINGS_UPDATED',
                name: 'Performance Monitor'
            },
            'gridFlexVisualizer': {
                key: 'gridFlexVisualizerEnabled',
                messageType: 'GRID_FLEX_VISUALIZER_SETTINGS_UPDATED',
                name: 'Grid/Flex Visualizer'
            },
            'boxModelVisualizer': {
                key: 'boxModelVisualizerEnabled',
                messageType: 'BOX_MODEL_VISUALIZER_SETTINGS_UPDATED',
                name: 'Box Model Visualizer'
            },
            'consoleOverlay': {
                key: 'consoleOverlayEnabled',
                messageType: 'CONSOLE_OVERLAY_SETTINGS_UPDATED',
                name: 'Console Overlay'
            }
        };
        
        const toolConfig = settingsMap[toolId];
        if (!toolConfig) return;
        
        // Get current state
        const result = await chrome.storage.sync.get([toolConfig.key]);
        const currentState = result[toolConfig.key] || false;
        const newState = !currentState;
        
        // Update state
        await chrome.storage.sync.set({
            [toolConfig.key]: newState
        });
        
        // Notify content script
        chrome.tabs.sendMessage(tab.id, {
            type: toolConfig.messageType,
            settings: { enabled: newState }
        });
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Debugging Tools',
            message: `${toolConfig.name} ${newState ? 'enabled' : 'disabled'}. Reloading page...`
        });
        
        // Reload the page to apply changes
        setTimeout(() => {
            chrome.tabs.reload(tab.id);
        }, 500);
        
    } catch (error) {
        console.error('Error toggling debugging tool:', error);
    }
}

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
    } else if (request.type === 'MATTERMOST_SET_MEETING_STATUS') {
        // Handle setting meeting status in Mattermost
        handleMattermostMeetingStatus(request.meetingTitle, request.roomId);
    } else if (request.type === 'MATTERMOST_CLEAR_MEETING_STATUS') {
        // Handle clearing meeting status in Mattermost
        handleMattermostClearStatus(request.roomId);
    } else if (request.type === 'MATTERMOST_SET_CUSTOM_STATUS') {
        // Handle setting custom status in Mattermost
        handleMattermostCustomStatus(request.emoji, request.text, sendResponse);
        return true; // Indicate we will send a response asynchronously
    } else if (request.action === 'toggleActiveMode') {
        // Handle Active Mode toggle
        if (request.enabled) {
            startActiveMode(request.interval);
        } else {
            stopActiveMode();
        }
    }
});

// Mattermost API integration functions
async function handleMattermostMeetingStatus(meetingTitle = '', roomId = null) {
    try {
        console.log('Background: Received meeting status request:', { meetingTitle, roomId });
        
        // Check if room is filtered (should not auto-update status)
        const stored = await chrome.storage.sync.get(['filteredRooms', 'customRoomsConfig']);
        const filteredRooms = stored.filteredRooms || [];
        const customRoomsConfig = stored.customRoomsConfig || [];
        
        console.log('[FILTER DEBUG] Filtered rooms list:', filteredRooms);
        console.log('[FILTER DEBUG] Current roomId:', roomId);
        
        if (roomId) {
            const normalizedRoomId = roomId.toLowerCase();
            console.log('[FILTER DEBUG] Normalized roomId:', normalizedRoomId);
            console.log('[FILTER DEBUG] Checking against list:', filteredRooms.map(r => `"${r}"`).join(', '));
            console.log('[FILTER DEBUG] Is in filter?', filteredRooms.includes(normalizedRoomId));
            
            // Extra check for edge cases
            const found = filteredRooms.some(r => r.toLowerCase() === normalizedRoomId);
            console.log('[FILTER DEBUG] Double-check with .some():', found);
            
            if (filteredRooms.includes(normalizedRoomId) || found) {
                console.log(`🚫 Room "${roomId}" is in filter list - skipping status update`);
                return;
            }
        } else {
            console.log('[FILTER DEBUG] No roomId provided - cannot filter');
        }
        
        const authStored = await chrome.storage.sync.get(['mattermostSettings', 'MMAuthToken', 'MMAccessToken', 'MMUserId', 'serverUrl']);
        const settings = authStored.mattermostSettings || {};
        
        if (!settings.googleMeetIntegration) {
            console.log('Google Meet integration is disabled');
            return;
        }

        const token = authStored.MMAccessToken || authStored.MMAuthToken;
        const userId = authStored.MMUserId;
        
        // Check for server URL in multiple places (for compatibility)
        const serverUrl = settings.serverUrl || authStored.serverUrl || 'https://chat.twntydigital.de';
        
        console.log('Meeting status authentication check:', { 
            hasToken: !!token, 
            hasUserId: !!userId, 
            serverUrl: serverUrl,
            googleMeetIntegration: settings.googleMeetIntegration
        });
        
        if (!token || !userId) {
            console.log('Mattermost authentication not found - missing token or userId');
            return;
        }

        const apiBaseUrl = `${serverUrl}/api/v4`;
        
        // Check if this room has a custom configuration
        let customRoomConfig = null;
        if (roomId) {
            customRoomConfig = customRoomsConfig.find(config => config.roomCode === roomId.toLowerCase());
        }
        
        if (customRoomConfig) {
            console.log('🎯 Custom room configuration found for room:', roomId, customRoomConfig);
        } else if (roomId) {
            console.log('ℹ️ No custom configuration for room:', roomId);
        }
        
        // Determine status, emoji, and text (from custom config or default settings)
        const status = customRoomConfig?.availability || settings.meetingStatus || 'dnd';
        let emoji = customRoomConfig?.emoji || settings.meetingEmoji || 'calendar';
        let text = customRoomConfig?.text || settings.meetingText || 'In a meeting';
        
        // Only add meeting title to status if it's not a room ID pattern and no custom config is set
        const roomIdPattern = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;
        const isRoomIdTitle = meetingTitle && roomIdPattern.test(meetingTitle.replace('Meet ', ''));
        
        if (!customRoomConfig && settings.showMeetingTitle && meetingTitle && !isRoomIdTitle) {
            text += `: ${meetingTitle}`;
        }
        
        console.log('Status update:', { meetingTitle, isRoomIdTitle, finalText: text, customConfig: !!customRoomConfig });
        
        // Update status (online/away/dnd)
        await fetch(`${apiBaseUrl}/users/me/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ 
                user_id: userId,
                status: status 
            })
        });

        // Update custom status with emoji and text
        await fetch(`${apiBaseUrl}/users/me/status/custom`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ emoji, text })
        });

        console.log('Mattermost meeting status set:', { status, emoji, text });
        
        // Record meeting history directly in storage
        try {
            const result = await chrome.storage.sync.get(['meetHistory']);
            const history = result.meetHistory || [];
            
            // Check if there's already an ongoing meeting with this roomId
            if (roomId) {
                const existingMeeting = history.find(entry => entry.roomId === roomId && !entry.endTime);
                if (existingMeeting) {
                    console.log('Background: Duplicate meeting detected - Meeting with room ID already in progress:', roomId);
                    console.log('Background: Existing meeting:', existingMeeting);
                    return;
                }
            }
            
            console.log('Background: No existing meeting found for room:', roomId, 'Creating new entry...');
            
            const finalTitle = meetingTitle || (roomId ? `Meet ${roomId}` : 'Google Meet');
            console.log('Background: Creating history entry with title:', finalTitle);
            
            const entry = {
                id: Date.now().toString(),
                roomId: roomId || Date.now().toString(),
                title: finalTitle,
                startTime: Date.now(),
                endTime: null
            };
            
            history.push(entry);
            
            // Keep only last 50 entries to prevent storage bloat
            if (history.length > 50) {
                history.splice(0, history.length - 50);
            }
            
            await chrome.storage.sync.set({ 
                meetHistory: history
            });
            
            console.log('Meeting history entry added:', entry);
        } catch (error) {
            console.error('Failed to record meeting history:', error);
        }
    } catch (error) {
        console.error('Failed to set Mattermost meeting status:', error);
    }
}

async function handleMattermostClearStatus(roomId = null) {
    try {
        console.log('Background: Received clear meeting status request for room:', roomId);
        
        const stored = await chrome.storage.sync.get(['mattermostSettings', 'MMAuthToken', 'MMAccessToken', 'MMUserId', 'serverUrl']);
        const settings = stored.mattermostSettings || {};
        const token = stored.MMAccessToken || stored.MMAuthToken;
        const userId = stored.MMUserId;
        
        // Check for server URL in multiple places (for compatibility)
        const serverUrl = settings.serverUrl || stored.serverUrl || 'https://chat.twntydigital.de';
        
        console.log('Clear status authentication check:', { 
            hasToken: !!token, 
            hasUserId: !!userId, 
            serverUrl: serverUrl
        });
        
        if (!token || !userId) {
            console.log('Mattermost authentication not found - missing token or userId');
            return;
        }

        const apiBaseUrl = `${serverUrl}/api/v4`;
        
        // Set status back to online
        await fetch(`${apiBaseUrl}/users/me/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ 
                user_id: userId,
                status: 'online' 
            })
        });

        // Clear custom status
        await fetch(`${apiBaseUrl}/users/me/status/custom`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        console.log('Mattermost status cleared and set to online');
        
        // Update meeting history directly in storage
        try {
            const result = await chrome.storage.sync.get(['meetHistory']);
            const history = result.meetHistory || [];
            
            if (roomId) {
                // Find the ongoing meeting with this roomId
                const entryIndex = history.findIndex(entry => entry.roomId === roomId && !entry.endTime);
                if (entryIndex !== -1) {
                    history[entryIndex].endTime = Date.now();
                    
                    await chrome.storage.sync.set({ 
                        meetHistory: history
                    });
                    
                    console.log('Meeting history entry updated:', history[entryIndex]);
                } else {
                    console.log('No ongoing meeting found with room ID:', roomId);
                }
            } else {
                console.log('No room ID provided for meeting end');
            }
        } catch (error) {
            console.error('Failed to update meeting history:', error);
        }
    } catch (error) {
        console.error('Failed to clear Mattermost status:', error);
    }
}

async function handleMattermostCustomStatus(emoji, text, sendResponse) {
    try {
        const stored = await chrome.storage.sync.get(['mattermostSettings', 'MMAuthToken', 'MMAccessToken', 'MMUserId', 'serverUrl']);
        const settings = stored.mattermostSettings || {};
        
        // Use access token if available, otherwise fall back to auth token
        const token = stored.MMAccessToken || stored.MMAuthToken;
        const userId = stored.MMUserId;
        
        // Check for server URL in multiple places (for compatibility)
        const serverUrl = settings.serverUrl || stored.serverUrl || 'https://chat.twntydigital.de';
        
        console.log('Custom status authentication check:', { 
            hasToken: !!token, 
            hasUserId: !!userId, 
            serverUrl: serverUrl
        });
        
        if (!token || !userId) {
            console.log('Mattermost authentication not found - missing token or userId');
            sendResponse({ success: false, error: 'Not authenticated' });
            return;
        }

        // Set custom status using the correct endpoint
        const customStatusUrl = `${serverUrl}/api/v4/users/me/status/custom`;
        
        const customStatusResponse = await fetch(customStatusUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                emoji: emoji,
                text: text
            })
        });

        if (!customStatusResponse.ok) {
            throw new Error(`Custom status request failed: ${customStatusResponse.status}`);
        }

        console.log('Mattermost custom status set:', { emoji, text });
        sendResponse({ success: true });
        
    } catch (error) {
        console.error('Failed to set Mattermost custom status:', error);
        sendResponse({ success: false, error: error.message });
    }
}

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

// Active Mode functions
function startActiveMode(interval) {
    stopActiveMode(); // Clear any existing timer
    
    const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds
    
    // Function to update status
    const updateStatus = async () => {
        try {
            const result = await chrome.storage.sync.get(['MMUserId', 'MMAuthToken', 'MMAccessToken', 'activeModeEnabled', 'mattermostSettings']);
            const { MMUserId, MMAuthToken, MMAccessToken, activeModeEnabled, mattermostSettings } = result;
            
            console.log('Active Mode: Checking status update...', { 
                hasUserId: !!MMUserId, 
                hasToken: !!(MMAccessToken || MMAuthToken), 
                activeModeEnabled 
            });
            
            // Check if active mode is still enabled
            if (!activeModeEnabled) {
                console.log('Active Mode: Disabled, stopping timer');
                stopActiveMode();
                return;
            }
            
            const token = MMAccessToken || MMAuthToken;
            const settings = mattermostSettings || {};
            const serverUrl = settings.serverUrl || 'https://chat.twntydigital.de';
            
            if (token && MMUserId) {
                console.log('Active Mode: Updating status to online...');
                // Set status to online
                const response = await fetch(`${serverUrl}/api/v4/users/me/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({
                        user_id: MMUserId,
                        status: 'online'
                    })
                });
                
                if (response.ok) {
                    console.log('Active Mode: Status successfully set to online');
                } else {
                    console.error('Active Mode: Failed to set status to online, response:', response.status, response.statusText);
                }
            } else {
                console.error('Active Mode: Missing authentication data', { hasToken: !!token, hasUserId: !!MMUserId });
            }
        } catch (error) {
            console.error('Active Mode error:', error);
        }
    };
    
    // Set up the interval timer
    activeModeTimer = setInterval(updateStatus, intervalMs);
    
    // Trigger the first update immediately
    updateStatus();
    
    console.log(`Active Mode started with ${interval} minute intervals (${intervalMs}ms)`);
}

function stopActiveMode() {
    if (activeModeTimer) {
        clearInterval(activeModeTimer);
        activeModeTimer = null;
        console.log('Active Mode stopped');
    }
}

// Initialize Active Mode on startup and install/reload
async function initializeActiveMode() {
    try {
        const result = await chrome.storage.sync.get(['activeModeEnabled', 'activeModeInterval']);
        if (result.activeModeEnabled) {
            startActiveMode(result.activeModeInterval || 5);
        }
    } catch (error) {
        console.error('Error initializing Active Mode:', error);
    }
}

chrome.runtime.onStartup.addListener(initializeActiveMode);
chrome.runtime.onInstalled.addListener(initializeActiveMode);
