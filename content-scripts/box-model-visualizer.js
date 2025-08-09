class BoxModelVisualizer {
    constructor() {
        this.settings = {
            boxModelVisualizerEnabled: false,
            boxModelLocalhostOnly: false,
            boxModelTrigger: 'hover',
            showBoxModelOverlay: true,
            showBoxModelValues: true,
            showBoxModelTooltip: true
        };
        
        this.currentOverlay = null;
        this.currentTooltip = null;
        this.isActive = false;
        this.boundHandlers = {};
        
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
                boxModelVisualizerEnabled: false,
                boxModelLocalhostOnly: false,
                boxModelTrigger: 'hover',
                showBoxModelOverlay: true,
                showBoxModelValues: true,
                showBoxModelTooltip: true
            });
            
            this.settings = result;
        } catch (error) {
            console.error('Error loading box model settings:', error);
        }
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'BOX_MODEL_SETTINGS_UPDATE') {
                this.settings = message.settings;
                this.checkAndActivate();
            }
        });
    }
    
    checkAndActivate() {
        const shouldBeActive = this.settings.boxModelVisualizerEnabled && this.isValidDomain();
        
        if (shouldBeActive && !this.isActive) {
            this.activate();
        } else if (!shouldBeActive && this.isActive) {
            this.deactivate();
        }
    }
    
    isValidDomain() {
        if (!this.settings.boxModelLocalhostOnly) {
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
        this.setupEventListeners();
        
        if (this.settings.boxModelTrigger === 'always') {
            this.showAllBoxModels();
        }
    }
    
    deactivate() {
        this.isActive = false;
        this.removeEventListeners();
        this.hideOverlay();
        this.hideTooltip();
    }
    
    setupEventListeners() {
        this.removeEventListeners();
        
        if (this.settings.boxModelTrigger === 'hover') {
            this.boundHandlers.mouseenter = (e) => this.handleMouseEnter(e);
            this.boundHandlers.mouseleave = (e) => this.handleMouseLeave(e);
            
            document.addEventListener('mouseenter', this.boundHandlers.mouseenter, true);
            document.addEventListener('mouseleave', this.boundHandlers.mouseleave, true);
        } else if (this.settings.boxModelTrigger === 'click') {
            this.boundHandlers.click = (e) => this.handleClick(e);
            document.addEventListener('click', this.boundHandlers.click, true);
        }
    }
    
    removeEventListeners() {
        Object.entries(this.boundHandlers).forEach(([event, handler]) => {
            document.removeEventListener(event, handler, true);
        });
        this.boundHandlers = {};
    }
    
    handleMouseEnter(e) {
        if (this.isValidTarget(e.target)) {
            this.showBoxModel(e.target);
        }
    }
    
    handleMouseLeave(e) {
        if (this.isValidTarget(e.target)) {
            this.hideOverlay();
            this.hideTooltip();
        }
    }
    
    handleClick(e) {
        if (this.isValidTarget(e.target)) {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.currentOverlay && this.currentOverlay.targetElement === e.target) {
                this.hideOverlay();
                this.hideTooltip();
            } else {
                this.showBoxModel(e.target);
            }
        }
    }
    
    isValidTarget(element) {
        // Skip our own overlays and tooltips
        if (element.classList.contains('box-model-overlay') || 
            element.classList.contains('box-model-tooltip') ||
            element.closest('.box-model-overlay') ||
            element.closest('.box-model-tooltip')) {
            return false;
        }
        
        // Skip script and style elements
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
            return false;
        }
        
        return true;
    }
    
    showBoxModel(element) {
        this.hideOverlay();
        this.hideTooltip();
        
        const boxModel = this.calculateBoxModel(element);
        
        if (this.settings.showBoxModelOverlay) {
            this.createOverlay(element, boxModel);
        }
        
        if (this.settings.showBoxModelTooltip) {
            this.createTooltip(element, boxModel);
        }
    }
    
    calculateBoxModel(element) {
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        const margin = {
            top: parseFloat(computedStyle.marginTop) || 0,
            right: parseFloat(computedStyle.marginRight) || 0,
            bottom: parseFloat(computedStyle.marginBottom) || 0,
            left: parseFloat(computedStyle.marginLeft) || 0
        };
        
        const border = {
            top: parseFloat(computedStyle.borderTopWidth) || 0,
            right: parseFloat(computedStyle.borderRightWidth) || 0,
            bottom: parseFloat(computedStyle.borderBottomWidth) || 0,
            left: parseFloat(computedStyle.borderLeftWidth) || 0
        };
        
        const padding = {
            top: parseFloat(computedStyle.paddingTop) || 0,
            right: parseFloat(computedStyle.paddingRight) || 0,
            bottom: parseFloat(computedStyle.paddingBottom) || 0,
            left: parseFloat(computedStyle.paddingLeft) || 0
        };
        
        return {
            rect,
            margin,
            border,
            padding,
            content: {
                width: rect.width - border.left - border.right - padding.left - padding.right,
                height: rect.height - border.top - border.bottom - padding.top - padding.bottom
            }
        };
    }
    
    createOverlay(element, boxModel) {
        const { rect, margin, border, padding } = boxModel;
        
        const overlay = document.createElement('div');
        overlay.className = 'box-model-overlay';
        overlay.targetElement = element;
        
        overlay.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 999999;
            font-family: monospace;
            font-size: 11px;
            line-height: 1;
        `;
        
        // Margin area (orange)
        const marginBox = document.createElement('div');
        marginBox.style.cssText = `
            position: absolute;
            top: ${rect.top - margin.top}px;
            left: ${rect.left - margin.left}px;
            width: ${rect.width + margin.left + margin.right}px;
            height: ${rect.height + margin.top + margin.bottom}px;
            background: rgba(255, 165, 0, 0.2);
            border: 1px dashed rgba(255, 165, 0, 0.8);
        `;
        
        // Border area (yellow)
        const borderBox = document.createElement('div');
        borderBox.style.cssText = `
            position: absolute;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: rgba(255, 255, 0, 0.2);
            border: 1px dashed rgba(255, 255, 0, 0.8);
        `;
        
        // Padding area (green)
        const paddingBox = document.createElement('div');
        paddingBox.style.cssText = `
            position: absolute;
            top: ${rect.top + border.top}px;
            left: ${rect.left + border.left}px;
            width: ${rect.width - border.left - border.right}px;
            height: ${rect.height - border.top - border.bottom}px;
            background: rgba(0, 255, 0, 0.2);
            border: 1px dashed rgba(0, 255, 0, 0.8);
        `;
        
        // Content area (blue)
        const contentBox = document.createElement('div');
        contentBox.style.cssText = `
            position: absolute;
            top: ${rect.top + border.top + padding.top}px;
            left: ${rect.left + border.left + padding.left}px;
            width: ${boxModel.content.width}px;
            height: ${boxModel.content.height}px;
            background: rgba(0, 0, 255, 0.2);
            border: 1px dashed rgba(0, 0, 255, 0.8);
        `;
        
        overlay.appendChild(marginBox);
        overlay.appendChild(borderBox);
        overlay.appendChild(paddingBox);
        overlay.appendChild(contentBox);
        
        // Add value labels if enabled
        if (this.settings.showBoxModelValues) {
            this.addValueLabels(overlay, boxModel);
        }
        
        document.body.appendChild(overlay);
        this.currentOverlay = overlay;
    }
    
    addValueLabels(overlay, boxModel) {
        const { rect, margin, border, padding } = boxModel;
        
        // Margin labels
        if (margin.top > 0) {
            const label = this.createLabel(`${margin.top}px`, rect.left + rect.width/2, rect.top - margin.top/2, 'orange');
            overlay.appendChild(label);
        }
        if (margin.bottom > 0) {
            const label = this.createLabel(`${margin.bottom}px`, rect.left + rect.width/2, rect.bottom + margin.bottom/2, 'orange');
            overlay.appendChild(label);
        }
        if (margin.left > 0) {
            const label = this.createLabel(`${margin.left}px`, rect.left - margin.left/2, rect.top + rect.height/2, 'orange');
            overlay.appendChild(label);
        }
        if (margin.right > 0) {
            const label = this.createLabel(`${margin.right}px`, rect.right + margin.right/2, rect.top + rect.height/2, 'orange');
            overlay.appendChild(label);
        }
        
        // Padding labels
        if (padding.top > 0) {
            const label = this.createLabel(`${padding.top}px`, rect.left + rect.width/2, rect.top + border.top + padding.top/2, 'green');
            overlay.appendChild(label);
        }
        if (padding.bottom > 0) {
            const label = this.createLabel(`${padding.bottom}px`, rect.left + rect.width/2, rect.bottom - border.bottom - padding.bottom/2, 'green');
            overlay.appendChild(label);
        }
        if (padding.left > 0) {
            const label = this.createLabel(`${padding.left}px`, rect.left + border.left + padding.left/2, rect.top + rect.height/2, 'green');
            overlay.appendChild(label);
        }
        if (padding.right > 0) {
            const label = this.createLabel(`${padding.right}px`, rect.right - border.right - padding.right/2, rect.top + rect.height/2, 'green');
            overlay.appendChild(label);
        }
    }
    
    createLabel(text, x, y, color) {
        const label = document.createElement('div');
        label.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            background: ${color};
            color: white;
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            pointer-events: none;
        `;
        label.textContent = text;
        return label;
    }
    
    createTooltip(element, boxModel) {
        const { rect, margin, border, padding, content } = boxModel;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'box-model-tooltip';
        
        tooltip.style.cssText = `
            position: fixed;
            top: ${Math.min(rect.bottom + 10, window.innerHeight - 200)}px;
            left: ${Math.min(rect.left, window.innerWidth - 250)}px;
            width: 240px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 11px;
            line-height: 1.4;
            z-index: 1000000;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        const tagName = element.tagName.toLowerCase();
        const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
        const id = element.id ? `#${element.id}` : '';
        
        tooltip.innerHTML = `
            <div style="color: #60a5fa; font-weight: bold; margin-bottom: 8px;">
                ${tagName}${id}${className}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
                <div style="color: #fbbf24;">Margin:</div>
                <div>${margin.top} ${margin.right} ${margin.bottom} ${margin.left}</div>
                
                <div style="color: #fbbf24;">Border:</div>
                <div>${border.top} ${border.right} ${border.bottom} ${border.left}</div>
                
                <div style="color: #34d399;">Padding:</div>
                <div>${padding.top} ${padding.right} ${padding.bottom} ${padding.left}</div>
                
                <div style="color: #60a5fa;">Content:</div>
                <div>${content.width.toFixed(1)} × ${content.height.toFixed(1)}</div>
                
                <div style="color: #a78bfa;">Total:</div>
                <div>${rect.width.toFixed(1)} × ${rect.height.toFixed(1)}</div>
            </div>
        `;
        
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }
    
    showAllBoxModels() {
        // For 'always' mode, show box models for all visible elements
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            if (this.isValidTarget(element) && this.isElementVisible(element)) {
                this.showBoxModel(element);
            }
        });
    }
    
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && 
               rect.top < window.innerHeight && rect.bottom > 0 &&
               rect.left < window.innerWidth && rect.right > 0;
    }
    
    hideOverlay() {
        if (this.currentOverlay) {
            this.currentOverlay.remove();
            this.currentOverlay = null;
        }
    }
    
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
}

// Initialize the visualizer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new BoxModelVisualizer();
    });
} else {
    new BoxModelVisualizer();
}