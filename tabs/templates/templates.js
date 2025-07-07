import { Utils } from '../../shared/utils.js';

export class TemplatesTab {
    constructor() {
        this.elements = {};
        this.settings = {};
        window.templatesTab = this; // Make globally accessible for remove buttons
        this.initialize();
    }

    initialize() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            // Review section
            reviewer1Select: document.getElementById('reviewer1Select'),
            reviewer2Select: document.getElementById('reviewer2Select'),
            mergeRequestLink: document.getElementById('mergeRequestLink'),
            reviewMessage: document.getElementById('reviewMessage'),
            copyReviewBtn: document.getElementById('copyReviewBtn'),
            clearReviewBtn: document.getElementById('clearReviewBtn'),
            reviewSettingsBtn: document.getElementById('reviewSettingsBtn'),
            
            // QA section
            testerSelect: document.getElementById('testerSelect'),
            branchName: document.getElementById('branchName'),
            qaMessage: document.getElementById('qaMessage'),
            copyQaBtn: document.getElementById('copyQaBtn'),
            clearQaBtn: document.getElementById('clearQaBtn'),
            qaSettingsBtn: document.getElementById('qaSettingsBtn'),
            
            // Resolved section
            resolvedReviewerSelect: document.getElementById('resolvedReviewerSelect'),
            resolvedLink: document.getElementById('resolvedLink'),
            resolvedMessage: document.getElementById('resolvedMessage'),
            copyResolvedBtn: document.getElementById('copyResolvedBtn'),
            clearResolvedBtn: document.getElementById('clearResolvedBtn'),
            resolvedSettingsBtn: document.getElementById('resolvedSettingsBtn'),
            
            // Settings modal
            settingsModal: document.getElementById('templatesSettingsModal'),
            settingsCloseBtn: document.getElementById('templatesSettingsCloseBtn'),
            saveSettingsBtn: document.getElementById('saveTemplatesSettingsBtn'),
            cancelSettingsBtn: document.getElementById('cancelTemplatesSettingsBtn'),
            
            // Reviewers management
            newReviewerInput: document.getElementById('newReviewerInput'),
            addReviewerBtn: document.getElementById('addReviewerBtn'),
            reviewersList: document.getElementById('reviewersList'),
            favoriteReviewer1: document.getElementById('favoriteReviewer1'),
            favoriteReviewer2: document.getElementById('favoriteReviewer2'),
            
