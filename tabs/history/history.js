import { Utils } from '../../shared/utils.js';

export class HistoryTab {
    constructor() {
        this.elements = {};
        this.editModal = null;
        this.currentEditIndex = null;
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
            // Edit modal elements
            editModal: document.getElementById('editModal'),
            editModalCloseBtn: document.getElementById('editModalCloseBtn'),
            editModalSaveBtn: document.getElementById('editModalSaveBtn'),
            editModalCancelBtn: document.getElementById('editModalCancelBtn'),
            editTaskId: document.getElementById('editTaskId'),
            editTaskTitle: document.getElementById('editTaskTitle'),
            editTaskDescription: document.getElementById('editTaskDescription'),
            editSourceUrl: document.getElementById('editSourceUrl'),
            editBranchName: document.getElementById('editBranchName'),
            editCommitMessage: document.getElementById('editCommitMessage')
        };
    }

    setupEventListeners() {
        if (this.elements.clearHistoryBtn) {
            this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        if (this.elements.historySearch) {
            this.elements.historySearch.addEventListener('input', () => this.filterHistory());
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
    onActivate() {
        this.elements.historySearch.value = '';
        this.loadHistory();
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
        history.unshift(item); // Add to beginning
        
        // Keep only last 50 items
        if (history.length > 50) {
            history.splice(50);
        }

        chrome.storage.local.set({ history });
    }

    async loadHistory(searchTerm = '') {
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
        
        if (history.length === 0) {
            const message = searchTerm.trim() 
                ? `<div class="text-center text-gray-500 italic py-10 px-5">No history items found matching "${Utils.escapeHtml(searchTerm.trim())}"</div>`
                : '<div class="text-center text-gray-500 italic py-10 px-5">No generation history yet. Generate some branch names and commit messages to see them here!</div>';
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
        
        return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4 relative" data-history-index="${realIndex}">
                <div class="absolute top-1 right-1 flex gap-1">
                    <button class="bg-gray-50 ring-1 ring-gray-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-[100px] hover:bg-gray-100 transition-all duration-300" data-edit-index="${realIndex}" title="Edit this item">✏️</button>
                    <button class="bg-red-50 ring-1 ring-red-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-[100px] hover:bg-red-100 transition-all duration-300" data-delete-index="${realIndex}">🗑️</button>
                </div>
                <div class="text-xs text-gray-500 mb-2.5">${new Date(item.timestamp).toLocaleString()}</div>

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
                const gitCommand = `git commit -m "${commitText}"`;
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
    }

    filterHistory() {
        const searchTerm = this.elements.historySearch.value;
        this.loadHistory(searchTerm);
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
                    this.loadHistory(); // Reload the history display
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
        this.elements.editBranchName.value = item.branchName || '';
        this.elements.editCommitMessage.value = item.commitMessage || '';
        
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
        item.branchName = this.elements.editBranchName.value.trim();
        item.commitMessage = this.elements.editCommitMessage.value.trim();
        
        // Update timestamp to show it was edited
        item.lastEdited = Date.now();

        // Save to storage
        chrome.storage.local.set({ history }, () => {
            this.closeEditModal();
            this.loadHistory(); // Reload history to show changes
            Utils.showNotification('History item updated successfully');
        });
    }
}
