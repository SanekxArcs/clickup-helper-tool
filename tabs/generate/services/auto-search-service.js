// Auto-Search Service
// Handles automatic searching from ClickUp and GitLab pages

import { Utils } from '../../../shared/utils.js';

export class AutoSearchService {
    constructor() {
        // Remove dependency on generateTab for better modularity
    }

    async searchFromCurrentPage(tab) {
        try {
            // Check if this is a GitLab merge request page
            if (tab.url.includes('/-/merge_requests/')) {
                return await this.handleGitLabPage(tab);
            } else if (tab.url.startsWith('https://app.clickup.com/t/')) {
                return await this.handleClickUpPage(tab);
            }
            
            // For all other pages, return no results
            return { foundInHistory: false, taskData: null };
            
        } catch (error) {
            console.error('Auto-search error:', error);
            return { foundInHistory: false, taskData: null, error: error.message };
        }
    }

    async handleGitLabPage(tab) {
        console.log('Detected GitLab merge request page, searching for task data...');

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Inline GitLab extractor function
                const data = { url: window.location.href };
                
                if (!data.url.includes('/-/merge_requests/')) {
                    return null;
                }

                const detailPageDescription = document.querySelector('.detail-page-description');
                if (detailPageDescription) {
                    const branchLinks = detailPageDescription.querySelectorAll('a[title*="#WDEV"], a[title*="WDEV"]');
                    
                    for (const link of branchLinks) {
                        const branchName = link.getAttribute('title') || link.textContent.trim();
                        const taskIdMatch = branchName.match(/(WDEV-\d+)/i);
                        if (taskIdMatch) {
                            data.taskId = taskIdMatch[1].toUpperCase();
                            data.branchName = branchName;
                            break;
                        }
                    }
                    
                    if (!data.taskId) {
                        const descriptionText = detailPageDescription.textContent;
                        const taskIdMatch = descriptionText.match(/(WDEV-\d+)/i);
                        if (taskIdMatch) {
                            data.taskId = taskIdMatch[1].toUpperCase();
                        }
                    }
                }

                const titleElement = document.querySelector('.merge-request-title-text, .issuable-header-text h1');
                if (titleElement) {
                    data.title = titleElement.textContent.trim();
                }

                return data.taskId ? data : null;
            }
        });
        
        if (result && result[0] && result[0].result) {
            const gitlabData = result[0].result;
            
            if (gitlabData.taskId) {
                // Search history first for this task ID
                const historyMatch = await this.searchHistoryForTask(gitlabData.taskId);
                
                if (historyMatch) {
                    // Found in history - return result indicating switch to history
                    return {
                        foundInHistory: true,
                        taskId: gitlabData.taskId,
                        historyItem: historyMatch,
                        needsHistoryUpdate: true,
                        gitlabData: gitlabData
                    };
                } else {
                    // Not found in history - return GitLab data for form filling
                    const taskData = {
                        id: gitlabData.taskId,
                        title: gitlabData.title ? gitlabData.title.replace(/^(feat|fix|chore|docs|style|refactor|test):\s*/i, '') : '',
                        description: ''
                    };
                    
                    return {
                        foundInHistory: false,
                        taskData: taskData,
                        message: `Auto-filled from GitLab for task ${gitlabData.taskId}`
                    };
                }
            }
        }
        
        return { foundInHistory: false, taskData: null };
    }

    async handleClickUpPage(tab) {
        console.log('Detected ClickUp task page, searching history first...');
        
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                // Inline ClickUp extractor function
                const data = { url: window.location.href };
                
                const taskIdElement = document.querySelector('[data-test="task-view-task-label__taskid-button"]');
                if (taskIdElement) {
                    data.id = taskIdElement.textContent.trim();
                }
                
                const titleElement = document.querySelector('[data-test="task-title__title-overlay"]');
                if (titleElement) {
                    data.title = titleElement.textContent.trim();
                }
                
                const descriptionElement = document.querySelector('.ql-editor');
                if (descriptionElement) {
                    data.description = descriptionElement.innerText.trim();
                }

                // Check for priority levels
                const priorityElement = document.querySelector('.cu-priorities-view__item-label');
                if (priorityElement) {
                    const priorityText = priorityElement.textContent.trim();
                    if (priorityText.includes('Urgent')) {
                        data.priority = 'Urgent';
                    } else if (priorityText.includes('High')) {
                        data.priority = 'High';
                    } else if (priorityText.includes('Low')) {
                        data.priority = 'Low';
                    } else if (priorityText.includes('Normal')) {
                        data.priority = 'Normal';
                    }
                }

                // Alternative priority detection
                if (!data.priority) {
                    const urgentKeywords = ['urgent', 'critical', 'emergency', 'hotfix', 'production', 'down', 'broken'];
                    const highKeywords = ['important', 'asap', 'priority', 'blocker'];
                    const text = (data.title + ' ' + data.description).toLowerCase();
                    
                    if (urgentKeywords.some(keyword => text.includes(keyword))) {
                        data.priority = 'Urgent';
                    } else if (highKeywords.some(keyword => text.includes(keyword))) {
                        data.priority = 'High';
                    } else {
                        data.priority = 'Normal';
                    }
                }

                return (data.id || data.title || data.description) ? data : null;
            }
        });

        if (result && result[0] && result[0].result) {
            const pageData = result[0].result;
            
            if (pageData.id) {
                // Search history for this task ID
                const historyMatch = await this.searchHistoryForTask(pageData.id);
                
                if (historyMatch) {
                    // Found in history - return result indicating switch to history
                    return {
                        foundInHistory: true,
                        taskId: pageData.id,
                        historyItem: historyMatch
                    };
                } else {
                    // Not found in history - return page data for form filling
                    return {
                        foundInHistory: false,
                        taskData: pageData,
                        message: 'Auto-filled from ClickUp page!'
                    };
                }
            } else if (pageData.title || pageData.description) {
                // No task ID but has other data - return for form filling
                return {
                    foundInHistory: false,
                    taskData: pageData,
                    message: 'Auto-filled from ClickUp page!'
                };
            }
        }
        
        return { foundInHistory: false, taskData: null };
    }

    async searchHistoryForTask(taskId) {
        const data = await Utils.getStorageData(['history']);
        const history = data.history || [];
        
        return history.find(item => 
            item.taskId && item.taskId.toUpperCase() === taskId.toUpperCase()
        );
    }

    async processGitLabTaskData(gitlabData) {
        // Get existing history
        const data = await Utils.getStorageData(['history']);
        const history = data.history || [];
        
        // Find matching history item by task ID
        const matchingItemIndex = history.findIndex(item => 
            item.taskId && item.taskId.toUpperCase() === gitlabData.taskId.toUpperCase()
        );

        if (matchingItemIndex === -1) {
            // No matching history item found
            console.log('No matching history item found for task ID:', gitlabData.taskId);
            return;
        }

        const historyItem = history[matchingItemIndex];
        let updated = false;
        let updateMessages = [];

        // Update GitLab Merge Request URL if not present or different
        if (!historyItem.gitlabMergeRequestUrl) {
            historyItem.gitlabMergeRequestUrl = gitlabData.url;
            updateMessages.push('🔗 GitLab merge request URL added');
            updated = true;
        } else if (historyItem.gitlabMergeRequestUrl !== gitlabData.url) {
            historyItem.gitlabMergeRequestUrl = gitlabData.url;
            updateMessages.push('🔗 GitLab merge request URL updated');
            updated = true;
        }

        // Compare and update branch name if different
        if (gitlabData.branchName) {
            if (!historyItem.branchName) {
                // No branch name in history, add it from GitLab
                historyItem.branchName = gitlabData.branchName;
                updateMessages.push('🌿 Branch name added from GitLab');
                updated = true;
                console.log(`Added branch name from GitLab: "${gitlabData.branchName}"`);
            } else if (historyItem.branchName !== gitlabData.branchName) {
                // Branch names are different, update with the one from GitLab page
                console.log(`Branch name difference detected:`);
                console.log(`  - History has: "${historyItem.branchName}"`);
                console.log(`  - GitLab page has: "${gitlabData.branchName}"`);
                console.log(`  - Updating to GitLab version`);
                historyItem.branchName = gitlabData.branchName;
                updateMessages.push('🌿 Branch name updated from GitLab page');
                updated = true;
            } else {
                console.log(`Branch names match: "${historyItem.branchName}"`);
            }
        }

        if (updated) {
            // Mark as updated
            historyItem.lastUpdated = Date.now();
            historyItem.updatedFromGitLab = true;
            
            // Save updated history
            await Utils.setStorageData({ history });
            
            const updateMessage = updateMessages.join(' and ');
            Utils.showNotification(`${updateMessage} for task ${gitlabData.taskId}`, 'success');
            console.log('Updated history item from GitLab:', historyItem);
        } else {
            console.log('No updates needed for GitLab data - everything matches');
        }
    }

    async updateHistoryFromGitLab(gitlabData) {
        return await this.processGitLabTaskData(gitlabData);
    }

    switchToHistoryAndHighlight(taskId) {
        // Get the tab manager from the global application object
        const tabManager = window.application?.tabManager;
        const historyTab = window.application?.tabs?.history;
        
        if (tabManager && historyTab) {
            // Switch to the History tab
            tabManager.switchTab('history');
            
            // Wait a bit for the tab to switch, then search and highlight
            setTimeout(() => {
                historyTab.searchAndHighlightTask(taskId);
            }, 100);
        }
    }
}
