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
            resetBreakpoints: document.getElementById('resetBreakpoints'),
            
            // Performance monitor elements
            performanceMonitorEnabled: document.getElementById('performanceMonitorEnabled'),
            performanceLocalhostOnly: document.getElementById('performanceLocalhostOnly'),
            performancePosition: document.getElementById('performancePosition'),
            performanceUpdateInterval: document.getElementById('performanceUpdateInterval'),
            showFPS: document.getElementById('showFPS'),
            showMemory: document.getElementById('showMemory'),
            showFrameTime: document.getElementById('showFrameTime'),
            showDOMNodes: document.getElementById('showDOMNodes'),
            
            // CSS Grid/Flexbox Visualizer elements
            gridFlexVisualizerEnabled: document.getElementById('gridFlexVisualizerEnabled'),
            gridFlexLocalhostOnly: document.getElementById('gridFlexLocalhostOnly'),
            showGridContainers: document.getElementById('showGridContainers'),
            showFlexContainers: document.getElementById('showFlexContainers'),
            showGridLines: document.getElementById('showGridLines'),
            showGaps: document.getElementById('showGaps'),
            gridFlexColor: document.getElementById('gridFlexColor'),
            
            // Box Model Visualizer elements
            boxModelVisualizerEnabled: document.getElementById('boxModelVisualizerEnabled'),
            boxModelLocalhostOnly: document.getElementById('boxModelLocalhostOnly'),
            boxModelTrigger: document.getElementById('boxModelTrigger'),
            showBoxModelOverlay: document.getElementById('showBoxModelOverlay'),
            showBoxModelValues: document.getElementById('showBoxModelValues'),
            showBoxModelTooltip: document.getElementById('showBoxModelTooltip'),
            
            // Console Log Overlay elements
            consoleOverlayEnabled: document.getElementById('consoleOverlayEnabled'),
            consoleLocalhostOnly: document.getElementById('consoleLocalhostOnly'),
            consolePosition: document.getElementById('consolePosition'),
            showConsoleLogs: document.getElementById('showConsoleLogs'),
            showConsoleWarnings: document.getElementById('showConsoleWarnings'),
            showConsoleErrors: document.getElementById('showConsoleErrors'),
            showConsoleInfo: document.getElementById('showConsoleInfo'),
            consoleMaxEntries: document.getElementById('consoleMaxEntries')
        };
        
        // Initialize selected unit
        this.selectedUnit = 'px';
        
        // Initialize breakpoint checker
        this.initializeBreakpointChecker();
        
        // Initialize performance monitor
        this.initializePerformanceMonitor();
        
        // Initialize CSS Grid/Flexbox Visualizer
        this.initializeGridFlexVisualizer();
        
        // Initialize Box Model Visualizer
        this.initializeBoxModelVisualizer();
        
        // Initialize Console Log Overlay
        this.initializeConsoleOverlay();
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
        
        // Performance monitor event listeners
        this.setupPerformanceMonitorListeners();
        
        // CSS Grid/Flexbox Visualizer event listeners
        this.setupGridFlexVisualizerListeners();
        
        // Box Model Visualizer event listeners
        this.setupBoxModelVisualizerListeners();
        
        // Console Log Overlay event listeners
        this.setupConsoleOverlayListeners();
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
    
    // Performance Monitor Methods
    initializePerformanceMonitor() {
        this.loadPerformanceSettings();
    }
    
    async loadPerformanceSettings() {
        try {
            const result = await chrome.storage.sync.get({
                performanceMonitorEnabled: false,
                performanceLocalhostOnly: false,
                performancePosition: 'top-left',
                performanceUpdateInterval: 250,
                showFPS: true,
                showMemory: true,
                showFrameTime: false,
                showDOMNodes: false
            });
            
            if (this.elements.performanceMonitorEnabled) {
                this.elements.performanceMonitorEnabled.checked = result.performanceMonitorEnabled;
            }
            if (this.elements.performanceLocalhostOnly) {
                this.elements.performanceLocalhostOnly.checked = result.performanceLocalhostOnly;
            }
            if (this.elements.performancePosition) {
                this.elements.performancePosition.value = result.performancePosition;
            }
            if (this.elements.performanceUpdateInterval) {
                this.elements.performanceUpdateInterval.value = result.performanceUpdateInterval.toString();
            }
            if (this.elements.showFPS) {
                this.elements.showFPS.checked = result.showFPS;
            }
            if (this.elements.showMemory) {
                this.elements.showMemory.checked = result.showMemory;
            }
            if (this.elements.showFrameTime) {
                this.elements.showFrameTime.checked = result.showFrameTime;
            }
            if (this.elements.showDOMNodes) {
                this.elements.showDOMNodes.checked = result.showDOMNodes;
            }
        } catch (error) {
            console.error('Error loading performance settings:', error);
        }
    }
    
    async savePerformanceSettings() {
        try {
            const settings = {
                performanceMonitorEnabled: this.elements.performanceMonitorEnabled?.checked || false,
                performanceLocalhostOnly: this.elements.performanceLocalhostOnly?.checked || false,
                performancePosition: this.elements.performancePosition?.value || 'top-left',
                performanceUpdateInterval: parseInt(this.elements.performanceUpdateInterval?.value) || 250,
                showFPS: this.elements.showFPS?.checked || false,
                showMemory: this.elements.showMemory?.checked || false,
                showFrameTime: this.elements.showFrameTime?.checked || false,
                showDOMNodes: this.elements.showDOMNodes?.checked || false
            };
            
            await chrome.storage.sync.set(settings);
            this.notifyPerformanceContentScripts();
        } catch (error) {
            console.error('Error saving performance settings:', error);
        }
    }
    
    async notifyPerformanceContentScripts() {
        try {
            const tabs = await chrome.tabs.query({});
            const settings = {
                performanceMonitorEnabled: this.elements.performanceMonitorEnabled?.checked || false,
                performanceLocalhostOnly: this.elements.performanceLocalhostOnly?.checked || false,
                performancePosition: this.elements.performancePosition?.value || 'top-left',
                performanceUpdateInterval: parseInt(this.elements.performanceUpdateInterval?.value) || 250,
                showFPS: this.elements.showFPS?.checked || false,
                showMemory: this.elements.showMemory?.checked || false,
                showFrameTime: this.elements.showFrameTime?.checked || false,
                showDOMNodes: this.elements.showDOMNodes?.checked || false
            };
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'PERFORMANCE_SETTINGS_UPDATE',
                        settings: settings
                    });
                } catch (error) {
                    // Ignore errors for tabs that don't have content scripts
                }
            }
        } catch (error) {
            console.error('Error notifying performance content scripts:', error);
        }
    }
    
    setupPerformanceMonitorListeners() {
        // Enable/disable toggle
        if (this.elements.performanceMonitorEnabled) {
            this.elements.performanceMonitorEnabled.addEventListener('change', () => {
                this.savePerformanceSettings();
            });
        }
        
        // Localhost only toggle
        if (this.elements.performanceLocalhostOnly) {
            this.elements.performanceLocalhostOnly.addEventListener('change', () => {
                this.savePerformanceSettings();
            });
        }
        
        // Position change
        if (this.elements.performancePosition) {
            this.elements.performancePosition.addEventListener('change', () => {
                this.savePerformanceSettings();
            });
        }
        
        // Update interval change
        if (this.elements.performanceUpdateInterval) {
            this.elements.performanceUpdateInterval.addEventListener('change', () => {
                this.savePerformanceSettings();
            });
        }
        
        // Metric toggles
        [this.elements.showFPS, this.elements.showMemory, this.elements.showFrameTime, this.elements.showDOMNodes].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.savePerformanceSettings();
                });
            }
        });
        
        // Listen for storage changes to update UI
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.performancePosition && this.elements.performancePosition) {
                    this.elements.performancePosition.value = changes.performancePosition.newValue;
                }
            }
        });
    }
    
    // CSS Grid/Flexbox Visualizer Methods
    initializeGridFlexVisualizer() {
        this.loadGridFlexSettings();
    }
    
    async loadGridFlexSettings() {
        try {
            const result = await chrome.storage.sync.get({
                gridFlexVisualizerEnabled: false,
                gridFlexLocalhostOnly: false,
                showGridContainers: true,
                showFlexContainers: true,
                showGridLines: true,
                showGaps: true,
                gridFlexColor: '#3b82f6'
            });
            
            if (this.elements.gridFlexVisualizerEnabled) {
                this.elements.gridFlexVisualizerEnabled.checked = result.gridFlexVisualizerEnabled;
            }
            if (this.elements.gridFlexLocalhostOnly) {
                this.elements.gridFlexLocalhostOnly.checked = result.gridFlexLocalhostOnly;
            }
            if (this.elements.showGridContainers) {
                this.elements.showGridContainers.checked = result.showGridContainers;
            }
            if (this.elements.showFlexContainers) {
                this.elements.showFlexContainers.checked = result.showFlexContainers;
            }
            if (this.elements.showGridLines) {
                this.elements.showGridLines.checked = result.showGridLines;
            }
            if (this.elements.showGaps) {
                this.elements.showGaps.checked = result.showGaps;
            }
            if (this.elements.gridFlexColor) {
                this.elements.gridFlexColor.value = result.gridFlexColor;
            }
        } catch (error) {
            console.error('Error loading grid/flex settings:', error);
        }
    }
    
    async saveGridFlexSettings() {
        try {
            const settings = {
                gridFlexVisualizerEnabled: this.elements.gridFlexVisualizerEnabled?.checked || false,
                gridFlexLocalhostOnly: this.elements.gridFlexLocalhostOnly?.checked || false,
                showGridContainers: this.elements.showGridContainers?.checked || true,
                showFlexContainers: this.elements.showFlexContainers?.checked || true,
                showGridLines: this.elements.showGridLines?.checked || true,
                showGaps: this.elements.showGaps?.checked || true,
                gridFlexColor: this.elements.gridFlexColor?.value || '#3b82f6'
            };
            
            await chrome.storage.sync.set(settings);
            this.notifyGridFlexContentScripts();
        } catch (error) {
            console.error('Error saving grid/flex settings:', error);
        }
    }
    
    async notifyGridFlexContentScripts() {
        try {
            const tabs = await chrome.tabs.query({});
            const settings = {
                gridFlexVisualizerEnabled: this.elements.gridFlexVisualizerEnabled?.checked || false,
                gridFlexLocalhostOnly: this.elements.gridFlexLocalhostOnly?.checked || false,
                showGridContainers: this.elements.showGridContainers?.checked || true,
                showFlexContainers: this.elements.showFlexContainers?.checked || true,
                showGridLines: this.elements.showGridLines?.checked || true,
                showGaps: this.elements.showGaps?.checked || true,
                gridFlexColor: this.elements.gridFlexColor?.value || '#3b82f6'
            };
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'GRID_FLEX_SETTINGS_UPDATE',
                        settings: settings
                    });
                } catch (error) {
                    // Ignore errors for tabs that don't have content scripts
                }
            }
        } catch (error) {
            console.error('Error notifying grid/flex content scripts:', error);
        }
    }
    
    setupGridFlexVisualizerListeners() {
        // Enable/disable toggle
        if (this.elements.gridFlexVisualizerEnabled) {
            this.elements.gridFlexVisualizerEnabled.addEventListener('change', () => {
                this.saveGridFlexSettings();
            });
        }
        
        // Localhost only toggle
        if (this.elements.gridFlexLocalhostOnly) {
            this.elements.gridFlexLocalhostOnly.addEventListener('change', () => {
                this.saveGridFlexSettings();
            });
        }
        
        // Feature toggles
        [this.elements.showGridContainers, this.elements.showFlexContainers, this.elements.showGridLines, this.elements.showGaps].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.saveGridFlexSettings();
                });
            }
        });
        
        // Color picker
        if (this.elements.gridFlexColor) {
            this.elements.gridFlexColor.addEventListener('change', () => {
                this.saveGridFlexSettings();
            });
        }
    }
    
    // Box Model Visualizer Methods
    initializeBoxModelVisualizer() {
        this.loadBoxModelSettings();
    }
    
    async loadBoxModelSettings() {
        try {
            const result = await chrome.storage.sync.get({
                boxModelVisualizerEnabled: false,
                boxModelLocalhostOnly: false,
                boxModelTrigger: 'hover',
                showBoxModelOverlay: true,
                showBoxModelValues: true,
                showBoxModelTooltip: true
            });
            
            if (this.elements.boxModelVisualizerEnabled) {
                this.elements.boxModelVisualizerEnabled.checked = result.boxModelVisualizerEnabled;
            }
            if (this.elements.boxModelLocalhostOnly) {
                this.elements.boxModelLocalhostOnly.checked = result.boxModelLocalhostOnly;
            }
            if (this.elements.boxModelTrigger) {
                this.elements.boxModelTrigger.value = result.boxModelTrigger;
            }
            if (this.elements.showBoxModelOverlay) {
                this.elements.showBoxModelOverlay.checked = result.showBoxModelOverlay;
            }
            if (this.elements.showBoxModelValues) {
                this.elements.showBoxModelValues.checked = result.showBoxModelValues;
            }
            if (this.elements.showBoxModelTooltip) {
                this.elements.showBoxModelTooltip.checked = result.showBoxModelTooltip;
            }
        } catch (error) {
            console.error('Error loading box model settings:', error);
        }
    }
    
    async saveBoxModelSettings() {
        try {
            const settings = {
                boxModelVisualizerEnabled: this.elements.boxModelVisualizerEnabled?.checked || false,
                boxModelLocalhostOnly: this.elements.boxModelLocalhostOnly?.checked || false,
                boxModelTrigger: this.elements.boxModelTrigger?.value || 'hover',
                showBoxModelOverlay: this.elements.showBoxModelOverlay?.checked || true,
                showBoxModelValues: this.elements.showBoxModelValues?.checked || true,
                showBoxModelTooltip: this.elements.showBoxModelTooltip?.checked || true
            };
            
            await chrome.storage.sync.set(settings);
            this.notifyBoxModelContentScripts();
        } catch (error) {
            console.error('Error saving box model settings:', error);
        }
    }
    
    async notifyBoxModelContentScripts() {
        try {
            const tabs = await chrome.tabs.query({});
            const settings = {
                boxModelVisualizerEnabled: this.elements.boxModelVisualizerEnabled?.checked || false,
                boxModelLocalhostOnly: this.elements.boxModelLocalhostOnly?.checked || false,
                boxModelTrigger: this.elements.boxModelTrigger?.value || 'hover',
                showBoxModelOverlay: this.elements.showBoxModelOverlay?.checked || true,
                showBoxModelValues: this.elements.showBoxModelValues?.checked || true,
                showBoxModelTooltip: this.elements.showBoxModelTooltip?.checked || true
            };
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'BOX_MODEL_SETTINGS_UPDATE',
                        settings: settings
                    });
                } catch (error) {
                    // Ignore errors for tabs that don't have content scripts
                }
            }
        } catch (error) {
            console.error('Error notifying box model content scripts:', error);
        }
    }
    
    setupBoxModelVisualizerListeners() {
        // Enable/disable toggle
        if (this.elements.boxModelVisualizerEnabled) {
            this.elements.boxModelVisualizerEnabled.addEventListener('change', () => {
                this.saveBoxModelSettings();
            });
        }
        
        // Localhost only toggle
        if (this.elements.boxModelLocalhostOnly) {
            this.elements.boxModelLocalhostOnly.addEventListener('change', () => {
                this.saveBoxModelSettings();
            });
        }
        
        // Trigger method change
        if (this.elements.boxModelTrigger) {
            this.elements.boxModelTrigger.addEventListener('change', () => {
                this.saveBoxModelSettings();
            });
        }
        
        // Feature toggles
        [this.elements.showBoxModelOverlay, this.elements.showBoxModelValues, this.elements.showBoxModelTooltip].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.saveBoxModelSettings();
                });
            }
        });
    }
    
    // Console Log Overlay Methods
    initializeConsoleOverlay() {
        this.loadConsoleSettings();
    }
    
    async loadConsoleSettings() {
        try {
            const result = await chrome.storage.sync.get({
                consoleOverlayEnabled: false,
                consoleLocalhostOnly: false,
                consolePosition: 'bottom-left',
                showConsoleLogs: true,
                showConsoleWarnings: true,
                showConsoleErrors: true,
                showConsoleInfo: false,
                consoleMaxEntries: 50
            });
            
            if (this.elements.consoleOverlayEnabled) {
                this.elements.consoleOverlayEnabled.checked = result.consoleOverlayEnabled;
            }
            if (this.elements.consoleLocalhostOnly) {
                this.elements.consoleLocalhostOnly.checked = result.consoleLocalhostOnly;
            }
            if (this.elements.consolePosition) {
                this.elements.consolePosition.value = result.consolePosition;
            }
            if (this.elements.showConsoleLogs) {
                this.elements.showConsoleLogs.checked = result.showConsoleLogs;
            }
            if (this.elements.showConsoleWarnings) {
                this.elements.showConsoleWarnings.checked = result.showConsoleWarnings;
            }
            if (this.elements.showConsoleErrors) {
                this.elements.showConsoleErrors.checked = result.showConsoleErrors;
            }
            if (this.elements.showConsoleInfo) {
                this.elements.showConsoleInfo.checked = result.showConsoleInfo;
            }
            if (this.elements.consoleMaxEntries) {
                this.elements.consoleMaxEntries.value = result.consoleMaxEntries.toString();
            }
        } catch (error) {
            console.error('Error loading console settings:', error);
        }
    }
    
    async saveConsoleSettings() {
        try {
            const settings = {
                consoleOverlayEnabled: this.elements.consoleOverlayEnabled?.checked || false,
                consoleLocalhostOnly: this.elements.consoleLocalhostOnly?.checked || false,
                consolePosition: this.elements.consolePosition?.value || 'bottom-left',
                showConsoleLogs: this.elements.showConsoleLogs?.checked || true,
                showConsoleWarnings: this.elements.showConsoleWarnings?.checked || true,
                showConsoleErrors: this.elements.showConsoleErrors?.checked || true,
                showConsoleInfo: this.elements.showConsoleInfo?.checked || false,
                consoleMaxEntries: parseInt(this.elements.consoleMaxEntries?.value) || 50
            };
            
            await chrome.storage.sync.set(settings);
            this.notifyConsoleContentScripts();
        } catch (error) {
            console.error('Error saving console settings:', error);
        }
    }
    
    async notifyConsoleContentScripts() {
        try {
            const tabs = await chrome.tabs.query({});
            const settings = {
                consoleOverlayEnabled: this.elements.consoleOverlayEnabled?.checked || false,
                consoleLocalhostOnly: this.elements.consoleLocalhostOnly?.checked || false,
                consolePosition: this.elements.consolePosition?.value || 'bottom-left',
                showConsoleLogs: this.elements.showConsoleLogs?.checked || true,
                showConsoleWarnings: this.elements.showConsoleWarnings?.checked || true,
                showConsoleErrors: this.elements.showConsoleErrors?.checked || true,
                showConsoleInfo: this.elements.showConsoleInfo?.checked || false,
                consoleMaxEntries: parseInt(this.elements.consoleMaxEntries?.value) || 50
            };
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        type: 'CONSOLE_SETTINGS_UPDATE',
                        settings: settings
                    });
                } catch (error) {
                    // Ignore errors for tabs that don't have content scripts
                }
            }
        } catch (error) {
            console.error('Error notifying console content scripts:', error);
        }
    }
    
    setupConsoleOverlayListeners() {
        // Enable/disable toggle
        if (this.elements.consoleOverlayEnabled) {
            this.elements.consoleOverlayEnabled.addEventListener('change', () => {
                this.saveConsoleSettings();
            });
        }
        
        // Localhost only toggle
        if (this.elements.consoleLocalhostOnly) {
            this.elements.consoleLocalhostOnly.addEventListener('change', () => {
                this.saveConsoleSettings();
            });
        }
        
        // Position change
        if (this.elements.consolePosition) {
            this.elements.consolePosition.addEventListener('change', () => {
                this.saveConsoleSettings();
            });
        }
        
        // Log type toggles
        [this.elements.showConsoleLogs, this.elements.showConsoleWarnings, this.elements.showConsoleErrors, this.elements.showConsoleInfo].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.saveConsoleSettings();
                });
            }
        });
        
        // Max entries change
        if (this.elements.consoleMaxEntries) {
            this.elements.consoleMaxEntries.addEventListener('change', () => {
                this.saveConsoleSettings();
            });
        }
    }
}
