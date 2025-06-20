// Gemini AI Service
// Handles all AI API interactions and prompt building

import { Utils } from '../../../shared/utils.js';

export class GeminiService {
    constructor() {
        this.priorityConfigs = {
            'Low': {
                branchPrefix: 'feature/',
                commitPrefix: 'feat:',
                instructions: '- Use standard feature branch prefix and conventional commit format'
            },
            'Normal': {
                branchPrefix: 'feature/',
                commitPrefix: 'feat:',
                instructions: '- Use standard feature branch prefix and conventional commit format'
            },
            'High': {
                branchPrefix: 'feature/',
                commitPrefix: 'feat:',
                instructions: '- This is a HIGH priority task, ensure clear and descriptive naming'
            },
            'Urgent': {
                branchPrefix: 'hotfix/',
                commitPrefix: 'fix:',
                instructions: '- This is an URGENT task, use hotfix/ branch prefix and fix: commit prefix for immediate attention'
            }
        };
    }

    async generateBranchAndCommit(taskData) {
        const { taskId, taskTitle, taskDescription, taskPriority } = taskData;
        
        if (!taskId || !taskTitle) {
            throw new Error('Please fill in at least Task ID and Task Title');
        }

        const settings = await Utils.getStorageData(['apiKey', 'geminiModel', 'temperature', 'branchRules', 'commitRules']);
        
        if (!settings.apiKey) {
            throw new Error('Please set your Gemini API key in Settings');
        }

        // Check rate limits
        const rateLimitOk = await this.checkRateLimit();
        if (!rateLimitOk) {
            throw new Error('Rate limit exceeded. Please wait before making another request.');
        }

        const result = await this.callGeminiAPI(settings, taskId, taskTitle, taskDescription, taskPriority);
        return result;
    }

    async callGeminiAPI(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const prompt = this.buildPrompt(settings, taskId, taskTitle, taskDescription, taskPriority);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.geminiModel || 'gemini-1.5-flash'}:generateContent?key=${settings.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: settings.temperature || 0.3,
                    maxOutputTokens: 1000,
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        return this.parseGeminiResponse(data);
    }

    buildPrompt(settings, taskId, taskTitle, taskDescription, taskPriority) {
        const priorityConfig = this.getPriorityConfig(taskPriority);
        
        let prompt = `Generate a git branch name and commit message for this task:

Task ID: ${taskId}
Title: ${taskTitle}
Description: ${taskDescription}
Priority: ${taskPriority}

Requirements:
- Branch name should be kebab-case (lowercase with dashes)
- Branch name should be concise but descriptive
- Commit message should follow conventional commits format
- Be precise and technical
${priorityConfig.instructions}

`;

        if (settings.branchRules) {
            prompt += `\nBranch naming rules:\n${settings.branchRules}\n`;
        }

        if (settings.commitRules) {
            prompt += `\nCommit message rules:\n${settings.commitRules}\n`;
        }

        prompt += `
Return ONLY in this exact JSON format:
{
  "branchName": "${priorityConfig.branchPrefix}your-branch-name",
  "commitMessage": "${priorityConfig.commitPrefix} your commit message"
}`;

        return prompt;
    }

    parseGeminiResponse(data) {
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from Gemini API');
        }

        const text = data.candidates[0].content.parts[0].text;
        
        try {
            // Try to extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON found in response');
        } catch (e) {
            throw new Error('Failed to parse Gemini response');
        }
    }

    getPriorityConfig(priority) {
        return this.priorityConfigs[priority] || this.priorityConfigs['Normal'];
    }

    async checkRateLimit() {
        // Rate limit checking logic
        // For now, simplified implementation
        return true;
    }
}
