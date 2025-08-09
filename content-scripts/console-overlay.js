class ConsoleOverlay {
    constructor() {
        this.settings = {
            consoleOverlayEnabled: false,
            consoleLocalhostOnly: false,
            consolePosition: 'bottom-right',
            showConsoleLogs: true,
            showConsoleWarnings: true,
            showConsoleErrors: true,
            showConsoleInfo: false,
            consoleMaxEntries: 50
        };
        
        this.overlay = null;
        this.logContainer = null;
        this.logs = [];
        this.isActive = false;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info
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
                consoleOverlayEnabled: false,
                consoleLocalhostOnly: false,
                consolePosition: 'bottom-right',
                showConsoleLogs: true,
                showConsoleWarnings: true,
                showConsoleErrors: true,
                showConsoleInfo: false,
                consoleMaxEntries: 50
            });
            
            this.settings = result;
        } catch (error) {
            console.error('Error loading console settings:', error);
        }
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'CONSOLE_OVERLAY_SETTINGS_UPDATED') {
                // Map the enabled property to consoleOverlayEnabled
                if (message.settings.enabled !== undefined) {
                    this.settings.consoleOverlayEnabled = message.settings.enabled;
                } else {
                    this.settings = { ...this.settings, ...message.settings };
                }
                this.checkAndActivate();
            }
        });
        
        // Listen for console logs from main page context
        window.addEventListener('consoleOverlayLog', (event) => {
            const { type, args } = event.detail;
            const settingMap = {
                log: 'showConsoleLogs',
                warn: 'showConsoleWarnings',
                error: 'showConsoleErrors',
                info: 'showConsoleInfo'
            };
            
            if (this.settings[settingMap[type]] && this.isActive) {
                this.addLog(type, args);
            }
        });
    }
    
    checkAndActivate() {
        const shouldBeActive = this.settings.consoleOverlayEnabled && this.isValidDomain();
        
        if (shouldBeActive && !this.isActive) {
            this.activate();
        } else if (!shouldBeActive && this.isActive) {
            this.deactivate();
        } else if (this.isActive) {
            this.updateOverlay();
        }
    }
    
    isValidDomain() {
        if (!this.settings.consoleLocalhostOnly) {
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
        this.interceptConsole();
        this.createOverlay();
        this.addInitialLog();
    }
    
    deactivate() {
        this.isActive = false;
        this.restoreConsole();
        this.removeOverlay();
    }
    
    interceptConsole() {
        const self = this;
        
        // Use a more robust interception method by wrapping the original methods
        // and storing them in a way that's harder to override
        const originalMethods = {
            log: self.originalConsole.log.bind(console),
            warn: self.originalConsole.warn.bind(console),
            error: self.originalConsole.error.bind(console),
            info: self.originalConsole.info.bind(console)
        };
        
        // Create wrapper functions that always call our overlay
        function createWrapper(type, originalMethod, settingKey) {
            return function(...args) {
                // Always call original first
                originalMethod(...args);
                // Then add to overlay if enabled
                if (self.settings[settingKey]) {
                    self.addLog(type, args);
                }
            };
        }
        
        // Override console methods with our wrappers
        console.log = createWrapper('log', originalMethods.log, 'showConsoleLogs');
        console.warn = createWrapper('warn', originalMethods.warn, 'showConsoleWarnings');
        console.error = createWrapper('error', originalMethods.error, 'showConsoleErrors');
        console.info = createWrapper('info', originalMethods.info, 'showConsoleInfo');
        
        // Also try to intercept at a lower level using defineProperty
        try {
            const consoleProto = Object.getPrototypeOf(console);
            if (consoleProto) {
                ['log', 'warn', 'error', 'info'].forEach(method => {
                    const original = consoleProto[method];
                    if (original) {
                        Object.defineProperty(consoleProto, method, {
                            value: function(...args) {
                                original.apply(this, args);
                                const settingMap = {
                                    log: 'showConsoleLogs',
                                    warn: 'showConsoleWarnings', 
                                    error: 'showConsoleErrors',
                                    info: 'showConsoleInfo'
                                };
                                if (self.settings[settingMap[method]]) {
                                    self.addLog(method, args);
                                }
                            },
                            writable: true,
                            configurable: true
                        });
                    }
                });
            }
        } catch (e) {
            // Fallback if prototype modification fails
            self.originalConsole.warn('Console overlay: Could not modify console prototype, using direct method override');
        }
        
        // Capture uncaught errors
        window.addEventListener('error', (event) => {
            if (self.settings.showConsoleErrors) {
                self.addLog('error', [`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
            }
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            if (self.settings.showConsoleErrors) {
                self.addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
            }
        });
    }
    
    restoreConsole() {
        console.log = this.originalConsole.log;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.info = this.originalConsole.info;
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'console-overlay';
        
        const position = this.getPositionStyles();
        
        this.overlay.style.cssText = `
            position: fixed;
            top: ${position.top || 'auto'};
            bottom: ${position.bottom || 'auto'};
            left: ${position.left || 'auto'};
            right: ${position.right || 'auto'};
            width: 400px;
            max-height: 300px;
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid #333;
            border-radius: 6px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 11px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: #1a1a1a;
            color: #fff;
            padding: 8px 12px;
            font-weight: bold;
            border-bottom: 1px solid #333;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        `;
        
        const title = document.createElement('span');
        title.textContent = 'Console Log Overlay';
        header.appendChild(title);
        
        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 8px;';
        
        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText = `
            background: #333;
            color: #fff;
            border: none;
            padding: 2px 6px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
        `;
        clearBtn.addEventListener('click', () => this.clearLogs());
        controls.appendChild(clearBtn);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: #666;
            color: #fff;
            border: none;
            padding: 2px 6px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
        `;
        closeBtn.addEventListener('click', () => this.deactivate());
        controls.appendChild(closeBtn);
        
        header.appendChild(controls);
        this.overlay.appendChild(header);
        
        // Log container
        this.logContainer = document.createElement('div');
        this.logContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px;
            max-height: 250px;
        `;
        this.overlay.appendChild(this.logContainer);
        
        // Make draggable
        this.makeDraggable(header);
        
        document.body.appendChild(this.overlay);
    }
    
    getPositionStyles() {
        const offset = '20px';
        
        switch (this.settings.consolePosition) {
            case 'top-left':
                return { top: offset, left: offset };
            case 'top-right':
                return { top: offset, right: offset };
            case 'bottom-left':
                return { bottom: offset, left: offset };
            case 'bottom-right':
            default:
                return { bottom: offset, right: offset };
        }
    }
    
    makeDraggable(header) {
        header.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = this.overlay.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.handleDragEnd);
            e.preventDefault();
        });
    }
    
    handleDrag = (e) => {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        // Keep overlay within viewport
        const maxX = window.innerWidth - this.overlay.offsetWidth;
        const maxY = window.innerHeight - this.overlay.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(x, maxX));
        const clampedY = Math.max(0, Math.min(y, maxY));
        
        this.overlay.style.left = clampedX + 'px';
        this.overlay.style.top = clampedY + 'px';
        this.overlay.style.right = 'auto';
        this.overlay.style.bottom = 'auto';
    };
    
    handleDragEnd = () => {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleDragEnd);
    };
    
    addInitialLog() {
        this.addLog('log', ['Console overlay initialized']);
        // Debug: Show current settings
        this.addLog('log', [`Settings: showConsoleLogs=${this.settings.showConsoleLogs}, showConsoleWarnings=${this.settings.showConsoleWarnings}, showConsoleErrors=${this.settings.showConsoleErrors}`]);
        
        // Check for any logs that were captured before overlay was ready
        if (window.consoleOverlayLogs && window.consoleOverlayLogs.length > 0) {
            this.addLog('log', [`Found ${window.consoleOverlayLogs.length} pre-captured logs`]);
            
            // Add all pre-captured logs to the overlay
            window.consoleOverlayLogs.forEach(logEntry => {
                const settingMap = {
                    log: 'showConsoleLogs',
                    warn: 'showConsoleWarnings',
                    error: 'showConsoleErrors'
                };
                
                if (this.settings[settingMap[logEntry.type]]) {
                    this.addLog(logEntry.type, logEntry.args);
                }
            });
            
            // Clear the pre-captured logs
            window.consoleOverlayLogs = [];
        }
    }
    
    addLog(type, args) {
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        const logEntry = {
            type,
            message,
            timestamp,
            id: Date.now() + Math.random()
        };
        
        this.logs.push(logEntry);
        
        // Limit log entries
        if (this.logs.length > this.settings.consoleMaxEntries) {
            this.logs = this.logs.slice(-this.settings.consoleMaxEntries);
        }
        
        this.renderLogs();
    }
    
    renderLogs() {
        if (!this.logContainer) return;
        
        this.logContainer.innerHTML = '';
        
        this.logs.forEach(log => {
            const logElement = document.createElement('div');
            logElement.style.cssText = `
                margin-bottom: 4px;
                padding: 4px 6px;
                border-radius: 3px;
                background: ${this.getLogBackgroundColor(log.type)};
                color: ${this.getLogTextColor(log.type)};
                font-size: 11px;
                line-height: 1.3;
                word-break: break-word;
                border-left: 3px solid ${this.getLogBorderColor(log.type)};
            `;
            
            const timeSpan = document.createElement('span');
            timeSpan.style.cssText = 'color: #888; margin-right: 8px; font-size: 10px;';
            timeSpan.textContent = log.timestamp;
            
            const typeSpan = document.createElement('span');
            typeSpan.style.cssText = `
                color: ${this.getLogTextColor(log.type)};
                font-weight: bold;
                margin-right: 8px;
                text-transform: uppercase;
                font-size: 10px;
            `;
            typeSpan.textContent = `[${log.type}]`;
            
            const messageSpan = document.createElement('span');
            messageSpan.textContent = log.message;
            
            logElement.appendChild(timeSpan);
            logElement.appendChild(typeSpan);
            logElement.appendChild(messageSpan);
            
            this.logContainer.appendChild(logElement);
        });
        
        // Auto-scroll to bottom
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
    
    getLogBackgroundColor(type) {
        switch (type) {
            case 'error': return 'rgba(239, 68, 68, 0.1)';
            case 'warn': return 'rgba(245, 158, 11, 0.1)';
            case 'info': return 'rgba(59, 130, 246, 0.1)';
            case 'log':
            default: return 'rgba(255, 255, 255, 0.05)';
        }
    }
    
    getLogTextColor(type) {
        switch (type) {
            case 'error': return '#fca5a5';
            case 'warn': return '#fbbf24';
            case 'info': return '#93c5fd';
            case 'log':
            default: return '#e5e7eb';
        }
    }
    
    getLogBorderColor(type) {
        switch (type) {
            case 'error': return '#ef4444';
            case 'warn': return '#f59e0b';
            case 'info': return '#3b82f6';
            case 'log':
            default: return '#6b7280';
        }
    }
    
    clearLogs() {
        this.logs = [];
        this.renderLogs();
    }
    
    updateOverlay() {
        if (this.overlay) {
            this.removeOverlay();
            this.createOverlay();
            this.renderLogs();
        }
    }
    
    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.logContainer = null;
        }
    }
}

// Initialize the console overlay
// Initialize console overlay as early as possible
(function() {
    // Run immediately, don't wait for DOM
    const overlay = new ConsoleOverlay();
    
    // Also ensure it runs after DOM is ready if needed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Re-initialize if needed
            if (!overlay.isActive) {
                overlay.init();
            }
        });
    }
})();

// Use a different approach that doesn't violate CSP
// Instead of injecting inline scripts, we'll use postMessage communication
(function() {
    // Create a script element that loads from the extension
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('console-injector.js');
    script.onload = function() {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
})();