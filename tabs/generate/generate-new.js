// Generate Tab - Main Controller (Simplified)
// Orchestrates all the services and UI components

import { Utils } from '../../shared/utils.js';
import { GeminiService } from './services/gemini-service.js';
import { AutoSearchService } from './services/auto-search-service.js';
import { FormManager } from './ui/form-manager.js';
import { ResultsDisplay } from './ui/results-display.js';
import { ClickUpExtractor } from './extractors/clickup-extractor.js';

export class GenerateTab {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        
        // Services will be initialized after elements
        this.geminiService = null;
        this.autoSearchService = null;
        this.formManager = null;
        this.resultsDisplay = null;
    }

    async onActivate() {
        if (!this.isInitialized) {
            await this.initialize();
            this.isInitialized = true;
        }
        
        // Auto-search from current page when tab activates
        setTimeout(() => {
            this.autoSearchService.performAutoSearch();
        }, 500);
    }

    onDeactivate() {
        // Cleanup if needed
    }

    async initialize() {
        this.initializeElements();
        this.initializeServices();
        this.setupEventListeners();
        await this.formManager.loadLastGeneration();
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

    initializeServices() {
        this.geminiService = new GeminiService();
        this.autoSearchService = new AutoSearchService(this);
        this.formManager = new FormManager(this.elements);
        this.resultsDisplay = new ResultsDisplay(this.elements);
    }

    setupEventListeners() {
        this.elements.generateBtn.addEventListener('click', () => this.generateBranchAndCommit());
        this.elements.autoFillBtn.addEventListener('click', () => this.autoFillFromPage());
        this.elements.clearFieldsBtn.addEventListener('click', () => this.formManager.clearFields());
        this.elements.saveTaskBtn.addEventListener('click', () => this.resultsDisplay.copyTaskLink());

        // Auto-save functionality
        [this.elements.taskId, this.elements.taskTitle, this.elements.taskDescription, this.elements.taskPriority].forEach(element => {
            element.addEventListener('input', Utils.debounce(() => this.formManager.autoSave(), 1000));
        });

        // Priority change listener
        this.elements.taskPriority.addEventListener('change', () => {
            this.formManager.updatePriorityIndicator();
            this.formManager.autoSave();
        });
    }

    async generateBranchAndCommit() {
        try {
            this.formManager.hideError();
            this.formManager.showLoading(true);

            // Validate form data
            const taskData = this.formManager.validateForm();

            // Generate using Gemini service
            const result = await this.geminiService.generateBranchAndCommit(taskData);
            
            // Display results
            this.resultsDisplay.displayResults(result);
            
            // Save to history
            await this.saveToHistory(taskData, result);
            
        } catch (error) {
            console.error('Generation error:', error);
            
            if (error.message.includes('Rate limit')) {
                this.formManager.showRateLimitWarning();
            } else {
                this.formManager.showError(`Generation failed: ${error.message}`);
            }
        } finally {
            this.formManager.showLoading(false);
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
            
            // Try ClickUp extraction
            if (ClickUpExtractor.isClickUpTaskPage(tab.url)) {
                const data = await ClickUpExtractor.extractFromPage(tab.id);
                
                if (data && (data.id || data.title || data.description)) {
                    this.formManager.fillFormWithData(data);
                    Utils.showNotification('Auto-fill completed!', 'success');
                } else {
                    Utils.showNotification('No task data found on this page', 'warning');
                }
            } else {
                Utils.showNotification('This page is not supported for auto-fill', 'warning');
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

    // Public methods for services to call
    fillFormWithData(data) {
        this.formManager.fillFormWithData(data);
    }

    fillFormWithGitLabData(gitlabData) {
        this.formManager.fillFormWithGitLabData(gitlabData);
    }

    fillFormWithHistoryData(historyItem) {
        this.formManager.fillFormWithHistoryData(historyItem);
    }
}
