// Shared utilities for the extension
import { ToastManager } from './toast-manager.js';

export class Utils {
    static escapeHtml(unsafe) {
        if (!unsafe) return '';
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }

    static escapeAttr(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    static highlightSearchTerm(text, searchTerm) {
        if (!searchTerm.trim()) return this.escapeHtml(text);
        const escapedText = this.escapeHtml(text);
        const escapedSearchTerm = this.escapeHtml(searchTerm.trim());
        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        return escapedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    }

    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showNotification('Copied to clipboard!');
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                this.showNotification('Failed to copy text', 'error');
            }
            document.body.removeChild(textArea);
        }
    }

    static async copyHtmlToClipboard(text, html) {
        try {
            const blobText = new Blob([text], { type: 'text/plain' });
            const blobHtml = new Blob([html], { type: 'text/html' });
            const data = [new ClipboardItem({
                'text/plain': blobText,
                'text/html': blobHtml
            })];
            await navigator.clipboard.write(data);
            this.showNotification('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy HTML: ', err);
            // Fallback to plain text
            this.copyToClipboard(text);
        }
    }

    static formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static showNotification(message, type = 'success', duration = 3000) {
        switch (type) {
            case 'error':
                ToastManager.error(message, duration);
                break;
            case 'warning':
                ToastManager.warning(message, duration);
                break;
            case 'info':
                ToastManager.info(message, duration);
                break;
            default:
                ToastManager.success(message, duration);
        }
    }

    static async ensureContentScripts(tabId, files = ['content-scripts/content.js']) {
        if (!tabId || !chrome?.scripting) {
            return;
        }

        if (!this._injectedContentScripts) {
            this._injectedContentScripts = new Map();
        }

        const key = `${tabId}::${files.join('|')}`;
        if (this._injectedContentScripts.has(key)) {
            return;
        }

        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files,
            });
            this._injectedContentScripts.set(key, Date.now());

            // Give the injected script a moment to register listeners
            await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
            const message = error?.message || '';
            if (message.includes('Cannot access contents of the page') || message.includes('Operation is not supported')) {
                return;
            }
            console.warn('Failed to inject content scripts:', error);
        }
    }

    static async safeSendMessage(tabId, message, options = {}) {
        if (!tabId) {
            throw new Error('safeSendMessage requires a valid tabId');
        }

        const files = options.files || ['content-scripts/content.js'];

        const attemptSend = async () => chrome.tabs.sendMessage(tabId, message);

        try {
            return await attemptSend();
        } catch (error) {
            const messageText = error?.message || '';
            if (messageText.includes('Receiving end does not exist')) {
                await this.ensureContentScripts(tabId, files);
                try {
                    return await attemptSend();
                } catch (retryError) {
                    if (retryError?.message?.includes('Receiving end does not exist')) {
                        console.debug('Content script unavailable after injection attempt', { tabId, requestType: message?.type });
                        return null;
                    }
                    throw retryError;
                }
            }
            throw error;
        }
    }

    // Storage helpers
    static async getStorageData(keys) {
        return new Promise((resolve) => {
            chrome.storage.local.get(keys, resolve);
        });
    }

    static async setStorageData(data) {
        return new Promise((resolve) => {
            chrome.storage.local.set(data, resolve);
        });
    }
}

export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(...args));
    }
}
