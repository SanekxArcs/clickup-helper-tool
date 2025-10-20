// Main application entry point - loads and manages all tabs
import { TabManager } from './shared/tab-manager.js';
import { GenerateTab } from './tabs/generate/generate.js';
import { HistoryTab } from './tabs/history/history.js';
import { TemplatesTab } from './tabs/templates/templates.js';
import { MattermostTab } from './tabs/mattermost/mattermost-refactored.js';
import { SettingsTab } from './tabs/settings/settings-refactored.js';
import { ToolsTab } from './tabs/tools/tools.js';
import { Utils } from './shared/utils.js';

class Application {
    constructor() {
        this.tabManager = null;
        this.tabs = {};
        this.initialize();
    }

    async initialize() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Load tab HTML content
            await this.loadTabContent();
            
            // Initialize tab manager
            this.tabManager = new TabManager();
            
            // Initialize tabs
            await this.initializeTabs();
            
            // Set up global message listeners
            this.setupGlobalMessageListeners();
            
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            Utils.showNotification('Failed to initialize extension', 'error');
        }
    }

    async loadTabContent() {
        const container = document.getElementById('tab-content-container');
        
        // Load each tab's HTML content
        const tabContents = await Promise.all([
            this.loadTabHTML('generate'),
            this.loadTabHTML('history'), 
            this.loadTabHTML('templates'),
            this.loadTabHTML('mattermost'),
            this.loadTabHTML('settings'),
            this.loadTabHTML('tools')
        ]);

        // Insert all tab content
        container.innerHTML = tabContents.join('');
        
        // Refresh tab manager elements after content is loaded
        this.refreshTabElements();
    }

    refreshTabElements() {
        // Refresh tab manager elements since new content was loaded
        if (this.tabManager) {
            this.tabManager.elements = {
                tabs: document.querySelectorAll('.tab'),
                tabContents: document.querySelectorAll('.tab-content')
            };
        }
    }

    async loadTabHTML(tabName) {
        try {
            const response = await fetch(`./tabs/${tabName}/${tabName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load ${tabName} tab: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error loading ${tabName} tab:`, error);
            return `<div id="${tabName}-tab" class="tab-content hidden">
                <div class="text-center text-red-500 p-8">
                    <p>Failed to load ${tabName} tab</p>
                    <small class="block mt-2">${error.message}</small>
                </div>
            </div>`;
        }
    }

    async initializeTabs() {
        // Initialize Generate tab
        this.tabs.generate = new GenerateTab();
        this.tabManager.registerTab('generate', this.tabs.generate);

        // Initialize History tab  
        this.tabs.history = new HistoryTab();
        this.tabManager.registerTab('history', this.tabs.history);

        // Initialize Templates tab
        this.tabs.templates = new TemplatesTab();
        this.tabManager.registerTab('templates', this.tabs.templates);

        // Initialize Mattermost tab
        this.tabs.mattermost = new MattermostTab();
        this.tabManager.registerTab('mattermost', this.tabs.mattermost);
        
        // Make mattermost tab globally accessible for delete functionality
        window.mattermostTab = this.tabs.mattermost;

        // Initialize Settings tab
        this.tabs.settings = new SettingsTab();
        this.tabManager.registerTab('settings', this.tabs.settings);
        // Initialize settings after HTML is loaded
        await this.tabs.settings.initialize();

        // Initialize Tools tab
        this.tabs.tools = new ToolsTab();
        this.tabManager.registerTab('tools', this.tabs.tools);

        // Check if we should auto-switch to History tab for ClickUp pages
        await this.checkForAutoSwitchToHistory();
        
        // Activate the default tab (if not already switched)
        if (this.tabManager.getCurrentTab() === 'generate') {
            this.tabManager.switchTab('generate');
        }
    }

    setupGlobalMessageListeners() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.type) {
                case 'QUICK_GENERATE_TRIGGERED':
                    this.handleQuickGenerate();
                    break;
                case 'AUTO_FILL_TRIGGERED':
                    this.handleAutoFill();
                    break;
                case 'COPY_TO_CLIPBOARD':
                    this.handleCopyToClipboard(request.text);
                    break;
            }
        });
    }

    async handleQuickGenerate() {
        this.tabManager.switchTab('generate');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this.tabs.generate && this.tabs.generate.autoFillFromPage) {
            await this.tabs.generate.autoFillFromPage();
            await this.tabs.generate.generateBranchAndCommit();
        }
    }

    async handleAutoFill() {
        this.tabManager.switchTab('generate');
        await new Promise(resolve => setTimeout(resolve, 100));
        if (this.tabs.generate && this.tabs.generate.autoFillFromPage) {
            await this.tabs.generate.autoFillFromPage();
        }
    }

    handleCopyToClipboard(text) {
        Utils.copyText(text);
    }

    async checkForAutoSwitchToHistory() {
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
                        // Switch to History tab to trigger auto-search
                        this.tabManager.switchTab('history');
                        return true;
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
                    if (timeDiff < 30000 && (data.lastExtractedData.id || data.lastExtractedData.title)) {
                        // Switch to History tab to trigger auto-search
                        this.tabManager.switchTab('history');
                        return true;
                    }
                }
            }
            
        } catch (error) {
            console.log('Auto-switch to history failed:', error);
        }
        
        return false;
    }
}

// Initialize the application
const application = new Application();
window.application = application;
