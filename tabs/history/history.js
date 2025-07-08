import { Utils } from '../../shared/utils.js';
import { TimeEstimationService } from '../generate/services/time-estimation-service.js';

export class HistoryTab {    constructor() {
        this.elements = {};
        this.editModal = null;
        this.currentEditIndex = null;
        this.timeEstimationService = new TimeEstimationService();
        
        // Status configuration with colors
        this.statusConfig = {
            'in-specification': { label: 'In Specification', color: '#ffc53d' },
            'in-progress': { label: 'In Progress', color: '#cf1761' },
            'code-review': { label: 'Code Review', color: '#8cb99b' },
            'completed': { label: 'Completed', color: '#000000' },
            'in-review': { label: 'In Review', color: '#c36522' },
            'rejected-cr': { label: 'Rejected (CR)', color: '#606060' },
            'rejected': { label: 'Rejected', color: '#9e49ab' },
            'blocked': { label: 'Blocked', color: '#8d7266' },
            'done': { label: 'Done', color: '#ffffff', textColor: '#000000' },
            'on-hold': { label: 'On Hold', color: '#d21e24' },
            'ready-release': { label: 'Ready to Release', color: '#3b5dce' },
            'closed': { label: 'Closed', color: '#2c8c5e' }
        };
        
        this.initialize();
    }

