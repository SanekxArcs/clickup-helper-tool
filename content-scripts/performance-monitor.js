class PerformanceMonitor {
    constructor() {
        this.overlay = null;
        this.isEnabled = false;
        this.localhostOnly = false;
        this.position = 'top-left';
        this.updateInterval = 250;
        this.showFPS = true;
        this.showMemory = true;
        this.showFrameTime = false;
        this.showDOMNodes = false;
        
        this.intervalId = null;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.frameTime = 0;
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupMessageListener();
        
        if (this.isEnabled && this.shouldShowOnCurrentSite()) {
            this.showOverlay();
        }
    }
    
    async loadSettings() {
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
            
            this.isEnabled = result.performanceMonitorEnabled;
            this.localhostOnly = result.performanceLocalhostOnly;
            this.position = result.performancePosition;
            this.updateInterval = result.performanceUpdateInterval;
            this.showFPS = result.showFPS;
            this.showMemory = result.showMemory;
            this.showFrameTime = result.showFrameTime;
            this.showDOMNodes = result.showDOMNodes;
        } catch (error) {
            console.error('Error loading performance settings:', error);
        }
    }
    
    shouldShowOnCurrentSite() {
        if (!this.localhostOnly) {
            return true;
        }
        
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname.startsWith('192.168.') || 
               hostname.startsWith('10.') || 
               hostname.startsWith('172.');
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'PERFORMANCE_SETTINGS_UPDATE') {
                this.updateSettings(message.settings);
            }
        });
    }
    
    updateSettings(settings) {
        const wasEnabled = this.isEnabled;
        
        this.isEnabled = settings.performanceMonitorEnabled;
        this.localhostOnly = settings.performanceLocalhostOnly;
        this.position = settings.performancePosition;
        this.updateInterval = settings.performanceUpdateInterval;
        this.showFPS = settings.showFPS;
        this.showMemory = settings.showMemory;
        this.showFrameTime = settings.showFrameTime;
        this.showDOMNodes = settings.showDOMNodes;
        
        if (this.isEnabled && this.shouldShowOnCurrentSite()) {
            if (!wasEnabled) {
                this.showOverlay();
            } else {
                this.updateOverlayPosition();
                this.updateOverlayContent();
            }
        } else {
            this.hideOverlay();
        }
    }
    
    showOverlay() {
        if (this.overlay) {
            this.hideOverlay();
        }
        
        this.overlay = this.createOverlay();
        document.body.appendChild(this.overlay);
        
        this.startMonitoring();
    }
    
    hideOverlay() {
        if (this.overlay) {
            document.body.removeChild(this.overlay);
            this.overlay = null;
        }
        
        this.stopMonitoring();
    }
    
    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'performance-monitor-overlay';
        
        const baseStyles = {
            position: 'fixed',
            zIndex: '999999',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #333',
            minWidth: '120px',
            pointerEvents: 'auto',
            cursor: 'pointer',
            userSelect: 'none'
        };
        
        const positionStyles = this.getPositionStyles();
        const allStyles = { ...baseStyles, ...positionStyles };
        
        Object.assign(overlay.style, allStyles);
        
        // Add click handler to cycle position
        overlay.addEventListener('click', () => {
            this.cyclePosition();
        });
        
        return overlay;
    }
    
    getPositionStyles() {
        const offset = '10px';
        
        switch (this.position) {
            case 'top-left':
                return { top: offset, left: offset };
            case 'top-right':
                return { top: offset, right: offset };
            case 'bottom-left':
                return { bottom: offset, left: offset };
            case 'bottom-right':
                return { bottom: offset, right: offset };
            default:
                return { top: offset, left: offset };
        }
    }
    
    cyclePosition() {
        const positions = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
        const currentIndex = positions.indexOf(this.position);
        const nextIndex = (currentIndex + 1) % positions.length;
        this.position = positions[nextIndex];
        
        // Save to storage
        chrome.storage.sync.set({ performancePosition: this.position });
        
        // Update overlay position
        this.updateOverlayPosition();
    }
    
    updateOverlayPosition() {
        if (this.overlay) {
            const positionStyles = this.getPositionStyles();
            
            // Clear all position properties
            this.overlay.style.top = '';
            this.overlay.style.right = '';
            this.overlay.style.bottom = '';
            this.overlay.style.left = '';
            
            // Apply new position
            Object.assign(this.overlay.style, positionStyles);
        }
    }
    
    startMonitoring() {
        this.stopMonitoring();
        
        this.lastTime = performance.now();
        this.frameCount = 0;
        
        const updateMetrics = () => {
            this.calculateFPS();
            this.updateOverlayContent();
        };
        
        this.intervalId = setInterval(updateMetrics, this.updateInterval);
        
        // Start frame counting
        this.requestAnimationFrame();
    }
    
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    
    requestAnimationFrame() {
        if (this.isEnabled && this.overlay) {
            requestAnimationFrame(() => {
                this.frameCount++;
                this.requestAnimationFrame();
            });
        }
    }
    
    calculateFPS() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / deltaTime);
            this.frameTime = deltaTime / this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }
    }
    
    getMemoryInfo() {
        if (performance.memory) {
            const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
            const total = Math.round(performance.memory.totalJSHeapSize / 1024 / 1024);
            return `${used}/${total}MB`;
        }
        return 'N/A';
    }
    
    getDOMNodeCount() {
        return document.querySelectorAll('*').length;
    }
    
    updateOverlayContent() {
        if (!this.overlay) return;
        
        const metrics = [];
        
        if (this.showFPS) {
            metrics.push(`FPS: ${this.fps}`);
        }
        
        if (this.showMemory) {
            metrics.push(`MEM: ${this.getMemoryInfo()}`);
        }
        
        if (this.showFrameTime && this.frameTime > 0) {
            metrics.push(`FT: ${this.frameTime.toFixed(1)}ms`);
        }
        
        if (this.showDOMNodes) {
            metrics.push(`DOM: ${this.getDOMNodeCount()}`);
        }
        
        this.overlay.innerHTML = metrics.join('<br>');
    }
}

// Initialize the performance monitor
if (typeof window !== 'undefined') {
    new PerformanceMonitor();
}