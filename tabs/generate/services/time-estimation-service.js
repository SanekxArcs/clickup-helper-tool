// Time Estimation Service
// Handles AI-powered time estimation for tasks based on experience levels

import { Utils } from '../../../shared/utils.js';

export class TimeEstimationService {
    constructor() {
        this.experienceLevels = {
            'junior': 'Junior Developer (0-2 years experience)',
            'mid': 'Mid-level Developer (2-5 years experience)', 
            'senior': 'Senior Developer (5+ years experience)'
        };
        this.modelRateLimits = {
            'gemini-2.5-pro': {
                requests_per_minute: 5,
                requests_per_day: 100,
                tokens_per_minute: 250000
            },
            'gemini-2.5-flash': {
                requests_per_minute: 10,
                requests_per_day: 250,
                tokens_per_minute: 250000
            },
            'gemini-2.5-flash-lite': {
                requests_per_minute: 15,
                requests_per_day: 1000,
                tokens_per_minute: 250000
            },
            'gemini-2.0-flash-exp': {
                requests_per_minute: 15,
                requests_per_day: 200,
                tokens_per_minute: 1000000
            },
            'gemini-2.0-flash-lite': {
                requests_per_minute: 30,
                requests_per_day: 200,
                tokens_per_minute: 1000000
            },
            'gemini-1.5-flash': {
                requests_per_minute: 15,
                requests_per_day: 1500,
                tokens_per_minute: 1000000
            },
            'gemini-1.5-pro': {
                requests_per_minute: 2,
                requests_per_day: 50,
                tokens_per_minute: 32000
            }
        };
    }

    async estimateTime(taskData) {
        const { taskId, taskTitle, taskDescription } = taskData;
        
        if (!taskTitle) {
            throw new Error('Task title is required for time estimation');
        }

        const settings = await Utils.getStorageData(['apiKey', 'geminiModel', 'timeEstimationPrompt']);
        
        if (!settings.apiKey) {
            throw new Error('Please set your Gemini API key in Settings to use time estimation');
        }

        // Check rate limits
        const rateLimitOk = await this.checkRateLimit();
        if (!rateLimitOk) {
            throw new Error('Rate limit exceeded. Please wait before making another request.');
        }

        const prompt = this.buildTimeEstimationPrompt(taskId, taskTitle, taskDescription, settings.timeEstimationPrompt);
        
        try {
            const response = await this.callGeminiAPI(prompt, settings);
            const estimations = this.parseTimeEstimation(response);
            
            // Update rate limit tracking
            await this.updateRateLimit();
            
            return estimations;
        } catch (error) {
            console.error('Time estimation error:', error);
            throw new Error(`Time estimation failed: ${error.message}`);
        }
    }

    buildTimeEstimationPrompt(taskId, taskTitle, taskDescription, customPrompt) {
        // Use custom prompt if provided, otherwise use default
        if (customPrompt && customPrompt.trim()) {
            // Replace placeholders in custom prompt
            return customPrompt
                .replace(/\{taskId\}/g, taskId || 'N/A')
                .replace(/\{taskTitle\}/g, taskTitle || 'N/A')
                .replace(/\{taskDescription\}/g, taskDescription || 'No description provided');
        }

        // Default prompt
        const prompt = `You are a senior software development project manager with expertise in time estimation.

Task Information:
- Task ID: ${taskId}
- Title: ${taskTitle}
- Description: ${taskDescription || 'No description provided'}

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
- Be realistic
- Minimum estimation should be 15min`;

        return prompt;
    }

    async callGeminiAPI(prompt, settings) {
        const model = settings.geminiModel || 'gemini-1.5-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.2, // Lower temperature for more consistent estimations
                topK: 10,
                topP: 0.8,
                maxOutputTokens: 1000,
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = `API request failed: ${response.status}`;
            
            if (response.status === 500) {
                errorMessage = 'Internal server error from Gemini API. This might be due to model overload or temporary issues. Please try again in a few moments or switch to a different model.';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please wait before making another request or switch to a different model.';
            } else if (response.status === 400) {
                errorMessage = 'Invalid request. Please check your API key and try again.';
            } else if (response.status === 403) {
                errorMessage = 'Access denied. Please check your API key permissions.';
            } else if (errorData.error?.message) {
                errorMessage = errorData.error.message;
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from API');
        }

        return data.candidates[0].content.parts[0].text;
    }

    getModelRateLimits(modelName) {
        return this.modelRateLimits[modelName] || this.modelRateLimits['gemini-2.5-flash'];
    }

