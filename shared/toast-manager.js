/**
 * Universal Toast Manager for the entire extension
 * Provides a single, consistent toast notification system across all tabs
 * 
 * Usage:
 *   import { ToastManager } from '../shared/toast-manager.js'
 *   ToastManager.show('Message text', 'success')
 *   ToastManager.success('Success message')
 *   ToastManager.error('Error message')
 */

export class ToastManager {
    static ensureContainer() {
        if (typeof document === 'undefined') {
            return null;
        }

        let container = document.getElementById('status-messages');
        if (!container) {
            container = document.createElement('div');
            container.id = 'status-messages';
            container.style.cssText = [
                'position: fixed',
                'top: 80px',
                'right: 16px',
                'z-index: 2147483647',
                'display: flex',
                'flex-direction: column',
                'gap: 8px',
                'pointer-events: auto'
            ].join('; ');
            document.body.appendChild(container);
        }

        return container;
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - How long to show the toast (milliseconds)
     */
    static show(message, type = 'info', duration = 5000) {
        const container = this.ensureContainer();
        if (!container) return;

        const messageEl = document.createElement('div');
        const colors = this.getMessageColors(type);
        
        // Add inline styles to ensure visibility and consistency
        messageEl.style.cssText = `
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            border: 1px solid ${colors.borderColor};
            background-color: ${colors.backgroundColor};
            color: ${colors.textColor};
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
            min-width: 250px;
            max-width: 400px;
            word-wrap: break-word;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        messageEl.textContent = message;

        container.appendChild(messageEl);

        // Auto-remove after specified duration
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, duration);
    }

    /**
     * Show success toast
     */
    static success(message, duration = 5000) {
        this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     */
    static error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     */
    static warning(message, duration = 5000) {
        this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     */
    static info(message, duration = 5000) {
        this.show(message, 'info', duration);
    }

    /**
     * Get color values for message type
     */
    static getMessageColors(type = 'info') {
        const colors = {
            success: {
                backgroundColor: '#dcfce7',
                textColor: '#166534',
                borderColor: '#86efac'
            },
            error: {
                backgroundColor: '#fee2e2',
                textColor: '#991b1b',
                borderColor: '#fca5a5'
            },
            warning: {
                backgroundColor: '#fef3c7',
                textColor: '#92400e',
                borderColor: '#fde68a'
            },
            info: {
                backgroundColor: '#dbeafe',
                textColor: '#1e40af',
                borderColor: '#93c5fd'
            }
        };
        return colors[type] || colors.info;
    }
}
