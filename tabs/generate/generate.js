// Generate Tab - Branch and Commit Generation
import { Utils } from '../../shared/utils.js';
import { TimeEstimationService } from './services/time-estimation-service.js';

// Function to extract task data from the current page
// This function will be injected into the active tab
function extractTaskDataFromPage() {
    const data = { url: window.location.href };
    
    // ClickUp selectors
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
        // Check for urgent keywords in title/description
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

    // Try alternative selectors if primary ones don't work
    if (!data.id) {
        // Alternative task ID selectors
        const altIdSelectors = [
            '.task-name__id',
            '.breadcrumb__task-id', 
            '[class*="task-id"]',
            '.task-header .task-id'
        ];
        
        for (const selector of altIdSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                data.id = element.textContent.trim();
                break;
            }
        }
    }

    if (!data.title) {
        // Alternative title selectors
        const altTitleSelectors = [
            '.task-name__title',
            '.task-title',
            'h1[class*="title"]',
            '.breadcrumb__task-name'
        ];
        
        for (const selector of altTitleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                data.title = element.textContent.trim();
                break;
            }
        }
    }

    // Check if any data was found
    if (!data.id && !data.title && !data.description) {
        return null;
    }

    return data;
}

// Function to extract GitLab merge request data from the current page
function extractGitLabMergeRequestData() {
    const data = { url: window.location.href };
    
    // Check if this is a GitLab merge request page
    if (!data.url.includes('/-/merge_requests/')) {
        return null;
    }

    // Extract task ID from branch name in the merge request description
    const detailPageDescription = document.querySelector('.detail-page-description');
    if (detailPageDescription) {
        // Look for branch name links that contain task IDs
        const branchLinks = detailPageDescription.querySelectorAll('a[title*="#WDEV"], a[title*="WDEV"]');
        
        for (const link of branchLinks) {
            const branchName = link.getAttribute('title') || link.textContent.trim();
            
            // Extract WDEV task ID from branch name
            const taskIdMatch = branchName.match(/(WDEV-\d+)/i);
            if (taskIdMatch) {
                data.taskId = taskIdMatch[1].toUpperCase();
                data.branchName = branchName;
                break;
            }
        }
        
        // Also try to extract from the description text directly
        if (!data.taskId) {
            const descriptionText = detailPageDescription.textContent;
            const taskIdMatch = descriptionText.match(/(WDEV-\d+)/i);
            if (taskIdMatch) {
                data.taskId = taskIdMatch[1].toUpperCase();
            }
        }
    }

    // Extract merge request title
    const titleElement = document.querySelector('.merge-request-title-text, .issuable-header-text h1');
    if (titleElement) {
        data.title = titleElement.textContent.trim();
    }

    // Extract author info
    const authorElement = document.querySelector('.author-link .author');
    if (authorElement) {
        data.author = authorElement.textContent.trim();
    }

    return data.taskId ? data : null; // Only return data if we found a task ID
}

