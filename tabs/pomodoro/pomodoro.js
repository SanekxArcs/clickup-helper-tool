// Advanced Pomodoro Tab - Complete work day management
import { Utils } from '../../shared/utils.js';

export class PomodoroTab {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        
        // Timer state
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.currentPhase = 'work'; // 'work', 'break', 'lunch'
        this.isWorkDayActive = false;
        this.isLunchActive = false;
        
        // Day tracking
        this.workDayStartTime = null;
        this.workDayEndTime = null;
        this.lunchStartTime = null;
        this.lunchEndTime = null;
        
        // Statistics
        this.todayStats = {
            workTime: 0,
            breakTime: 0,
            lunchTime: 0,
            sessions: 0,
            date: new Date().toDateString()
        };
        
        // Settings
        this.settings = {
            workStartTime: '08:00',
            workEndTime: '17:00',
            workDuration: 8,
            workTimeMinutes: 25,
            breakTimeMinutes: 5,
            autoStartDay: false,
            autoEndDay: false,
            historyPassword: ''
        };
        
        this.profiles = [];
        this.updateInterval = null;
        this.autoScheduleInterval = null;
    }

    async onActivate() {
        if (!this.isInitialized) {
            await this.initialize();
            this.isInitialized = true;
        }
        this.startPeriodicUpdates();
        this.startAutoScheduleCheck();
    }

    onDeactivate() {
        this.stopPeriodicUpdates();
        this.stopAutoScheduleCheck();
    }

    async initialize() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupBackgroundMessageListener();
        await this.loadSettings();
        await this.loadProfiles();
        await this.loadTodayStats();
        await this.loadWorkDayState(); // Load previous work day state
        this.updateLunchCalculation();
        this.updateCurrentTime();
        this.getTimerStateFromBackground();
        this.updateWorkHistory();
        this.updateButtons();
        this.updateWorkDayStatus();
        this.updateStatistics();
    }

    initializeElements() {
        this.elements = {
            // Settings modal
            settingsModal: document.getElementById('settingsModal'),
            workStartTime: document.getElementById('workStartTime'),
            workEndTime: document.getElementById('workEndTime'),
            workDuration: document.getElementById('workDuration'),
            workTimeMinutes: document.getElementById('workTimeMinutes'),
            breakTimeMinutes: document.getElementById('breakTimeMinutes'),
            autoStartDay: document.getElementById('autoStartDay'),
            autoEndDay: document.getElementById('autoEndDay'),
            historyPassword: document.getElementById('historyPassword'),
            profileName: document.getElementById('profileName'),
            profileSelect: document.getElementById('profileSelect'),
            saveProfile: document.getElementById('saveProfile'),
            loadProfile: document.getElementById('loadProfile'),
            saveSettings: document.getElementById('saveSettings'),
            cancelSettings: document.getElementById('cancelSettings'),
            lunchCalculation: document.getElementById('lunchCalculation'),
            
            // Main display
            currentTime: document.getElementById('currentTime'),
            workDayStatus: document.getElementById('workDayStatus'),
            timerDisplay: document.getElementById('timerDisplay'),
            timerPhase: document.getElementById('timerPhase'),
            timerProgress: document.getElementById('timerProgress'),
            timerProgressBar: document.getElementById('timerProgressBar'),
            nextPhaseInfo: document.getElementById('nextPhaseInfo'),
            
            // Control buttons
            startDayBtn: document.getElementById('startDayBtn'),
            startLunchBtn: document.getElementById('startLunchBtn'),
            endWorkBtn: document.getElementById('endWorkBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // Statistics
            todayWorkTime: document.getElementById('todayWorkTime'),
            todayBreakTime: document.getElementById('todayBreakTime'),
            todaySessions: document.getElementById('todaySessions'),
            todayLunchTime: document.getElementById('todayLunchTime'),
            dailyProgressPercent: document.getElementById('dailyProgressPercent'),
            dailyProgressBar: document.getElementById('dailyProgressBar'),
            
            // History
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            workHistory: document.getElementById('workHistory')
        };
    }

    setupEventListeners() {
        // Control buttons
        this.elements.startDayBtn.addEventListener('click', () => this.startWorkDay());
        this.elements.startLunchBtn.addEventListener('click', () => this.startLunch());
        this.elements.endWorkBtn.addEventListener('click', () => this.endWorkDay());
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        
        // Settings modal
        this.elements.saveSettings.addEventListener('click', () => this.saveSettings());
        this.elements.cancelSettings.addEventListener('click', () => this.closeSettings());
        this.elements.saveProfile.addEventListener('click', () => this.saveProfile());
        this.elements.loadProfile.addEventListener('click', () => this.loadSelectedProfile());
        
        // Settings inputs
        this.elements.workStartTime.addEventListener('change', () => this.updateLunchCalculation());
        this.elements.workEndTime.addEventListener('change', () => this.updateLunchCalculation());
        this.elements.workDuration.addEventListener('change', () => this.updateLunchCalculation());
        
        // History
        this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        
        // Close modal on outside click
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
    }

    setupBackgroundMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'ADVANCED_POMODORO_STATE_UPDATE') {
                this.updateFromBackgroundState(request.state);
            }
        });
    }

    startWorkDay() {
        if (!this.isWorkDayActive) {
            this.isWorkDayActive = true;
            this.workDayStartTime = new Date();
            this.startWorkTimer();
            this.saveWorkDayState();
            this.updateButtons();
            this.updateWorkDayStatus();
            Utils.showNotification('Work day started! Good luck! 💪', 'success');
        }
    }

    startLunch() {
        if (this.isWorkDayActive && !this.isLunchActive) {
            this.isLunchActive = true;
            this.lunchStartTime = new Date();
            this.pauseCurrentTimer();
            this.currentPhase = 'lunch';
            this.updateDisplay();
            this.updateButtons();
            this.updateWorkDayStatus();
            Utils.showNotification('Lunch break started! Enjoy your meal! 🍽️', 'success');
        }
    }

    endLunch() {
        if (this.isLunchActive) {
            this.isLunchActive = false;
            this.lunchEndTime = new Date();
            const lunchDuration = Math.floor((this.lunchEndTime - this.lunchStartTime) / 60000);
            this.todayStats.lunchTime += lunchDuration;
            this.currentPhase = 'work';
            this.startWorkTimer();
            this.updateButtons();
            this.updateWorkDayStatus();
            this.saveStats();
            Utils.showNotification('Back to work! Let\'s be productive! 🚀', 'success');
        }
    }

    endWorkDay() {
        if (this.isWorkDayActive) {
            this.isWorkDayActive = false;
            this.workDayEndTime = new Date();
            
            if (this.isLunchActive) {
                this.endLunch();
            }
            
            this.pauseCurrentTimer();
            this.saveWorkDayToHistory();
            this.resetDayState();
            this.updateButtons();
            this.updateWorkDayStatus();
            
            const totalWorkHours = Math.floor(this.todayStats.workTime / 60);
            const totalWorkMinutes = this.todayStats.workTime % 60;
            Utils.showNotification(`Work day ended! Total work time: ${totalWorkHours}h ${totalWorkMinutes}m 🎉`, 'success');
        }
    }

    startWorkTimer() {
        this.currentPhase = 'work';
        this.currentTime = this.settings.workTimeMinutes * 60;
        this.totalTime = this.currentTime;
        this.isRunning = true;
        
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_START',
            phase: this.currentPhase,
            duration: this.currentTime,
            settings: this.settings
        });
        
        this.updateDisplay();
    }

    startBreakTimer() {
        this.currentPhase = 'break';
        this.currentTime = this.settings.breakTimeMinutes * 60;
        this.totalTime = this.currentTime;
        this.isRunning = true;
        
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_START',
            phase: this.currentPhase,
            duration: this.currentTime,
            settings: this.settings
        });
        
        this.updateDisplay();
    }

    pauseCurrentTimer() {
        this.isRunning = false;
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_PAUSE'
        });
    }

    onTimerComplete() {
        this.isRunning = false;
        
        if (this.currentPhase === 'work') {
            this.todayStats.workTime += this.settings.workTimeMinutes;
            this.todayStats.sessions++;
            this.startBreakTimer();
            Utils.showNotification('Work session complete! Time for a break! ☕', 'success');
        } else if (this.currentPhase === 'break') {
            this.todayStats.breakTime += this.settings.breakTimeMinutes;
            this.startWorkTimer();
            Utils.showNotification('Break over! Back to work! 💪', 'success');
        }
        
        this.saveStats();
        this.updateStatistics();
    }

    getTimerStateFromBackground() {
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_GET_STATE'
        }, (response) => {
            if (response && response.state) {
                this.updateFromBackgroundState(response.state);
            } else {
                this.updateDisplay();
            }
        });
    }

    updateFromBackgroundState(state) {
        this.currentTime = state.currentTime || 0;
        this.totalTime = state.totalTime || 0;
        this.isRunning = state.isRunning || false;
        this.currentPhase = state.currentPhase || 'work';
        
        if (state.timerComplete) {
            this.onTimerComplete();
        }
        
        this.updateDisplay();
    }

    updateDisplay() {
        // Update timer display
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.elements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update phase display
        let phaseText = '';
        let progressColor = '';
        
        switch (this.currentPhase) {
            case 'work':
                phaseText = this.isRunning ? '🎯 Working' : '💼 Ready to Work';
                progressColor = 'bg-blue-500';
                break;
            case 'break':
                phaseText = this.isRunning ? '☕ Break Time' : '⏸️ Break Ready';
                progressColor = 'bg-green-500';
                break;
            case 'lunch':
                phaseText = '🍽️ Lunch Break';
                progressColor = 'bg-orange-500';
                break;
        }
        
        this.elements.timerPhase.textContent = phaseText;
        this.elements.timerProgressBar.className = `${progressColor} h-3 rounded-full transition-all duration-1000`;
        
        // Update progress bar
        if (this.totalTime > 0 && this.currentPhase !== 'lunch') {
            const progress = ((this.totalTime - this.currentTime) / this.totalTime) * 100;
            this.elements.timerProgressBar.style.width = `${progress}%`;
        } else {
            this.elements.timerProgressBar.style.width = '0%';
        }
        
        // Update next phase info
        if (this.isRunning) {
            const nextPhase = this.currentPhase === 'work' ? 'break' : 'work';
            const nextDuration = nextPhase === 'work' ? this.settings.workTimeMinutes : this.settings.breakTimeMinutes;
            this.elements.nextPhaseInfo.textContent = `Next: ${nextDuration}min ${nextPhase}`;
        } else {
            this.elements.nextPhaseInfo.textContent = '';
        }
    }

    updateCurrentTime() {
        const now = new Date();
        this.elements.currentTime.textContent = now.toLocaleTimeString();
    }

    updateWorkDayStatus() {
        let status = '';
        
        if (!this.isWorkDayActive) {
            status = '🌅 Ready to start your work day';
        } else if (this.isLunchActive) {
            status = '🍽️ On lunch break';
        } else {
            const elapsed = new Date() - this.workDayStartTime;
            const elapsedHours = Math.floor(elapsed / 3600000);
            const elapsedMinutes = Math.floor((elapsed % 3600000) / 60000);
            status = `💼 Work day active (${elapsedHours}h ${elapsedMinutes}m)`;
        }
        
        this.elements.workDayStatus.textContent = status;
    }

    updateButtons() {
        this.elements.startDayBtn.disabled = this.isWorkDayActive;
        this.elements.startLunchBtn.disabled = !this.isWorkDayActive || this.isLunchActive;
        this.elements.endWorkBtn.disabled = !this.isWorkDayActive;
        
        // Update button text if lunch is active
        if (this.isLunchActive) {
            this.elements.startLunchBtn.textContent = '🔄 End Lunch';
            this.elements.startLunchBtn.disabled = false;
            this.elements.startLunchBtn.onclick = () => this.endLunch();
        } else {
            this.elements.startLunchBtn.textContent = '🍽️ Start Lunch';
            this.elements.startLunchBtn.onclick = () => this.startLunch();
        }
    }

    updateStatistics() {
        // Update today's statistics
        const workHours = Math.floor(this.todayStats.workTime / 60);
        const workMinutes = this.todayStats.workTime % 60;
        this.elements.todayWorkTime.textContent = `${workHours}:${workMinutes.toString().padStart(2, '0')}`;
        
        const breakHours = Math.floor(this.todayStats.breakTime / 60);
        const breakMinutes = this.todayStats.breakTime % 60;
        this.elements.todayBreakTime.textContent = `${breakHours}:${breakMinutes.toString().padStart(2, '0')}`;
        
        const lunchHours = Math.floor(this.todayStats.lunchTime / 60);
        const lunchMinutes = this.todayStats.lunchTime % 60;
        this.elements.todayLunchTime.textContent = `${lunchHours}:${lunchMinutes.toString().padStart(2, '0')}`;
        
        this.elements.todaySessions.textContent = this.todayStats.sessions;
        
        // Update daily progress
        const targetWorkMinutes = this.settings.workDuration * 60;
        const progress = Math.min((this.todayStats.workTime / targetWorkMinutes) * 100, 100);
        this.elements.dailyProgressBar.style.width = `${progress}%`;
        this.elements.dailyProgressPercent.textContent = `${Math.round(progress)}%`;
    }

    updateLunchCalculation() {
        const startTime = this.elements.workStartTime.value;
        const endTime = this.elements.workEndTime.value;
        const workDuration = parseFloat(this.elements.workDuration.value);
        
        if (startTime && endTime && workDuration) {
            const start = new Date(`2000-01-01 ${startTime}`);
            const end = new Date(`2000-01-01 ${endTime}`);
            const totalHours = (end - start) / 3600000;
            const lunchHours = totalHours - workDuration;
            
            if (lunchHours > 0) {
                const lunchMinutes = Math.round(lunchHours * 60);
                this.elements.lunchCalculation.textContent = `💡 You have ${lunchMinutes} minutes (${lunchHours.toFixed(1)}h) for lunch`;
            } else {
                this.elements.lunchCalculation.textContent = '⚠️ Work duration exceeds available time';
            }
        }
    }

    startPeriodicUpdates() {
        this.updateInterval = setInterval(() => {
            this.getTimerStateFromBackground();
            this.updateCurrentTime();
            this.updateWorkDayStatus();
            this.updateStatistics();
        }, 1000);
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    startAutoScheduleCheck() {
        this.autoScheduleInterval = setInterval(() => {
            this.checkAutoSchedule();
        }, 60000); // Check every minute
    }

    stopAutoScheduleCheck() {
        if (this.autoScheduleInterval) {
            clearInterval(this.autoScheduleInterval);
            this.autoScheduleInterval = null;
        }
    }

    checkAutoSchedule() {
        const now = new Date();
        const currentTime = now.toTimeString().substring(0, 5);
        
        // Auto start work day
        if (this.settings.autoStartDay && !this.isWorkDayActive && currentTime === this.settings.workStartTime) {
            this.startWorkDay();
        }
        
        // Auto end work day
        if (this.settings.autoEndDay && this.isWorkDayActive && currentTime === this.settings.workEndTime) {
            this.endWorkDay();
        }
    }

    // Settings Management
    openSettings() {
        this.populateSettingsForm();
        this.populateProfileSelect();
        this.elements.settingsModal.classList.remove('hidden');
        this.elements.settingsModal.classList.add('flex');
    }

    closeSettings() {
        this.elements.settingsModal.classList.add('hidden');
        this.elements.settingsModal.classList.remove('flex');
    }

    populateSettingsForm() {
        this.elements.workStartTime.value = this.settings.workStartTime;
        this.elements.workEndTime.value = this.settings.workEndTime;
        this.elements.workDuration.value = this.settings.workDuration;
        this.elements.workTimeMinutes.value = this.settings.workTimeMinutes;
        this.elements.breakTimeMinutes.value = this.settings.breakTimeMinutes;
        this.elements.autoStartDay.checked = this.settings.autoStartDay;
        this.elements.autoEndDay.checked = this.settings.autoEndDay;
        this.elements.historyPassword.value = this.settings.historyPassword;
    }

    async saveSettings() {
        this.settings = {
            workStartTime: this.elements.workStartTime.value,
            workEndTime: this.elements.workEndTime.value,
            workDuration: parseFloat(this.elements.workDuration.value),
            workTimeMinutes: parseInt(this.elements.workTimeMinutes.value),
            breakTimeMinutes: parseInt(this.elements.breakTimeMinutes.value),
            autoStartDay: this.elements.autoStartDay.checked,
            autoEndDay: this.elements.autoEndDay.checked,
            historyPassword: this.elements.historyPassword.value
        };
        
        await Utils.setStorageData({ advancedPomodoroSettings: this.settings });
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_UPDATE_SETTINGS',
            settings: this.settings
        });
        
        this.closeSettings();
        Utils.showNotification('Settings saved successfully! ⚙️', 'success');
    }

    // Profile Management
    populateProfileSelect() {
        this.elements.profileSelect.innerHTML = '<option value="">Select a profile...</option>';
        this.profiles.forEach((profile, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = profile.name;
            this.elements.profileSelect.appendChild(option);
        });
    }

    async saveProfile() {
        const name = this.elements.profileName.value.trim();
        if (!name) {
            Utils.showNotification('Please enter a profile name', 'warning');
            return;
        }
        
        const profile = {
            name: name,
            ...this.settings,
            createdAt: new Date().toISOString()
        };
        
        this.profiles.push(profile);
        await Utils.setStorageData({ advancedPomodoroProfiles: this.profiles });
        this.populateProfileSelect();
        this.elements.profileName.value = '';
        Utils.showNotification('Profile saved successfully! 👤', 'success');
    }

    loadSelectedProfile() {
        const selectedIndex = this.elements.profileSelect.value;
        if (selectedIndex === '') {
            Utils.showNotification('Please select a profile to load', 'warning');
            return;
        }
        
        const profile = this.profiles[selectedIndex];
        if (profile) {
            this.settings = { ...profile };
            delete this.settings.name;
            delete this.settings.createdAt;
            
            this.populateSettingsForm();
            this.updateLunchCalculation();
            Utils.showNotification(`Profile "${profile.name}" loaded! 👤`, 'success');
        }
    }

    // History Management
    async saveWorkDayToHistory() {
        const workDay = {
            date: new Date().toDateString(),
            startTime: this.workDayStartTime,
            endTime: this.workDayEndTime,
            stats: { ...this.todayStats },
            settings: { ...this.settings }
        };
        
        const data = await Utils.getStorageData(['advancedPomodoroHistory']);
        const history = data.advancedPomodoroHistory || [];
        history.unshift(workDay); // Add to beginning
        
        // Keep only last 30 days
        if (history.length > 30) {
            history.splice(30);
        }
        
        await Utils.setStorageData({ advancedPomodoroHistory: history });
        this.updateWorkHistory();
    }

    async updateWorkHistory() {
        const data = await Utils.getStorageData(['advancedPomodoroHistory']);
        const history = data.advancedPomodoroHistory || [];
        
        this.elements.workHistory.innerHTML = '';
        
        if (history.length === 0) {
            this.elements.workHistory.innerHTML = '<div class="text-sm text-gray-500 text-center py-2">No work history yet</div>';
            return;
        }
        
        history.slice(0, 10).forEach(day => {
            const workHours = Math.floor(day.stats.workTime / 60);
            const workMinutes = day.stats.workTime % 60;
            
            const historyItem = document.createElement('div');
            historyItem.className = 'text-xs bg-white p-2 rounded border';
            historyItem.innerHTML = `
                <div class="font-medium">${day.date}</div>
                <div class="text-gray-600">
                    Work: ${workHours}h ${workMinutes}m | Sessions: ${day.stats.sessions}
                </div>
            `;
            this.elements.workHistory.appendChild(historyItem);
        });
    }

    async clearHistory() {
        const password = prompt('Enter password to clear history:');
        if (password === this.settings.historyPassword && this.settings.historyPassword !== '') {
            await Utils.setStorageData({ advancedPomodoroHistory: [] });
            this.updateWorkHistory();
            Utils.showNotification('History cleared successfully! 🗑️', 'success');
        } else {
            Utils.showNotification('Incorrect password or no password set', 'error');
        }
    }

    // Data Management
    async loadSettings() {
        const data = await Utils.getStorageData(['advancedPomodoroSettings']);
        if (data.advancedPomodoroSettings) {
            this.settings = { ...this.settings, ...data.advancedPomodoroSettings };
        }
    }

    async loadProfiles() {
        const data = await Utils.getStorageData(['advancedPomodoroProfiles']);
        if (data.advancedPomodoroProfiles) {
            this.profiles = data.advancedPomodoroProfiles;
        }
    }

    async loadTodayStats() {
        const data = await Utils.getStorageData(['advancedPomodoroStats']);
        if (data.advancedPomodoroStats && data.advancedPomodoroStats.date === new Date().toDateString()) {
            this.todayStats = data.advancedPomodoroStats;
        }
    }

    async saveStats() {
        this.todayStats.date = new Date().toDateString();
        await Utils.setStorageData({ advancedPomodoroStats: this.todayStats });
    }

    async saveWorkDayState() {
        const state = {
            isWorkDayActive: this.isWorkDayActive,
            isLunchActive: this.isLunchActive,
            workDayStartTime: this.workDayStartTime,
            lunchStartTime: this.lunchStartTime,
            currentPhase: this.currentPhase
        };
        await Utils.setStorageData({ advancedPomodoroWorkDayState: state });
    }

    async loadWorkDayState() {
        const data = await Utils.getStorageData(['advancedPomodoroWorkDayState']);
        if (data.advancedPomodoroWorkDayState) {
            const state = data.advancedPomodoroWorkDayState;
            this.isWorkDayActive = state.isWorkDayActive;
            this.isLunchActive = state.isLunchActive;
            this.workDayStartTime = state.workDayStartTime ? new Date(state.workDayStartTime) : null;
            this.lunchStartTime = state.lunchStartTime ? new Date(state.lunchStartTime) : null;
            this.currentPhase = state.currentPhase || 'work';
        }
    }

    resetDayState() {
        this.isWorkDayActive = false;
        this.isLunchActive = false;
        this.workDayStartTime = null;
        this.workDayEndTime = null;
        this.lunchStartTime = null;
        this.lunchEndTime = null;
        this.currentPhase = 'work';
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = false;
        
        // Reset stats for new day
        this.todayStats = {
            workTime: 0,
            breakTime: 0,
            lunchTime: 0,
            sessions: 0,
            date: new Date().toDateString()
        };
        
        this.saveWorkDayState();
        this.saveStats();
    }
}
