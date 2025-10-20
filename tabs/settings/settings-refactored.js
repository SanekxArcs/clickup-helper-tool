import { APIConfigManager } from './managers/APIConfigManager.js';
import { RulesManager } from './managers/RulesManager.js';
import { DataBackupManager } from './managers/DataBackupManager.js';
import { RateLimitManager } from './managers/RateLimitManager.js';
import { UIHelpers } from './managers/UIHelpers.js';

export class SettingsTab {
    constructor() {
        this.elements = {};
        this.initializeElements();
        this.createManagers();
        // Note: initialize() is called by the Application class after HTML is loaded
    }

    /**
     * Initialize and cache all DOM elements
     */
    initializeElements() {
        this.elements = {
            // API configuration
            apiKey: document.getElementById('apiKey'),
            temperature: document.getElementById('temperature'),
            temperatureValue: document.getElementById('temperatureValue'),
            timeEstimationPrompt: document.getElementById('timeEstimationPrompt'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            saveTimeEstimationBtn: document.getElementById('saveTimeEstimationBtn'),
            
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
            
            // Rules modal
            openRulesModalBtn: document.getElementById('openRulesModalBtn'),
            rulesModal: document.getElementById('rulesModal'),
            rulesModalCloseBtn: document.getElementById('rulesModalCloseBtn'),
            rulesModalCancelBtn: document.getElementById('rulesModalCancelBtn'),
            branchRules: document.getElementById('branchRules'),
            commitRules: document.getElementById('commitRules'),
            saveRulesBtn: document.getElementById('saveRulesBtn'),
            loadDefaultRulesBtn: document.getElementById('loadDefaultRulesBtn')
        };
    }

    /**
     * Create all manager instances
     */
    createManagers() {
        this.apiConfigManager = new APIConfigManager(this, this.elements);
        this.rulesManager = new RulesManager(this, this.elements);
        this.dataBackupManager = new DataBackupManager(this, this.elements);
        this.rateLimitManager = new RateLimitManager(this, this.elements);
    }

    /**
     * Initialize the settings tab
     */
    async initialize() {
        // Re-cache elements now that HTML is loaded
        this.initializeElements();
        // Re-create managers with proper elements
        this.createManagers();
        
        await this.loadSavedData();
        await this.updateRateLimitsDisplay();
        this.setupEventListeners();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // API Configuration events
        if (this.elements.saveSettingsBtn) {
            this.elements.saveSettingsBtn.addEventListener('click', () => this.apiConfigManager.saveSettings());
        }

        // Time Estimation event
        if (this.elements.saveTimeEstimationBtn) {
            this.elements.saveTimeEstimationBtn.addEventListener('click', () => this.apiConfigManager.saveTimeEstimationPrompt());
        }

        if (this.elements.temperature) {
            this.elements.temperature.addEventListener('input', () => this.apiConfigManager.updateTemperatureDisplay());
        }

        // Shortcuts event
        if (this.elements.openShortcutsPage) {
            this.elements.openShortcutsPage.addEventListener('click', () => UIHelpers.openShortcutsPage());
        }

        // Data backup/restore events
        if (this.elements.exportDataBtn) {
            this.elements.exportDataBtn.addEventListener('click', () => this.dataBackupManager.exportData());
        }

        if (this.elements.importDataBtn) {
            this.elements.importDataBtn.addEventListener('click', () => this.elements.importFileInput.click());
        }

        if (this.elements.importFileInput) {
            this.elements.importFileInput.addEventListener('change', (e) => this.dataBackupManager.importData(e));
        }

        // Rules modal events
        if (this.elements.openRulesModalBtn) {
            this.elements.openRulesModalBtn.addEventListener('click', () => this.rulesManager.openRulesModal());
        }

        if (this.elements.rulesModalCloseBtn) {
            this.elements.rulesModalCloseBtn.addEventListener('click', () => this.rulesManager.closeRulesModal());
        }

        if (this.elements.rulesModalCancelBtn) {
            this.elements.rulesModalCancelBtn.addEventListener('click', () => this.rulesManager.closeRulesModal());
        }

        if (this.elements.saveRulesBtn) {
            this.elements.saveRulesBtn.addEventListener('click', () => this.rulesManager.saveRules());
        }

        if (this.elements.loadDefaultRulesBtn) {
            this.elements.loadDefaultRulesBtn.addEventListener('click', () => this.rulesManager.loadDefaultRules());
        }

        // Close modal when clicking outside
        if (this.elements.rulesModal) {
            this.elements.rulesModal.addEventListener('click', (e) => {
                if (e.target === this.elements.rulesModal) {
                    this.rulesManager.closeRulesModal();
                }
            });
        }
    }

    /**
     * Tab lifecycle: called when tab becomes active
     */
    onActivate() {
        this.loadSavedData();
        this.updateRateLimitsDisplay();
    }

    /**
     * Tab lifecycle: called when tab becomes inactive
     */
    onDeactivate() {
        // Clean up any ongoing operations
    }

    /**
     * Load all saved data from storage and populate UI
     */
    async loadSavedData() {
        await this.apiConfigManager.loadSavedData();
        await this.rulesManager.loadSavedData();
    }

    /**
     * Update rate limits display
     */
    async updateRateLimitsDisplay() {
        await this.rateLimitManager.updateRateLimitsDisplay();
    }

    /**
     * Check and update rate limit (used by other tabs)
     */
    async checkAndUpdateRateLimit() {
        return await this.rateLimitManager.checkAndUpdateRateLimit();
    }

    /**
     * Get API settings for use by other tabs
     */
    async getApiSettings() {
        return await this.apiConfigManager.getApiSettings();
    }

    /**
     * Get rules for use by other tabs
     */
    async getRules() {
        return await this.rulesManager.getRules();
    }

    /**
     * Get current rate limits for selected model
     */
    getCurrentRateLimits() {
        return this.rateLimitManager.getCurrentRateLimits();
    }
}
