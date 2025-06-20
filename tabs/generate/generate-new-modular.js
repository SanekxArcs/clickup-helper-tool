// Generate Tab - Branch and Commit Generation (Modularized)
import { Utils } from '../../shared/utils.js';
import { GeminiService } from './services/gemini-service.js';
import { AutoSearchService } from './services/auto-search-service.js';
import { FormManager } from './ui/form-manager.js';
import { ResultsDisplay } from './ui/results-display.js';
import { extractClickUpTaskData } from './extractors/clickup-extractor.js';
import { extractGitLabMergeRequestData } from './extractors/gitlab-extractor.js';

export class GenerateTab {
    constructor() {
        this.isInitialized = false;
        
        // Initialize services
        this.geminiService = new GeminiService();
        this.autoSearchService = new AutoSearchService();
        this.formManager = new FormManager();
        this.resultsDisplay = new ResultsDisplay();
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
        // Initialize UI components
        this.formManager.initialize();
        this.resultsDisplay.initialize();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load previous session data
        await this.loadLastGeneration();
    }

    setupEventListeners() {
        // Main action buttons
        this.formManager.elements.generateBtn.addEventListener('click', () => this.generateBranchAndCommit());
        this.formManager.elements.autoFillBtn.addEventListener('click', () => this.autoFillFromPage());
        this.formManager.elements.clearFieldsBtn.addEventListener('click', () => this.clearFields());
        this.formManager.elements.saveTaskBtn.addEventListener('click', () => this.copyTaskLink());

        // Form auto-save
        this.formManager.setupAutoSave();
        
        // Priority changes
        this.formManager.onPriorityChange(() => {
            // Priority change handled by FormManager
        });

        // Copy buttons in results
        this.resultsDisplay.onCopyBranch(() => {
            // Copy functionality handled by ResultsDisplay
        });
        
        this.resultsDisplay.onCopyCommit(() => {
            // Copy functionality handled by ResultsDisplay
        });
    }

    async generateBranchAndCommit() {
        try {
            // Get form data
            const taskData = this.formManager.getFormData();
            
            // Validate required fields
            if (!taskData.taskId || !taskData.taskTitle) {
                this.resultsDisplay.showError('Please fill in at least Task ID and Task Title');
                return;
            }

            // Show loading state
            this.resultsDisplay.showLoading(true);
            this.resultsDisplay.hideError();

            // Generate branch and commit with Gemini
            const result = await this.geminiService.generateBranchAndCommit(taskData);
            
            // Display results
            this.resultsDisplay.displayResults(result);
            
            // Save to history
            await this.saveToHistory(taskData, result);
            
        } catch (error) {
            console.error('Generation error:', error);
            this.resultsDisplay.showError(`Generation failed: ${error.message}`);
            
            if (error.message.includes('Rate limit')) {
                this.resultsDisplay.showRateLimitWarning();
            }
        } finally {
            this.resultsDisplay.showLoading(false);
        }
    }

    async autoFillFromPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                Utils.showNotification('No active tab found', 'error');
                return;
            }

            console.log('Attempting to auto-fill from tab:', tab.url);
            
            // Use ClickUp extractor for ClickUp pages
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: extractClickUpTaskData
            });

            console.log('Auto-fill result:', result);

            if (result && result[0] && result[0].result) {
                const data = result[0].result;
                if (data && (data.id || data.title || data.description)) {
                    this.formManager.fillFormWithData(data);
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

    async autoSearchFromCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                return;
            }

            // Use auto-search service to handle page detection and searching
            const searchResult = await this.autoSearchService.searchFromCurrentPage(tab);
            
            if (searchResult.foundInHistory) {
                // Found in history - switch to History tab and highlight
                Utils.showNotification(`Found task ${searchResult.taskId} in history - switching to History tab`, 'success');
                this.switchToHistoryAndHighlight(searchResult.taskId);
                
                // Update history if needed (GitLab data)
                if (searchResult.needsHistoryUpdate) {
                    await this.autoSearchService.updateHistoryFromGitLab(searchResult.gitlabData);
                }
            } else if (searchResult.taskData) {
                // Not in history - auto-fill form
                this.formManager.fillFormWithData(searchResult.taskData);
                Utils.showNotification(searchResult.message || 'Auto-filled from page!', 'success');
            }
            
        } catch (error) {
            console.error('Auto-search error:', error);
            // Fail silently for auto-search
        }
    }

    clearFields() {
        this.formManager.clearFields();
        this.resultsDisplay.hideResults();
    }

    async copyTaskLink() {
        const taskData = this.formManager.getFormData();
        
        if (!taskData.taskId || !taskData.taskTitle) {
            Utils.showNotification('Please fill in Task ID and Title first', 'warning');
            return;
        }

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const markdownLink = `[${taskData.taskId}, ${taskData.taskTitle}](${tab.url})`;
            
            await Utils.copyToClipboard(markdownLink);
            Utils.showNotification('Markdown link copied!', 'success');
        } catch (error) {
            console.error('Copy task link error:', error);
            Utils.showNotification('Failed to copy markdown link', 'error');
        }
    }

    async saveToHistory(taskData, result) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const historyItem = {
            taskId: taskData.taskId,
            taskTitle: taskData.taskTitle,
            taskDescription: taskData.taskDescription,
            taskPriority: taskData.taskPriority,
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

    async loadLastGeneration() {
        const data = await Utils.getStorageData(['lastFormData']);
        if (data.lastFormData) {
            this.formManager.loadFormData(data.lastFormData);
        }
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
