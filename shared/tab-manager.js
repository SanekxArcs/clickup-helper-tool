// Tab Manager - handles tab switching and initialization
import { Utils } from '../shared/utils.js';

export class TabManager {
    constructor() {
        this.tabs = {};
        this.currentTab = 'generate';
        this.elements = {
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content')
        };
        this.initialize();
    }

    initialize() {
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
    }

    registerTab(name, tabInstance) {
        this.tabs[name] = tabInstance;
    }

    switchTab(tabName) {
        // Remove active classes from all tabs
        this.elements.tabs.forEach(tab => {
            tab.classList.remove('bg-blue-500', 'text-white');
            tab.classList.add('hover:bg-gray-100');
        });
        
        // Hide all tab contents
        this.elements.tabContents.forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('block');
        });
        
        // Add active class to selected tab
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('bg-blue-500', 'text-white');
            activeTab.classList.remove('hover:bg-gray-100');
        }
        
        // Show selected tab content
        const activeContent = document.getElementById(`${tabName}-tab`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add('block');
        }

        // Cleanup previous tab
        if (this.tabs[this.currentTab] && this.tabs[this.currentTab].onDeactivate) {
            this.tabs[this.currentTab].onDeactivate();
        }

        // Activate new tab
        this.currentTab = tabName;
        if (this.tabs[tabName] && this.tabs[tabName].onActivate) {
            this.tabs[tabName].onActivate();
        }
    }

    getCurrentTab() {
        return this.currentTab;
    }
}
