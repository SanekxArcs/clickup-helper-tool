import { Utils } from '../../shared/utils.js';

export class ToolsTab {
    constructor() {
        this.elements = {};
        this.initialize();
    }

    initialize() {
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            // Screen size inputs
            screenWidth: document.getElementById('screenWidth'),
            screenHeight: document.getElementById('screenHeight'),
            
            // Base font size
            baseFontSize: document.getElementById('baseFontSize'),
            
            // Input value and unit
            inputValue: document.getElementById('inputValue'),
            // Remove inputUnit since we're using buttons now
            
            // Unit buttons
            unitButtons: document.querySelectorAll('.unit-btn'),
            
            // Results
            conversionResults: document.getElementById('conversionResults'),
            resultPx: document.getElementById('resultPx'),
            resultRem: document.getElementById('resultRem'),
            resultVw: document.getElementById('resultVw'),
            resultVh: document.getElementById('resultVh'),
            conversionFormula: document.getElementById('conversionFormula'),
            
            // Preset buttons
            presetButtons: document.querySelectorAll('.screen-preset-btn'),
            
            // Breakpoint checker elements
            breakpointCheckerEnabled: document.getElementById('breakpointCheckerEnabled'),
            localhostOnly: document.getElementById('localhostOnly'),
            overlayPosition: document.getElementById('overlayPosition'),
            breakpointName: document.getElementById('breakpointName'),
            breakpointValue: document.getElementById('breakpointValue'),
            addBreakpoint: document.getElementById('addBreakpoint'),
            breakpointsList: document.getElementById('breakpointsList'),
            resetBreakpoints: document.getElementById('resetBreakpoints')
        };
        
        // Initialize selected unit
        this.selectedUnit = 'px';
        