            // Testers management
            newTesterInput: document.getElementById('newTesterInput'),
            addTesterBtn: document.getElementById('addTesterBtn'),
            testersList: document.getElementById('testersList'),
            favoriteTester: document.getElementById('favoriteTester')
        };
    }

    setupEventListeners() {
        // Review section listeners
        if (this.elements.reviewer1Select) {
            this.elements.reviewer1Select.addEventListener('change', () => this.updateReviewMessage());
        }
        if (this.elements.reviewer2Select) {
            this.elements.reviewer2Select.addEventListener('change', () => this.updateReviewMessage());
        }
        if (this.elements.mergeRequestLink) {
            this.elements.mergeRequestLink.addEventListener('input', () => this.updateReviewMessage());
        }
        if (this.elements.copyReviewBtn) {
            this.elements.copyReviewBtn.addEventListener('click', () => this.copyReviewMessage());
        }
        if (this.elements.clearReviewBtn) {
            this.elements.clearReviewBtn.addEventListener('click', () => this.clearReviewSection());
        }
        if (this.elements.reviewSettingsBtn) {
            this.elements.reviewSettingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // QA section listeners
        if (this.elements.testerSelect) {
            this.elements.testerSelect.addEventListener('change', () => this.updateQaMessage());
        }
        if (this.elements.branchName) {
            this.elements.branchName.addEventListener('input', () => this.updateQaMessage());
        }
        if (this.elements.copyQaBtn) {
            this.elements.copyQaBtn.addEventListener('click', () => this.copyQaMessage());
        }
        if (this.elements.clearQaBtn) {
            this.elements.clearQaBtn.addEventListener('click', () => this.clearQaSection());
        }
        if (this.elements.qaSettingsBtn) {
            this.elements.qaSettingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // Resolved section listeners
        if (this.elements.resolvedReviewerSelect) {
            this.elements.resolvedReviewerSelect.addEventListener('change', () => this.updateResolvedMessage());
        }
        if (this.elements.resolvedLink) {
            this.elements.resolvedLink.addEventListener('input', () => this.updateResolvedMessage());
        }
        if (this.elements.copyResolvedBtn) {
            this.elements.copyResolvedBtn.addEventListener('click', () => this.copyResolvedMessage());
        }
        if (this.elements.clearResolvedBtn) {
            this.elements.clearResolvedBtn.addEventListener('click', () => this.clearResolvedSection());
        }
        if (this.elements.resolvedSettingsBtn) {
            this.elements.resolvedSettingsBtn.addEventListener('click', () => this.openSettingsModal());
        }

        // Settings modal listeners
        if (this.elements.settingsCloseBtn) {
            this.elements.settingsCloseBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        if (this.elements.cancelSettingsBtn) {
            this.elements.cancelSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        }
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // Add/remove listeners
        if (this.elements.addReviewerBtn) {
            this.elements.addReviewerBtn.addEventListener('click', () => this.addReviewer());
        }
        if (this.elements.addTesterBtn) {
            this.elements.addTesterBtn.addEventListener('click', () => this.addTester());
        }

        // Enter key support for inputs
        if (this.elements.newReviewerInput) {
            this.elements.newReviewerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addReviewer();
            });
        }
        if (this.elements.newTesterInput) {
            this.elements.newTesterInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addTester();
            });
        }

        // Close modal when clicking outside
        if (this.elements.settingsModal) {
            this.elements.settingsModal.addEventListener('click', (e) => {
                if (e.target === this.elements.settingsModal) {
                    this.closeSettingsModal();
                }
            });
        }
    }

    // Tab lifecycle methods
    async onActivate() {
        // Load settings and populate dropdowns
        await this.loadSettings();
        
        // Update all messages when tab is activated
        this.updateReviewMessage();
        this.updateQaMessage();
        this.updateResolvedMessage();
    }

    onDeactivate() {
        // Clean up any ongoing operations
    }

    // Review section methods
    updateReviewMessage() {
        const reviewer1 = this.elements.reviewer1Select.value;
        const reviewer2 = this.elements.reviewer2Select.value;
        const link = this.elements.mergeRequestLink.value.trim();
        
        let message = '';
        let isValid = false;
        
        if (reviewer1) {
            if (reviewer2) {
                // Two reviewers
                message = `Hey @${reviewer1} and @${reviewer2}. Please make a code review for my merge request ${link ? link : '[link]'}.`;
            } else {
                // One reviewer
                message = `Hey @${reviewer1}. Please make a code review for my merge request ${link ? link : '[link]'}.`;
            }
            isValid = true;
        } else {
            message = 'Select reviewers and add link to generate message';
        }
        
        this.elements.reviewMessage.textContent = message;
        this.elements.copyReviewBtn.disabled = !isValid;
        
        if (isValid) {
            this.elements.copyReviewBtn.classList.remove('disabled:bg-gray-300');
        } else {
            this.elements.copyReviewBtn.classList.add('disabled:bg-gray-300');
        }
    }

    copyReviewMessage() {
        const reviewer1 = this.elements.reviewer1Select.value;
        const reviewer2 = this.elements.reviewer2Select.value;
        const link = this.elements.mergeRequestLink.value.trim();
        
        if (!reviewer1) return;
        
        let message;
        if (reviewer2) {
            message = `Hey @${reviewer1} and @${reviewer2}. Please make a code review for my merge request ${link || '[link]'}.`;
        } else {
            message = `Hey @${reviewer1}. Please make a code review for my merge request ${link || '[link]'}.`;
        }
        
        Utils.copyToClipboard(message);
        Utils.showNotification('Review message copied to clipboard!');
    }

    // QA section methods
    updateQaMessage() {
        const tester = this.elements.testerSelect.value;
        const branch = this.elements.branchName.value.trim();
        
        let message = '';
        let isValid = false;
        
        if (tester && branch) {
            message = `@${tester} task is completed, please check: ${branch}`;
            isValid = true;
        } else if (tester) {
            message = `@${tester} task is completed, please check: [branch name]`;
        } else {
            message = 'Select tester and add branch name to generate message';
        }
        
        this.elements.qaMessage.textContent = message;
        this.elements.copyQaBtn.disabled = !isValid;
        
        if (isValid) {
            this.elements.copyQaBtn.classList.remove('disabled:bg-gray-300');
        } else {
            this.elements.copyQaBtn.classList.add('disabled:bg-gray-300');
        }
    }

    copyQaMessage() {
        const tester = this.elements.testerSelect.value;
        const branch = this.elements.branchName.value.trim();
        
        if (!tester || !branch) return;
        
        const message = `@${tester} task is completed, please check: ${branch}`;
        
        Utils.copyToClipboard(message);
        Utils.showNotification('QA message copied to clipboard!');
    }

    // Resolved section methods
    updateResolvedMessage() {
        const reviewer = this.elements.resolvedReviewerSelect.value;
        const link = this.elements.resolvedLink.value.trim();
        
        let message = '';
        let isValid = false;
        
        if (reviewer && link) {
            message = `@${reviewer} comments in GitLab is resolved please check ${link}`;
            isValid = true;
        } else if (reviewer) {
            message = `@${reviewer} comments in GitLab is resolved please check [link]`;
        } else {
            message = 'Select reviewer and add link to generate message';
        }
        
        this.elements.resolvedMessage.textContent = message;
        this.elements.copyResolvedBtn.disabled = !isValid;
        
        if (isValid) {
            this.elements.copyResolvedBtn.classList.remove('disabled:bg-gray-300');
        } else {
            this.elements.copyResolvedBtn.classList.add('disabled:bg-gray-300');
        }
    }

    copyResolvedMessage() {
        const reviewer = this.elements.resolvedReviewerSelect.value;
        const link = this.elements.resolvedLink.value.trim();
        
        if (!reviewer || !link) return;
        
        const message = `@${reviewer} comments in GitLab is resolved please check ${link}`;
        
        Utils.copyToClipboard(message);
        Utils.showNotification('Resolved message copied to clipboard!');
    }

    // Method to auto-fill from history (called from History tab)
    autoFillFromHistory(historyItem) {
        if (historyItem.branchName) {
            this.elements.branchName.value = historyItem.branchName;
            this.updateQaMessage();
        }
        
        // If there's a GitLab merge request URL in the history item, use it
        if (historyItem.gitlabMergeRequestUrl) {
            this.elements.mergeRequestLink.value = historyItem.gitlabMergeRequestUrl;
            this.elements.resolvedLink.value = historyItem.gitlabMergeRequestUrl;
            this.updateReviewMessage();
            this.updateResolvedMessage();
        }
    }

    // Settings management methods
    async loadSettings() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['templatesSettings'], resolve);
        });
        
        this.settings = data.templatesSettings || {
            reviewers: ['reviewer1', 'reviewer2', 'reviewer3', 'testuser1', 'testuser2'],
            testers: ['tester', 'qa1', 'qa2', 'testuser3'],
            favoriteReviewer1: '',
            favoriteReviewer2: '',
            favoriteTester: ''
        };
        
        this.populateDropdowns();
        this.setFavoriteDefaults();
    }

    async saveSettings() {
        // Get values from settings modal
        this.settings.favoriteReviewer1 = this.elements.favoriteReviewer1.value;
        this.settings.favoriteReviewer2 = this.elements.favoriteReviewer2.value;
        this.settings.favoriteTester = this.elements.favoriteTester.value;
        
        // Save to storage
        chrome.storage.local.set({ templatesSettings: this.settings }, () => {
            Utils.showNotification('Templates settings saved!');
            this.closeSettingsModal();
            this.populateDropdowns();
            this.setFavoriteDefaults();
        });
    }

    populateDropdowns() {
        // Clear existing options (except first "Select..." option)
        [this.elements.reviewer1Select, this.elements.reviewer2Select, this.elements.resolvedReviewerSelect].forEach(select => {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
        });
        
        while (this.elements.testerSelect.children.length > 1) {
            this.elements.testerSelect.removeChild(this.elements.testerSelect.lastChild);
        }

        // Add reviewers to dropdowns
        this.settings.reviewers.forEach(reviewer => {
            [this.elements.reviewer1Select, this.elements.reviewer2Select, this.elements.resolvedReviewerSelect].forEach(select => {
                const option = document.createElement('option');
                option.value = reviewer;
                option.textContent = `@${reviewer}`;
                select.appendChild(option);
            });
        });

        // Add testers to dropdown
        this.settings.testers.forEach(tester => {
            const option = document.createElement('option');
            option.value = tester;
            option.textContent = `@${tester}`;
            this.elements.testerSelect.appendChild(option);
        });
    }

    setFavoriteDefaults() {
        // Set favorite reviewers as default
        if (this.settings.favoriteReviewer1) {
            this.elements.reviewer1Select.value = this.settings.favoriteReviewer1;
        }
        if (this.settings.favoriteReviewer2) {
            this.elements.reviewer2Select.value = this.settings.favoriteReviewer2;
        }
        if (this.settings.favoriteTester) {
            this.elements.testerSelect.value = this.settings.favoriteTester;
        }
        
        // Update messages
        this.updateReviewMessage();
        this.updateQaMessage();
        this.updateResolvedMessage();
    }

    async openSettingsModal() {
        // Ensure settings are loaded first
        if (!this.settings || !this.settings.reviewers) {
            await this.loadSettings();
        }
        
        // Populate settings modal with current data
        this.populateSettingsModal();
        this.elements.settingsModal.style.display = 'flex';
        this.elements.settingsModal.classList.remove('hidden');
    }

    closeSettingsModal() {
        this.elements.settingsModal.style.display = 'none';
        this.elements.settingsModal.classList.add('hidden');
    }

    populateSettingsModal() {
        // Clear and populate reviewers list
        this.elements.reviewersList.innerHTML = '';
        this.settings.reviewers.forEach((reviewer, index) => {
            this.addReviewerToList(reviewer, index);
        });

        // Clear and populate testers list
        this.elements.testersList.innerHTML = '';
        this.settings.testers.forEach((tester, index) => {
            this.addTesterToList(tester, index);
        });

        // Populate favorite dropdowns in modal
        this.populateFavoriteDropdowns();
        
        // Set current favorites
        this.elements.favoriteReviewer1.value = this.settings.favoriteReviewer1;
        this.elements.favoriteReviewer2.value = this.settings.favoriteReviewer2;
        this.elements.favoriteTester.value = this.settings.favoriteTester;
    }

    populateFavoriteDropdowns() {
        // Clear favorite dropdowns
        [this.elements.favoriteReviewer1, this.elements.favoriteReviewer2].forEach(select => {
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
        });
        while (this.elements.favoriteTester.children.length > 1) {
            this.elements.favoriteTester.removeChild(this.elements.favoriteTester.lastChild);
        }

        // Add reviewers to favorite dropdowns
        this.settings.reviewers.forEach(reviewer => {
            [this.elements.favoriteReviewer1, this.elements.favoriteReviewer2].forEach(select => {
                const option = document.createElement('option');
                option.value = reviewer;
                option.textContent = `@${reviewer}`;
                select.appendChild(option);
            });
        });

        // Add testers to favorite dropdown
        this.settings.testers.forEach(tester => {
            const option = document.createElement('option');
            option.value = tester;
            option.textContent = `@${tester}`;
            this.elements.favoriteTester.appendChild(option);
        });
    }

    addReviewer() {
        const newReviewer = this.elements.newReviewerInput.value.trim().replace('@', '');
        if (newReviewer && !this.settings.reviewers.includes(newReviewer)) {
            this.settings.reviewers.push(newReviewer);
            this.addReviewerToList(newReviewer, this.settings.reviewers.length - 1);
            this.populateFavoriteDropdowns();
            this.elements.newReviewerInput.value = '';
        }
    }

    addTester() {
        const newTester = this.elements.newTesterInput.value.trim().replace('@', '');
        if (newTester && !this.settings.testers.includes(newTester)) {
            this.settings.testers.push(newTester);
            this.addTesterToList(newTester, this.settings.testers.length - 1);
            this.populateFavoriteDropdowns();
            this.elements.newTesterInput.value = '';
        }
    }

    addReviewerToList(reviewer, index) {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-gray-50 p-2 rounded';
        div.innerHTML = `
            <span>@${reviewer}</span>
            <button class="text-red-500 hover:text-red-700 text-sm remove-reviewer-btn" data-index="${index}">🗑️</button>
        `;
        
        // Add event listener to the remove button
        const removeBtn = div.querySelector('.remove-reviewer-btn');
        removeBtn.addEventListener('click', () => this.removeReviewer(index));
        
        this.elements.reviewersList.appendChild(div);
    }

    addTesterToList(tester, index) {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between bg-gray-50 p-2 rounded';
        div.innerHTML = `
            <span>@${tester}</span>
            <button class="text-red-500 hover:text-red-700 text-sm remove-tester-btn" data-index="${index}">🗑️</button>
        `;
        
        // Add event listener to the remove button
        const removeBtn = div.querySelector('.remove-tester-btn');
        removeBtn.addEventListener('click', () => this.removeTester(index));
        
        this.elements.testersList.appendChild(div);
    }

    removeReviewer(index) {
        if (!this.settings || !this.settings.reviewers) {
            console.error('Settings not loaded');
            return;
        }
        this.settings.reviewers.splice(index, 1);
        this.populateSettingsModal();
    }

    removeTester(index) {
        if (!this.settings || !this.settings.testers) {
            console.error('Settings not loaded');
            return;
        }
        this.settings.testers.splice(index, 1);
        this.populateSettingsModal();
    }

    // Clear section methods
    clearReviewSection() {
        this.elements.reviewer1Select.value = this.settings.favoriteReviewer1 || '';
        this.elements.reviewer2Select.value = this.settings.favoriteReviewer2 || '';
        this.elements.mergeRequestLink.value = '';
        this.updateReviewMessage();
    }

    clearQaSection() {
        this.elements.testerSelect.value = this.settings.favoriteTester || '';
        this.elements.branchName.value = '';
        this.updateQaMessage();
    }

    clearResolvedSection() {
        this.elements.resolvedReviewerSelect.value = this.settings.favoriteReviewer1 || '';
        this.elements.resolvedLink.value = '';
        this.updateResolvedMessage();
    }
}
