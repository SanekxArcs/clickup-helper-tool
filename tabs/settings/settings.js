import { Utils } from '../../shared/utils.js';

export class SettingsTab {
    constructor() {
        this.elements = {};
        this.rateLimits = {
            requests_per_minute: 15,
            requests_per_day: 1500
        };
        this.initialize();
    }

    initialize() {
        this.initializeElements();
        this.setupEventListeners();
        this.loadSavedData();
        this.updateRateLimitsDisplay();
    }

    initializeElements() {
        this.elements = {
            apiKey: document.getElementById('apiKey'),
            geminiModel: document.getElementById('geminiModel'),
            temperature: document.getElementById('temperature'),
            temperatureValue: document.getElementById('temperatureValue'),
            timeEstimationPrompt: document.getElementById('timeEstimationPrompt'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            settingsSaved: document.getElementById('settingsSaved'),
            
            // Rate limits display
            minuteUsage: document.getElementById('minuteUsage'),
            dayUsage: document.getElementById('dayUsage'),
            minuteBar: document.getElementById('minuteBar'),
            dayBar: document.getElementById('dayBar'),
            rateLimitReset: document.getElementById('rateLimitReset'),
            
            // Shortcuts
            openShortcutsPage: document.getElementById('openShortcutsPage'),
            
            // Data import/export
            exportDataBtn: document.getElementById('exportDataBtn'),
            importDataBtn: document.getElementById('importDataBtn'),
            importFileInput: document.getElementById('importFileInput'),
            exportSuccess: document.getElementById('exportSuccess'),
            importSuccess: document.getElementById('importSuccess'),
            importError: document.getElementById('importError'),
            
            // Rules modal
            openRulesModalBtn: document.getElementById('openRulesModalBtn'),
            rulesModal: document.getElementById('rulesModal'),
            rulesModalCloseBtn: document.getElementById('rulesModalCloseBtn'),
            rulesModalCancelBtn: document.getElementById('rulesModalCancelBtn'),
            branchRules: document.getElementById('branchRules'),
            commitRules: document.getElementById('commitRules'),
            saveRulesBtn: document.getElementById('saveRulesBtn'),
            loadDefaultRulesBtn: document.getElementById('loadDefaultRulesBtn'),
            rulesSaved: document.getElementById('rulesSaved')
        };
    }

    setupEventListeners() {
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        if (this.elements.temperature) {
            this.elements.temperature.addEventListener('input', () => this.updateTemperatureDisplay());
        }

        if (this.elements.openShortcutsPage) {
            this.elements.openShortcutsPage.addEventListener('click', () => this.openShortcutsPage());
        }

        if (this.elements.exportDataBtn) {
            this.elements.exportDataBtn.addEventListener('click', () => this.exportData());
        }

        if (this.elements.importDataBtn) {
            this.elements.importDataBtn.addEventListener('click', () => this.elements.importFileInput.click());
        }

        if (this.elements.importFileInput) {
            this.elements.importFileInput.addEventListener('change', (e) => this.importData(e));
        }

        // Rules modal event listeners
        if (this.elements.openRulesModalBtn) {
            this.elements.openRulesModalBtn.addEventListener('click', () => this.openRulesModal());
        }

        if (this.elements.rulesModalCloseBtn) {
            this.elements.rulesModalCloseBtn.addEventListener('click', () => this.closeRulesModal());
        }

        if (this.elements.rulesModalCancelBtn) {
            this.elements.rulesModalCancelBtn.addEventListener('click', () => this.closeRulesModal());
        }

        if (this.elements.saveRulesBtn) {
            this.elements.saveRulesBtn.addEventListener('click', () => this.saveRules());
        }

        if (this.elements.loadDefaultRulesBtn) {
            this.elements.loadDefaultRulesBtn.addEventListener('click', () => this.loadDefaultRules());
        }

        // Close modal when clicking outside
        if (this.elements.rulesModal) {
            this.elements.rulesModal.addEventListener('click', (e) => {
                if (e.target === this.elements.rulesModal) {
                    this.closeRulesModal();
                }
            });
        }
    }

    // Tab lifecycle methods
    onActivate() {
        // Refresh data when tab becomes active
        this.loadSavedData();
        this.updateRateLimitsDisplay();
    }

    onDeactivate() {
        // Clean up any ongoing operations
    }

    async loadSavedData() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['apiKey', 'geminiModel', 'temperature', 'timeEstimationPrompt', 'branchRules', 'commitRules'], resolve);
        });

        if (this.elements.apiKey) {
            this.elements.apiKey.value = data.apiKey || '';
        }
        
        if (this.elements.geminiModel) {
            this.elements.geminiModel.value = data.geminiModel || 'gemini-2.0-flash-exp';
        }
        
        if (this.elements.temperature) {
            this.elements.temperature.value = data.temperature || 0.3;
            this.updateTemperatureDisplay();
        }

        if (this.elements.timeEstimationPrompt) {
            this.elements.timeEstimationPrompt.value = data.timeEstimationPrompt || this.getDefaultTimeEstimationPrompt();
        }

        // Load rules data
        if (this.elements.branchRules) {
            this.elements.branchRules.value = data.branchRules || '';
        }
        
        if (this.elements.commitRules) {
            this.elements.commitRules.value = data.commitRules || '';
        }
    }

    saveSettings() {
        const data = {
            apiKey: this.elements.apiKey.value.trim(),
            geminiModel: this.elements.geminiModel.value,
            temperature: parseFloat(this.elements.temperature.value),
            timeEstimationPrompt: this.elements.timeEstimationPrompt.value.trim()
        };
        
        chrome.storage.local.set(data, () => {
            this.showTemporaryMessage();
            Utils.showNotification('Settings saved successfully');
        });
    }

    updateTemperatureDisplay() {
        if (this.elements.temperatureValue) {
            this.elements.temperatureValue.textContent = this.elements.temperature.value;
        }
    }

    showTemporaryMessage() {
        if (this.elements.settingsSaved) {
            this.elements.settingsSaved.classList.remove('hidden');
            setTimeout(() => {
                this.elements.settingsSaved.classList.add('hidden');
            }, 3000);
        }
    }

    openShortcutsPage() {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }

    async exportData() {
        try {
            // Get all extension data
            const data = await new Promise(resolve => {
                chrome.storage.local.get(null, resolve);
            });
            
            // Create export object with metadata
            const exportData = {
                exportDate: new Date().toISOString(),
                exportVersion: "1.0",
                extensionName: "Branch & Commit Helper",
                data: {
                    // Settings
                    apiKey: data.apiKey || "",
                    geminiModel: data.geminiModel || "gemini-2.0-flash-exp",
                    temperature: data.temperature || 0.3,
                    
                    // Rules
                    branchRules: data.branchRules || "",
                    commitRules: data.commitRules || "",
                    
                    // History
                    history: data.history || [],
                    
                    // Rate limit data (optional)
                    rateLimitData: data.rateLimitData || null
                }
            };
            
            // Create and download file
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const filename = `branch-commit-helper-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showExportSuccess();
            
        } catch (error) {
            console.error('Export error:', error);
            Utils.showNotification('Failed to export data: ' + error.message, 'error');
        }
    }

    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data structure
            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('Invalid backup file format');
            }
            
            // Confirm import
            const confirmMessage = `Import data from ${importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : 'unknown date'}?\n\nThis will replace:\n- API key and settings\n- Custom rules\n- History (${importData.data.history?.length || 0} items)\n\nCurrent data will be overwritten.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Import the data
            const dataToImport = {};
            
            // Import settings
            if (importData.data.apiKey !== undefined) dataToImport.apiKey = importData.data.apiKey;
            if (importData.data.geminiModel !== undefined) dataToImport.geminiModel = importData.data.geminiModel;
            if (importData.data.temperature !== undefined) dataToImport.temperature = importData.data.temperature;
            
            // Import rules
            if (importData.data.branchRules !== undefined) dataToImport.branchRules = importData.data.branchRules;
            if (importData.data.commitRules !== undefined) dataToImport.commitRules = importData.data.commitRules;
            
            // Import history
            if (importData.data.history !== undefined) dataToImport.history = importData.data.history;
            
            // Import rate limit data (optional)
            if (importData.data.rateLimitData !== undefined) dataToImport.rateLimitData = importData.data.rateLimitData;
            
            // Save to storage
            await new Promise(resolve => {
                chrome.storage.local.set(dataToImport, resolve);
            });
            
            // Reload the UI with imported data
            this.loadSavedData();
            this.updateRateLimitsDisplay();
            
            // Show success message
            this.showImportSuccess();
            
            // Clear file input
            this.elements.importFileInput.value = '';
            
        } catch (error) {
            console.error('Import error:', error);
            this.showImportError('Failed to import data: ' + error.message);
            
            // Clear file input
            this.elements.importFileInput.value = '';
        }
    }

    showExportSuccess() {
        if (this.elements.exportSuccess) {
            this.elements.exportSuccess.classList.remove('hidden');
            setTimeout(() => {
                this.elements.exportSuccess.classList.add('hidden');
            }, 3000);
        }
    }

    showImportSuccess() {
        if (this.elements.importSuccess) {
            this.elements.importSuccess.classList.remove('hidden');
            setTimeout(() => {
                this.elements.importSuccess.classList.add('hidden');
            }, 3000);
        }
    }

    showImportError(message) {
        if (this.elements.importError) {
            this.elements.importError.textContent = message;
            this.elements.importError.classList.remove('hidden');
            setTimeout(() => {
                this.elements.importError.classList.add('hidden');
            }, 5000);
        }
    }

    // Rate limiting methods
    async checkAndUpdateRateLimit() {
        const now = Date.now();
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['rateLimitData'], resolve);
        });

        let rateLimitData = data.rateLimitData || {
            minuteRequests: [],
            dayRequests: [],
            lastReset: now
        };

        // Clean old requests
        const oneMinuteAgo = now - 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        rateLimitData.minuteRequests = rateLimitData.minuteRequests.filter(time => time > oneMinuteAgo);
        rateLimitData.dayRequests = rateLimitData.dayRequests.filter(time => time > oneDayAgo);

        // Check limits
        if (rateLimitData.minuteRequests.length >= this.rateLimits.requests_per_minute) {
            return false;
        }

        if (rateLimitData.dayRequests.length >= this.rateLimits.requests_per_day) {
            return false;
        }

        // Add current request
        rateLimitData.minuteRequests.push(now);
        rateLimitData.dayRequests.push(now);

        // Save updated data
        chrome.storage.local.set({ rateLimitData });
        
        // Update display after rate limit check
        this.updateRateLimitsDisplay();
        
        return true;
    }

    async updateRateLimitsDisplay() {
        const now = Date.now();
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['rateLimitData'], resolve);
        });

        let rateLimitData = data.rateLimitData || {
            minuteRequests: [],
            dayRequests: [],
            lastReset: now
        };

        // Clean old requests
        const oneMinuteAgo = now - 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        rateLimitData.minuteRequests = rateLimitData.minuteRequests.filter(time => time > oneMinuteAgo);
        rateLimitData.dayRequests = rateLimitData.dayRequests.filter(time => time > oneDayAgo);

        const minuteCount = rateLimitData.minuteRequests.length;
        const dayCount = rateLimitData.dayRequests.length;

        // Update usage display
        if (this.elements.minuteUsage) {
            this.elements.minuteUsage.textContent = `${minuteCount} / ${this.rateLimits.requests_per_minute}`;
        }
        if (this.elements.dayUsage) {
            this.elements.dayUsage.textContent = `${dayCount} / ${this.rateLimits.requests_per_day}`;
        }

        // Update progress bars
        const minutePercent = (minuteCount / this.rateLimits.requests_per_minute) * 100;
        const dayPercent = (dayCount / this.rateLimits.requests_per_day) * 100;

        if (this.elements.minuteBar) {
            this.elements.minuteBar.style.width = minutePercent + '%';
            this.updateProgressBarColor(this.elements.minuteBar, minutePercent);
        }
        
        if (this.elements.dayBar) {
            this.elements.dayBar.style.width = dayPercent + '%';
            this.updateProgressBarColor(this.elements.dayBar, dayPercent);
        }

        // Update reset time display
        const nextReset = this.getNextResetTime(rateLimitData.minuteRequests);
        if (this.elements.rateLimitReset) {
            if (nextReset && minuteCount >= this.rateLimits.requests_per_minute) {
                this.elements.rateLimitReset.innerHTML = `<small>Minute limit resets in ${nextReset}</small>`;
            } else {
                this.elements.rateLimitReset.innerHTML = '<small>Limits reset automatically</small>';
            }
        }
    }

    updateProgressBarColor(progressBar, percent) {
        progressBar.classList.remove('warning', 'danger');
        
        if (percent >= 90) {
            progressBar.classList.add('danger');
        } else if (percent >= 70) {
            progressBar.classList.add('warning');
        }
    }

    getNextResetTime(requests) {
        if (requests.length === 0) return null;
        
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + 60 * 1000; // 1 minute after oldest request
        const now = Date.now();
        
        if (resetTime <= now) return null;
        
        const seconds = Math.ceil((resetTime - now) / 1000);
        return seconds > 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
    }

    // Method to get API settings for use by other tabs
    async getApiSettings() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['apiKey', 'geminiModel', 'temperature'], resolve);
        });

        return {
            apiKey: data.apiKey || '',
            geminiModel: data.geminiModel || 'gemini-2.0-flash-exp',
            temperature: data.temperature || 0.3
        };
    }

    // Rules modal methods
    openRulesModal() {
        if (this.elements.rulesModal) {
            this.elements.rulesModal.classList.remove('hidden');
            // Focus on first input
            if (this.elements.branchRules) {
                this.elements.branchRules.focus();
            }
        }
    }

    closeRulesModal() {
        if (this.elements.rulesModal) {
            this.elements.rulesModal.classList.add('hidden');
        }
    }

    async saveRules() {
        const data = {
            branchRules: this.elements.branchRules ? this.elements.branchRules.value.trim() : '',
            commitRules: this.elements.commitRules ? this.elements.commitRules.value.trim() : ''
        };
        
        chrome.storage.local.set(data, () => {
            this.showRulesSavedMessage();
            Utils.showNotification('Rules saved successfully');
            // Keep modal open so user can continue editing if needed
        });
    }

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

    showRulesSavedMessage() {
        if (this.elements.rulesSaved) {
            this.elements.rulesSaved.classList.remove('hidden');
            setTimeout(() => {
                this.elements.rulesSaved.classList.add('hidden');
            }, 3000);
        }
    }

    // Method to get rules for use by other tabs
    async getRules() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['branchRules', 'commitRules'], resolve);
        });

        return {
            branchRules: data.branchRules || '',
            commitRules: data.commitRules || ''
        };
    }

    getDefaultTimeEstimationPrompt() {
        return `You are a senior software development project manager with expertise in time estimation.

Task Information:
- Task ID: {taskId}
- Title: {taskTitle}
- Description: {taskDescription}

Analyze this task and provide time estimations for different experience levels. Consider:
- Task complexity and scope
- Implementation requirements
- Testing time
- Code review and iteration time
- Documentation needs
- Potential blockers or research needed

Provide estimations in the following JSON format (respond with ONLY the JSON, no additional text):
{
  "junior": "Xh Ymin",
  "mid": "Xh Ymin", 
  "senior": "Xh Ymin",
  "reasoning": "Brief explanation of the estimation factors"
}

Guidelines:
- Use format like "2h 30min", "45min", "1h 15min"
- Junior developers typically take 1.5-3x longer than senior developers
- Mid-level developers typically take 1.2-2x longer than senior developers
- Consider learning curve, debugging time, and mentorship needs
- Be realistic but not overly conservative
- Minimum estimation should be 15min, maximum should be reasonable`;
    }
}
