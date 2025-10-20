import { ToastManager } from '../../../shared/toast-manager.js';

export class UIHelpers {
    static showAuthSection() {
        document.getElementById('auth-section')?.classList.remove('hidden');
        document.getElementById('main-controls')?.classList.add('hidden');
    }

    static showMainControls() {
        document.getElementById('auth-section')?.classList.add('hidden');
        document.getElementById('main-controls')?.classList.remove('hidden');
    }

    static updateConnectionStatus(status, message) {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        if (indicator && text) {
            indicator.className = 'w-3 h-3 rounded-full mr-3';

            switch (status) {
                case 'connected':
                    indicator.classList.add('bg-green-500');
                    break;
                case 'disconnected':
                    indicator.classList.add('bg-gray-400');
                    break;
                case 'error':
                    indicator.classList.add('bg-red-500');
                    break;
                default:
                    indicator.classList.add('bg-yellow-500');
            }

            text.textContent = message;
        }
    }

    static updateUserInfo(userData, authMethod) {
        const userInitial = document.getElementById('user-initial');
        const userName = document.getElementById('user-name');
        const authMethodElement = document.getElementById('auth-method');

        if (userInitial) {
            userInitial.textContent = userData.username ? userData.username[0].toUpperCase() : '?';
        }
        if (userName) {
            userName.textContent = userData.username || 'User';
        }
        if (authMethodElement) {
            authMethodElement.textContent = authMethod === 'token' ? 'personal access token' : 'password';
        }
    }

    static showMessage(message, type = 'info') {
        ToastManager.show(message, type);
    }

    static showError(message, errorElement) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        } else {
            ToastManager.error(message);
        }
    }
}
