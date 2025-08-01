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
- Be realistic but not overly conservative
- Minimum estimation should be 15min, maximum should be reasonable`;

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
                temperature: 0.3, // Lower temperature for more consistent estimations
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
            throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from API');
        }

        return data.candidates[0].content.parts[0].text;
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
            throw new Error('Failed to parse AI response. Please try again.');
        }
    }

    async checkRateLimit() {
        const now = Date.now();
        const rateLimitData = await Utils.getStorageData(['lastTimeEstimationRequest', 'timeEstimationRequestCount']);
        
        // Reset counter if more than 1 minute has passed
        if (!rateLimitData.lastTimeEstimationRequest || now - rateLimitData.lastTimeEstimationRequest > 60000) {
            await Utils.setStorageData({
                lastTimeEstimationRequest: now,
                timeEstimationRequestCount: 0
            });
            return true;
        }
        
        // Allow up to 10 requests per minute
        return (rateLimitData.timeEstimationRequestCount || 0) < 10;
    }

    async updateRateLimit() {
        const rateLimitData = await Utils.getStorageData(['timeEstimationRequestCount']);
        await Utils.setStorageData({
            timeEstimationRequestCount: (rateLimitData.timeEstimationRequestCount || 0) + 1,
            lastTimeEstimationRequest: Date.now()
        });
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