    parseTimeEstimation(response) {
        try {
            // Clean the response to extract JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Validate the response structure
            if (!parsed.junior || !parsed.mid || !parsed.senior) {
                throw new Error('Missing required estimation levels');
            }

            // Validate time format (should be like "2h 30min" or "45min")
            const timePattern = /^(\d+h\s*)?(\d+min)$/;
            if (!timePattern.test(parsed.junior) || 
                !timePattern.test(parsed.mid) || 
                !timePattern.test(parsed.senior)) {
                throw new Error('Invalid time format in response');
            }

            return {
                junior: parsed.junior,
                mid: parsed.mid,
                senior: parsed.senior,
                reasoning: parsed.reasoning || 'No reasoning provided',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to parse time estimation:', error);
            console.error('Raw AI response:', response);
            
            // Return the raw AI response in a clean, readable format
            return {
                junior: 'See AI Response',
                mid: 'See AI Response', 
                senior: 'See AI Response',
                reasoning: response.trim(), // Show the raw response directly
                timestamp: new Date().toISOString()
            };
        }
    }

    async checkRateLimit() {
        const now = Date.now();
        const currentDate = new Date().toDateString();
        const settings = await Utils.getStorageData(['geminiModel']);
        const modelName = settings.geminiModel || 'gemini-2.5-flash';
        const storageKey = `rateLimits_${modelName}`;
        
        const rateLimitData = await Utils.getStorageData([storageKey]);
        const modelLimits = rateLimitData[storageKey] || {
            minuteRequests: [],
            dayRequests: [],
            currentDate: currentDate,
            lastReset: now
        };
        
        // Get rate limits for current model
        const currentLimits = this.getModelRateLimits(modelName);
        
        // Clean old minute requests (older than 1 minute)
        const oneMinuteAgo = now - 60 * 1000;
        modelLimits.minuteRequests = modelLimits.minuteRequests.filter(time => time > oneMinuteAgo);
        
        // Clean day requests if date has changed (new day = reset daily limits)
        if (modelLimits.currentDate !== currentDate) {
            console.log(`Date changed from ${modelLimits.currentDate} to ${currentDate} - resetting daily rate limits for ${modelName}`);
            modelLimits.dayRequests = []; // Clear all daily requests
            modelLimits.currentDate = currentDate; // Update to current date
        }
        
        // Check if we're within limits
        const minuteCount = modelLimits.minuteRequests.length;
        const dayCount = modelLimits.dayRequests.length;
        
        if (minuteCount >= currentLimits.requests_per_minute) {
            throw new Error(`Rate limit exceeded for ${modelName}: ${minuteCount}/${currentLimits.requests_per_minute} requests per minute. Please wait or switch to a different model.`);
        }
        
        if (dayCount >= currentLimits.requests_per_day) {
            throw new Error(`Daily rate limit exceeded for ${modelName}: ${dayCount}/${currentLimits.requests_per_day} requests per day. Please wait until tomorrow or switch to a different model.`);
        }
        
        return true;
    }

    async updateRateLimit() {
        const now = Date.now();
        const currentDate = new Date().toDateString(); // Get today's date string
        const settings = await Utils.getStorageData(['geminiModel']);
        const modelName = settings.geminiModel || 'gemini-2.5-flash';
        const storageKey = `rateLimits_${modelName}`;
        
        const rateLimitData = await Utils.getStorageData([storageKey]);
        const modelLimits = rateLimitData[storageKey] || {
            minuteRequests: [],
            dayRequests: [],
            currentDate: currentDate,
            lastReset: now
        };
        
        // Update current date if needed
        if (modelLimits.currentDate !== currentDate) {
            modelLimits.dayRequests = []; // Reset daily requests for new day
            modelLimits.currentDate = currentDate;
        }
        
        // Add current request timestamp
        modelLimits.minuteRequests.push(now);
        modelLimits.dayRequests.push(now); // Store timestamp, but date comparison handles daily reset
        modelLimits.lastReset = now;
        
        // Save updated limits
        await Utils.setStorageData({
            [storageKey]: modelLimits
        });
        
        console.log(`Rate limit updated for ${modelName}: ${modelLimits.minuteRequests.length} requests this minute, ${modelLimits.dayRequests.length} requests today (${currentDate})`);
    }

    // Convert time string to minutes for sorting/comparison
    parseTimeToMinutes(timeStr) {
        const hourMatch = timeStr.match(/(\d+)h/);
        const minMatch = timeStr.match(/(\d+)min/);
        
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minMatch ? parseInt(minMatch[1]) : 0;
        
        return hours * 60 + minutes;
    }

    // Format minutes back to readable time string
    formatMinutesToTime(minutes) {
        if (minutes < 60) {
            return `${minutes}min`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        if (remainingMinutes === 0) {
            return `${hours}h`;
        }
        
        return `${hours}h ${remainingMinutes}min`;
    }
}
