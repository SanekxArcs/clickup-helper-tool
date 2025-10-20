import { Utils } from '../../../shared/utils.js';
import { ToastManager } from '../../../shared/toast-manager.js';

export class RulesManager {
    constructor(tab, elements) {
        this.tab = tab;
        this.elements = elements;
    }

    /**
     * Load saved rules from storage
     */
    async loadSavedData() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['branchRules', 'commitRules'], resolve);
        });

        if (this.elements.branchRules) {
            this.elements.branchRules.value = data.branchRules || '';
        }
        
        if (this.elements.commitRules) {
            this.elements.commitRules.value = data.commitRules || '';
        }
    }

    /**
     * Open the rules management modal
     */
    openRulesModal() {
        if (this.elements.rulesModal) {
            this.elements.rulesModal.classList.remove('hidden');
            // Focus on first input
            if (this.elements.branchRules) {
                this.elements.branchRules.focus();
            }
        }
    }

    /**
     * Close the rules management modal
     */
    closeRulesModal() {
        if (this.elements.rulesModal) {
            this.elements.rulesModal.classList.add('hidden');
        }
    }

    /**
     * Save branch and commit rules to storage
     */
    async saveRules() {
        const data = {
            branchRules: this.elements.branchRules ? this.elements.branchRules.value.trim() : '',
            commitRules: this.elements.commitRules ? this.elements.commitRules.value.trim() : ''
        };
        
        chrome.storage.local.set(data, () => {
            ToastManager.success('✅ Rules saved successfully!');
        });
    }

    /**
     * Load default rules template
     */
    loadDefaultRules() {
        const defaultBranchRules = `Branch naming conventions:
• Use lowercase with hyphens for separation
• Include ticket/task ID when available
• Format: {type}/{ticket-id}-{short-description}
• Types: feature, bugfix, hotfix, chore, docs
• Examples:
  - feature/JIRA-123-user-authentication
  - bugfix/GH-456-fix-login-error
  - hotfix/urgent-security-patch
  - chore/update-dependencies`;

        const defaultCommitRules = `Commit message conventions:
• Follow conventional commits format
• Format: {type}({scope}): {description}
• Types: feat, fix, docs, style, refactor, test, chore
• Keep first line under 50 characters
• Use imperative mood ("add" not "added")
• Examples:
  - feat(auth): add user login validation
  - fix(ui): resolve button styling issue
  - docs: update API documentation
  - refactor(utils): simplify date formatting
  - test: add unit tests for user service`;

        if (this.elements.branchRules) {
            this.elements.branchRules.value = defaultBranchRules;
        }
        
        if (this.elements.commitRules) {
            this.elements.commitRules.value = defaultCommitRules;
        }
    }

    /**
     * Get saved rules for use by other tabs
     */
    async getRules() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['branchRules', 'commitRules'], resolve);
        });

        return {
            branchRules: data.branchRules || '',
            commitRules: data.commitRules || ''
        };
    }
}
