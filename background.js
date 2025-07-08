// Background script for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('Branch & Commit Helper extension installed');
    
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
        handleMattermostMeetingStatus(request.meetingTitle);
    } else if (request.type === 'MATTERMOST_CLEAR_MEETING_STATUS') {
        // Handle clearing meeting status in Mattermost
        handleMattermostClearStatus();
    }
});

// Mattermost API integration functions
async function handleMattermostMeetingStatus(meetingTitle = '') {
    try {
        const stored = await chrome.storage.sync.get(['mattermostSettings', 'MMAuthToken', 'MMAccessToken', 'MMUserId']);
        const settings = stored.mattermostSettings || {};
        
        if (!settings.googleMeetIntegration) {
            console.log('Google Meet integration is disabled');
            return;
        }

        const token = stored.MMAccessToken || stored.MMAuthToken;
        const userId = stored.MMUserId;
        
        if (!token || !userId) {
            console.log('Mattermost authentication not found');
            return;
        }

        const apiBaseUrl = 'https://chat.twntydigital.de/api/v4';
        
        // Update status (online/away/dnd)
        const status = settings.meetingStatus || 'dnd';
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
        const emoji = settings.meetingEmoji || 'calendar';
        let text = settings.meetingText || 'In a meeting';
        
        if (settings.showMeetingTitle && meetingTitle) {
            text += `: ${meetingTitle}`;
        }

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
    } catch (error) {
        console.error('Failed to set Mattermost meeting status:', error);
    }
}

async function handleMattermostClearStatus() {
    try {
        const stored = await chrome.storage.sync.get(['MMAuthToken', 'MMAccessToken', 'MMUserId']);
        const token = stored.MMAccessToken || stored.MMAuthToken;
        const userId = stored.MMUserId;
        
        if (!token || !userId) {
            console.log('Mattermost authentication not found');
            return;
        }

        const apiBaseUrl = 'https://chat.twntydigital.de/api/v4';
        
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
    } catch (error) {
        console.error('Failed to clear Mattermost status:', error);
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
