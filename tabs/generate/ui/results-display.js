// Results Display Manager
// Handles displaying and copying generation results

import { Utils } from '../../../shared/utils.js';

export class ResultsDisplay {
    constructor() {
        this.elements = {};
    }

    initialize() {
        this.elements = {
            results: document.getElementById('results'),
            branchResult: document.getElementById('branchResult'),
            commitResult: document.getElementById('commitResult'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            rateLimitWarning: document.getElementById('rateLimitWarning')
        };
        this.setupCopyButtons();
    }

    displayResults(result) {
        this.elements.branchResult.textContent = result.branchName || 'No branch name generated';
        this.elements.commitResult.textContent = result.commitMessage || 'No commit message generated';
        this.elements.results.classList.remove('hidden');
    }

    setupCopyButtons() {
        // Copy branch button
        const copyBranchBtn = document.getElementById('copyBranchBtn');
        if (copyBranchBtn) {
            copyBranchBtn.addEventListener('click', async () => {
                const text = this.elements.branchResult.textContent;
                if (text && text !== 'No branch name generated') {
                    await Utils.copyToClipboard(text);
                    Utils.showNotification('Branch name copied!', 'success');
                } else {
                    Utils.showNotification('No branch name to copy', 'warning');
                }
            });
        }
        
        // Copy commit button
        const copyCommitBtn = document.getElementById('copyCommitBtn');
        if (copyCommitBtn) {
            copyCommitBtn.addEventListener('click', async () => {
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

    onCopyBranch(callback) {
        // This is handled internally by setupCopyButtons
        // Callback is optional for additional actions
    }

    onCopyCommit(callback) {
        // This is handled internally by setupCopyButtons  
        // Callback is optional for additional actions
    }

    showLoading(show) {
        if (show) {
            this.elements.loading.classList.remove('hidden');
        } else {
            this.elements.loading.classList.add('hidden');
        }
    }

    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
    }

    hideError() {
        this.elements.error.classList.add('hidden');
    }

    hideResults() {
        this.elements.results.classList.add('hidden');
    }

    showRateLimitWarning() {
        this.elements.rateLimitWarning.classList.remove('hidden');
        setTimeout(() => {
            this.elements.rateLimitWarning.classList.add('hidden');
        }, 5000);
    }
}
