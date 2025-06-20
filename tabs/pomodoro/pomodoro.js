// Pomodoro Tab - Timer functionality
import { Utils } from '../../shared/utils.js';

export class PomodoroTab {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        this.currentTime = 0;
        this.totalTime = 0;
        this.isRunning = false;
        this.currentPhase = 'focus';
        this.sessionsCompleted = 0;
        this.totalFocusMinutes = 0;
        this.dailyTemplates = [];
        this.updateInterval = null;
    }

    async onActivate() {
        if (!this.isInitialized) {
            await this.initialize();
            this.isInitialized = true;
        }
        this.startPeriodicUpdates();
    }

    onDeactivate() {
        this.stopPeriodicUpdates();
    }

    async initialize() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupBackgroundMessageListener();
        await this.loadPomodoroSettings();
        await this.loadPomodoroTemplates();
        this.getTimerStateFromBackground();
    }

    initializeElements() {
        this.elements = {
            pomodoroDisplay: document.getElementById('pomodoroDisplay'),
            pomodoroPhase: document.getElementById('pomodoroPhase'),
            pomodoroProgress: document.getElementById('pomodoroProgress'),
            pomodoroProgressBar: document.getElementById('pomodoroProgressBar'),
            pomodoroStart: document.getElementById('pomodoroStart'),
            pomodoroPause: document.getElementById('pomodoroPause'),
            pomodoroReset: document.getElementById('pomodoroReset'),
            pomodoroNext: document.getElementById('pomodoroNext'),
            focusTime: document.getElementById('focusTime'),
            shortBreak: document.getElementById('shortBreak'),
            longBreak: document.getElementById('longBreak'),
            sessionsUntilLongBreak: document.getElementById('sessionsUntilLongBreak'),
            targetEndTime: document.getElementById('targetEndTime'),
            calculateTime: document.getElementById('calculateTime'),
            timeCalculation: document.getElementById('timeCalculation'),
            templateName: document.getElementById('templateName'),
            createTemplate: document.getElementById('createTemplate'),
            loadTemplate: document.getElementById('loadTemplate'),
            templateList: document.getElementById('templateList'),
            sessionsCompleted: document.getElementById('sessionsCompleted'),
            totalFocusTime: document.getElementById('totalFocusTime'),
            dailyProgress: document.getElementById('dailyProgress')
        };
    }

    setupEventListeners() {
        this.elements.pomodoroStart.addEventListener('click', () => this.startTimer());
        this.elements.pomodoroPause.addEventListener('click', () => this.pauseTimer());
        this.elements.pomodoroReset.addEventListener('click', () => this.resetTimer());
        this.elements.pomodoroNext.addEventListener('click', () => this.nextPhase());
        
        this.elements.calculateTime.addEventListener('click', () => this.calculateEndTime());
        this.elements.createTemplate.addEventListener('click', () => this.createTemplate());
        this.elements.loadTemplate.addEventListener('click', () => this.loadTemplate());
        
        // Save settings when changed
        [this.elements.focusTime, this.elements.shortBreak, this.elements.longBreak, this.elements.sessionsUntilLongBreak].forEach(element => {
            element.addEventListener('change', () => this.savePomodoroSettings());
        });
    }

    setupBackgroundMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'POMODORO_STATE_UPDATE') {
                this.updateFromBackgroundState(request.state);
            }
        });
    }

    startTimer() {
        const settings = this.getSettings();
        chrome.runtime.sendMessage({
            type: 'POMODORO_START',
            settings: settings
        }, (response) => {
            if (response && response.success) {
                this.updateFromBackgroundState(response.state);
            }
        });
    }

    pauseTimer() {
        chrome.runtime.sendMessage({
            type: 'POMODORO_PAUSE'
        }, (response) => {
            if (response && response.success) {
                this.updateFromBackgroundState(response.state);
            }
        });
    }

    resetTimer() {
        chrome.runtime.sendMessage({
            type: 'POMODORO_RESET'
        }, (response) => {
            if (response && response.success) {
                this.updateFromBackgroundState(response.state);
                this.setPhaseTime();
                this.updateDisplay();
            }
        });
    }

    nextPhase() {
        chrome.runtime.sendMessage({
            type: 'POMODORO_NEXT'
        }, (response) => {
            if (response && response.success) {
                this.updateFromBackgroundState(response.state);
            }
        });
    }

    getTimerStateFromBackground() {
        chrome.runtime.sendMessage({
            type: 'POMODORO_GET_STATE'
        }, (response) => {
            if (response && response.state) {
                this.updateFromBackgroundState(response.state);
            } else {
                this.setPhaseTime();
                this.updateDisplay();
                this.updateProgressDisplay();
            }
        });
    }

    updateFromBackgroundState(state) {
        this.currentTime = state.currentTime || 0;
        this.totalTime = state.totalTime || 0;
        this.isRunning = state.isRunning || false;
        this.currentPhase = state.currentPhase || 'focus';
        this.sessionsCompleted = state.sessionsCompleted || 0;
        this.totalFocusMinutes = state.totalFocusMinutes || 0;
        
        this.updateDisplay();
        this.updateProgressDisplay();
        this.updateControlButtons();
    }

    updateControlButtons() {
        if (this.isRunning) {
            this.elements.pomodoroStart.disabled = true;
            this.elements.pomodoroPause.disabled = false;
            this.elements.pomodoroStart.textContent = '▶️ Running...';
        } else {
            this.elements.pomodoroStart.disabled = false;
            this.elements.pomodoroPause.disabled = true;
            this.elements.pomodoroStart.textContent = this.currentTime > 0 && this.currentTime < this.totalTime ? '▶️ Resume' : '▶️ Start';
        }
    }

    startPeriodicUpdates() {
        this.updateInterval = setInterval(() => {
            this.getTimerStateFromBackground();
        }, 1000);
    }

    stopPeriodicUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    getSettings() {
        return {
            focusTime: parseInt(this.elements.focusTime.value),
            shortBreak: parseInt(this.elements.shortBreak.value),
            longBreak: parseInt(this.elements.longBreak.value),
            sessionsUntilLongBreak: parseInt(this.elements.sessionsUntilLongBreak.value)
        };
    }

    setPhaseTime() {
        const settings = this.getSettings();
        let minutes;
        switch (this.currentPhase) {
            case 'focus':
                minutes = settings.focusTime;
                this.elements.pomodoroPhase.textContent = '🎯 Focus Session';
                this.elements.pomodoroProgressBar.className = 'bg-blue-500 h-2 rounded-full transition-all duration-1000';
                break;
            case 'shortBreak':
                minutes = settings.shortBreak;
                this.elements.pomodoroPhase.textContent = '☕ Short Break';
                this.elements.pomodoroProgressBar.className = 'bg-green-500 h-2 rounded-full transition-all duration-1000';
                break;
            case 'longBreak':
                minutes = settings.longBreak;
                this.elements.pomodoroPhase.textContent = '🌴 Long Break';
                this.elements.pomodoroProgressBar.className = 'bg-purple-500 h-2 rounded-full transition-all duration-1000';
                break;
        }
        this.currentTime = minutes * 60;
        this.totalTime = minutes * 60;
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        this.elements.pomodoroDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        if (this.totalTime > 0) {
            const progress = ((this.totalTime - this.currentTime) / this.totalTime) * 100;
            this.elements.pomodoroProgressBar.style.width = `${progress}%`;
        }
        
        // Update phase display
        switch (this.currentPhase) {
            case 'focus':
                this.elements.pomodoroPhase.textContent = '🎯 Focus Session';
                this.elements.pomodoroProgressBar.className = 'bg-blue-500 h-2 rounded-full transition-all duration-1000';
                break;
            case 'shortBreak':
                this.elements.pomodoroPhase.textContent = '☕ Short Break';
                this.elements.pomodoroProgressBar.className = 'bg-green-500 h-2 rounded-full transition-all duration-1000';
                break;
            case 'longBreak':
                this.elements.pomodoroPhase.textContent = '🌴 Long Break';
                this.elements.pomodoroProgressBar.className = 'bg-purple-500 h-2 rounded-full transition-all duration-1000';
                break;
        }
    }

    updateProgressDisplay() {
        this.elements.sessionsCompleted.textContent = this.sessionsCompleted;
        const hours = Math.floor(this.totalFocusMinutes / 60);
        const minutes = this.totalFocusMinutes % 60;
        this.elements.totalFocusTime.textContent = `${hours}h ${minutes}m`;
        
        const dailyGoal = 8;
        const progress = Math.min((this.sessionsCompleted / dailyGoal) * 100, 100);
        this.elements.dailyProgress.style.width = `${progress}%`;
    }

    calculateEndTime() {
        const targetTime = this.elements.targetEndTime.value;
        if (!targetTime) {
            this.elements.timeCalculation.textContent = 'Please select a target end time';
            this.elements.timeCalculation.classList.remove('hidden');
            return;
        }

        const now = new Date();
        const target = new Date();
        const [hours, minutes] = targetTime.split(':');
        target.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }

        const diffMinutes = Math.floor((target - now) / (1000 * 60));
        
        if (diffMinutes > 0) {
            this.elements.focusTime.value = Math.max(1, Math.min(60, diffMinutes));
            this.resetTimer();
            this.elements.timeCalculation.textContent = `Set to ${diffMinutes} minutes to reach ${targetTime}`;
        } else {
            this.elements.timeCalculation.textContent = 'Invalid target time';
        }
        
        this.elements.timeCalculation.classList.remove('hidden');
        setTimeout(() => {
            this.elements.timeCalculation.classList.add('hidden');
        }, 5000);
    }

    createTemplate() {
        const name = this.elements.templateName.value.trim();
        if (!name) {
            Utils.showNotification('Please enter a template name', 'warning');
            return;
        }

        const template = {
            name: name,
            focusTime: parseInt(this.elements.focusTime.value),
            shortBreak: parseInt(this.elements.shortBreak.value),
            longBreak: parseInt(this.elements.longBreak.value),
            sessionsUntilLongBreak: parseInt(this.elements.sessionsUntilLongBreak.value),
            createdAt: new Date().toISOString()
        };

        this.dailyTemplates.push(template);
        this.savePomodoroTemplates();
        this.renderTemplateList();
        this.elements.templateName.value = '';
        Utils.showNotification('Template created successfully!', 'success');
    }

    loadTemplate() {
        if (this.dailyTemplates.length === 0) {
            Utils.showNotification('No templates available. Create one first!', 'warning');
            return;
        }

        const template = this.dailyTemplates[this.dailyTemplates.length - 1];
        this.loadSpecificTemplate(this.dailyTemplates.length - 1);
    }

    renderTemplateList() {
        this.elements.templateList.innerHTML = this.dailyTemplates.map((template, index) => `
            <div class="flex justify-between items-center p-2 bg-white rounded border border-gray-200 mb-2">
                <div class="flex-1">
                    <div class="font-medium text-sm">${template.name}</div>
                    <div class="text-xs text-gray-500">${template.focusTime}m focus, ${template.shortBreak}m short, ${template.longBreak}m long</div>
                </div>
                <div class="flex gap-1">
                    <button class="template-load-btn text-xs px-2 py-1 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100" data-template-index="${index}">Load</button>
                    <button class="template-delete-btn text-xs px-2 py-1 bg-red-50 border border-red-300 rounded hover:bg-red-100" data-template-index="${index}">×</button>
                </div>
            </div>
        `).join('');
        
        this.setupTemplateButtonListeners();
    }

    setupTemplateButtonListeners() {
        const loadButtons = this.elements.templateList.querySelectorAll('.template-load-btn');
        loadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-template-index'));
                this.loadSpecificTemplate(index);
            });
        });

        const deleteButtons = this.elements.templateList.querySelectorAll('.template-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-template-index'));
                this.deleteTemplate(index);
            });
        });
    }

    loadSpecificTemplate(index) {
        const template = this.dailyTemplates[index];
        if (template) {
            this.elements.focusTime.value = template.focusTime;
            this.elements.shortBreak.value = template.shortBreak;
            this.elements.longBreak.value = template.longBreak;
            this.elements.sessionsUntilLongBreak.value = template.sessionsUntilLongBreak;
            
            this.savePomodoroSettings();
            this.resetTimer();
            
            chrome.runtime.sendMessage({
                type: 'POMODORO_UPDATE_SETTINGS',
                settings: this.getSettings()
            });
            
            Utils.showNotification(`Template "${template.name}" loaded!`, 'success');
        }
    }

    deleteTemplate(index) {
        if (confirm('Delete this template?')) {
            this.dailyTemplates.splice(index, 1);
            this.savePomodoroTemplates();
            this.renderTemplateList();
            Utils.showNotification('Template deleted', 'success');
        }
    }

    async savePomodoroSettings() {
        const settings = this.getSettings();
        await Utils.setStorageData({ pomodoroSettings: settings });
        
        chrome.runtime.sendMessage({
            type: 'POMODORO_UPDATE_SETTINGS',
            settings: settings
        });
    }

    async loadPomodoroSettings() {
        const data = await Utils.getStorageData(['pomodoroSettings']);
        if (data.pomodoroSettings) {
            const settings = data.pomodoroSettings;
            this.elements.focusTime.value = settings.focusTime || 25;
            this.elements.shortBreak.value = settings.shortBreak || 5;
            this.elements.longBreak.value = settings.longBreak || 15;
            this.elements.sessionsUntilLongBreak.value = settings.sessionsUntilLongBreak || 4;
        }
    }

    async savePomodoroTemplates() {
        await Utils.setStorageData({ pomodoroTemplates: this.dailyTemplates });
    }

    async loadPomodoroTemplates() {
        const data = await Utils.getStorageData(['pomodoroTemplates']);
        if (data.pomodoroTemplates) {
            this.dailyTemplates = data.pomodoroTemplates;
            this.renderTemplateList();
        }
    }
}
