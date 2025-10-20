/**
 * Static UI helper methods for Settings tab
 * All methods are static and have no side effects beyond DOM manipulation
 */
import { ToastManager } from '../../../shared/toast-manager.js';

export class UIHelpers {
    /**
     * Open Chrome extensions shortcuts page
     */
    static openShortcutsPage() {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }

    /**
     * Show temporary toast message
     */
    static showTemporaryMessage(element, duration = 3000) {
        if (element) {
            element.classList.remove('hidden');
            setTimeout(() => {
                element.classList.add('hidden');
            }, duration);
        }
    }

    /**
     * Show temporary error message
     */
    static showError(element, message, duration = 5000) {
        if (element) {
            element.textContent = message;
            element.classList.remove('hidden');
            setTimeout(() => {
                element.classList.add('hidden');
            }, duration);
        }
    }

    /**
     * Show toast message with auto-dismiss using the shared manager
     */
    static showMessage(message, type = 'info', duration = 5000) {
        ToastManager.show(message, type, duration);
    }

    /**
     * Toggle modal visibility
     */
    static toggleModal(modal, show = true) {
        if (modal) {
            if (show) {
                modal.classList.remove('hidden');
            } else {
                modal.classList.add('hidden');
            }
        }
    }
}
