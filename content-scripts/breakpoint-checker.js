// Tailwind CSS Breakpoint Checker Content Script

class BreakpointChecker {
    constructor() {
        this.overlay = null;
        this.settings = {
            enabled: false,
            localhostOnly: false,
            overlayPosition: 'bottom-right',
            breakpoints: [
                { name: 'sm', value: 640 },
                { name: 'md', value: 768 },
                { name: 'lg', value: 1024 },
                { name: 'xl', value: 1280 },
                { name: '2xl', value: 1536 }
            ]
        };
        this.resizeObserver = null;
        this.init();
    }

    async init() {
        // Load settings from storage
        await this.loadSettings();
        
        // Listen for messages from extension
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'BREAKPOINT_CHECKER_UPDATE') {
                this.settings = message.settings;
                this.updateDisplay();
            }
        });
        
        // Initial display update
        this.updateDisplay();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get({
                breakpointCheckerEnabled: false,
                localhostOnly: false,
                overlayPosition: 'bottom-right',
                customBreakpoints: this.settings.breakpoints
            });
            
            this.settings = {
                enabled: result.breakpointCheckerEnabled,
                localhostOnly: result.localhostOnly,
                overlayPosition: result.overlayPosition,
                breakpoints: result.customBreakpoints
            };
        } catch (error) {
            console.error('Error loading breakpoint checker settings:', error);
        }
    }

    shouldShowOnCurrentSite() {
        if (!this.settings.enabled) return false;
        
        if (this.settings.localhostOnly) {
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' || 
                              hostname === '127.0.0.1' || 
                              hostname.startsWith('192.168.') ||
                              hostname.startsWith('10.') ||
                              hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./); // Private IP ranges
            return isLocalhost;
        }
        
        return true;
    }

    updateDisplay() {
        if (this.shouldShowOnCurrentSite()) {
            this.showOverlay();
        } else {
            this.hideOverlay();
        }
    }

    showOverlay() {
        if (!this.overlay) {
            this.createOverlay();
        } else {
            // Update position styles in case settings changed
            // Clear all position properties first
            this.overlay.style.top = '';
            this.overlay.style.bottom = '';
            this.overlay.style.left = '';
            this.overlay.style.right = '';
            this.overlay.style.transform = '';
            
            const positionStyles = this.getPositionStyles();
            Object.assign(this.overlay.style, positionStyles);
        }
        
        this.updateOverlayContent();
        this.overlay.style.display = 'block';
        
        // Set up resize observer if not already done
        if (!this.resizeObserver) {
            this.setupResizeObserver();
        }
    }

    hideOverlay() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'tailwind-breakpoint-checker';
        
        // Base styles for the overlay
        const baseStyles = {
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: '999999',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            userSelect: 'none',
            pointerEvents: 'auto',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
        };
        
        // Position-specific styles
        const positionStyles = this.getPositionStyles();
        
        Object.assign(this.overlay.style, baseStyles, positionStyles);
        
        // Add click handler to cycle through positions
        this.overlay.addEventListener('click', () => {
            this.cyclePosition();
        });
        
        document.body.appendChild(this.overlay);
    }

    getPositionStyles() {
        const position = this.settings.overlayPosition || 'bottom-right';
        const offset = '20px';
        
        switch (position) {
            case 'top-left':
                return { top: offset, left: offset };
            case 'top-middle':
                return { top: offset, left: '50%', transform: 'translateX(-50%)' };
            case 'top-right':
                return { top: offset, right: offset };
            case 'right-middle':
                return { top: '50%', right: offset, transform: 'translateY(-50%)' };
            case 'bottom-right':
                return { bottom: offset, right: offset };
            case 'bottom-middle':
                return { bottom: offset, left: '50%', transform: 'translateX(-50%)' };
            case 'bottom-left':
                return { bottom: offset, left: offset };
            case 'left-middle':
                return { top: '50%', left: offset, transform: 'translateY(-50%)' };
            default:
                return { bottom: offset, right: offset };
        }
    }

    cyclePosition() {
        const positions = ['top-left', 'top-middle', 'top-right', 'right-middle', 'bottom-right', 'bottom-middle', 'bottom-left', 'left-middle'];
        const currentIndex = positions.indexOf(this.settings.overlayPosition || 'bottom-right');
        const nextIndex = (currentIndex + 1) % positions.length;
        const newPosition = positions[nextIndex];
        
        // Update settings
        this.settings.overlayPosition = newPosition;
        
        // Save to storage
        chrome.storage.sync.set({ overlayPosition: newPosition });
        
        // Update overlay position immediately
        if (this.overlay) {
            // Clear all position properties first
            this.overlay.style.top = '';
            this.overlay.style.bottom = '';
            this.overlay.style.left = '';
            this.overlay.style.right = '';
            this.overlay.style.transform = '';
            
            const positionStyles = this.getPositionStyles();
            Object.assign(this.overlay.style, positionStyles);
        }
    }

    setupResizeObserver() {
        this.resizeObserver = new ResizeObserver(() => {
            this.updateOverlayContent();
        });
        
        this.resizeObserver.observe(document.documentElement);
        
        // Also listen for window resize events as a fallback
        window.addEventListener('resize', () => {
            this.updateOverlayContent();
        });
    }

    getCurrentBreakpoint() {
        const width = window.innerWidth;
        
        // Sort breakpoints by value in descending order to find the largest matching one
        const sortedBreakpoints = [...this.settings.breakpoints].sort((a, b) => b.value - a.value);
        
        for (const breakpoint of sortedBreakpoints) {
            if (width >= breakpoint.value) {
                return breakpoint.name;
            }
        }
        
        // If no breakpoint matches, return the smallest one or 'xs'
        const smallestBreakpoint = [...this.settings.breakpoints].sort((a, b) => a.value - b.value)[0];
        return smallestBreakpoint ? `<${smallestBreakpoint.name}` : 'xs';
    }

    updateOverlayContent() {
        if (!this.overlay) return;
        
        const width = window.innerWidth;
        const currentBreakpoint = this.getCurrentBreakpoint();
        
        this.overlay.textContent = `${width}px • ${currentBreakpoint}`;
        
        // Add a subtle animation on update
        this.overlay.style.transform = 'scale(1.05)';
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.transform = 'scale(1)';
            }
        }, 150);
    }

    destroy() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
        
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }
}

// Initialize the breakpoint checker
let breakpointChecker;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        breakpointChecker = new BreakpointChecker();
    });
} else {
    breakpointChecker = new BreakpointChecker();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (breakpointChecker) {
        breakpointChecker.destroy();
    }
});