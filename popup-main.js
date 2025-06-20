// Main application entry point - loads and manages all tabs
import { TabManager } from './shared/tab-manager.js';
import { GenerateTab } from './tabs/generate/generate.js';
import { HistoryTab } from './tabs/history/history.js';
import { PomodoroTab } from './tabs/pomodoro/pomodoro.js';
import { SettingsTab } from './tabs/settings/settings.js';
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
            this.loadTabHTML('pomodoro'),
            this.loadTabHTML('settings')
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

        // Initialize Pomodoro tab
        this.tabs.pomodoro = new PomodoroTab();
        this.tabManager.registerTab('pomodoro', this.tabs.pomodoro);

        // Initialize Settings tab
        this.tabs.settings = new SettingsTab();
        this.tabManager.registerTab('settings', this.tabs.settings);

        // Activate the default tab
        this.tabManager.switchTab('generate');
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
}

// Initialize the application
new Application();