        // Initialize breakpoint checker
        this.initializeBreakpointChecker();
    }

    setupEventListeners() {
        // Input value change
        if (this.elements.inputValue) {
            this.elements.inputValue.addEventListener('input', () => this.calculateConversions());
        }
        
        // Unit button clicks
        this.elements.unitButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                this.elements.unitButtons.forEach(btn => {
                    btn.classList.remove('bg-blue-500', 'text-white');
                    btn.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                });
                
                // Add active class to clicked button
                button.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
                button.classList.add('bg-blue-500', 'text-white');
                
                // Update selected unit
                this.selectedUnit = button.dataset.unit;
                
                // Recalculate conversions
                this.calculateConversions();
            });
        });
        
        // Screen size changes
        if (this.elements.screenWidth) {
            this.elements.screenWidth.addEventListener('input', () => this.calculateConversions());
        }
        
        if (this.elements.screenHeight) {
            this.elements.screenHeight.addEventListener('input', () => this.calculateConversions());
        }
        
        // Base font size change
        if (this.elements.baseFontSize) {
            this.elements.baseFontSize.addEventListener('input', () => this.calculateConversions());
        }
        
        // Preset buttons
        this.elements.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const width = button.dataset.width;
                const height = button.dataset.height;
                
                if (this.elements.screenWidth) this.elements.screenWidth.value = width;
                if (this.elements.screenHeight) this.elements.screenHeight.value = height;
                
                this.calculateConversions();
            });
        });
        
        // Breakpoint checker event listeners
        this.setupBreakpointCheckerListeners();
    }

    calculateConversions() {
        const inputValue = parseFloat(this.elements.inputValue?.value);
        const inputUnit = this.selectedUnit; // Use selectedUnit instead of dropdown value
        const screenWidth = parseFloat(this.elements.screenWidth?.value) || 1440;
        const screenHeight = parseFloat(this.elements.screenHeight?.value) || 900;
        const baseFontSize = parseFloat(this.elements.baseFontSize?.value) || 16;
        
        if (!inputValue || isNaN(inputValue) || inputValue <= 0) {
            this.hideResults();
            return;
        }
        
        let pxValue, remValue, vwValue, vhValue;
        let formula = '';
        
        // Convert input to pixels first
        switch (inputUnit) {
            case 'px':
                pxValue = inputValue;
                formula = `${inputValue}px`;
                break;
            case 'rem':
                pxValue = inputValue * baseFontSize;
                formula = `${inputValue}rem × ${baseFontSize}px = ${pxValue}px`;
                break;
            case 'vw':
                pxValue = (inputValue * screenWidth) / 100;
                formula = `${inputValue}vw × ${screenWidth}px ÷ 100 = ${pxValue}px`;
                break;
            case 'vh':
                pxValue = (inputValue * screenHeight) / 100;
                formula = `${inputValue}vh × ${screenHeight}px ÷ 100 = ${pxValue}px`;
                break;
        }
        
        // Calculate all other units from pixels
        remValue = (pxValue / baseFontSize).toFixed(4);
        vwValue = ((pxValue / screenWidth) * 100).toFixed(4);
        vhValue = ((pxValue / screenHeight) * 100).toFixed(4);
        
        // Update results
        this.showResults({
            px: pxValue.toFixed(2),
            rem: remValue,
            vw: vwValue,
            vh: vhValue,
            formula: formula
        });
    }

    showResults(results) {
        if (this.elements.resultPx) this.elements.resultPx.textContent = results.px;
        if (this.elements.resultRem) this.elements.resultRem.textContent = results.rem;
        if (this.elements.resultVw) this.elements.resultVw.textContent = `${results.vw}%`;
        if (this.elements.resultVh) this.elements.resultVh.textContent = `${results.vh}%`;
        
        if (this.elements.conversionFormula) {
            this.elements.conversionFormula.textContent = `Formula: ${results.formula}`;
        }
        
        if (this.elements.conversionResults) {
            this.elements.conversionResults.classList.remove('hidden');
        }
    }

    hideResults() {
        if (this.elements.conversionResults) {
            this.elements.conversionResults.classList.add('hidden');
        }
    }

    // Tab lifecycle methods (called by TabManager)
    onActivate() {
        console.log('Tools tab activated');
        // Re-initialize elements in case they weren't available during construction
        this.initializeElements();
        this.setupEventListeners();
        // Reload breakpoint settings to ensure UI is up to date
        this.loadBreakpointSettings();
    }

    onDeactivate() {
        console.log('Tools tab deactivated');
    }
    
    // Breakpoint Checker Methods
    initializeBreakpointChecker() {
        // Default Tailwind CSS breakpoints
        this.defaultBreakpoints = [
            { name: 'sm', value: 640 },
            { name: 'md', value: 768 },
            { name: 'lg', value: 1024 },
            { name: 'xl', value: 1280 },
            { name: '2xl', value: 1536 }
        ];
        
        this.loadBreakpointSettings();
    }
    
    async loadBreakpointSettings() {
        try {
            const result = await chrome.storage.sync.get({
                breakpointCheckerEnabled: false,
                localhostOnly: false,
                overlayPosition: 'bottom-right',
                customBreakpoints: this.defaultBreakpoints
            });
            
            if (this.elements.breakpointCheckerEnabled) {
                this.elements.breakpointCheckerEnabled.checked = result.breakpointCheckerEnabled;
            }
            if (this.elements.localhostOnly) {
                this.elements.localhostOnly.checked = result.localhostOnly;
            }
            if (this.elements.overlayPosition) {
                this.elements.overlayPosition.value = result.overlayPosition;
            }
            
            this.customBreakpoints = result.customBreakpoints;
            this.renderBreakpointsList();
            
        } catch (error) {
            console.error('Error loading breakpoint settings:', error);
            this.customBreakpoints = this.defaultBreakpoints;
            this.renderBreakpointsList();
        }
    }
    
    async saveBreakpointSettings() {
        try {
            await chrome.storage.sync.set({
                breakpointCheckerEnabled: this.elements.breakpointCheckerEnabled?.checked || false,
                localhostOnly: this.elements.localhostOnly?.checked || false,
                overlayPosition: this.elements.overlayPosition?.value || 'bottom-right',
                customBreakpoints: this.customBreakpoints
            });
            
            // Notify content scripts about the change
            this.notifyContentScripts();
        } catch (error) {
            console.error('Error saving breakpoint settings:', error);
        }
    }
    
    async notifyContentScripts() {
        try {
            const tabs = await chrome.tabs.query({});
            const settings = {
                enabled: this.elements.breakpointCheckerEnabled?.checked || false,
                localhostOnly: this.elements.localhostOnly?.checked || false,
                overlayPosition: this.elements.overlayPosition?.value || 'bottom-right',
                breakpoints: this.customBreakpoints
            };
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'BREAKPOINT_CHECKER_UPDATE',
                        settings: settings
                    });
                } catch (error) {
                    // Ignore errors for tabs that don't have content scripts
                }
            }
        } catch (error) {
            console.error('Error notifying content scripts:', error);
        }
    }
    
    setupBreakpointCheckerListeners() {
        // Enable/disable toggle
        if (this.elements.breakpointCheckerEnabled) {
            this.elements.breakpointCheckerEnabled.addEventListener('change', () => {
                this.saveBreakpointSettings();
            });
        }
        
        // Localhost only toggle
        if (this.elements.localhostOnly) {
            this.elements.localhostOnly.addEventListener('change', () => {
                this.saveBreakpointSettings();
            });
        }
        
        // Overlay position change
        if (this.elements.overlayPosition) {
            this.elements.overlayPosition.addEventListener('change', () => {
                this.saveBreakpointSettings();
            });
        }
        
        // Listen for storage changes to update UI when overlay position is changed by clicking
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.overlayPosition && this.elements.overlayPosition) {
                this.elements.overlayPosition.value = changes.overlayPosition.newValue;
            }
        });
        
        // Add breakpoint
        if (this.elements.addBreakpoint) {
            this.elements.addBreakpoint.addEventListener('click', () => {
                this.addCustomBreakpoint();
            });
        }
        
        // Reset breakpoints
        if (this.elements.resetBreakpoints) {
            this.elements.resetBreakpoints.addEventListener('click', () => {
                this.resetToDefaultBreakpoints();
            });
        }
        
        // Enter key on inputs
        [this.elements.breakpointName, this.elements.breakpointValue].forEach(element => {
            if (element) {
                element.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addCustomBreakpoint();
                    }
                });
            }
        });
    }
    
    addCustomBreakpoint() {
        const name = this.elements.breakpointName?.value.trim();
        const value = parseInt(this.elements.breakpointValue?.value);
        
        if (!name || !value || value <= 0) {
            alert('Please enter a valid breakpoint name and width value.');
            return;
        }
        
        // Check if breakpoint already exists
        const existingIndex = this.customBreakpoints.findIndex(bp => bp.name === name);
        if (existingIndex !== -1) {
            // Update existing breakpoint
            this.customBreakpoints[existingIndex].value = value;
        } else {
            // Add new breakpoint
            this.customBreakpoints.push({ name, value });
        }
        
        // Sort breakpoints by value
        this.customBreakpoints.sort((a, b) => a.value - b.value);
        
        // Clear inputs
        if (this.elements.breakpointName) this.elements.breakpointName.value = '';
        if (this.elements.breakpointValue) this.elements.breakpointValue.value = '';
        
        this.renderBreakpointsList();
        this.saveBreakpointSettings();
    }
    
    removeBreakpoint(name) {
        this.customBreakpoints = this.customBreakpoints.filter(bp => bp.name !== name);
        this.renderBreakpointsList();
        this.saveBreakpointSettings();
    }
    
    resetToDefaultBreakpoints() {
        if (confirm('Reset to default Tailwind CSS breakpoints? This will remove all custom breakpoints.')) {
            this.customBreakpoints = [...this.defaultBreakpoints];
            this.renderBreakpointsList();
            this.saveBreakpointSettings();
        }
    }
    
    renderBreakpointsList() {
        if (!this.elements.breakpointsList) return;
        
        this.elements.breakpointsList.innerHTML = '';
        
        this.customBreakpoints.forEach(breakpoint => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm';
            item.innerHTML = `
                <span class="font-mono">${breakpoint.name}: ${breakpoint.value}px</span>
                <button class="text-red-500 hover:text-red-700 text-xs" data-name="${breakpoint.name}">×</button>
            `;
            
            const deleteBtn = item.querySelector('button');
            deleteBtn.addEventListener('click', () => {
                this.removeBreakpoint(breakpoint.name);
            });
            
            this.elements.breakpointsList.appendChild(item);
        });
    }
}
