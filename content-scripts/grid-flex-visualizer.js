class GridFlexVisualizer {
    constructor() {
        this.settings = {
            gridFlexVisualizerEnabled: false,
            gridFlexLocalhostOnly: false,
            showGridContainers: true,
            showFlexContainers: true,
            showGridLines: true,
            showGaps: true,
            gridFlexColor: 'blue'
        };
        
        this.overlays = new Map();
        this.observer = null;
        this.isActive = false;
        
        this.colorMap = {
            blue: '#3b82f6',
            red: '#ef4444',
            green: '#10b981',
            purple: '#8b5cf6',
            orange: '#f97316'
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupMessageListener();
        this.checkAndActivate();
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                gridFlexVisualizerEnabled: false,
                gridFlexLocalhostOnly: false,
                showGridContainers: true,
                showFlexContainers: true,
                showGridLines: true,
                showGaps: true,
                gridFlexColor: 'blue'
            });
            
            this.settings = result;
        } catch (error) {
            console.error('Error loading grid/flex settings:', error);
        }
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'GRID_FLEX_SETTINGS_UPDATE') {
                this.settings = message.settings;
                this.checkAndActivate();
            }
        });
    }
    
    checkAndActivate() {
        const shouldBeActive = this.settings.gridFlexVisualizerEnabled && this.isValidDomain();
        
        if (shouldBeActive && !this.isActive) {
            this.activate();
        } else if (!shouldBeActive && this.isActive) {
            this.deactivate();
        } else if (this.isActive) {
            this.updateVisualization();
        }
    }
    
    isValidDomain() {
        if (!this.settings.gridFlexLocalhostOnly) {
            return true;
        }
        
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname.startsWith('192.168.') || 
               hostname.startsWith('10.') || 
               hostname.startsWith('172.');
    }
    
    activate() {
        this.isActive = true;
        this.createVisualization();
        this.setupObserver();
    }
    
    deactivate() {
        this.isActive = false;
        this.clearVisualization();
        this.disconnectObserver();
    }
    
    setupObserver() {
        this.observer = new MutationObserver(() => {
            this.updateVisualization();
        });
        
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
    }
    
    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
    
    createVisualization() {
        this.clearVisualization();
        
        const elements = this.findGridFlexElements();
        elements.forEach(element => {
            this.createOverlayForElement(element);
        });
    }
    
    updateVisualization() {
        // Debounce updates
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this.createVisualization();
        }, 100);
    }
    
    findGridFlexElements() {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const display = computedStyle.display;
            
            if (this.settings.showGridContainers && (display === 'grid' || display === 'inline-grid')) {
                elements.push({ element, type: 'grid' });
            }
            
            if (this.settings.showFlexContainers && (display === 'flex' || display === 'inline-flex')) {
                elements.push({ element, type: 'flex' });
            }
        });
        
        return elements;
    }
    
    createOverlayForElement(elementData) {
        const { element, type } = elementData;
        const rect = element.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) return;
        
        const overlay = document.createElement('div');
        overlay.className = `grid-flex-visualizer-overlay grid-flex-${type}`;
        
        const color = this.colorMap[this.settings.gridFlexColor] || this.colorMap.blue;
        
        overlay.style.cssText = `
            position: fixed;
            top: ${rect.top + window.scrollY}px;
            left: ${rect.left + window.scrollX}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 2px solid ${color};
            background: ${color}15;
            pointer-events: none;
            z-index: 999999;
            box-sizing: border-box;
            font-family: monospace;
            font-size: 12px;
        `;
        
        // Add label
        const label = document.createElement('div');
        label.style.cssText = `
            position: absolute;
            top: -20px;
            left: 0;
            background: ${color};
            color: white;
            padding: 2px 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 2px;
            white-space: nowrap;
        `;
        label.textContent = `display: ${type}`;
        overlay.appendChild(label);
        
        // Add grid-specific visualizations
        if (type === 'grid' && this.settings.showGridLines) {
            this.addGridLines(overlay, element, color);
        }
        
        // Add gap visualization
        if (this.settings.showGaps) {
            this.addGapVisualization(overlay, element, type, color);
        }
        
        document.body.appendChild(overlay);
        this.overlays.set(element, overlay);
        
        // Auto-remove after 5 seconds to prevent clutter
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
                this.overlays.delete(element);
            }
        }, 5000);
    }
    
    addGridLines(overlay, element, color) {
        const computedStyle = window.getComputedStyle(element);
        const gridTemplateColumns = computedStyle.gridTemplateColumns;
        const gridTemplateRows = computedStyle.gridTemplateRows;
        
        if (gridTemplateColumns !== 'none') {
            const columns = gridTemplateColumns.split(' ');
            let currentX = 0;
            
            columns.forEach((column, index) => {
                if (index > 0) {
                    const line = document.createElement('div');
                    line.style.cssText = `
                        position: absolute;
                        left: ${currentX}px;
                        top: 0;
                        width: 1px;
                        height: 100%;
                        background: ${color};
                        opacity: 0.7;
                    `;
                    overlay.appendChild(line);
                    
                    // Add column number
                    const number = document.createElement('div');
                    number.style.cssText = `
                        position: absolute;
                        left: ${currentX - 8}px;
                        top: -15px;
                        width: 16px;
                        height: 16px;
                        background: ${color};
                        color: white;
                        text-align: center;
                        line-height: 16px;
                        font-size: 10px;
                        border-radius: 50%;
                    `;
                    number.textContent = index.toString();
                    overlay.appendChild(number);
                }
                
                // Calculate next position (simplified)
                const rect = overlay.getBoundingClientRect();
                currentX += rect.width / columns.length;
            });
        }
        
        if (gridTemplateRows !== 'none') {
            const rows = gridTemplateRows.split(' ');
            let currentY = 0;
            
            rows.forEach((row, index) => {
                if (index > 0) {
                    const line = document.createElement('div');
                    line.style.cssText = `
                        position: absolute;
                        left: 0;
                        top: ${currentY}px;
                        width: 100%;
                        height: 1px;
                        background: ${color};
                        opacity: 0.7;
                    `;
                    overlay.appendChild(line);
                    
                    // Add row number
                    const number = document.createElement('div');
                    number.style.cssText = `
                        position: absolute;
                        left: -15px;
                        top: ${currentY - 8}px;
                        width: 16px;
                        height: 16px;
                        background: ${color};
                        color: white;
                        text-align: center;
                        line-height: 16px;
                        font-size: 10px;
                        border-radius: 50%;
                    `;
                    number.textContent = index.toString();
                    overlay.appendChild(number);
                }
                
                // Calculate next position (simplified)
                const rect = overlay.getBoundingClientRect();
                currentY += rect.height / rows.length;
            });
        }
    }
    
    addGapVisualization(overlay, element, type, color) {
        const computedStyle = window.getComputedStyle(element);
        let gap = null;
        
        if (type === 'grid') {
            gap = computedStyle.gap || computedStyle.gridGap;
        } else if (type === 'flex') {
            gap = computedStyle.gap;
        }
        
        if (gap && gap !== 'normal' && gap !== '0px') {
            const gapInfo = document.createElement('div');
            gapInfo.style.cssText = `
                position: absolute;
                bottom: -20px;
                right: 0;
                background: ${color};
                color: white;
                padding: 2px 6px;
                font-size: 10px;
                border-radius: 2px;
                white-space: nowrap;
            `;
            gapInfo.textContent = `gap: ${gap}`;
            overlay.appendChild(gapInfo);
        }
    }
    
    clearVisualization() {
        this.overlays.forEach(overlay => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        });
        this.overlays.clear();
        
        // Remove any remaining overlays
        const existingOverlays = document.querySelectorAll('.grid-flex-visualizer-overlay');
        existingOverlays.forEach(overlay => overlay.remove());
    }
}

// Initialize the visualizer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new GridFlexVisualizer();
    });
} else {
    new GridFlexVisualizer();
}