export class GenerateTab {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        this.timeEstimationService = new TimeEstimationService();
    }

    async onActivate() {
        if (!this.isInitialized) {
            await this.initialize();
            this.isInitialized = true;
        }
        
        // Auto-search from current page when tab activates
        setTimeout(() => {
            this.autoSearchFromCurrentPage();
        }, 500);
    }

    onDeactivate() {
        // Cleanup if needed
    }

    async initialize() {
        this.initializeElements();
        this.setupEventListeners();
        await this.loadSettings();
        this.loadLastGeneration();
    }    initializeElements() {
        this.elements = {
            taskId: document.getElementById('taskId'),
            taskTitle: document.getElementById('taskTitle'),
            taskDescription: document.getElementById('taskDescription'),
            taskPriority: document.getElementById('taskPriority'),
            generateBtn: document.getElementById('generateBtn'),
            timeEstimationBtn: document.getElementById('timeEstimationBtn'),
            autoFillBtn: document.getElementById('autoFillBtn'),
            clearFieldsBtn: document.getElementById('clearFieldsBtn'),
            saveTaskBtn: document.getElementById('saveTaskBtn'),
            results: document.getElementById('results'),
            branchResult: document.getElementById('branchResult'),
            commitResult: document.getElementById('commitResult'),
            timeEstimationResults: document.getElementById('timeEstimationResults'),
            seniorTime: document.getElementById('seniorTime'),
            midTime: document.getElementById('midTime'),
            juniorTime: document.getElementById('juniorTime'),
            timeReasoning: document.getElementById('timeReasoning'),
            copyTimeEstimationBtn: document.getElementById('copyTimeEstimationBtn'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            rateLimitWarning: document.getElementById('rateLimitWarning'),
            priorityIndicator: document.getElementById('priorityIndicator'),
            priorityIndicatorText: document.getElementById('priorityIndicatorText'),
            // New regeneration buttons
            regenerateBranchBtn: document.getElementById('regenerateBranchBtn'),
            regenerateCommitBtn: document.getElementById('regenerateCommitBtn'),
            regenerateBothBtn: document.getElementById('regenerateBothBtn')
        };
    }

    setupEventListeners() {
        this.elements.generateBtn.addEventListener('click', () => this.generateBranchAndCommit());
        this.elements.timeEstimationBtn.addEventListener('click', () => this.generateTimeEstimation());
        this.elements.autoFillBtn.addEventListener('click', () => this.autoFillFromPage());
        this.elements.clearFieldsBtn.addEventListener('click', () => this.clearFields());
        this.elements.saveTaskBtn.addEventListener('click', () => this.copyTaskLink());
        
        if (this.elements.copyTimeEstimationBtn) {
            this.elements.copyTimeEstimationBtn.addEventListener('click', () => this.copyTimeEstimation());
        }

        // Auto-save functionality
        [this.elements.taskId, this.elements.taskTitle, this.elements.taskDescription, this.elements.taskPriority].forEach(element => {
            element.addEventListener('input', Utils.debounce(() => this.autoSave(), 1000));
        });

        // Priority change listener
        this.elements.taskPriority.addEventListener('change', () => {
            this.updatePriorityIndicator();
            this.autoSave();
        });

        // Copy buttons
        const copyBranchBtn = document.getElementById('copyBranchBtn');
        const copyCommitBtn = document.getElementById('copyCommitBtn');
        
        if (copyBranchBtn) {
            copyBranchBtn.addEventListener('click', async (e) => {
                const text = this.elements.branchResult.textContent;
                if (text && text !== 'No branch name generated') {
                    await Utils.copyToClipboard(text);
                    Utils.showNotification('Branch name copied!', 'success');
                } else {
                    Utils.showNotification('No branch name to copy', 'warning');
                }
            });
        }
          if (copyCommitBtn) {
            copyCommitBtn.addEventListener('click', async (e) => {
                const text = this.elements.commitResult.textContent;
                if (text && text !== 'No commit message generated') {
                    await Utils.copyToClipboard(text);
                    Utils.showNotification('Commit message copied!', 'success');
                } else {
                    Utils.showNotification('No commit message to copy', 'warning');
                }
            });
        }

        // Regeneration buttons
        if (this.elements.regenerateBranchBtn) {
            this.elements.regenerateBranchBtn.addEventListener('click', () => this.regenerateBranch());
        }
        
        if (this.elements.regenerateCommitBtn) {
            this.elements.regenerateCommitBtn.addEventListener('click', () => this.regenerateCommit());
        }
        
        if (this.elements.regenerateBothBtn) {
            this.elements.regenerateBothBtn.addEventListener('click', () => this.regenerateBoth());
        }
    }

    getTaskData() {
        return {
            taskId: this.elements.taskId.value.trim(),
            taskTitle: this.elements.taskTitle.value.trim(),
            taskDescription: this.elements.taskDescription.value.trim(),
            taskPriority: this.elements.taskPriority.value
        };
    }

    async generateBranchAndCommit() {
        const taskId = this.elements.taskId.value.trim();
        const taskTitle = this.elements.taskTitle.value.trim();
        const taskDescription = this.elements.taskDescription.value.trim();
        const taskPriority = this.elements.taskPriority.value;

        if (!taskId || !taskTitle) {
            this.showError('Please fill in at least Task ID and Task Title');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const data = await Utils.getStorageData(['apiKey', 'geminiModel', 'temperature', 'branchRules', 'commitRules']);
            
            if (!data.apiKey) {
                this.showError('Please set your Gemini API key in Settings');
                return;
            }

            // Check rate limits
            const rateLimitOk = await this.checkRateLimit();
            if (!rateLimitOk) {
                this.showRateLimitWarning();
                return;
            }

            const result = await this.callGeminiAPI(data, taskId, taskTitle, taskDescription, taskPriority);
            
            // Update rate limit tracking after successful API call
            await this.updateRateLimit();
            
            this.displayResults(result);
            await this.saveToHistory(taskId, taskTitle, taskDescription, taskPriority, result);
            
        } catch (error) {
            console.error('Generation error:', error);
            this.showError(`Generation failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async callGeminiAPI(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const prompt = this.buildPrompt(settings, taskId, taskTitle, taskDescription, taskPriority);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || 'gemini-1.5-flash'}:generateContent?key=${settings.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: settings.temperature || 0.3,
                    maxOutputTokens: 1000,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = `API request failed: ${response.status}`;
            
            if (response.status === 500) {
                errorMessage = 'Internal server error from Gemini API. This might be due to model overload or temporary issues. Please try again in a few moments or switch to a different model.';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please wait before making another request or switch to a different model.';
            } else if (response.status === 400) {
                errorMessage = 'Invalid request. Please check your API key and try again.';
            } else if (response.status === 403) {
                errorMessage = 'Access denied. Please check your API key permissions.';
            } else if (errorData.error?.message) {
                errorMessage = errorData.error.message;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return this.parseGeminiResponse(data);
    }

    buildPrompt(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const priorityConfig = this.getPriorityConfig(taskPriority);
        
        let prompt = `Generate a git branch name and commit message for this task:

Task ID: ${taskId}
Title: ${taskTitle}
Description: ${taskDescription}
Priority: ${taskPriority}

Requirements:
- Branch name should be kebab-case (lowercase with dashes)
- Branch name should be concise but descriptive
- Commit message should follow conventional commits format
- Be precise and technical
${priorityConfig.instructions}

`;

        if (settings.branchRules) {
            prompt += `\nBranch naming rules:\n${settings.branchRules}\n`;
        }

        if (settings.commitRules) {
            prompt += `\nCommit message rules:\n${settings.commitRules}\n`;
        }

        prompt += `
Return ONLY in this exact JSON format:
{
  "branchName": "${priorityConfig.branchPrefix}your-branch-name",
  "commitMessage": "${priorityConfig.commitPrefix} your commit message"
}`;

        return prompt;
    }

    parseGeminiResponse(data) {
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from Gemini API');
        }

        const text = data.candidates[0].content.parts[0].text;
        
        try {
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON found in response');
        } catch (e) {
            throw new Error('Failed to parse Gemini response');
        }
    }

    getPriorityConfig(priority) {
        const configs = {
            'Low': {
                branchPrefix: 'feature/',
                commitPrefix: 'feat:',
                instructions: '- Use standard feature branch prefix and conventional commit format'
            },
            'Normal': {
                branchPrefix: 'feature/',
                commitPrefix: 'feat:',
                instructions: '- Use standard feature branch prefix and conventional commit format'
            },
            'High': {
                branchPrefix: 'feature/',
                commitPrefix: 'feat:',
                instructions: '- This is a HIGH priority task, ensure clear and descriptive naming'
            },
            'Urgent': {
                branchPrefix: 'hotfix/',
                commitPrefix: 'feat:',
                instructions: '- This is an URGENT task, use hotfix/ branch prefix and feat: commit prefix for immediate attention'
            }
        };
        
        return configs[priority] || configs['Normal'];
    }

    updatePriorityIndicator() {
        const priority = this.elements.taskPriority.value;
        const priorityConfig = this.getPriorityConfig(priority);
        
        // Update indicator styling based on priority
        const indicator = this.elements.priorityIndicator;
        const indicatorText = this.elements.priorityIndicatorText;
        
        // Reset classes
        indicator.className = 'p-1 rounded-md mt-2 text-xs border-l-4';

        switch (priority) {
            case 'Low':
                indicator.classList.add('bg-green-100', 'text-green-700', 'border-green-500');
                break;
            case 'Normal':
                indicator.classList.add('bg-blue-100', 'text-blue-700', 'border-blue-500');
                break;
            case 'High':
                indicator.classList.add('bg-yellow-100', 'text-yellow-700', 'border-yellow-500');
                break;
            case 'Urgent':
                indicator.classList.add('bg-red-100', 'text-red-700', 'border-red-500');
                break;
        }
        
        indicatorText.textContent = `${priority} priority - Will use ${priorityConfig.branchPrefix} branch and ${priorityConfig.commitPrefix} commit prefix`;
        indicator.classList.remove('hidden');
    }

    showPriorityIndicator(message) {
        this.elements.priorityIndicatorText.textContent = message;
        this.elements.priorityIndicator.classList.remove('hidden');
        setTimeout(() => {
            this.updatePriorityIndicator();
        }, 3000);
    }

    checkIfUrgent(title, description) {
        const urgentKeywords = ['urgent', 'critical', 'emergency', 'hotfix', 'production', 'down', 'broken'];
        const text = `${title} ${description}`.toLowerCase();
        return urgentKeywords.some(keyword => text.includes(keyword));
    }

    displayResults(result) {
        this.elements.branchResult.textContent = result.branchName || 'No branch name generated';
        this.elements.commitResult.textContent = result.commitMessage || 'No commit message generated';
        this.elements.results.classList.remove('hidden');
    }

    async autoFillFromPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                Utils.showNotification('No active tab found', 'error');
                return;
            }

            console.log('Attempting to auto-fill from tab:', tab.url);
            
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: extractTaskDataFromPage
            });

            console.log('Auto-fill result:', result);

            if (result && result[0] && result[0].result) {
                const data = result[0].result;
                if (data && (data.id || data.title || data.description)) {
                    this.fillFormWithData(data);
                    Utils.showNotification('Auto-fill completed!', 'success');
                } else {
                    Utils.showNotification('No task data found on this page', 'warning');
                }
            } else {
                Utils.showNotification('No task data found on this page', 'warning');
            }
        } catch (error) {
            console.error('Auto-fill error:', error);
            if (error.message.includes('Cannot access')) {
                Utils.showNotification('Cannot access this page. Try refreshing the page or navigate to a ClickUp task.', 'error');
            } else {
                Utils.showNotification('Auto-fill failed: ' + error.message, 'error');
            }
        }
    }

    fillFormWithData(data) {
        if (data.id) this.elements.taskId.value = data.id;
        if (data.title) this.elements.taskTitle.value = data.title;
        if (data.description) this.elements.taskDescription.value = data.description;
        
        if (data.priority) {
            this.elements.taskPriority.value = data.priority;
            this.showPriorityIndicator(`Auto-detected priority: ${data.priority}`);
        }

        this.updatePriorityIndicator();
        this.autoSave();
    }

    clearFields() {
        this.elements.taskId.value = '';
        this.elements.taskTitle.value = '';
        this.elements.taskDescription.value = '';
        this.elements.taskPriority.value = 'Normal';
        this.elements.results.classList.add('hidden');
        this.hideTimeEstimationResults();
        this.elements.priorityIndicator.classList.add('hidden');
        this.hideError();
        this.autoSave();
    }

    async copyTaskLink() {
        const taskId = this.elements.taskId.value.trim();
        const taskTitle = this.elements.taskTitle.value.trim();
        
        if (!taskId || !taskTitle) {
            Utils.showNotification('Please fill in Task ID and Title first', 'warning');
            return;
        }

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const markdownLink = `[${taskId}, ${taskTitle}](${tab.url})`;
            
            await Utils.copyToClipboard(markdownLink);
            Utils.showNotification('Markdown link copied!', 'success');
        } catch (error) {
            console.error('Copy task link error:', error);
            Utils.showNotification('Failed to copy markdown link', 'error');
        }
    }

    async saveToHistory(taskId, taskTitle, taskDescription, taskPriority, result) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const historyItem = {
            taskId,
            taskTitle,
            taskDescription,
            taskPriority,
            branchName: result.branchName,
            commitMessage: result.commitMessage,
            sourceUrl: tab.url,
            timestamp: Date.now()
        };

        const data = await Utils.getStorageData(['history']);
        const history = data.history || [];
        history.unshift(historyItem);
        
        // Keep only last 100 items
        if (history.length > 100) {
            history.splice(100);
        }

        await Utils.setStorageData({ history });
    }

    async autoSave() {
        const formData = {
            taskId: this.elements.taskId.value,
            taskTitle: this.elements.taskTitle.value,
            taskDescription: this.elements.taskDescription.value,
            taskPriority: this.elements.taskPriority.value
        };
        await Utils.setStorageData({ lastFormData: formData });
    }

    async loadSettings() {
        // Settings are loaded when needed during generation
    }

    async loadLastGeneration() {
        const data = await Utils.getStorageData(['lastFormData']);
        if (data.lastFormData) {
            this.elements.taskId.value = data.lastFormData.taskId || '';
            this.elements.taskTitle.value = data.lastFormData.taskTitle || '';
            this.elements.taskDescription.value = data.lastFormData.taskDescription || '';
            this.elements.taskPriority.value = data.lastFormData.taskPriority || 'Normal';
            this.updatePriorityIndicator();
        }
    }    async autoSearchFromCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                return;
            }

            // Check if this is a GitLab merge request page
            if (tab.url.includes('/-/merge_requests/')) {
                console.log('Detected GitLab merge request page, searching for task data...');

                const result = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: extractGitLabMergeRequestData
                });

                if (result && result[0] && result[0].result) {
                    const gitlabData = result[0].result;
                    
                    if (gitlabData.taskId) {
                        // Search history first for this task ID
                        const historyMatch = await this.searchHistoryForTask(gitlabData.taskId);
                          if (historyMatch) {
                            // Found in history - switch to History tab and show the item
                            Utils.showNotification(`Found task ${gitlabData.taskId} in history - switching to History tab`, 'success');
                            
                            // Still update history with GitLab link and branch name if needed
                            await this.processGitLabTaskData(gitlabData);
                            
                            // Switch to History tab and highlight the item
                            this.switchToHistoryAndHighlight(gitlabData.taskId);
                        } else {
                            // Not found in history - use GitLab data only
                            if (gitlabData.taskId) {
                                this.elements.taskId.value = gitlabData.taskId;
                            }
                            if (gitlabData.title) {
                                const cleanTitle = gitlabData.title.replace(/^(feat|fix|chore|docs|style|refactor|test):\s*/i, '');
                                this.elements.taskTitle.value = cleanTitle;
                            }
                            this.updatePriorityIndicator();
                            this.autoSave();
                            Utils.showNotification(`Auto-filled from GitLab for task ${gitlabData.taskId}`, 'success');
                        }
                    }
                }
            } else if (tab.url.startsWith('https://app.clickup.com/t/')) {
                // ClickUp task page - try history first, then auto-fill from page
                console.log('Detected ClickUp task page, searching history first...');
                
                // First extract task ID from the page to search history
                const result = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: extractTaskDataFromPage
                });

                if (result && result[0] && result[0].result) {
                    const pageData = result[0].result;
                    
                    if (pageData.id) {
                        // Search history for this task ID
                        const historyMatch = await this.searchHistoryForTask(pageData.id);
                          if (historyMatch) {
                            // Found in history - switch to History tab and show the item
                            Utils.showNotification(`Found task ${pageData.id} in history - switching to History tab`, 'success');
                            this.switchToHistoryAndHighlight(pageData.id);
                        } else {
                            // Not found in history - auto-fill from page
                            this.fillFormWithData(pageData);
                            Utils.showNotification('Auto-filled from ClickUp page!', 'success');
                        }
                    } else if (pageData.title || pageData.description) {
                        // No task ID but has other data - just fill from page
                        this.fillFormWithData(pageData);
                        Utils.showNotification('Auto-filled from ClickUp page!', 'success');
                    }
                }
            }
            // For all other pages, do nothing (no auto-search)
            
        } catch (error) {
            console.error('Auto-search error:', error);
            // Fail silently for auto-search
        }
    }

    async searchHistoryForTask(taskId) {
        const data = await Utils.getStorageData(['history']);
        const history = data.history || [];
        
        return history.find(item => 
            item.taskId && item.taskId.toUpperCase() === taskId.toUpperCase()
        );
    }

    fillFormWithHistoryData(historyItem) {
        if (historyItem.taskId) this.elements.taskId.value = historyItem.taskId;
        if (historyItem.taskTitle) this.elements.taskTitle.value = historyItem.taskTitle;
        if (historyItem.taskDescription) this.elements.taskDescription.value = historyItem.taskDescription;
        if (historyItem.taskPriority) {
            this.elements.taskPriority.value = historyItem.taskPriority;
            this.showPriorityIndicator(`Auto-detected priority from history: ${historyItem.taskPriority}`);
        }

        this.updatePriorityIndicator();
        this.autoSave();
    }

    async autoFillFromGitLab(gitlabData) {
        // Check if we have a matching history item to get more details
        const data = await Utils.getStorageData(['history']);
        const history = data.history || [];
        
        const matchingItem = history.find(item => 
            item.taskId && item.taskId.toUpperCase() === gitlabData.taskId.toUpperCase()
        );

        // Fill form with available data
        if (gitlabData.taskId) {
            this.elements.taskId.value = gitlabData.taskId;
        }

        // If we have a matching history item, use its data for better auto-fill
        if (matchingItem) {
            if (matchingItem.taskTitle) {
                this.elements.taskTitle.value = matchingItem.taskTitle;
            }
            if (matchingItem.taskDescription) {
                this.elements.taskDescription.value = matchingItem.taskDescription;
            }
            if (matchingItem.taskPriority) {
                this.elements.taskPriority.value = matchingItem.taskPriority;
                this.showPriorityIndicator(`Auto-detected priority from history: ${matchingItem.taskPriority}`);
            }
        } else {
            // If no history match, use GitLab data
            if (gitlabData.title) {
                // Extract a cleaner task title from the GitLab MR title
                const cleanTitle = gitlabData.title.replace(/^(feat|fix|chore|docs|style|refactor|test):\s*/i, '');
                this.elements.taskTitle.value = cleanTitle;
            }
        }

        this.updatePriorityIndicator();
        this.autoSave();

        // Show notification about auto-fill
        const source = matchingItem ? 'history and GitLab' : 'GitLab';
        Utils.showNotification(`Auto-filled from ${source} for task ${gitlabData.taskId}`, 'success');
    }    async processGitLabTaskData(gitlabData) {
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
        }        // Compare and update branch name if different
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

    async checkRateLimit() {
        const now = Date.now();
        const currentDate = new Date().toDateString(); // Get today's date string (e.g., "Sun Aug 04 2025")
        const settings = await Utils.getStorageData(['geminiModel']);
        const modelName = settings.geminiModel || 'gemini-2.5-flash';
        const storageKey = `rateLimits_${modelName}`;
        
        const rateLimitData = await Utils.getStorageData([storageKey]);
        const modelLimits = rateLimitData[storageKey] || {
            minuteRequests: [],
            dayRequests: [],
            currentDate: currentDate,
            lastReset: now
        };
        
        // Get rate limits for current model
        const currentLimits = this.getModelRateLimits(modelName);
        
        // Clean old minute requests (older than 1 minute)
        const oneMinuteAgo = now - 60 * 1000;
        modelLimits.minuteRequests = modelLimits.minuteRequests.filter(time => time > oneMinuteAgo);
        
        // Clean day requests if date has changed (new day = reset daily limits)
        if (modelLimits.currentDate !== currentDate) {
            console.log(`Date changed from ${modelLimits.currentDate} to ${currentDate} - resetting daily rate limits for ${modelName}`);
            modelLimits.dayRequests = []; // Clear all daily requests
            modelLimits.currentDate = currentDate; // Update to current date
        }
        
        // Check if we're within limits
        const minuteCount = modelLimits.minuteRequests.length;
        const dayCount = modelLimits.dayRequests.length;
        
        if (minuteCount >= currentLimits.requests_per_minute) {
            this.showRateLimitWarning(`Rate limit exceeded for ${modelName}: ${minuteCount}/${currentLimits.requests_per_minute} requests per minute. Please wait or switch to a different model.`);
            return false;
        }
        
        if (dayCount >= currentLimits.requests_per_day) {
            this.showRateLimitWarning(`Daily rate limit exceeded for ${modelName}: ${dayCount}/${currentLimits.requests_per_day} requests per day. Please wait until tomorrow or switch to a different model.`);
            return false;
        }
        
        return true;
    }

    getModelRateLimits(modelName) {
        const modelRateLimits = {
            'gemini-2.5-pro': {
                requests_per_minute: 5,
                requests_per_day: 100,
                tokens_per_minute: 250000
            },
            'gemini-2.5-flash': {
                requests_per_minute: 10,
                requests_per_day: 250,
                tokens_per_minute: 250000
            },
            'gemini-2.5-flash-lite': {
                requests_per_minute: 15,
                requests_per_day: 1000,
                tokens_per_minute: 250000
            },
            'gemini-2.0-flash-exp': {
                requests_per_minute: 15,
                requests_per_day: 200,
                tokens_per_minute: 1000000
            },
            'gemini-2.0-flash-lite': {
                requests_per_minute: 30,
                requests_per_day: 200,
                tokens_per_minute: 1000000
            },
            'gemini-1.5-flash': {
                requests_per_minute: 15,
                requests_per_day: 1500,
                tokens_per_minute: 1000000
            },
            'gemini-1.5-pro': {
                requests_per_minute: 2,
                requests_per_day: 50,
                tokens_per_minute: 32000
            }
        };
        return modelRateLimits[modelName] || modelRateLimits['gemini-2.5-flash'];
    }

    async updateRateLimit() {
        const now = Date.now();
        const currentDate = new Date().toDateString(); // Get today's date string
        const settings = await Utils.getStorageData(['geminiModel']);
        const modelName = settings.geminiModel || 'gemini-2.5-flash';
        const storageKey = `rateLimits_${modelName}`;
        
        const rateLimitData = await Utils.getStorageData([storageKey]);
        const modelLimits = rateLimitData[storageKey] || {
            minuteRequests: [],
            dayRequests: [],
            currentDate: currentDate,
            lastReset: now
        };
        
        // Update current date if needed
        if (modelLimits.currentDate !== currentDate) {
            modelLimits.dayRequests = []; // Reset daily requests for new day
            modelLimits.currentDate = currentDate;
        }
        
        // Add current request timestamp
        modelLimits.minuteRequests.push(now);
        modelLimits.dayRequests.push(now); // Store timestamp, but date comparison handles daily reset
        modelLimits.lastReset = now;
        
        // Save updated limits
        await Utils.setStorageData({
            [storageKey]: modelLimits
        });
    }

    showRateLimitWarning(customMessage) {
        if (customMessage && this.elements.rateLimitWarning) {
            this.elements.rateLimitWarning.innerHTML = `⚠️ ${customMessage}`;
        }
        this.elements.rateLimitWarning.classList.remove('hidden');
        setTimeout(() => {
            this.elements.rateLimitWarning.classList.add('hidden');
        }, 8000); // Show longer for more detailed messages
    }    showLoading(show) {
        if (show) {
            this.elements.loading.classList.remove('hidden');
            this.elements.generateBtn.disabled = true;
            if (this.elements.timeEstimationBtn) this.elements.timeEstimationBtn.disabled = true;
            // Disable regeneration buttons during loading
            if (this.elements.regenerateBranchBtn) this.elements.regenerateBranchBtn.disabled = true;
            if (this.elements.regenerateCommitBtn) this.elements.regenerateCommitBtn.disabled = true;
            if (this.elements.regenerateBothBtn) this.elements.regenerateBothBtn.disabled = true;
        } else {
            this.elements.loading.classList.add('hidden');
            this.elements.generateBtn.disabled = false;
            if (this.elements.timeEstimationBtn) this.elements.timeEstimationBtn.disabled = false;
            // Re-enable regeneration buttons after loading
            if (this.elements.regenerateBranchBtn) this.elements.regenerateBranchBtn.disabled = false;
            if (this.elements.regenerateCommitBtn) this.elements.regenerateCommitBtn.disabled = false;
            if (this.elements.regenerateBothBtn) this.elements.regenerateBothBtn.disabled = false;
        }
    }

    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    hideError() {
        this.elements.error.classList.add('hidden');
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

    // New regeneration methods
    async regenerateBranch() {
        const taskId = this.elements.taskId.value.trim();
        const taskTitle = this.elements.taskTitle.value.trim();
        const taskDescription = this.elements.taskDescription.value.trim();
        const taskPriority = this.elements.taskPriority.value;

        if (!taskId || !taskTitle) {
            this.showError('Please fill in at least Task ID and Task Title');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const data = await Utils.getStorageData(['apiKey', 'geminiModel', 'temperature', 'branchRules']);
            
            if (!data.apiKey) {
                this.showError('Please set your Gemini API key in Settings');
                return;
            }

            // Check rate limits
            const rateLimitOk = await this.checkRateLimit();
            if (!rateLimitOk) {
                this.showRateLimitWarning();
                return;
            }

            const result = await this.callGeminiAPIForBranch(data, taskId, taskTitle, taskDescription, taskPriority);
            
            // Update rate limit tracking after successful API call
            await this.updateRateLimit();
            
            // Update only the branch result
            this.elements.branchResult.textContent = result.branchName || 'No branch name generated';
            
            // Update history if there's already a result
            const currentCommit = this.elements.commitResult.textContent;
            if (currentCommit && currentCommit !== 'No commit message generated') {
                const fullResult = {
                    branchName: result.branchName,
                    commitMessage: currentCommit
                };
                await this.saveToHistory(taskId, taskTitle, taskDescription, taskPriority, fullResult);
            }
            
            Utils.showNotification('Branch name regenerated!', 'success');
        } catch (error) {
            console.error('Branch regeneration error:', error);
            this.showError(`Branch regeneration failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async regenerateCommit() {
        const taskId = this.elements.taskId.value.trim();
        const taskTitle = this.elements.taskTitle.value.trim();
        const taskDescription = this.elements.taskDescription.value.trim();
        const taskPriority = this.elements.taskPriority.value;

        if (!taskId || !taskTitle) {
            this.showError('Please fill in at least Task ID and Task Title');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const data = await Utils.getStorageData(['apiKey', 'geminiModel', 'temperature', 'commitRules']);
            
            if (!data.apiKey) {
                this.showError('Please set your Gemini API key in Settings');
                return;
            }

            // Check rate limits
            const rateLimitOk = await this.checkRateLimit();
            if (!rateLimitOk) {
                this.showRateLimitWarning();
                return;
            }

            const result = await this.callGeminiAPIForCommit(data, taskId, taskTitle, taskDescription, taskPriority);
            
            // Update rate limit tracking after successful API call
            await this.updateRateLimit();
            
            // Update only the commit result
            this.elements.commitResult.textContent = result.commitMessage || 'No commit message generated';
            
            // Update history if there's already a result
            const currentBranch = this.elements.branchResult.textContent;
            if (currentBranch && currentBranch !== 'No branch name generated') {
                const fullResult = {
                    branchName: currentBranch,
                    commitMessage: result.commitMessage
                };
                await this.saveToHistory(taskId, taskTitle, taskDescription, taskPriority, fullResult);
            }
            
            Utils.showNotification('Commit message regenerated!', 'success');
        } catch (error) {
            console.error('Commit regeneration error:', error);
            this.showError(`Commit regeneration failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async regenerateBoth() {
        // Simply call the existing generateBranchAndCommit method
        await this.generateBranchAndCommit();
        Utils.showNotification('Both branch and commit regenerated!', 'success');
    }

    // Helper methods for individual API calls
    async callGeminiAPIForBranch(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const prompt = this.buildBranchPrompt(settings, taskId, taskTitle, taskDescription, taskPriority);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || 'gemini-1.5-flash'}:generateContent?key=${settings.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: settings.temperature || 0.3,
                    maxOutputTokens: 500,
                    topP: 0.8,
                    topK: 40,
                    stopSequences: []
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response format');
        }

        const text = data.candidates[0].content.parts[0].text;
        const branchName = this.extractBranchFromText(text);
        
        return { branchName };
    }

    async callGeminiAPIForCommit(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const prompt = this.buildCommitPrompt(settings, taskId, taskTitle, taskDescription, taskPriority);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || 'gemini-1.5-flash'}:generateContent?key=${settings.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: settings.temperature || 0.3,
                    maxOutputTokens: 500,
                    topP: 0.8,
                    topK: 40,
                    stopSequences: []
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response format');
        }

        const text = data.candidates[0].content.parts[0].text;
        const commitMessage = this.extractCommitFromText(text);
        
        return { commitMessage };
    }

    buildBranchPrompt(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const branchRules = settings.branchRules || `Naming:

feature/\<name>_<#taskid> - uses for develop of new functionality. It should be created from the develop branch. Examples: feature/about_us_page_#123, feature/add_rest_api_#234.
release/\versionId> - supports the preparation of a new production release, it should be created from the develop branch. Examples: release/v1.2.1, release/v3.0.0.
hotfix/\<name>_<#taskid?> - uses for quick/urgent fixes. urgent, If a bug is detected in the production environment, it should be created from the main (old name master) branch. Examples: hotfix/burger_menu_fix#432, hotfix/animation_fix#754.
for spaces use only: _

\<name> - should be in lowercase, unique, and shortly describe the functionality. Don't use a commit message in the name of a branch, because commit means what was done but the branch describes a functionality, entity, module, page, component, or feature. In common situations, the name of a task is the name of a branch.

\<#taskid> - relative task ID in the issue tracker, but it is not an optional parameter if there is no relative task

\<versionId> - next release which reflects changes in the production release

Note: allowed symbols are underscore (_) , where underscore is equal to space key.

ID at the end can be only #{LetterCode}-{NumberCode} -expample: #WDEV-12345
        `.trim();

        const priorityPrefix = taskPriority === 'Urgent' ? 'hotfix/' : 'feature/';

        return `Generate a git branch name for this task:

Task ID: ${taskId}
Task Title: ${taskTitle}
Task Description: ${taskDescription}
Priority: ${taskPriority}

Branch Naming Rules:
${branchRules}

Suggested prefix based on priority: ${priorityPrefix}

Please generate ONLY the branch name, nothing else. Format: prefix/task-id-brief-description`;
    }

    buildCommitPrompt(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const commitRules = settings.commitRules || `Rules for Git Commit Message Generation1. Required Inputs
To generate a commit message, provide the following data:

type: (String, Required) The category of the change.
subject: (String, Required) A short description of the work.
task_id: (String, Required) The ID from the issue tracker (e.g., "WDEV-7777").
scope: (String, Optional) The part of the codebase affected.
body: (String, Optional) A more detailed explanation.
is_monorepo: (Boolean, Optional) true if the repo contains both front-end and back-end code.
2. Core Constraints
Header Length: The first line (header) must not exceed 72 characters.
Tense: All descriptions (subject, body) must use the imperative, present tense (e.g., "add", "fix", "change").
3. Generation Logic
Step 1: Assemble the Header
The header format is: <type>: <subject> <task_id>
<type>: Required. Must be one of the following enum values: build, ci, docs, feat, fix, perf, refactor, style, test. (usualy its feat of fix)
<subject>: Required. Formatting Rules: Do not capitalize the first letter. Do not end with a period (.).
<task_id>:Required. Format as a space followed by a hash and the ID. Example:  #WDEV-7777.
WE DONT PROVIDE BODY!

`.trim();

        const commitPrefix = taskPriority === 'Urgent' ? 'fix:' : 'feat:';

        return `Generate a git commit message for this task:

Task ID: ${taskId}
Task Title: ${taskTitle}
Task Description: ${taskDescription}
Priority: ${taskPriority}

Commit Message Rules:
${commitRules}

Suggested prefix based on priority: ${commitPrefix}

Please generate ONLY the commit message, nothing else. Format: type: [TASK-ID] description`;
    }

    extractBranchFromText(text) {
        // Extract branch name from the API response
        const lines = text.split('\n').filter(line => line.trim());
        for (const line of lines) {
            if (line.includes('/') && !line.includes(' ')) {
                return line.trim();
            }
        }
        return lines[0]?.trim() || text.trim();
    }

    extractCommitFromText(text) {
        // Extract commit message from the API response
        const lines = text.split('\n').filter(line => line.trim());
        return lines[0]?.trim() || text.trim();
    }

    async generateTimeEstimation() {
        try {
            this.showLoading(true);
            this.hideError();
            this.hideTimeEstimationResults();

            const taskData = this.getTaskData();
            
            if (!taskData.taskTitle.trim()) {
                throw new Error('Please fill in the task title before generating time estimation');
            }

            const estimation = await this.timeEstimationService.estimateTime({
                taskId: taskData.taskId,
                taskTitle: taskData.taskTitle,
                taskDescription: taskData.taskDescription
            });

            this.displayTimeEstimationResults(estimation);

        } catch (error) {
            console.error('Time estimation error:', error);
            this.showError(`Time estimation failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    displayTimeEstimationResults(estimation) {
        this.elements.seniorTime.textContent = estimation.senior;
        this.elements.midTime.textContent = estimation.mid;
        this.elements.juniorTime.textContent = estimation.junior;
        this.elements.timeReasoning.textContent = estimation.reasoning;
        
        this.showTimeEstimationResults();
    }

    showTimeEstimationResults() {
        this.elements.timeEstimationResults.classList.remove('hidden');
    }

    hideTimeEstimationResults() {
        this.elements.timeEstimationResults.classList.add('hidden');
    }

    copyTimeEstimation() {
        try {
            const senior = this.elements.seniorTime.textContent;
            const mid = this.elements.midTime.textContent;
            const junior = this.elements.juniorTime.textContent;
            const reasoning = this.elements.timeReasoning.textContent;

            const formattedEstimation = `Time Estimation:
🎯 Senior Developer: ${senior}
👩‍💻 Mid-level Developer: ${mid}
👨‍🎓 Junior Developer: ${junior}

💭 Reasoning: ${reasoning}`;

            navigator.clipboard.writeText(formattedEstimation).then(() => {
                Utils.showNotification('Time estimation copied to clipboard!', 'success');
                
                // Visual feedback
                const originalText = this.elements.copyTimeEstimationBtn.textContent;
                this.elements.copyTimeEstimationBtn.textContent = '✓ Copied!';
                this.elements.copyTimeEstimationBtn.classList.add('bg-green-100', 'ring-green-400');
                this.elements.copyTimeEstimationBtn.classList.remove('bg-emerald-50', 'ring-emerald-400');
                
                setTimeout(() => {
                    this.elements.copyTimeEstimationBtn.textContent = originalText;
                    this.elements.copyTimeEstimationBtn.classList.remove('bg-green-100', 'ring-green-400');
                    this.elements.copyTimeEstimationBtn.classList.add('bg-emerald-50', 'ring-emerald-400');
                }, 2000);
            });
        } catch (error) {
            console.error('Failed to copy time estimation:', error);
            Utils.showNotification('Failed to copy to clipboard', 'error');
        }
    }
}
