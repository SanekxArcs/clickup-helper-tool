// Form Manager
// Handles form filling, validation, and data management

import { Utils } from '../../../shared/utils.js';

export class FormManager {
    constructor() {
        this.elements = {};
    }

    initialize() {
        this.elements = {
            taskId: document.getElementById('taskId'),
            taskTitle: document.getElementById('taskTitle'),
            taskDescription: document.getElementById('taskDescription'),
            taskPriority: document.getElementById('taskPriority'),
            generateBtn: document.getElementById('generateBtn'),
            autoFillBtn: document.getElementById('autoFillBtn'),
            clearFieldsBtn: document.getElementById('clearFieldsBtn'),
            saveTaskBtn: document.getElementById('saveTaskBtn'),
            priorityIndicator: document.getElementById('priorityIndicator'),
            priorityIndicatorText: document.getElementById('priorityIndicatorText')
        };
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

    fillFormWithGitLabData(gitlabData) {
        if (gitlabData.taskId) {
            this.elements.taskId.value = gitlabData.taskId;
        }
        
        if (gitlabData.title) {
            const cleanTitle = gitlabData.title.replace(/^(feat|fix|chore|docs|style|refactor|test):\s*/i, '');
            this.elements.taskTitle.value = cleanTitle;
        }
        
        this.updatePriorityIndicator();
        this.autoSave();
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

    validateForm() {
        const taskId = this.elements.taskId.value.trim();
        const taskTitle = this.elements.taskTitle.value.trim();
        
        if (!taskId || !taskTitle) {
            throw new Error('Please fill in at least Task ID and Task Title');
        }

        return {
            taskId,
            taskTitle,
            taskDescription: this.elements.taskDescription.value.trim(),
            taskPriority: this.elements.taskPriority.value
        };
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

    async autoSave() {
        const formData = {
            taskId: this.elements.taskId.value,
            taskTitle: this.elements.taskTitle.value,
            taskDescription: this.elements.taskDescription.value,
            taskPriority: this.elements.taskPriority.value
        };
        await Utils.setStorageData({ lastFormData: formData });
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
    }

    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    hideError() {
        this.elements.error.classList.add('hidden');
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

    showRateLimitWarning() {
        this.elements.rateLimitWarning.classList.remove('hidden');
        setTimeout(() => {
            this.elements.rateLimitWarning.classList.add('hidden');
        }, 5000);
    }

    setupAutoSave() {
        // Auto-save functionality
        [this.elements.taskId, this.elements.taskTitle, this.elements.taskDescription, this.elements.taskPriority].forEach(element => {
            element.addEventListener('input', Utils.debounce(() => this.autoSave(), 1000));
        });
    }

    onPriorityChange(callback) {
        this.elements.taskPriority.addEventListener('change', () => {
            this.updatePriorityIndicator();
            this.autoSave();
            if (callback) callback();
        });
    }

    getFormData() {
        return {
            taskId: this.elements.taskId.value.trim(),
            taskTitle: this.elements.taskTitle.value.trim(),
            taskDescription: this.elements.taskDescription.value.trim(),
            taskPriority: this.elements.taskPriority.value
        };
    }

    loadFormData(formData) {
        this.elements.taskId.value = formData.taskId || '';
        this.elements.taskTitle.value = formData.taskTitle || '';
        this.elements.taskDescription.value = formData.taskDescription || '';
        this.elements.taskPriority.value = formData.taskPriority || 'Normal';
        this.updatePriorityIndicator();
    }
}
