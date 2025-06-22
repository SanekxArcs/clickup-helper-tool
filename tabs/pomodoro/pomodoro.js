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
            workTime: 0, // in seconds
            breakTime: 0, // in seconds
            lunchTime: 0, // in seconds
            sessions: 0,
            date: new Date().toDateString()
        };
        
        // Lunch budget tracking
        this.lunchBudget = {
            totalMinutes: 0, // calculated from settings
            usedMinutes: 0,  // total lunch time used today
            remainingMinutes: 0 // available lunch time
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
        console.log('PomodoroTab activated');
        if (!this.isInitialized) {
            console.log('Initializing PomodoroTab...');
            await this.initialize();
            this.isInitialized = true;
        } else {
            console.log('PomodoroTab already initialized, syncing with background...');
            // Re-sync with background when reactivating
            await this.loadWorkDayState(); // Reload work day state first
            await this.loadTodayStats(); // Reload today's stats
            await this.getTimerStateFromBackground(); // Then get timer state
            this.updateButtons();
            this.updateWorkDayStatus();
            this.updateStatistics();
            this.updateDebugInfo();
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
        await this.getTimerStateFromBackground();
        this.updateWorkHistory();
        this.updateButtons();
        this.updateWorkDayStatus();
        this.updateStatistics();
        this.updateDebugInfo();
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
            workHistory: document.getElementById('workHistory'),
            
            // Debug
            debugRefresh: document.getElementById('debugRefresh'),
            debugInfo: document.getElementById('debugInfo')
        };
    }

    setupEventListeners() {
        // Control buttons - using once to prevent duplicates
        this.elements.startDayBtn.addEventListener('click', () => this.startWorkDay(), { once: false });
        this.elements.startLunchBtn.addEventListener('click', () => this.startLunch(), { once: false });
        this.elements.endWorkBtn.addEventListener('click', async () => await this.endWorkDay(), { once: false });
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings(), { once: false });
        
        // Mark buttons as having listeners
        this.elements.startDayBtn.setAttribute('data-listener-active', 'true');
        this.elements.endWorkBtn.setAttribute('data-listener-active', 'true');
        
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
        
        // Debug
        this.elements.debugRefresh.addEventListener('click', () => {
            this.forceUIRefresh();
            this.updateDebugInfo();
        });
        
        // Close modal on outside click
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
        
        console.log('Event listeners setup completed');
    }

    setupBackgroundMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'ADVANCED_POMODORO_STATE_UPDATE') {
                this.updateFromBackgroundState(request.state);
            }
        });
    }

    startWorkDay() {
        console.log('startWorkDay called, isWorkDayActive:', this.isWorkDayActive);
        if (!this.isWorkDayActive) {
            this.isWorkDayActive = true;
            this.workDayStartTime = new Date();
            console.log('Starting work day at:', this.workDayStartTime);
            this.startWorkTimer();
            this.saveWorkDayState();
            this.updateButtons();
            this.updateWorkDayStatus();
            Utils.showNotification('Work day started! Good luck! 💪', 'success');
        } else {
            console.log('Work day already active, ignoring start request');
        }
    }

    startLunch() {
        if (this.isWorkDayActive && !this.isLunchActive) {
            // Check lunch budget
            this.calculateLunchBudget();
            
            if (this.lunchBudget.remainingMinutes <= 0) {
                Utils.showNotification('No lunch time remaining! You have used your full lunch budget for today. 🍽️', 'warning');
                return;
            }
            
            this.isLunchActive = true;
            this.lunchStartTime = new Date();
            this.pauseCurrentTimer();
            this.currentPhase = 'lunch';
            
            // Start lunch timer - counting up from 0
            this.currentTime = 0;
            this.totalTime = 0; // No fixed total time for lunch
            this.isRunning = true;
            
            chrome.runtime.sendMessage({
                type: 'ADVANCED_POMODORO_START_LUNCH'
            }, (response) => {
                if (response && response.state) {
                    this.updateFromBackgroundState(response.state);
                }
            });
            
            this.updateDisplay();
            this.updateButtons();
            this.updateWorkDayStatus();
            this.saveWorkDayState();
            Utils.showNotification(`Lunch break started! You have ${this.lunchBudget.remainingMinutes} minutes available. Enjoy your meal! 🍽️`, 'success');
        }
    }

    endLunch() {
        if (this.isLunchActive) {
            this.isLunchActive = false;
            this.lunchEndTime = new Date();
            
            // Calculate actual lunch duration from start time to now in seconds
            const actualLunchDuration = Math.floor((this.lunchEndTime - this.lunchStartTime) / 1000); // in seconds
            this.todayStats.lunchTime += actualLunchDuration;
            
            // Recalculate lunch budget
            this.calculateLunchBudget();
            
            console.log('Ending lunch:', {
                lunchStartTime: this.lunchStartTime,
                lunchEndTime: this.lunchEndTime,
                actualDuration: actualLunchDuration,
                timerCurrentTime: this.currentTime,
                lunchBudget: this.lunchBudget
            });
            
            // Stop the lunch timer
            chrome.runtime.sendMessage({
                type: 'ADVANCED_POMODORO_PAUSE'
            });
            
            // Reset to work phase
            this.currentPhase = 'work';
            this.startWorkTimer();
            
            this.updateButtons();
            this.updateWorkDayStatus();
            this.updateStatistics();
            this.saveStats();
            this.saveWorkDayState();
            
            const durationMinutes = Math.floor(actualLunchDuration / 60);
            const durationSeconds = actualLunchDuration % 60;
            
            // Show different messages based on budget status
            if (this.lunchBudget.remainingMinutes <= 0) {
                Utils.showNotification(`Back to work! Lunch was ${durationMinutes}m ${durationSeconds}s. You have used your full lunch budget for today! 🚀`, 'warning');
            } else {
                Utils.showNotification(`Back to work! Lunch was ${durationMinutes}m ${durationSeconds}s. ${this.lunchBudget.remainingMinutes} minutes remaining. Let's be productive! 🚀`, 'success');
            }
        }
    }

    async endWorkDay() {
        if (this.isWorkDayActive) {
            this.isWorkDayActive = false;
            this.workDayEndTime = new Date();
            
            console.log('Ending work day:', {
                startTime: this.workDayStartTime,
                endTime: this.workDayEndTime,
                currentStats: this.todayStats,
                currentPhase: this.currentPhase,
                isRunning: this.isRunning,
                currentTime: this.currentTime,
                totalTime: this.totalTime
            });
            
            // Add any partial work session time
            const currentWorkProgress = this.calculateCurrentWorkProgress();
            if (currentWorkProgress > 0) {
                this.todayStats.workTime += currentWorkProgress;
                console.log('Added', currentWorkProgress, 'seconds from current work session');
            }
            
            if (this.isLunchActive) {
                this.endLunch();
            }
            
            this.pauseCurrentTimer();
            
            console.log('Final work day stats before saving:', this.todayStats);
            
            // Save final stats before creating history
            await this.saveStats();
            await this.saveWorkDayToHistory();
            this.resetDayState();
            this.updateButtons();
            this.updateWorkDayStatus();
            this.updateStatistics();
            
            const totalWorkHours = Math.floor(this.todayStats.workTime / 3600);
            const totalWorkMinutes = Math.floor((this.todayStats.workTime % 3600) / 60);
            const totalWorkSeconds = this.todayStats.workTime % 60;
            Utils.showNotification(`Work day ended! Total work time: ${totalWorkHours}h ${totalWorkMinutes}m ${totalWorkSeconds}s 🎉`, 'success');
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
        }, (response) => {
            if (response && response.state) {
                this.updateFromBackgroundState(response.state);
            }
        });
        
        this.updateDisplay();
        this.saveWorkDayState();
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
        }, (response) => {
            if (response && response.state) {
                this.updateFromBackgroundState(response.state);
            }
        });
        
        this.updateDisplay();
        this.saveWorkDayState();
    }

    pauseCurrentTimer() {
        this.isRunning = false;
        chrome.runtime.sendMessage({
            type: 'ADVANCED_POMODORO_PAUSE'
        });
    }

    onTimerComplete() {
        this.isRunning = false;
        
        console.log('Timer completed for phase:', this.currentPhase);
        
        if (this.currentPhase === 'work') {
            // Add completed work session to stats (convert minutes to seconds)
            const workTimeSeconds = this.settings.workTimeMinutes * 60;
            this.todayStats.workTime += workTimeSeconds;
            this.todayStats.sessions++;
            console.log('Work session completed, added', workTimeSeconds, 'seconds to stats');
            
            this.currentPhase = 'break';
            this.currentTime = this.settings.breakTimeMinutes * 60;
            this.totalTime = this.currentTime;
            Utils.showNotification('Work session complete! Time for a break! ☕', 'success');
            
            // Auto-start break
            setTimeout(() => {
                this.startBreakTimer();
            }, 2000);
            
        } else if (this.currentPhase === 'break') {
            // Add completed break session to stats (convert minutes to seconds)
            const breakTimeSeconds = this.settings.breakTimeMinutes * 60;
            this.todayStats.breakTime += breakTimeSeconds;
            console.log('Break session completed, added', breakTimeSeconds, 'seconds to stats');
            
            this.currentPhase = 'work';
            this.currentTime = this.settings.workTimeMinutes * 60;
            this.totalTime = this.currentTime;
            Utils.showNotification('Break over! Back to work! 💪', 'success');
            
            // Auto-start work session if work day is still active
            if (this.isWorkDayActive) {
                setTimeout(() => {
                    this.startWorkTimer();
                }, 2000);
            }
        }
        
        this.saveStats();
        this.updateStatistics();
        this.updateDisplay();
        this.saveWorkDayState();
    }

    getTimerStateFromBackground() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'ADVANCED_POMODORO_GET_STATE'
            }, (response) => {
                console.log('Background state response:', response);
                if (chrome.runtime.lastError) {
                    console.error('Error getting timer state:', chrome.runtime.lastError);
                    // If we can't communicate with background, check if we need to restore timer
                    this.handleMissingBackgroundState();
                    this.updateDisplay();
                    this.updateDebugInfo();
                    resolve();
                    return;
                }
                
                if (response && response.state) {
                    console.log('Received valid background state:', response.state);
                    this.updateFromBackgroundState(response.state);
                } else {
                    console.log('No background state received, checking if timer should be running...');
                    this.handleMissingBackgroundState();
                }
                resolve();
            });
        });
    }

    handleMissingBackgroundState() {
        console.log('Handling missing background state...');
        console.log('Current state:', {
            isWorkDayActive: this.isWorkDayActive,
            currentTime: this.currentTime,
            currentPhase: this.currentPhase,
            isRunning: this.isRunning
        });
        
        // If we have a work day active but no timer state, we need to restore it
        if (this.isWorkDayActive && this.currentTime <= 0) {
            console.log('Work day is active but timer is 0, restoring timer state...');
            
            // Set up a fresh timer based on current phase
            if (this.currentPhase === 'work') {
                this.currentTime = this.settings.workTimeMinutes * 60;
                this.totalTime = this.currentTime;
            } else if (this.currentPhase === 'break') {
                this.currentTime = this.settings.breakTimeMinutes * 60;
                this.totalTime = this.currentTime;
            }
            
            // Don't auto-start, let user decide
            this.isRunning = false;
            console.log('Restored timer state:', {
                currentTime: this.currentTime,
                totalTime: this.totalTime,
                currentPhase: this.currentPhase
            });
        }
        
        this.updateDisplay();
        this.updateButtons();
        this.updateDebugInfo();
    }

    updateFromBackgroundState(state) {
        console.log('Updating from background state:', state);
        console.log('Current local state before update:', {
            currentTime: this.currentTime,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            isWorkDayActive: this.isWorkDayActive
        });
        
        // Update timer state from background - only if background has valid state
        if (state.currentTime !== undefined && state.currentTime >= 0) {
            this.currentTime = state.currentTime;
            console.log('Updated currentTime from background:', this.currentTime);
        }
        if (state.totalTime !== undefined && state.totalTime > 0) {
            this.totalTime = state.totalTime;
            console.log('Updated totalTime from background:', this.totalTime);
        }
        if (state.isRunning !== undefined) {
            this.isRunning = state.isRunning;
            console.log('Updated isRunning from background:', this.isRunning);
        }
        if (state.currentPhase !== undefined) {
            // Only update phase if it makes sense with our work day state
            if (!this.isWorkDayActive || state.currentPhase === this.currentPhase || 
                (this.isWorkDayActive && ['work', 'break'].includes(state.currentPhase))) {
                this.currentPhase = state.currentPhase;
                console.log('Updated currentPhase from background:', this.currentPhase);
            }
        }
        
        // Handle timer completion
        if (state.timerComplete) {
            console.log('Timer completed, processing...');
            this.onTimerComplete();
        }
        
        console.log('Final state after background update:', {
            currentTime: this.currentTime,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            isWorkDayActive: this.isWorkDayActive
        });
        
        // Update all UI elements
        this.updateDisplay();
        this.updateButtons();
        this.updateWorkDayStatus();
        this.updateStatistics();
        this.updateDebugInfo();
        
        // Re-enable event listeners if they were disabled
        this.ensureEventListenersActive();
    }

    ensureEventListenersActive() {
        // Make sure all buttons are clickable and event listeners are working
        this.elements.startDayBtn.style.pointerEvents = 'auto';
        this.elements.startLunchBtn.style.pointerEvents = 'auto';
        this.elements.endWorkBtn.style.pointerEvents = 'auto';
        this.elements.settingsBtn.style.pointerEvents = 'auto';
        
        // Force re-setup of critical event listeners
        if (this.elements.startDayBtn && !this.elements.startDayBtn.hasAttribute('data-listener-active')) {
            this.elements.startDayBtn.addEventListener('click', () => this.startWorkDay());
            this.elements.startDayBtn.setAttribute('data-listener-active', 'true');
        }
        
        if (this.elements.endWorkBtn && !this.elements.endWorkBtn.hasAttribute('data-listener-active')) {
            this.elements.endWorkBtn.addEventListener('click', async () => await this.endWorkDay());
            this.elements.endWorkBtn.setAttribute('data-listener-active', 'true');
        }
        
        // Re-setup lunch button with correct handler
        if (this.elements.startLunchBtn) {
            // Remove old listeners
            const newLunchBtn = this.elements.startLunchBtn.cloneNode(true);
            this.elements.startLunchBtn.parentNode.replaceChild(newLunchBtn, this.elements.startLunchBtn);
            this.elements.startLunchBtn = newLunchBtn;
            
            if (this.isLunchActive) {
                this.elements.startLunchBtn.addEventListener('click', () => this.endLunch());
            } else {
                this.elements.startLunchBtn.addEventListener('click', () => this.startLunch());
            }
        }
    }

    updateDisplay() {
        // Update timer display
        let minutes, seconds;
        
        if (this.currentPhase === 'lunch') {
            // For lunch, show time elapsed (counting up)
            minutes = Math.floor(Math.max(0, this.currentTime) / 60);
            seconds = Math.max(0, this.currentTime) % 60;
        } else {
            // For work/break, show time remaining (counting down)
            minutes = Math.floor(Math.max(0, this.currentTime) / 60);
            seconds = Math.max(0, this.currentTime) % 60;
        }
        
        this.elements.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update phase display
        let phaseText = '';
        let progressColor = '';
        
        switch (this.currentPhase) {
            case 'work':
                phaseText = this.isRunning ? '🎯 Working' : (this.isWorkDayActive ? '💼 Ready to Work' : '🌅 Ready to Start Day');
                progressColor = 'bg-blue-500';
                break;
            case 'break':
                phaseText = this.isRunning ? '☕ Break Time' : '⏸️ Break Ready';
                progressColor = 'bg-green-500';
                break;
            case 'lunch':
                phaseText = this.isRunning ? '🍽️ Lunch Break (time elapsed)' : '🍽️ Lunch Break';
                progressColor = 'bg-orange-500';
                break;
        }
        
        this.elements.timerPhase.textContent = phaseText;
        this.elements.timerProgressBar.className = `${progressColor} h-3 rounded-full transition-all duration-1000`;
        
        // Update progress bar
        if (this.totalTime > 0 && this.currentPhase !== 'lunch') {
            const progress = ((this.totalTime - this.currentTime) / this.totalTime) * 100;
            this.elements.timerProgressBar.style.width = `${Math.max(0, progress)}%`;
        } else if (this.currentPhase === 'lunch') {
            // For lunch, show a pulsing animation instead of progress
            this.elements.timerProgressBar.style.width = '100%';
            this.elements.timerProgressBar.style.animation = 'pulse 2s infinite';
        } else {
            this.elements.timerProgressBar.style.width = '0%';
            this.elements.timerProgressBar.style.animation = 'none';
        }
        
        // Update next phase info
        if (this.isRunning && this.isWorkDayActive && this.currentPhase !== 'lunch') {
            const nextPhase = this.currentPhase === 'work' ? 'break' : 'work';
            const nextDuration = nextPhase === 'work' ? this.settings.workTimeMinutes : this.settings.breakTimeMinutes;
            this.elements.nextPhaseInfo.textContent = `Next: ${nextDuration}min ${nextPhase}`;
        } else if (this.currentPhase === 'lunch') {
            this.elements.nextPhaseInfo.textContent = 'Click "End Lunch" when ready to continue working';
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
        } else if (this.workDayStartTime) {
            const elapsed = new Date() - new Date(this.workDayStartTime);
            const elapsedHours = Math.floor(elapsed / 3600000);
            const elapsedMinutes = Math.floor((elapsed % 3600000) / 60000);
            status = `💼 Work day active (${elapsedHours}h ${elapsedMinutes}m)`;
        } else {
            status = '💼 Work day active';
        }
        
        this.elements.workDayStatus.textContent = status;
    }

    updateButtons() {
        // Calculate lunch budget first
        this.calculateLunchBudget();
        
        // Ensure buttons are enabled/disabled correctly
        this.elements.startDayBtn.disabled = this.isWorkDayActive;
        
        // Lunch button logic with budget
        const canStartLunch = this.isWorkDayActive && !this.isLunchActive && this.lunchBudget.remainingMinutes > 0;
        this.elements.startLunchBtn.disabled = !canStartLunch && !this.isLunchActive;
        
        this.elements.endWorkBtn.disabled = !this.isWorkDayActive;
        
        // Set onclick handlers directly as backup
        this.elements.startDayBtn.onclick = () => this.startWorkDay();
        this.elements.endWorkBtn.onclick = async () => await this.endWorkDay();
        
        // Make sure buttons are clickable when enabled
        if (!this.elements.startDayBtn.disabled) {
            this.elements.startDayBtn.style.pointerEvents = 'auto';
            this.elements.startDayBtn.style.opacity = '1';
        } else {
            this.elements.startDayBtn.style.opacity = '0.5';
        }
        
        if (!this.elements.endWorkBtn.disabled) {
            this.elements.endWorkBtn.style.pointerEvents = 'auto';
            this.elements.endWorkBtn.style.opacity = '1';
        } else {
            this.elements.endWorkBtn.style.opacity = '0.5';
        }
        
        // Update lunch button text and functionality with budget display
        if (this.isLunchActive) {
            // During lunch, show remaining minutes counting down
            const currentLunchMinutes = Math.floor((Date.now() - this.lunchStartTime) / 60000);
            const remainingLunchMinutes = Math.max(0, this.lunchBudget.remainingMinutes - currentLunchMinutes);
            
            this.elements.startLunchBtn.textContent = `🔄 End Lunch (${remainingLunchMinutes})`;
            this.elements.startLunchBtn.disabled = false;
            this.elements.startLunchBtn.style.pointerEvents = 'auto';
            this.elements.startLunchBtn.style.opacity = '1';
            this.elements.startLunchBtn.onclick = () => this.endLunch();
            
            // Change color if over budget
            if (remainingLunchMinutes <= 0) {
                this.elements.startLunchBtn.className = 'bg-red-50 ring-2 ring-red-400 text-black px-4 py-3 rounded-lg font-medium hover:bg-red-100 transition-all';
            } else {
                this.elements.startLunchBtn.className = 'bg-orange-50 ring-2 ring-orange-400 text-black px-4 py-3 rounded-lg font-medium hover:bg-orange-100 transition-all';
            }
        } else {
            // Not on lunch, show available minutes
            if (this.lunchBudget.remainingMinutes > 0) {
                this.elements.startLunchBtn.textContent = `🍽️ Start Lunch (${this.lunchBudget.remainingMinutes})`;
                this.elements.startLunchBtn.className = 'bg-orange-50 ring-2 ring-orange-400 text-black px-4 py-3 rounded-lg font-medium hover:bg-orange-100 transition-all';
            } else {
                this.elements.startLunchBtn.textContent = `🍽️ Lunch Used (0)`;
                this.elements.startLunchBtn.className = 'bg-gray-50 ring-2 ring-gray-400 text-gray-500 px-4 py-3 rounded-lg font-medium cursor-not-allowed';
            }
            
            if (!this.elements.startLunchBtn.disabled) {
                this.elements.startLunchBtn.style.pointerEvents = 'auto';
                this.elements.startLunchBtn.style.opacity = '1';
            } else {
                this.elements.startLunchBtn.style.opacity = '0.5';
            }
            this.elements.startLunchBtn.onclick = () => this.startLunch();
        }
        
        console.log('Buttons updated:', {
            startDay: { disabled: this.elements.startDayBtn.disabled, workDayActive: this.isWorkDayActive },
            lunch: { disabled: this.elements.startLunchBtn.disabled, lunchActive: this.isLunchActive, remainingMinutes: this.lunchBudget.remainingMinutes },
            endWork: { disabled: this.elements.endWorkBtn.disabled }
        });
    }

    updateStatistics() {
        // Update today's statistics with seconds (all stats are now in seconds)
        const workHours = Math.floor(this.todayStats.workTime / 3600);
        const workMinutes = Math.floor((this.todayStats.workTime % 3600) / 60);
        const workSeconds = this.todayStats.workTime % 60;
        this.elements.todayWorkTime.textContent = `${workHours}:${workMinutes.toString().padStart(2, '0')}:${workSeconds.toString().padStart(2, '0')}`;
        
        const breakHours = Math.floor(this.todayStats.breakTime / 3600);
        const breakMinutes = Math.floor((this.todayStats.breakTime % 3600) / 60);
        const breakSecondsVal = this.todayStats.breakTime % 60;
        this.elements.todayBreakTime.textContent = `${breakHours}:${breakMinutes.toString().padStart(2, '0')}:${breakSecondsVal.toString().padStart(2, '0')}`;
        
        const lunchHours = Math.floor(this.todayStats.lunchTime / 3600);
        const lunchMinutes = Math.floor((this.todayStats.lunchTime % 3600) / 60);
        const lunchSecondsVal = this.todayStats.lunchTime % 60;
        this.elements.todayLunchTime.textContent = `${lunchHours}:${lunchMinutes.toString().padStart(2, '0')}:${lunchSecondsVal.toString().padStart(2, '0')}`;
        
        this.elements.todaySessions.textContent = this.todayStats.sessions;
        
        // Update daily progress (convert work duration from hours to seconds)
        const targetWorkSeconds = this.settings.workDuration * 3600;
        const progress = Math.min((this.todayStats.workTime / targetWorkSeconds) * 100, 100);
        this.elements.dailyProgressBar.style.width = `${progress}%`;
        this.elements.dailyProgressPercent.textContent = `${Math.round(progress)}%`;
        
        console.log('Statistics updated:', {
            workTime: this.todayStats.workTime,
            breakTime: this.todayStats.breakTime,
            lunchTime: this.todayStats.lunchTime,
            sessions: this.todayStats.sessions
        });
    }

    calculateLunchBudget() {
        const startTime = this.settings.workStartTime;
        const endTime = this.settings.workEndTime;
        const workDuration = this.settings.workDuration;
        
        if (startTime && endTime && workDuration) {
            const start = new Date(`2000-01-01 ${startTime}`);
            const end = new Date(`2000-01-01 ${endTime}`);
            const totalHours = (end - start) / 3600000;
            const lunchHours = totalHours - workDuration;
            
            if (lunchHours > 0) {
                this.lunchBudget.totalMinutes = Math.round(lunchHours * 60);
            } else {
                this.lunchBudget.totalMinutes = 0;
            }
        } else {
            this.lunchBudget.totalMinutes = 60; // Default 1 hour
        }
        
        // Calculate used and remaining minutes
        this.lunchBudget.usedMinutes = Math.floor(this.todayStats.lunchTime / 60);
        this.lunchBudget.remainingMinutes = Math.max(0, this.lunchBudget.totalMinutes - this.lunchBudget.usedMinutes);
        
        console.log('Lunch budget calculated:', this.lunchBudget);
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
                this.elements.lunchCalculation.textContent = `💡 Available time for lunch: ${lunchMinutes} minutes (${lunchHours.toFixed(1)}h)`;
                this.elements.lunchCalculation.className = 'text-xs text-blue-600 bg-blue-50 p-2 rounded';
            } else if (lunchHours < 0) {
                this.elements.lunchCalculation.textContent = '⚠️ Work duration exceeds available time - you need more hours in your schedule';
                this.elements.lunchCalculation.className = 'text-xs text-red-600 bg-red-50 p-2 rounded';
            } else {
                this.elements.lunchCalculation.textContent = '⚠️ No time available for lunch - work duration equals total time';
                this.elements.lunchCalculation.className = 'text-xs text-orange-600 bg-orange-50 p-2 rounded';
            }
        }
    }

    startPeriodicUpdates() {
        this.updateInterval = setInterval(async () => {
            await this.getTimerStateFromBackground();
            this.updateCurrentTime();
            this.updateWorkDayStatus();
            
            // Update lunch button every minute during lunch
            if (this.isLunchActive) {
                this.updateButtons(); // This will update the countdown
            }
            
            // Update statistics more frequently to show real-time progress
            if (this.isRunning && this.currentPhase === 'work') {
                // Add current session progress to display
                const currentProgress = this.calculateCurrentWorkProgress();
                const tempStats = { ...this.todayStats };
                tempStats.workTime += currentProgress;
                
                // Temporarily update display with current progress
                const workHours = Math.floor(tempStats.workTime / 3600);
                const workMinutes = Math.floor((tempStats.workTime % 3600) / 60);
                const workSeconds = tempStats.workTime % 60;
                this.elements.todayWorkTime.textContent = `${workHours}:${workMinutes.toString().padStart(2, '0')}:${workSeconds.toString().padStart(2, '0')}`;
                
                // Update progress bar with current work
                const targetWorkSeconds = this.settings.workDuration * 3600;
                const progress = Math.min((tempStats.workTime / targetWorkSeconds) * 100, 100);
                this.elements.dailyProgressBar.style.width = `${progress}%`;
                this.elements.dailyProgressPercent.textContent = `${Math.round(progress)}%`;
            } else {
                // Normal statistics update
                this.updateStatistics();
            }
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
        
        history.slice(0, 10).forEach((day, index) => {
            // Handle both old format (minutes) and new format (seconds)
            let workTimeInSeconds = day.stats.workTime;
            if (workTimeInSeconds < 3600 && day.stats.sessions > 0) {
                // Likely old format in minutes, convert to seconds
                workTimeInSeconds = day.stats.workTime * 60;
            }
            
            const workHours = Math.floor(workTimeInSeconds / 3600);
            const workMinutes = Math.floor((workTimeInSeconds % 3600) / 60);
            const workSeconds = workTimeInSeconds % 60;
            
            const historyItem = document.createElement('div');
            historyItem.className = 'text-xs bg-white p-2 rounded border flex justify-between items-center';
            historyItem.innerHTML = `
                <div>
                    <div class="font-medium">${day.date}</div>
                    <div class="text-gray-600">
                        Work: ${workHours}h ${workMinutes}m ${workSeconds}s | Sessions: ${day.stats.sessions}
                    </div>
                </div>
                <button class="delete-history-item text-red-500 hover:text-red-700 px-1" data-index="${index}">
                    🗑️
                </button>
            `;
            this.elements.workHistory.appendChild(historyItem);
        });
        
        // Add event listeners for individual delete buttons
        this.elements.workHistory.querySelectorAll('.delete-history-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.deleteHistoryItem(index);
            });
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

    async deleteHistoryItem(index) {
        const password = prompt('Enter password to delete this history item:');
        if (password === this.settings.historyPassword && this.settings.historyPassword !== '') {
            const data = await Utils.getStorageData(['advancedPomodoroHistory']);
            const history = data.advancedPomodoroHistory || [];
            
            if (index >= 0 && index < history.length) {
                history.splice(index, 1);
                await Utils.setStorageData({ advancedPomodoroHistory: history });
                this.updateWorkHistory();
                Utils.showNotification('History item deleted! 🗑️', 'success');
            }
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
        // Recalculate lunch budget when settings are loaded
        this.calculateLunchBudget();
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
        // Recalculate lunch budget when stats are loaded
        this.calculateLunchBudget();
    }

    async saveStats() {
        this.todayStats.date = new Date().toDateString();
        await Utils.setStorageData({ advancedPomodoroStats: this.todayStats });
    }

    async saveWorkDayState() {
        const state = {
            isWorkDayActive: this.isWorkDayActive,
            isLunchActive: this.isLunchActive,
            workDayStartTime: this.workDayStartTime ? this.workDayStartTime.toISOString() : null,
            lunchStartTime: this.lunchStartTime ? this.lunchStartTime.toISOString() : null,
            currentPhase: this.currentPhase,
            date: new Date().toDateString()
        };
        
        console.log('Saving work day state:', state);
        await Utils.setStorageData({ advancedPomodoroWorkDayState: state });
    }

    async loadWorkDayState() {
        const data = await Utils.getStorageData(['advancedPomodoroWorkDayState']);
        if (data.advancedPomodoroWorkDayState) {
            const state = data.advancedPomodoroWorkDayState;
            
            // Only load state if it's from today
            const today = new Date().toDateString();
            if (state.date === today) {
                console.log('Loading work day state from today:', state);
                
                this.isWorkDayActive = state.isWorkDayActive || false;
                this.isLunchActive = state.isLunchActive || false;
                
                // Fix date parsing issues - be more robust
                if (state.workDayStartTime) {
                    try {
                        // Handle both string and already parsed dates
                        if (typeof state.workDayStartTime === 'string') {
                            this.workDayStartTime = new Date(state.workDayStartTime);
                        } else if (state.workDayStartTime instanceof Date) {
                            this.workDayStartTime = state.workDayStartTime;
                        } else {
                            this.workDayStartTime = new Date(state.workDayStartTime);
                        }
                        
                        // Verify the date is valid
                        if (isNaN(this.workDayStartTime.getTime())) {
                            console.error('Invalid workDayStartTime, resetting to null');
                            this.workDayStartTime = null;
                        }
                    } catch (e) {
                        console.error('Error parsing workDayStartTime:', e, state.workDayStartTime);
                        this.workDayStartTime = null;
                    }
                } else {
                    this.workDayStartTime = null;
                }
                
                if (state.lunchStartTime) {
                    try {
                        // Handle both string and already parsed dates
                        if (typeof state.lunchStartTime === 'string') {
                            this.lunchStartTime = new Date(state.lunchStartTime);
                        } else if (state.lunchStartTime instanceof Date) {
                            this.lunchStartTime = state.lunchStartTime;
                        } else {
                            this.lunchStartTime = new Date(state.lunchStartTime);
                        }
                        
                        // Verify the date is valid
                        if (isNaN(this.lunchStartTime.getTime())) {
                            console.error('Invalid lunchStartTime, resetting to null');
                            this.lunchStartTime = null;
                        }
                    } catch (e) {
                        console.error('Error parsing lunchStartTime:', e, state.lunchStartTime);
                        this.lunchStartTime = null;
                    }
                } else {
                    this.lunchStartTime = null;
                }
                
                this.currentPhase = state.currentPhase || 'work';
                
                console.log('Loaded work day state:', {
                    isWorkDayActive: this.isWorkDayActive,
                    workDayStartTime: this.workDayStartTime,
                    currentPhase: this.currentPhase,
                    isLunchActive: this.isLunchActive
                });
            } else {
                console.log('Work day state is from a different day, resetting...');
                this.resetDayState();
            }
        } else {
            console.log('No work day state found, using defaults');
        }
    }

    resetDayState() {
        console.log('Resetting day state...');
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
            workTime: 0, // in seconds
            breakTime: 0, // in seconds
            lunchTime: 0, // in seconds
            sessions: 0,
            date: new Date().toDateString()
        };
        
        // Reset lunch budget
        this.calculateLunchBudget();
        
        this.saveWorkDayState();
        this.saveStats();
        console.log('Day state reset complete');
    }

    async forceUIRefresh() {
        console.log('Force refreshing UI state...');
        console.log('Current state before refresh:', {
            isWorkDayActive: this.isWorkDayActive,
            isLunchActive: this.isLunchActive,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            currentTime: this.currentTime
        });
        
        // Reload all state from storage and background
        await this.loadWorkDayState();
        await this.loadTodayStats();
        await this.getTimerStateFromBackground();
        
        console.log('Current state after refresh:', {
            isWorkDayActive: this.isWorkDayActive,
            isLunchActive: this.isLunchActive,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            currentTime: this.currentTime
        });
        
        this.updateDisplay();
        this.updateButtons();
        this.updateWorkDayStatus();
        this.updateStatistics();
        this.ensureEventListenersActive();
        this.updateDebugInfo();
    }

    updateDebugInfo() {
        const debugInfo = {
            isWorkDayActive: this.isWorkDayActive,
            isLunchActive: this.isLunchActive,
            isRunning: this.isRunning,
            currentPhase: this.currentPhase,
            currentTime: this.currentTime,
            totalTime: this.totalTime,
            workDayStartTime: this.workDayStartTime ? this.workDayStartTime.toLocaleTimeString() : 'null',
            lunchStartTime: this.lunchStartTime ? this.lunchStartTime.toLocaleTimeString() : 'null',
            todayDate: new Date().toDateString()
        };
        
        this.elements.debugInfo.textContent = JSON.stringify(debugInfo, null, 2);
    }

    calculateCurrentWorkProgress() {
        // Calculate how much work time has been accumulated from the current session in seconds
        if (this.isRunning && this.currentPhase === 'work' && this.totalTime > 0) {
            const elapsedTime = this.totalTime - this.currentTime; // in seconds
            console.log('Current work session progress:', elapsedTime, 'seconds');
            return elapsedTime;
        }
        return 0;
    }
}