    initialize() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            historyContainer: document.getElementById('historyContainer'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            historySearch: document.getElementById('historySearch'),
            clearSearchBtn: document.getElementById('clearSearchBtn'),
            statusFilter: document.getElementById('statusFilter'),
            autoSearchIndicator: document.getElementById('autoSearchIndicator'),
            // Edit modal elements
            editModal: document.getElementById('editModal'),
            editModalCloseBtn: document.getElementById('editModalCloseBtn'),
            editModalSaveBtn: document.getElementById('editModalSaveBtn'),
            editModalCancelBtn: document.getElementById('editModalCancelBtn'),
            editTaskId: document.getElementById('editTaskId'),
            editTaskTitle: document.getElementById('editTaskTitle'),
            editTaskDescription: document.getElementById('editTaskDescription'),
            editSourceUrl: document.getElementById('editSourceUrl'),
            editGitlabMergeRequestUrl: document.getElementById('editGitlabMergeRequestUrl'),
            editBranchName: document.getElementById('editBranchName'),
            editCommitMessage: document.getElementById('editCommitMessage'),
            editStatus: document.getElementById('editStatus')
        };
    }

    setupEventListeners() {
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        if (this.elements.historySearch) {
            this.elements.historySearch.addEventListener('input', () => {
                this.hideAutoSearchIndicator();
                this.toggleClearSearchButton();
                this.filterHistory();
            });
        }

        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                this.clearSearchField();
            });
        }

        if (this.elements.statusFilter) {
            this.elements.statusFilter.addEventListener('change', () => {
                this.hideAutoSearchIndicator();
                this.filterHistory();
            });
        }

        // Edit modal event listeners
        if (this.elements.editModalCloseBtn) {
            this.elements.editModalCloseBtn.addEventListener('click', () => this.closeEditModal());
        }

        if (this.elements.editModalCancelBtn) {
            this.elements.editModalCancelBtn.addEventListener('click', () => this.closeEditModal());
        }

        if (this.elements.editModalSaveBtn) {
            this.elements.editModalSaveBtn.addEventListener('click', () => this.saveEditedItem());
        }

        // Close modal when clicking outside
        if (this.elements.editModal) {
            this.elements.editModal.addEventListener('click', (e) => {
                if (e.target === this.elements.editModal) {
                    this.closeEditModal();
                }
            });
        }
    }

    // Tab lifecycle methods
    async onActivate() {
        // Check if we're on a ClickUp page and auto-search
        const autoSearchPerformed = await this.checkForAutoSearch();
        
        // Only clear search and load default history if no auto-search was performed
        if (!autoSearchPerformed) {
            this.elements.historySearch.value = '';
            this.elements.statusFilter.value = '';
            this.toggleClearSearchButton();
            this.loadHistory();
        }
    }

    onDeactivate() {
        // Clean up any ongoing operations
        this.closeEditModal();
    }

    async saveToHistory(item) {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        
        // Add default status if not provided
        if (!item.status) {
            item.status = 'in-progress';
        }
        
        history.unshift(item); // Add to beginning
        
        // Keep only last 50 items
        if (history.length > 50) {
            history.splice(50);
        }

        chrome.storage.local.set({ history });
    }

    async loadHistory(searchTerm = '', statusFilter = '') {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        let history = data.history || [];
        
        // Filter history if search term provided
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase().trim();
            history = history.filter(item => 
                item.taskId.toLowerCase().includes(search) || 
                item.taskTitle.toLowerCase().includes(search)
            );
        }
        
        // Filter by status if provided
        if (statusFilter.trim()) {
            history = history.filter(item => 
                (item.status || 'in-progress') === statusFilter
            );
        }
        
        if (history.length === 0) {
            let message;
            if (searchTerm.trim() && statusFilter.trim()) {
                const statusLabel = this.statusConfig[statusFilter]?.label || statusFilter;
                message = `<div class="text-center text-gray-500 italic py-10 px-5">No ${statusLabel.toLowerCase()} items found matching "${Utils.escapeHtml(searchTerm.trim())}"</div>`;
            } else if (searchTerm.trim()) {
                message = `<div class="text-center text-gray-500 italic py-10 px-5">No history items found matching "${Utils.escapeHtml(searchTerm.trim())}"</div>`;
            } else if (statusFilter.trim()) {
                const statusLabel = this.statusConfig[statusFilter]?.label || statusFilter;
                message = `<div class="text-center text-gray-500 italic py-10 px-5">No items with status "${statusLabel}"</div>`;
            } else {
                message = '<div class="text-center text-gray-500 italic py-10 px-5">No generation history yet. Generate some branch names and commit messages to see them here!</div>';
            }
            this.elements.historyContainer.innerHTML = message;
            return;
        }

        this.elements.historyContainer.innerHTML = history.map((item, index) => {
            // Find original index for proper deletion
            const allHistory = data.history || [];
            const realIndex = allHistory.findIndex(historyItem => 
                historyItem.timestamp === item.timestamp && 
                historyItem.taskId === item.taskId
            );
            
            return this.createHistoryItemHtml(item, realIndex, searchTerm);
        }).join('');

        this.addHistoryEventListeners();
    }

    createHistoryItemHtml(item, realIndex, searchTerm = '') {
        const markdownLink = item.sourceUrl ? `[${item.taskId}, ${item.taskTitle}](${item.sourceUrl})` : '';
        
        // Highlight search terms in task ID and title
        const highlightedTaskId = this.highlightSearchTerm(item.taskId, searchTerm);
        const highlightedTitle = this.highlightSearchTerm(item.taskTitle, searchTerm);
        
        // Create title with link if URL exists, otherwise plain text
        const taskTitleHtml = item.sourceUrl 
            ? `<a href="${Utils.escapeHtml(item.sourceUrl)}" target="_blank" class="text-primary no-underline font-semibold hover:underline hover:text-primary-dark" title="Open original task">${highlightedTaskId}: ${highlightedTitle}</a>`
            : `${highlightedTaskId}: ${highlightedTitle}`;
        
        // Create status selector
        const currentStatus = item.status || 'in-progress';
        const statusSelector = this.createStatusSelector(currentStatus, realIndex);
        
        return `
            <div class="bg-white border related border-gray-200 rounded-lg p-4 mb-4 relative" data-history-index="${realIndex}">                <div class="absolute bottom-1 right-0 left-0 flex justify-between w-full gap-2 px-6">
                    <button class="bg-gray-50 ring-1 ring-gray-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-10 hover:bg-gray-100 transition-all duration-300" data-edit-index="${realIndex}" title="Edit this item">✏️</button>
                    <button class="bg-purple-50 ring-1 ring-purple-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-10 hover:bg-purple-100 transition-all duration-300 time-estimate-btn ${item.timeEstimation ? 'has-estimation' : ''}" data-time-index="${realIndex}" title="${item.timeEstimation ? 'View time estimation' : 'Generate time estimation'}">⏱️</button>
                    <button class="bg-green-50 ring-1 ring-green-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-10 hover:bg-green-100 transition-all duration-300 mattermost-status-btn" data-mattermost-index="${realIndex}" data-task-id="${Utils.escapeAttr(item.taskId)}" title="Set Mattermost status: vscode + task ID">💬</button>
                    <button class="bg-blue-50 ring-1 ring-blue-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-10 hover:bg-blue-100 transition-all duration-300" data-template-index="${realIndex}" title="Go to Templates">⏭️</button>
                    <button class="bg-red-50 ring-1 ring-red-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-10 hover:bg-red-100 transition-all duration-300" data-delete-index="${realIndex}">🗑️</button>
                </div>
                
                <div class="flex items-center justify-between mb-2">
                    <div class="text-xs text-gray-500">${new Date(item.timestamp).toLocaleString()}</div>
                    ${statusSelector}
                </div>

                <div class="bg-gray-50 p-2.5 rounded-md font-mono text-xs mb-2.5">
                    <div class="flex flex-row items-center gap-2 mb-2">
                        <div class="font-semibold text-gray-700 mb-2 flex-1 text-balance">${taskTitleHtml}</div>
                        ${markdownLink ? `<button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-shrink-0 min-w-auto hover:bg-emerald-100 transition-all duration-300" data-copy-text="${Utils.escapeAttr(markdownLink)}" title="Copy markdown link">📋</button>` : ''}
                    </div>
                   
                    ${item.branchName ? ` 
                        <div class="flex flex-col">
                            <strong>Branch:</strong>
                            <div class="text-primary-dark flex flex-row gap-1 items-center">
                                <div class="select-all w-full cursor-text bg-orange-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-orange-100 hover:border-gray-300 text-balance" title="Click to select all">
                                    ${Utils.escapeHtml(item.branchName)}
                                </div>
                                <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${Utils.escapeAttr(item.branchName)}">
                                    📋
                                </button>
                            </div>
                        </div>` : ''}
                      ${item.commitMessage ? `
                        <div class="flex flex-col">
                            <strong>Commit:</strong>
                            <div class="text-primary-dark flex flex-row gap-1 items-center">
                                <div class="select-all cursor-text bg-blue-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-blue-100 hover:border-gray-300 text-balance" title="Click to select all">${Utils.escapeHtml(item.commitMessage)}</div> 
                                <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${Utils.escapeAttr(item.commitMessage)}">📋</button>
                            </div>
                        </div>` : ''}
                    
                    ${item.gitlabMergeRequestUrl ? `
                        <div class="flex flex-col">
                            <strong>GitLab MR:</strong>
                            <div class="text-primary-dark flex flex-row gap-1 items-center">
                                <a href="${Utils.escapeHtml(item.gitlabMergeRequestUrl)}" target="_blank" class="select-all cursor-pointer bg-purple-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-purple-100 hover:border-gray-300 text-balance no-underline hover:underline" title="Open GitLab merge request">${Utils.escapeHtml(item.gitlabMergeRequestUrl)}</a>
                                <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${Utils.escapeAttr(item.gitlabMergeRequestUrl)}">📋</button>
                            </div>
                        </div>` : ''}
                    
                    ${!item.branchName && !item.commitMessage ? `
                        <div class="text-secondary italic py-2 px-2 bg-purple-50 rounded text-center mb-1">
                            <em>📌 Task reference only (no generation performed)</em>
                        </div>` : ''}
                    
                    <div class="flex gap-2 justify-start mt-2.5 pt-2.5 border-t border-gray-200">
                        ${item.commitMessage ? `<button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-full hover:bg-emerald-100 transition-all duration-300" data-commit-text="${Utils.escapeAttr(item.commitMessage)}" data-task-id="${Utils.escapeAttr(item.taskId)}">📋 Git console command</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    createStatusSelector(currentStatus, itemIndex) {
        const statusConfig = this.statusConfig[currentStatus] || this.statusConfig['in-progress'];
        const textColor = statusConfig.textColor || '#ffffff';
        
        return `
            <div class="status-selector relative">
                <select class="status-select px-2 py-1 rounded text-xs font-medium border-none cursor-pointer focus:outline-none transition-all duration-200" 
                        style="background-color: ${statusConfig.color}; color: ${textColor};" 
                        data-item-index="${itemIndex}">
                    ${Object.entries(this.statusConfig).map(([key, config]) => {
                        const selected = key === currentStatus ? 'selected' : '';
                        return `<option value="${key}" ${selected} style="background-color: ${config.color}; color: ${config.textColor || '#ffffff'};">${config.label}</option>`;
                    }).join('')}
                </select>
            </div>
        `;
    }

    addHistoryEventListeners() {
        // Add click listeners to copy buttons (branch/commit and markdown link)
        const copyButtons = this.elements.historyContainer.querySelectorAll('button[data-copy-text]');
        copyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const text = this.getAttribute('data-copy-text');
                Utils.copyToClipboard(text);
            });
        });

        // Add click listeners to git commit buttons
        const gitButtons = this.elements.historyContainer.querySelectorAll('button[data-commit-text]');
        gitButtons.forEach(button => {
            button.addEventListener('click', function() {
                const commitText = this.getAttribute('data-commit-text');
                const taskId = this.getAttribute('data-task-id');
                const gitCommand = `git commit -m "${commitText}" --no-verify`;
                Utils.copyToClipboard(gitCommand);
                Utils.showNotification(`Git command copied: ${gitCommand}`);
            });
        });

        // Add click listeners to delete buttons
        const deleteButtons = this.elements.historyContainer.querySelectorAll('button[data-delete-index]');
        deleteButtons.forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-delete-index'));
                this.deleteHistoryItem(index);
            });
        });

        // Add click listeners to edit buttons
        const editButtons = this.elements.historyContainer.querySelectorAll('button[data-edit-index]');
        editButtons.forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-edit-index'));
                this.openEditModal(index);
            });
        });        // Add click listeners to template buttons
        const templateButtons = this.elements.historyContainer.querySelectorAll('button[data-template-index]');
        templateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const index = parseInt(button.getAttribute('data-template-index'));
                this.goToTemplates(index);
            });
        });        // Add click listeners to time estimation buttons
        const timeButtons = this.elements.historyContainer.querySelectorAll('button[data-time-index]');
        timeButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const index = parseInt(button.getAttribute('data-time-index'));
                await this.handleTimeEstimation(index, button);
            });
            
            // Add hover functionality for buttons that already have estimations
            if (button.classList.contains('has-estimation')) {
                button.addEventListener('mouseenter', async () => {
                    const index = parseInt(button.getAttribute('data-time-index'));
                    const data = await Utils.getStorageData(['history']);
                    const historyItems = data.history || [];
                    
                    if (index >= 0 && index < historyItems.length && historyItems[index].timeEstimation) {
                        this.showTimeEstimationTooltip(button, historyItems[index].timeEstimation);
                    }
                });
            }
        });

        // Add click listeners to Mattermost status buttons
        const mattermostButtons = this.elements.historyContainer.querySelectorAll('button[data-mattermost-index]');
        mattermostButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const taskId = button.getAttribute('data-task-id');
                await this.setMattermostStatus(taskId, button);
            });
        });

        // Add click listeners to text areas for easy selection
        const textAreas = this.elements.historyContainer.querySelectorAll('div[title="Click to select all"]');
        textAreas.forEach(textArea => {
            textArea.addEventListener('click', function() {
                // Select all text when clicked
                const range = document.createRange();
                range.selectNodeContents(this);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });

        // Add change listeners to status selectors
        const statusSelectors = this.elements.historyContainer.querySelectorAll('.status-select');
        statusSelectors.forEach(selector => {
            selector.addEventListener('change', (e) => {
                const itemIndex = parseInt(e.target.getAttribute('data-item-index'));
                const newStatus = e.target.value;
                this.updateItemStatus(itemIndex, newStatus);
                
                // Update the selector's appearance
                const statusConfig = this.statusConfig[newStatus];
                const textColor = statusConfig.textColor || '#ffffff';
                e.target.style.backgroundColor = statusConfig.color;
                e.target.style.color = textColor;
            });
        });
    }

    filterHistory() {
        const searchTerm = this.elements.historySearch.value;
        const statusFilter = this.elements.statusFilter.value;
        this.loadHistory(searchTerm, statusFilter);
    }

    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm.trim()) {
            return Utils.escapeHtml(text);
        }
        
        const escaped = Utils.escapeHtml(text);
        const escapedSearchTerm = Utils.escapeHtml(searchTerm.trim());
        const regex = new RegExp(`(${escapedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        return escaped.replace(regex, '<span class="bg-yellow-300 px-0.5 py-0.5 rounded-sm">$1</span>');
    }

    toggleClearSearchButton() {
        if (this.elements.clearSearchBtn) {
            const hasText = this.elements.historySearch.value.trim().length > 0;
            if (hasText) {
                this.elements.clearSearchBtn.style.display = 'flex';
                this.elements.clearSearchBtn.classList.remove('hidden');
            } else {
                this.elements.clearSearchBtn.style.display = 'none';
                this.elements.clearSearchBtn.classList.add('hidden');
            }
        }
    }

    clearSearchField() {
        if (this.elements.historySearch) {
            this.elements.historySearch.value = '';
            this.hideAutoSearchIndicator();
            this.toggleClearSearchButton();
            this.filterHistory();
            this.elements.historySearch.focus(); // Keep focus on the search field
        }
    }

    clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            chrome.storage.local.remove(['history']);
            this.elements.historyContainer.innerHTML = '<div class="text-center text-gray-500 italic py-10 px-5">No generation history yet. Generate some branch names and commit messages to see them here!</div>';
        }
    }

    async deleteHistoryItem(index) {
        if (confirm('Are you sure you want to delete this history item?')) {
            const data = await new Promise(resolve => {
                chrome.storage.local.get(['history'], resolve);
            });

            const history = data.history || [];
            
            if (index >= 0 && index < history.length) {
                history.splice(index, 1);
                chrome.storage.local.set({ history }, () => {
                    this.filterHistory(); // Reload with current filters
                });
            }
        }
    }

    async openEditModal(index) {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        const item = history[index];
        
        if (!item) return;

        this.currentEditIndex = index;
        
        // Populate modal fields
        this.elements.editTaskId.value = item.taskId || '';
        this.elements.editTaskTitle.value = item.taskTitle || '';
        this.elements.editTaskDescription.value = item.taskDescription || '';
        this.elements.editSourceUrl.value = item.sourceUrl || '';
        this.elements.editGitlabMergeRequestUrl.value = item.gitlabMergeRequestUrl || '';
        this.elements.editBranchName.value = item.branchName || '';
        this.elements.editCommitMessage.value = item.commitMessage || '';
        this.elements.editStatus.value = item.status || 'in-progress';
        
        // Show modal
        this.elements.editModal.classList.remove('hidden');
        this.elements.editModal.classList.add('flex');
        this.elements.editModal.style.display = 'flex';
        this.elements.editModal.style.alignItems = 'center';
        this.elements.editModal.style.justifyContent = 'center';
    }

    closeEditModal() {
        this.elements.editModal.classList.add('hidden');
        this.elements.editModal.classList.remove('flex');
        this.elements.editModal.style.display = 'none';
        this.currentEditIndex = null;
    }

    async saveEditedItem() {
        if (this.currentEditIndex === null) return;

        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        const item = history[this.currentEditIndex];
        
        if (!item) return;

        // Update item with new values
        item.taskId = this.elements.editTaskId.value.trim();
        item.taskTitle = this.elements.editTaskTitle.value.trim();
        item.taskDescription = this.elements.editTaskDescription.value.trim();
        item.sourceUrl = this.elements.editSourceUrl.value.trim();
        item.gitlabMergeRequestUrl = this.elements.editGitlabMergeRequestUrl.value.trim();
        item.branchName = this.elements.editBranchName.value.trim();
        item.commitMessage = this.elements.editCommitMessage.value.trim();
        item.status = this.elements.editStatus.value;
        
        // Update timestamp to show it was edited
        item.lastEdited = Date.now();

        // Save to storage
        chrome.storage.local.set({ history }, () => {
            this.closeEditModal();
            this.filterHistory(); // Reload history with current filters to show changes
            Utils.showNotification('History item updated successfully');
        });
    }

    async updateItemStatus(itemIndex, newStatus) {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        
        if (itemIndex >= 0 && itemIndex < history.length) {
            history[itemIndex].status = newStatus;
            history[itemIndex].statusUpdated = Date.now();
            
            chrome.storage.local.set({ history }, () => {
                Utils.showNotification(`Status updated to ${this.statusConfig[newStatus].label}`);
            });
        }
    }

    async checkForAutoSearch() {
        try {
            // Get current tab URL to check if we're on ClickUp
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.url) return;
            
            // Check if we're on ClickUp
            if (tab.url.startsWith('https://app.clickup.com/t/')) {
                // Try to extract task data from the current page
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TASK_DATA' });
                    
                    if (response && (response.id || response.title)) {
                        // Auto-search for the task ID or title
                        const searchTerm = response.id || response.title;
                        
                        // Set the search input and perform search
                        this.elements.historySearch.value = searchTerm;
                        this.toggleClearSearchButton();
                        this.loadHistory(searchTerm, '');
                        
                        // Show the auto-search indicator
                        this.showAutoSearchIndicator(searchTerm);
                        
                        // Show notification about auto-search
                        Utils.showNotification(`Auto-searching for: ${searchTerm}`);
                        
                        return true; // Found and searched
                    }
                } catch (error) {
                    console.log('Could not extract task data from current page:', error);
                }
            }
            
            // Fallback: Check for recently extracted data from storage, but only if we're still on ClickUp
            if (tab.url.startsWith('https://app.clickup.com/t/')) {
                const data = await new Promise(resolve => {
                    chrome.storage.local.get(['lastExtractedData', 'extractedAt'], resolve);
                });
                
                if (data.lastExtractedData && data.extractedAt) {
                    // Check if the data was extracted recently (within last 30 seconds)
                    const timeDiff = Date.now() - data.extractedAt;
                    if (timeDiff < 30000) { // 30 seconds
                        const extractedData = data.lastExtractedData;
                        if (extractedData.id || extractedData.title) {
                            const searchTerm = extractedData.id || extractedData.title;
                            
                            // Set the search input and perform search
                            this.elements.historySearch.value = searchTerm;
                            this.toggleClearSearchButton();
                            this.loadHistory(searchTerm, '');
                            
                            // Show the auto-search indicator
                            this.showAutoSearchIndicator(searchTerm);
                            
                            // Show notification about auto-search
                            Utils.showNotification(`Auto-searching for: ${searchTerm}`);
                            
                            return true; // Found and searched
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log('Auto-search failed:', error);
        }
        
        return false; // No auto-search performed
    }

    showAutoSearchIndicator(searchTerm) {
        if (this.elements.autoSearchIndicator) {
            this.elements.autoSearchIndicator.textContent = `🔍 Auto-searched: ${searchTerm}`;
            this.elements.autoSearchIndicator.classList.remove('hidden');
            
            // Hide the indicator after 5 seconds
            setTimeout(() => {
                if (this.elements.autoSearchIndicator) {
                    this.elements.autoSearchIndicator.classList.add('hidden');
                }
            }, 5000);
        }
    }

    hideAutoSearchIndicator() {
        if (this.elements.autoSearchIndicator) {
            this.elements.autoSearchIndicator.classList.add('hidden');
        }
    }

    async goToTemplates(index) {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        const item = history[index];
        
        if (!item) return;

        // Switch to templates tab and auto-fill with history data
        const tabManager = window.application?.tabManager;
        const templatesTab = window.application?.tabs?.templates;
        
        if (tabManager && templatesTab) {
            tabManager.switchTab('templates');
            
            // Wait a bit for the tab to activate
            setTimeout(() => {
                templatesTab.autoFillFromHistory(item);
                Utils.showNotification('Templates tab opened with data from history');
            }, 100);
        }
    }

    async searchAndHighlightTask(taskId) {
        // Set the search field with the task ID
        this.elements.historySearch.value = taskId;
        this.toggleClearSearchButton();
        
        // Clear any status filter to ensure we can find the item
        this.elements.statusFilter.value = '';
        
        // Load history with the search term
        await this.loadHistory(taskId, '');
        
        // Show the auto-search indicator
        this.showAutoSearchIndicator(taskId);
        
        // Highlight the matching item(s)
        setTimeout(() => {
            this.highlightMatchingItems(taskId);
        }, 100);
    }    highlightMatchingItems(taskId) {
        // Find all history items that match the task ID
        const historyItems = this.elements.historyContainer.querySelectorAll('[data-history-index]');
        let foundMatch = false;
        let firstMatch = null;
        
        historyItems.forEach(item => {
            const taskIdElement = item.querySelector('a[title="Open original task"], .font-semibold');
            if (taskIdElement) {
                const itemText = taskIdElement.textContent || '';
                // Check if the task ID matches (case-insensitive)
                if (itemText.toLowerCase().includes(taskId.toLowerCase())) {
                    // Add a highlight border and background
                    item.style.border = '2px solid #3b82f6';
                    item.style.backgroundColor = '#eff6ff';
                    item.classList.add('shadow-lg');
                    
                    if (!foundMatch) {
                        firstMatch = item;
                        foundMatch = true;
                    }
                    
                    // Remove highlight after 5 seconds
                    setTimeout(() => {
                        item.style.border = '';
                        item.style.backgroundColor = '';
                        item.classList.remove('shadow-lg');
                    }, 5000);
                }
            }
        });
          // Scroll the first match into view
        if (firstMatch) {
            firstMatch.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest' 
            });
            Utils.showNotification(`Highlighted matching task: ${taskId}`, 'success');
        } else {
            Utils.showNotification(`Task ${taskId} not found in current view`, 'warning');
        }
    }

    async handleTimeEstimation(index, buttonElement) {
        const data = await Utils.getStorageData(['history']);
        const historyItems = data.history || [];
        
        if (index < 0 || index >= historyItems.length) {
            Utils.showNotification('Invalid history item', 'error');
            return;
        }
        
        const item = historyItems[index];
        
        // If already has estimation, show it
        if (item.timeEstimation) {
            this.showTimeEstimationTooltip(buttonElement, item.timeEstimation);
            return;
        }
        
        // Otherwise, generate new estimation
        try {
            // Show loading state
            buttonElement.innerHTML = '⏳';
            buttonElement.disabled = true;
            buttonElement.title = 'Generating time estimation...';
            
            const taskData = {
                taskId: item.taskId,
                taskTitle: item.taskTitle,
                taskDescription: item.taskDescription || ''
            };
            
            const estimation = await this.timeEstimationService.estimateTime(taskData);
            
            // Save estimation to history
            historyItems[index].timeEstimation = estimation;
            await Utils.setStorageData({ history: historyItems });
            
            // Update button appearance
            buttonElement.innerHTML = '⏱️';
            buttonElement.disabled = false;
            buttonElement.classList.add('has-estimation');
            buttonElement.title = 'View time estimation';
            
            // Show the estimation
            this.showTimeEstimationTooltip(buttonElement, estimation);
            
            Utils.showNotification('Time estimation generated successfully!', 'success');
            
        } catch (error) {
            console.error('Time estimation error:', error);
            
            // Reset button state
            buttonElement.innerHTML = '⏱️';
            buttonElement.disabled = false;
            buttonElement.title = 'Generate time estimation';
            
            Utils.showNotification(`Time estimation failed: ${error.message}`, 'error');
        }
    }

    showTimeEstimationTooltip(buttonElement, estimation) {
        // Remove any existing tooltips
        const existingTooltip = document.querySelector('.time-estimation-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'time-estimation-tooltip absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs';
        tooltip.style.minWidth = '200px';
          tooltip.innerHTML = `
            <div class="font-semibold text-gray-800 mb-2 border-b border-gray-200 pb-2">⏱️ Time Estimation</div>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-green-600 flex items-center">
                        <span class="mr-1">🎓</span>
                        <span>Junior:</span>
                    </span>
                    <span class="font-mono bg-green-50 px-2 py-1 rounded text-green-800">${estimation.junior}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-blue-600 flex items-center">
                        <span class="mr-1"></span>
                        <span>Mid-level:</span>
                    </span>
                    <span class="font-mono bg-blue-50 px-2 py-1 rounded text-blue-800">${estimation.mid}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-purple-600 flex items-center">
                        <span class="mr-1">�</span>
                        <span>Senior:</span>
                    </span>
                    <span class="font-mono bg-purple-50 px-2 py-1 rounded text-purple-800">${estimation.senior}</span>
                </div>
            </div>
            ${estimation.reasoning ? `
                <div class="mt-3 pt-2 border-t border-gray-200">
                    <div class="text-gray-600 text-xs">
                        <strong>💡 Reasoning:</strong><br>
                        <span class="text-gray-500">${estimation.reasoning}</span>
                    </div>
                </div>
            ` : ''}
            <div class="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-400 flex items-center">
                <span class="mr-1">🕐</span>
                Generated: ${new Date(estimation.timestamp).toLocaleString()}
            </div>
        `;
        
        document.body.appendChild(tooltip);
        
        // Position tooltip
        const buttonRect = buttonElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Position above the button by default
        let top = buttonRect.top - tooltipRect.height - 8;
        let left = buttonRect.left + (buttonRect.width / 2) - (tooltipRect.width / 2);
        
        // Adjust if tooltip goes off screen
        if (top < 8) {
            top = buttonRect.bottom + 8; // Position below instead
        }
        if (left < 8) {
            left = 8;
        }
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        
        tooltip.style.top = `${top + window.scrollY}px`;
        tooltip.style.left = `${left}px`;
        
        // Auto-hide tooltip after 10 seconds
        const hideTimeout = setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 10000);
        
        // Hide on click outside
        const hideOnClickOutside = (e) => {
            if (!tooltip.contains(e.target) && e.target !== buttonElement) {
                tooltip.remove();
                document.removeEventListener('click', hideOnClickOutside);
                clearTimeout(hideTimeout);
            }
        };
        
        // Small delay to prevent immediate hiding from the button click
        setTimeout(() => {
            document.addEventListener('click', hideOnClickOutside);
        }, 100);
        
        // Hide on scroll
        const hideOnScroll = () => {
            tooltip.remove();
            document.removeEventListener('scroll', hideOnScroll);
            clearTimeout(hideTimeout);
        };
        document.addEventListener('scroll', hideOnScroll);
    }

    async setMattermostStatus(taskId, button) {
        try {
            // Store original button content
            const originalContent = button.innerHTML;
            const originalTitle = button.title;
            
            // Show loading state
            button.innerHTML = '⏳';
            button.title = 'Setting Mattermost status...';
            button.disabled = true;
            
            // Import and use the Mattermost API directly
            const { mattermostAPI } = await import('../../shared/mattermost-api.js');
            
            // Get stored authentication and settings
            const stored = await chrome.storage.sync.get(['mattermostSettings', 'MMAuthToken', 'MMAccessToken', 'MMUserId', 'serverUrl']);
            const settings = stored.mattermostSettings || {};
            const token = stored.MMAccessToken || stored.MMAuthToken;
            const userId = stored.MMUserId;
            
            // Check for server URL in multiple places (for compatibility)
            const serverUrl = settings.serverUrl || stored.serverUrl || 'https://chat.twntydigital.de';
            
            console.log('Authentication check:', { 
                hasToken: !!token, 
                hasUserId: !!userId, 
                serverUrl: serverUrl,
                storedKeys: Object.keys(stored)
            });
            
            if (!token) {
                throw new Error('No authentication token found. Please authenticate in the Mattermost tab first.');
            }
            
            if (!userId) {
                throw new Error('No user ID found. Please re-authenticate in the Mattermost tab.');
            }
            
            // Set the server URL in the API
            mattermostAPI.setServerUrl(serverUrl);
            
            // Set custom status using the Mattermost API
            const success = await mattermostAPI.setCustomStatus(token, 'vscode', taskId);
            
            // Restore button state
            button.innerHTML = originalContent;
            button.title = originalTitle;
            button.disabled = false;
            
            if (success) {
                Utils.showNotification(`Mattermost status set: 💻 ${taskId}`, 'success');
                
                // Temporarily change button appearance to show success
                button.classList.remove('bg-green-50', 'ring-green-400', 'hover:bg-green-100');
                button.classList.add('bg-emerald-50', 'ring-emerald-400', 'hover:bg-emerald-100');
                button.innerHTML = '✅';
                button.title = `Status set: vscode ${taskId}`;
                
                // Revert after 2 seconds
                setTimeout(() => {
                    button.classList.remove('bg-emerald-50', 'ring-emerald-400', 'hover:bg-emerald-100');
                    button.classList.add('bg-green-50', 'ring-green-400', 'hover:bg-green-100');
                    button.innerHTML = originalContent;
                    button.title = originalTitle;
                }, 2000);
            } else {
                Utils.showNotification('Failed to set Mattermost status. Check your connection and settings.', 'error');
            }
            
        } catch (error) {
            console.error('Error setting Mattermost status:', error);
            
            // Restore button state
            button.innerHTML = '💬';
            button.title = 'Set Mattermost status: vscode + task ID';
            button.disabled = false;
            
            // Show helpful error message
            if (error.message.includes('authentication') || error.message.includes('token') || error.message.includes('user ID')) {
                Utils.showNotification('Please authenticate with Mattermost first (go to Mattermost tab)', 'error');
            } else {
                Utils.showNotification('Error setting Mattermost status: ' + error.message, 'error');
            }
        }
    }
}
