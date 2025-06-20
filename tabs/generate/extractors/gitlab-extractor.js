// GitLab Data Extractor
// This function will be injected into GitLab merge request pages

export function extractGitLabMergeRequestData() {
    const data = { url: window.location.href };
    
    // Check if this is a GitLab merge request page
    if (!data.url.includes('/-/merge_requests/')) {
        return null;
    }

    // Extract task ID from branch name in the merge request description
    const detailPageDescription = document.querySelector('.detail-page-description');
    if (detailPageDescription) {
        // Look for branch name links that contain task IDs
        const branchLinks = detailPageDescription.querySelectorAll('a[title*="#WDEV"], a[title*="WDEV"]');
        
        for (const link of branchLinks) {
            const branchName = link.getAttribute('title') || link.textContent.trim();
            
            // Extract WDEV task ID from branch name
            const taskIdMatch = branchName.match(/(WDEV-\d+)/i);
            if (taskIdMatch) {
                data.taskId = taskIdMatch[1].toUpperCase();
                data.branchName = branchName;
                break;
            }
        }
        
        // Also try to extract from the description text directly
        if (!data.taskId) {
            const descriptionText = detailPageDescription.textContent;
            const taskIdMatch = descriptionText.match(/(WDEV-\d+)/i);
            if (taskIdMatch) {
                data.taskId = taskIdMatch[1].toUpperCase();
            }
        }
    }

    // Extract merge request title
    const titleElement = document.querySelector('.merge-request-title-text, .issuable-header-text h1');
    if (titleElement) {
        data.title = titleElement.textContent.trim();
    }

    // Extract author info
    const authorElement = document.querySelector('.author-link .author');
    if (authorElement) {
        data.author = authorElement.textContent.trim();
    }

    return data.taskId ? data : null; // Only return data if we found a task ID
}

export class GitLabExtractor {
    static isGitLabMergeRequestPage(url) {
        return url.includes('/-/merge_requests/');
    }
    
    static async extractFromPage(tabId) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId },
                function: extractGitLabMergeRequestData
            });
            
            return result && result[0] && result[0].result ? result[0].result : null;
        } catch (error) {
            console.error('GitLab extraction error:', error);
            return null;
        }
    }
}
