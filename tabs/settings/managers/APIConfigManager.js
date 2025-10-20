import { Utils } from '../../../shared/utils.js';
import { ToastManager } from '../../../shared/toast-manager.js';

export class APIConfigManager {
    constructor(tab, elements) {
        this.tab = tab;
        this.elements = elements;

        // Model rate limits configuration
        this.modelRateLimits = {
            'gemini-2.5-flash': {
                requests_per_minute: 10,
                requests_per_day: 250,
                tokens_per_minute: 250000
            },
            'gemini-2.5-flash-lite': {
                requests_per_minute: 15,
                requests_per_day: 1000,
                tokens_per_minute: 250000
            }
        };

        this.rateLimits = {
            requests_per_minute: 15,
            requests_per_day: 1500
        };
    }

    /**
     * Load saved API configuration from storage
     */
    async loadSavedData() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['apiKey', 'temperature', 'timeEstimationPrompt'], resolve);
        });

        if (this.elements.apiKey) {
            this.elements.apiKey.value = data.apiKey || '';
        }
        
        if (this.elements.temperature) {
            this.elements.temperature.value = data.temperature || 0.3;
            this.updateTemperatureDisplay();
        }

        if (this.elements.timeEstimationPrompt) {
            this.elements.timeEstimationPrompt.value = data.timeEstimationPrompt || this.getDefaultTimeEstimationPrompt();
        }
    }

    /**
     * Save API configuration to storage
     */
    saveSettings() {
        const data = {
            apiKey: this.elements.apiKey.value.trim(),
            temperature: parseFloat(this.elements.temperature.value)
        };
        
        chrome.storage.local.set(data, () => {
            ToastManager.success('✅ API Settings saved successfully!');
        });
    }

    /**
     * Save time estimation prompt to storage
     */
    saveTimeEstimationPrompt() {
        const data = {
            timeEstimationPrompt: this.elements.timeEstimationPrompt.value.trim()
        };
        
        chrome.storage.local.set(data, () => {
            ToastManager.success('✅ Time Estimation Prompt saved successfully!');
        });
    }

    /**
     * Update the displayed temperature value
     */
    updateTemperatureDisplay() {
        if (this.elements.temperatureValue) {
            this.elements.temperatureValue.textContent = this.elements.temperature.value;
        }
    }

    /**
     * Get current API settings for use by other tabs
     */
    async getApiSettings() {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['apiKey', 'temperature'], resolve);
        });

        return {
            apiKey: data.apiKey || '',
            geminiModel: 'gemini-2.5-flash-lite',
            temperature: data.temperature || 0.3
        };
    }

    /**
     * Get rate limits for the selected model
     */
    getCurrentRateLimits() {
        return this.modelRateLimits['gemini-2.5-flash-lite'];
    }

    /**
     * Get the default time estimation prompt template
     */
    getDefaultTimeEstimationPrompt() {
        return `You are a senior software development project manager with expertise in time estimation.

Task Information:
- Task ID: {taskId}
- Title: {taskTitle}
- Description: {taskDescription}

Analyze this task and provide time estimations for different experience levels. Consider:
- Task complexity and scope
- Implementation requirements
- Testing time
- Code review and iteration time
- Documentation needs
- Potential blockers or research needed

Provide estimations in the following JSON format (respond with ONLY the JSON, no additional text):
{
  "junior": "Xh Ymin",
  "mid": "Xh Ymin", 
  "senior": "Xh Ymin",
  "reasoning": "Brief explanation of the estimation factors"
}

Guidelines:
- Use format like "2h 30min", "45min", "1h 15min"
- Junior developers typically take 1.5-3x longer than senior developers
- Mid-level developers typically take 1.2-2x longer than senior developers
- Consider learning curve, debugging time, and mentorship needs
- Be realistic but not overly conservative
- Minimum estimation should be 15min, maximum should be reasonable`;
    }
}
