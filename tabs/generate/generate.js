// Generate Tab - Branch and Commit Generation
import { Utils } from '../../shared/utils.js';

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
    }

    initializeElements() {
        this.elements = {
            taskId: document.getElementById('taskId'),
            taskTitle: document.getElementById('taskTitle'),
            taskDescription: document.getElementById('taskDescription'),
            taskPriority: document.getElementById('taskPriority'),
            generateBtn: document.getElementById('generateBtn'),
            autoFillBtn: document.getElementById('autoFillBtn'),
            clearFieldsBtn: document.getElementById('clearFieldsBtn'),
            saveTaskBtn: document.getElementById('saveTaskBtn'),
            results: document.getElementById('results'),
            branchResult: document.getElementById('branchResult'),
            commitResult: document.getElementById('commitResult'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            rateLimitWarning: document.getElementById('rateLimitWarning'),
            priorityIndicator: document.getElementById('priorityIndicator'),
            priorityIndicatorText: document.getElementById('priorityIndicatorText')
        };
    }

    setupEventListeners() {
        this.elements.generateBtn.addEventListener('click', () => this.generateBranchAndCommit());
        this.elements.autoFillBtn.addEventListener('click', () => this.autoFillFromPage());
        this.elements.clearFieldsBtn.addEventListener('click', () => this.clearFields());
        this.elements.saveTaskBtn.addEventListener('click', () => this.copyTaskLink());

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
            throw new Error(`API request failed: ${response.status}`);
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
                commitPrefix: 'fix:',
                instructions: '- This is an URGENT task, use hotfix/ branch prefix and fix: commit prefix for immediate attention'
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
        indicator.className = 'p-2.5 rounded-md mb-4 text-xs border-l-4';
        
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
        let updateMessage = '';

        // Check if GitLab link already exists and is the same
        if (historyItem.gitlabUrl === gitlabData.url) {
            console.log('GitLab link already stored for this item');
            return; // Do nothing if the same GitLab link is already stored
        }

        // Update GitLab URL if not present or different
        if (!historyItem.gitlabUrl) {
            historyItem.gitlabUrl = gitlabData.url;
            updateMessage = '🔗 GitLab link stored for task ' + gitlabData.taskId;
            updated = true;
        } else if (historyItem.gitlabUrl !== gitlabData.url) {
            historyItem.gitlabUrl = gitlabData.url;
            updateMessage = '🔗 GitLab link updated for task ' + gitlabData.taskId;
            updated = true;
        }

        // Check if branch name is different and update it
        if (gitlabData.branchName && historyItem.branchName !== gitlabData.branchName) {
            historyItem.branchName = gitlabData.branchName;
            if (updateMessage) {
                updateMessage += ' and branch name updated';
            } else {
                updateMessage = '🌿 Branch name updated from GitLab for task ' + gitlabData.taskId;
            }
            updated = true;
        }

        if (updated) {
            // Mark as updated
            historyItem.lastUpdated = Date.now();
            historyItem.updatedFromGitLab = true;
            
            // Save updated history
            await Utils.setStorageData({ history });
            Utils.showNotification(updateMessage, 'success');
            console.log('Updated history item from GitLab:', historyItem);
        }
    }

    async checkRateLimit() {
        // Rate limit checking logic
        return true; // Simplified for now
    }

    showRateLimitWarning() {
        this.elements.rateLimitWarning.classList.remove('hidden');
        setTimeout(() => {
            this.elements.rateLimitWarning.classList.add('hidden');
        }, 5000);
    }

    showLoading(show) {
        if (show) {
            this.elements.loading.classList.remove('hidden');
            this.elements.generateBtn.disabled = true;
        } else {
            this.elements.loading.classList.add('hidden');
            this.elements.generateBtn.disabled = false;
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
}
