import { AuthManager } from './managers/AuthManager.js';
import { CustomStatusManager } from './managers/CustomStatusManager.js';
import { MeetFilterManager } from './managers/MeetFilterManager.js';
import { MeetCustomRoomManager } from './managers/MeetCustomRoomManager.js';
import { SettingsManager } from './managers/SettingsManager.js';
import { UIHelpers } from './managers/UIHelpers.js';

export class MattermostTab {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.customStatusPresets = [];
        this.filteredRooms = [];
        this.customRoomsConfig = [];
        
        // Initialize managers
        this.authManager = new AuthManager(this);
        this.customStatusManager = new CustomStatusManager(this);
        this.meetFilterManager = new MeetFilterManager(this);
        this.meetCustomRoomManager = new MeetCustomRoomManager(this);
        this.settingsManager = new SettingsManager(this);
        
        this.initialize();
    }

    async initialize() {
        try {
            await this.authManager.checkAuthentication();
            this.setupEventListeners();
            await this.settingsManager.loadSavedSettings();
            
            // Load data
            await this.customStatusManager.loadCustomStatusPresets();
            await this.meetFilterManager.loadFilteredRooms();
            await this.meetCustomRoomManager.loadCustomRoomsConfig();
        } catch (error) {
            console.error('Failed to initialize Mattermost tab:', error);
        }
    }

    setupEventListeners() {
        // Authentication buttons
        document.getElementById('login-btn')?.addEventListener('click', () => this.authManager.handleLogin());
        document.getElementById('token-btn')?.addEventListener('click', () => this.authManager.handleTokenAuth());
        document.getElementById('logout-btn')?.addEventListener('click', () => this.authManager.handleLogout());

        // Quick status buttons
        document.querySelectorAll('.status-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.currentTarget.getAttribute('data-status');
                this.settingsManager.updateStatus(status);
            });
        });

        // Custom status presets
        document.getElementById('create-status-btn')?.addEventListener('click', () => this.customStatusManager.showCustomStatusModal());
        document.getElementById('clear-status-btn')?.addEventListener('click', () => this.customStatusManager.clearCustomStatus());
        
        // Custom status modal
        document.getElementById('close-status-modal')?.addEventListener('click', () => this.customStatusManager.hideCustomStatusModal());
        document.getElementById('cancel-status-modal')?.addEventListener('click', () => this.customStatusManager.hideCustomStatusModal());
        document.getElementById('custom-status-form')?.addEventListener('submit', (e) => this.customStatusManager.handleCreateCustomStatus(e));

        // Google Meet integration toggle
        document.getElementById('google-meet-integration')?.addEventListener('change', (e) => {
            const meetSettings = document.getElementById('meet-settings');
            if (meetSettings) {
                meetSettings.classList.toggle('hidden', !e.target.checked);
            }
        });

        // Settings buttons
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.settingsManager.saveSettings());
        document.getElementById('test-connection-btn')?.addEventListener('click', () => this.settingsManager.testConnection());

        // Meet filter
        document.getElementById('add-meet-filter-btn')?.addEventListener('click', () => this.meetFilterManager.addMeetFilter());
        document.getElementById('meet-room-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.meetFilterManager.addMeetFilter();
        });

        // Meet custom room
        document.getElementById('add-custom-room-btn')?.addEventListener('click', () => this.meetCustomRoomManager.openCustomRoomModal());
        document.getElementById('custom-room-code-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.meetCustomRoomManager.openCustomRoomModal();
        });
        
        // Custom room modal
        document.getElementById('close-custom-room-modal')?.addEventListener('click', () => this.meetCustomRoomManager.hideCustomRoomModal());
        document.getElementById('cancel-custom-room-modal')?.addEventListener('click', () => this.meetCustomRoomManager.hideCustomRoomModal());
        document.getElementById('custom-room-form')?.addEventListener('submit', (e) => this.meetCustomRoomManager.handleSaveCustomRoom(e));

        // Enter key handling for login forms
        document.getElementById('login-id')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.authManager.handleLogin();
        });
        document.getElementById('password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.authManager.handleLogin();
        });
        document.getElementById('personal-token')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.authManager.handleTokenAuth();
        });
    }

    // UI helper methods
    showAuthSection() {
        UIHelpers.showAuthSection();
    }

    showMainControls() {
        UIHelpers.showMainControls();
    }

    updateConnectionStatus(status, message) {
        UIHelpers.updateConnectionStatus(status, message);
    }

    updateUserInfo(userData, authMethod) {
        UIHelpers.updateUserInfo(userData, authMethod);
    }

    showMessage(message, type = 'info') {
        UIHelpers.showMessage(message, type);
    }

    showError(message, errorElement) {
        UIHelpers.showError(message, errorElement);
    }

    // Tab interface methods
    onShow() {
        // Called when tab becomes active
        this.authManager.checkAuthentication();
    }

    onHide() {
        // Called when tab becomes inactive
    }
}
