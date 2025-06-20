// ClickUp Data Extractor
// This function will be injected into ClickUp task pages

export function extractClickUpTaskData() {
    const data = { url: window.location.href };
    
    // ClickUp selectors
    const taskIdElement = document.querySelector('[data-test="task-view-task-label__taskid-button"]');
    if (taskIdElement) {
        data.id = taskIdElement.textContent.trim();
    }
    
    const titleElement = document.querySelector('[data-test="task-title__title-overlay"]');
    if (titleElement) {
        data.title = titleElement.textContent.trim();
    }
    
    const descriptionElement = document.querySelector('.ql-editor');
    if (descriptionElement) {
        data.description = descriptionElement.innerText.trim();
    }

    // Check for priority levels
    const priorityElement = document.querySelector('.cu-priorities-view__item-label');
    if (priorityElement) {
        const priorityText = priorityElement.textContent.trim();
        if (priorityText.includes('Urgent')) {
            data.priority = 'Urgent';
        } else if (priorityText.includes('High')) {
            data.priority = 'High';
        } else if (priorityText.includes('Low')) {
            data.priority = 'Low';
        } else if (priorityText.includes('Normal')) {
            data.priority = 'Normal';
        }
    }

    // Alternative priority detection
    if (!data.priority) {
        // Check for urgent keywords in title/description
        const urgentKeywords = ['urgent', 'critical', 'emergency', 'hotfix', 'production', 'down', 'broken'];
        const highKeywords = ['important', 'asap', 'priority', 'blocker'];
        const text = (data.title + ' ' + data.description).toLowerCase();
        
        if (urgentKeywords.some(keyword => text.includes(keyword))) {
            data.priority = 'Urgent';
        } else if (highKeywords.some(keyword => text.includes(keyword))) {
            data.priority = 'High';
        } else {
            data.priority = 'Normal';
        }
    }

    // Try alternative selectors if primary ones don't work
    if (!data.id) {
        // Alternative task ID selectors
        const altIdSelectors = [
            '.task-name__id',
            '.breadcrumb__task-id', 
            '[class*="task-id"]',
            '.task-header .task-id'
        ];
        
        for (const selector of altIdSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                data.id = element.textContent.trim();
                break;
            }
        }
    }

    if (!data.title) {
        // Alternative title selectors
        const altTitleSelectors = [
            '.task-name__title',
            '.task-title',
            'h1[class*="title"]',
            '.breadcrumb__task-name'
        ];
        
        for (const selector of altTitleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                data.title = element.textContent.trim();
                break;
            }
        }
    }

    // Check if any data was found
    if (!data.id && !data.title && !data.description) {
        return null;
    }

    return data;
}

export class ClickUpExtractor {
    static isClickUpTaskPage(url) {
        return url.startsWith('https://app.clickup.com/t/');
    }
    
    static async extractFromPage(tabId) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId },
                function: extractClickUpTaskData
            });
            
            return result && result[0] && result[0].result ? result[0].result : null;
        } catch (error) {
            console.error('ClickUp extraction error:', error);
            return null;
        }
    }
}
