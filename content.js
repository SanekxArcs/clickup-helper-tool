// Content script for extracting task data from pages
(function() {
    'use strict';
    
    // Listen for messages from popup or background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'EXTRACT_TASK_DATA') {
            const data = extractTaskData();
            sendResponse(data);
        }
    });
    
    // Function to extract task data from the current page
    function extractTaskData() {
        const data = {
            url: window.location.href // Capture current page URL
        };
        
        try {
            // Extract task ID - looking for the specific selector you provided
            const taskIdElement = document.querySelector('[data-test="task-view-task-label__taskid-button"]');
            if (taskIdElement) {
                data.id = taskIdElement.textContent.trim();
            }
            
            // Extract title - looking for the specific selector you provided
            const titleElement = document.querySelector('[data-test="task-title__title-overlay"]');
            if (titleElement) {
                data.title = titleElement.textContent.trim();
            }
            
            // Extract description - looking for the specific selector you provided
            const descriptionElement = document.querySelector('.ql-editor.ql-cls-checklist');
            if (descriptionElement) {
                data.description = cleanDescription(descriptionElement.innerText.trim());
            }
            
            // Extract priority - check if task is urgent
            data.isUrgent = false;
            
            // Look for the specific ClickUp urgent priority element
            const priorityElement = document.querySelector('.cu-priorities-view__item-label[data-test="priorities-view__item-label-Urgent"]');
            if (priorityElement && priorityElement.textContent.trim() === 'Urgent') {
                data.isUrgent = true;
            }
            
            // Fallback selectors in case the specific ones don't work
            if (!data.id) {
                // Try alternative selectors for task ID
                const altIdSelectors = [
                    '[class*="task-id"]',
                    '[class*="taskid"]',
                    '[data-testid*="task-id"]',
                    'span[class*="task"]'
                ];
                
                for (const selector of altIdSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.match(/[A-Z]+-\d+/)) {
                        data.id = element.textContent.trim();
                        break;
                    }
                }
            }
            
            if (!data.title) {
                // Try alternative selectors for title
                const altTitleSelectors = [
                    'h1',
                    '[class*="title"]',
                    '[data-testid*="title"]'
                ];
                
                for (const selector of altTitleSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim().length > 0) {
                        data.title = element.textContent.trim();
                        break;
                    }
                }
            }
            
            if (!data.description) {
                // Try alternative selectors for description
                const altDescSelectors = [
                    '.ql-editor',
                    '[class*="description"]',
                    '[data-testid*="description"]',
                    'div[contenteditable="true"]'
                ];
                
                for (const selector of altDescSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent.trim().length > 0) {
                        data.description = cleanDescription(element.textContent.trim());
                        break;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error extracting task data:', error);
        }
        
        return data;
    }
    
    // Function to clean up description text
    function cleanDescription(text) {
        return text
            .replace(/\n\s*\n/g, '\n') // Remove multiple empty lines
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim()
            .substring(0, 500); // Limit length to avoid too long descriptions
    }
    
    // Auto-extract data when page loads (for context menu functionality)
    window.addEventListener('load', () => {
        setTimeout(() => {
            const data = extractTaskData();
            if (data.id || data.title) {
                // Store extracted data for later use
                chrome.storage.local.set({ 
                    lastExtractedData: data,
                    extractedAt: Date.now()
                });
            }
        }, 2000); // Wait 2 seconds for page to fully load
    });
    
    // Make the extraction function available globally for background script
    window.extractTaskData = extractTaskData;
    
})();
