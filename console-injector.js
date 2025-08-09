// Console injector script that runs in main page context
// This script intercepts console methods and communicates with the content script

(function() {
    'use strict';
    
    // Store original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    
    // Create global storage for logs
    window.consoleOverlayLogs = window.consoleOverlayLogs || [];
    
    // Helper function to serialize arguments
    function serializeArgs(args) {
        return Array.from(args).map(arg => {
            if (typeof arg === 'object' && arg !== null) {
                try {
                    return JSON.stringify(arg);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        });
    }
    
    // Override console methods in main page context
    console.log = function(...args) {
        originalLog.apply(console, args);
        const serializedArgs = serializeArgs(args);
        window.consoleOverlayLogs.push({type: 'log', args: serializedArgs, timestamp: new Date()});
        // Dispatch custom event to content script
        window.dispatchEvent(new CustomEvent('consoleOverlayLog', {
            detail: {type: 'log', args: serializedArgs, timestamp: new Date()}
        }));
    };
    
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        const serializedArgs = serializeArgs(args);
        window.consoleOverlayLogs.push({type: 'warn', args: serializedArgs, timestamp: new Date()});
        window.dispatchEvent(new CustomEvent('consoleOverlayLog', {
            detail: {type: 'warn', args: serializedArgs, timestamp: new Date()}
        }));
    };
    
    console.error = function(...args) {
        originalError.apply(console, args);
        const serializedArgs = serializeArgs(args);
        window.consoleOverlayLogs.push({type: 'error', args: serializedArgs, timestamp: new Date()});
        window.dispatchEvent(new CustomEvent('consoleOverlayLog', {
            detail: {type: 'error', args: serializedArgs, timestamp: new Date()}
        }));
    };
    
    console.info = function(...args) {
        originalInfo.apply(console, args);
        const serializedArgs = serializeArgs(args);
        window.consoleOverlayLogs.push({type: 'info', args: serializedArgs, timestamp: new Date()});
        window.dispatchEvent(new CustomEvent('consoleOverlayLog', {
            detail: {type: 'info', args: serializedArgs, timestamp: new Date()}
        }));
    };
    
    // Capture uncaught errors
    window.addEventListener('error', (event) => {
        const errorMsg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
        window.dispatchEvent(new CustomEvent('consoleOverlayLog', {
            detail: {type: 'error', args: [errorMsg], timestamp: new Date()}
        }));
    });
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const errorMsg = `Unhandled Promise Rejection: ${event.reason}`;
        window.dispatchEvent(new CustomEvent('consoleOverlayLog', {
            detail: {type: 'error', args: [errorMsg], timestamp: new Date()}
        }));
    });
    
})();