// popup.js - Main JavaScript logic for Branch & Commit Helper
(function() {
    'use strict';

    // Rate limiting constants
    const RATE_LIMITS = {
        requests_per_minute: 15,
        requests_per_day: 1500
    };

    // DOM elements
    let elements = {};

    // Initialize the popup
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        initializeTabs();
        loadSavedData();
        setupEventListeners();
        checkRateLimit();
        updateRateLimitsDisplay();

        const copyBranchBtn = document.getElementById('copyBranchBtn');
        const copyCommitBtn = document.getElementById('copyCommitBtn');

        if (copyBranchBtn) {
            copyBranchBtn.addEventListener('click', () => {
                copyToClipboard(elements.branchResult.textContent);
            });
        }

        if (copyCommitBtn) {
            copyCommitBtn.addEventListener('click', () => {
                copyToClipboard(elements.commitResult.textContent);
            });
        }
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'QUICK_GENERATE_TRIGGERED') {
                // Auto-generate after a short delay to ensure data is loaded
                setTimeout(() => {
                    generateBranchAndCommit();
                }, 100);
            } else if (request.type === 'AUTO_FILL_TRIGGERED') {
                // Show success message for auto-fill
                setTimeout(() => {
                    showSuccess('Data auto-filled from current page!');
                }, 100);
            } else if (request.type === 'COPY_TO_CLIPBOARD') {
                // Copy text to clipboard
                navigator.clipboard.writeText(request.text).then(() => {
                    console.log('Text copied to clipboard:', request.text);
                }).catch(err => {
                    console.error('Failed to copy text:', err);
                });
            }
        });

        // Auto-search and caching functionality
        autoSearchFromCurrentPage();
    });

    function initializeElements() {
        elements = {
            // Tabs
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // Generate tab
            apiKey: document.getElementById('apiKey'),
            taskId: document.getElementById('taskId'),
            taskTitle: document.getElementById('taskTitle'),
            taskDescription: document.getElementById('taskDescription'),
            generateBtn: document.getElementById('generateBtn'),
            autoFillBtn: document.getElementById('autoFillBtn'),
            clearFieldsBtn: document.getElementById('clearFieldsBtn'),
            saveTaskBtn: document.getElementById('saveTaskBtn'),
            results: document.getElementById('results'),
            branchResult: document.getElementById('branchResult'),
            commitResult: document.getElementById('commitResult'),
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            rateLimitWarning: document.getElementById('rateLimitWarning'),
            priorityIndicator: document.getElementById('priorityIndicator'),
            
            // History tab
            historyContainer: document.getElementById('historyContainer'),
            clearHistoryBtn: document.getElementById('clearHistoryBtn'),
            historySearch: document.getElementById('historySearch'),
            
            // Rules tab
            branchRules: document.getElementById('branchRules'),
            commitRules: document.getElementById('commitRules'),
            saveRulesBtn: document.getElementById('saveRulesBtn'),
            rulesSaved: document.getElementById('rulesSaved'),
            
            // Settings tab
            geminiModel: document.getElementById('geminiModel'),
            temperature: document.getElementById('temperature'),
            temperatureValue: document.getElementById('temperatureValue'),
            saveSettingsBtn: document.getElementById('saveSettingsBtn'),
            settingsSaved: document.getElementById('settingsSaved'),
            
            // Rate limits display
            minuteUsage: document.getElementById('minuteUsage'),
            dayUsage: document.getElementById('dayUsage'),
            minuteBar: document.getElementById('minuteBar'),
            dayBar: document.getElementById('dayBar'),
            rateLimitReset: document.getElementById('rateLimitReset'),
            
            // Open shortcuts page button
            openShortcutsPage: document.getElementById('openShortcutsPage'),
            
            // Data import/export
            exportDataBtn: document.getElementById('exportDataBtn'),
            importDataBtn: document.getElementById('importDataBtn'),
            importFileInput: document.getElementById('importFileInput'),
            exportSuccess: document.getElementById('exportSuccess'),
            importSuccess: document.getElementById('importSuccess'),
            importError: document.getElementById('importError')
        };
    }

    function initializeTabs() {
        elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
    }

    function switchTab(tabName) {
        // Remove active classes from all tabs
        elements.tabs.forEach(tab => {
            tab.classList.remove('bg-blue-500', 'text-white');
            tab.classList.add('hover:bg-gray-100');
        });
        
        // Hide all tab contents
        elements.tabContents.forEach(content => {
            content.classList.add('hidden');
            content.classList.remove('block');
        });
        
        // Add active class to selected tab
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        activeTab.classList.add('bg-blue-500', 'text-white');
        activeTab.classList.remove('hover:bg-gray-100');
        
        // Show selected tab content
        const activeContent = document.getElementById(`${tabName}-tab`);
        activeContent.classList.remove('hidden');
        activeContent.classList.add('block');
        
        // Load history when switching to history tab
        if (tabName === 'history') {
            // Clear search when switching to history tab
            elements.historySearch.value = '';
            loadHistory();
        }
        
        // Update rate limits display when switching to settings tab
        if (tabName === 'settings') {
            updateRateLimitsDisplay();
        }
    }

    function setupEventListeners() {
        // Generate button
        elements.generateBtn.addEventListener('click', generateBranchAndCommit);
        
        // Auto-fill button
        elements.autoFillBtn.addEventListener('click', autoFillFromPage);
        
        // Clear fields button
        elements.clearFieldsBtn.addEventListener('click', clearFields);
        
        // Save task button
        elements.saveTaskBtn.addEventListener('click', copyTaskLink);
        
        // Form inputs auto-save
        [elements.taskId, elements.taskTitle, elements.taskDescription, elements.apiKey].forEach(input => {
            input.addEventListener('input', saveFormData);
        });
        
        // Rules buttons
        elements.saveRulesBtn.addEventListener('click', saveRules);
        
        // Settings
        elements.temperature.addEventListener('input', updateTemperatureDisplay);
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
        
        // History
        elements.clearHistoryBtn.addEventListener('click', clearHistory);
        elements.historySearch.addEventListener('input', filterHistory);

        // Data import/export
        elements.exportDataBtn.addEventListener('click', exportData);
        elements.importDataBtn.addEventListener('click', () => elements.importFileInput.click());
        elements.importFileInput.addEventListener('change', importData);

        // Open shortcuts page button
        elements.openShortcutsPage.addEventListener('click', openShortcutsPage);

        // Edit modal buttons
        document.getElementById('editModalSaveBtn').addEventListener('click', saveEditedItem);
        document.getElementById('editModalCancelBtn').addEventListener('click', closeEditModal);
        document.getElementById('editModalCloseBtn').addEventListener('click', closeEditModal);

        // Add click-to-select to result text areas
        [elements.branchResult, elements.commitResult].forEach(textArea => {
            textArea.addEventListener('click', function() {
                const range = document.createRange();
                range.selectNodeContents(this);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });
    }

    function loadSavedData() {
        chrome.storage.local.get([
            'apiKey', 'taskId', 'taskTitle', 'taskDescription',
            'branchRules', 'commitRules', 'geminiModel', 'temperature',
            'extractedTaskData', 'isUrgent'
        ], (data) => {
            // Load form data
            if (data.apiKey) elements.apiKey.value = data.apiKey;
            if (data.taskId) elements.taskId.value = data.taskId;
            if (data.taskTitle) elements.taskTitle.value = data.taskTitle;
            if (data.taskDescription) elements.taskDescription.value = data.taskDescription;
            
            // Load extracted data from context menu if available
            if (data.extractedTaskData) {
                if (data.extractedTaskData.id && !elements.taskId.value) {
                    elements.taskId.value = data.extractedTaskData.id;
                }
                if (data.extractedTaskData.title && !elements.taskTitle.value) {
                    elements.taskTitle.value = data.extractedTaskData.title;
                }
                if (data.extractedTaskData.description && !elements.taskDescription.value) {
                    elements.taskDescription.value = data.extractedTaskData.description;
                }
                
                // Store priority flag for later use during generation
                if (data.extractedTaskData.isUrgent !== undefined) {
                    chrome.storage.local.set({ isUrgent: data.extractedTaskData.isUrgent });
                    
                    // Show/hide priority indicator
                    if (data.extractedTaskData.isUrgent) {
                        elements.priorityIndicator.classList.remove('hidden');
                    } else {
                        elements.priorityIndicator.classList.add('hidden');
                    }
                }
                
                // Store URL for later use and clear extracted data
                if (data.extractedTaskData.url) {
                    chrome.storage.local.set({ sourceUrl: data.extractedTaskData.url });
                }
                chrome.storage.local.remove(['extractedTaskData']);
                saveFormData();
            }
            
            // Load rules or set defaults
            if (data.branchRules) {
                elements.branchRules.value = data.branchRules;
            } else {
                // Set default branch naming rules
                elements.branchRules.value = `Branch Naming Rules:

feature/<name>_<#taskid> - uses for develop of new functionality. It should be created from the develop branch. Examples: feature/about_us_page_#123, feature/add_rest_api_#234.

release/<versionId> - supports the preparation of a new production release, it should be created from the develop branch. Examples: release/v1.2.1, release/v3.0.0.

hotfix/<name>_<#taskid?> - uses for quick/urgent fixes. If a bug is detected in the production environment, it should be created from the main (old name master) branch. Examples: hotfix/burger_menu_fix#432, hotfix/animation_fix#754.

<name> - should be in lowercase, unique, and shortly describe the functionality. Don't use a commit message in the name of a branch, because commit means what was done but the branch describes a functionality, entity, module, page, component, or feature. In common situations, the name of a task is the name of a branch.

<#taskid> - relative task ID in the issue tracker, but it is not an optional parameter if there is no relative task.

<versionId> - next release which reflects changes in the production release.

Note: allowed symbols are underscore (_) and hyphen (-), where underscore is equal to space key.`;
            }
            
            if (data.commitRules) {
                elements.commitRules.value = data.commitRules;
            } else {
                // Set default commit message rules
                elements.commitRules.value = `Rules for Git Commit Message Generation:

1. Required Inputs:
   - type: (String, Required) The category of the change
   - subject: (String, Required) A short description of the work
   - task_id: (String, Required) The ID from the issue tracker (e.g., "WDEV-7777")
   - scope: (String, Optional) The part of the codebase affected
   - body: (String, Optional) A more detailed explanation
   - is_monorepo: (Boolean, Optional) true if the repo contains both front-end and back-end code

2. Core Constraints:
   - Header Length: The first line (header) must not exceed 72 characters
   - Tense: All descriptions (subject, body) must use the imperative, present tense (e.g., "add", "fix", "change")

3. Generation Logic:
   Step 1: Assemble the Header
   The header format is: <type>: <subject> <task_id>
   
   <type>: Required. Must be one of: build, ci, docs, feat, fix, perf, refactor, style, test (usually feat or fix)
   <subject>: Required. Do not capitalize the first letter. Do not end with a period (.)
   <task_id>: Required. Format as a space followed by a hash and the ID. Example: #WDEV-7777
   
   Step 2: Assemble the Full Message
   - If a body input is provided: <header>\\n\\n<body>
   - If no body is provided: just the <header>`;
            }
            
            // Auto-save default rules if they were just set
            if (!data.branchRules || !data.commitRules) {
                saveDefaultRules();
            }
            
            // Load settings
            if (data.geminiModel) elements.geminiModel.value = data.geminiModel;
            if (data.temperature !== undefined) {
                elements.temperature.value = data.temperature;
                updateTemperatureDisplay();
            }
            
            // Show priority indicator if urgent flag is set
            if (data.isUrgent) {
                elements.priorityIndicator.classList.remove('hidden');
            } else {
                elements.priorityIndicator.classList.add('hidden');
            }
        });
        
        // Auto-search for cached results from current page
        setTimeout(() => {
            autoSearchFromCurrentPage();
        }, 500); // Small delay to ensure DOM is ready
        
        // Removed keyboard shortcuts loading since we're using Chrome's built-in shortcuts page
    }

    function saveFormData() {
        const data = {
            apiKey: elements.apiKey.value,
            taskId: elements.taskId.value,
            taskTitle: elements.taskTitle.value,
            taskDescription: elements.taskDescription.value
        };
        chrome.storage.local.set(data);
    }

    function clearFields() {
        elements.taskId.value = '';
        elements.taskTitle.value = '';
        elements.taskDescription.value = '';
        elements.results.classList.add('hidden');
        elements.error.classList.add('hidden');
        elements.priorityIndicator.classList.add('hidden');
        
        // Clear from storage
        chrome.storage.local.remove(['taskId', 'taskTitle', 'taskDescription', 'isUrgent']);
    }

    async function autoFillFromPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TASK_DATA' });
            
            if (response) {
                if (response.id) elements.taskId.value = response.id;
                if (response.title) elements.taskTitle.value = response.title;
                if (response.description) elements.taskDescription.value = response.description;
                
                // Store priority flag for later use during generation
                if (response.isUrgent !== undefined) {
                    chrome.storage.local.set({ isUrgent: response.isUrgent });
                    
                    // Show/hide priority indicator
                    if (response.isUrgent) {
                        elements.priorityIndicator.classList.remove('hidden');
                    } else {
                        elements.priorityIndicator.classList.add('hidden');
                    }
                } else {
                    elements.priorityIndicator.classList.add('hidden');
                }
                
                // Store the URL for later use in history
                const urlData = { sourceUrl: response.url || tab.url };
                chrome.storage.local.set(urlData);
                
                saveFormData();
                
                // Show priority indicator in success message
                const priorityText = response.isUrgent ? ' (🚨 URGENT detected)' : '';
                showSuccess(`Data auto-filled from current page!${priorityText}`);
            } else {
                showError('Could not extract data from current page. Try using the context menu instead.');
            }
        } catch (error) {
            console.error('Auto-fill error:', error);
            showError('Could not extract data from current page. Make sure you\'re on a supported page.');
        }
    }

    async function copyTaskLink() {
        const taskId = elements.taskId.value.trim();
        const taskTitle = elements.taskTitle.value.trim();

        if (!taskId || !taskTitle) {
            showError('Please enter at least Task ID and Title to copy task link.');
            return;
        }

        try {
            // Get the source URL if available
            const urlData = await new Promise(resolve => {
                chrome.storage.local.get(['sourceUrl'], resolve);
            });

            // Get current tab URL if no stored URL
            let sourceUrl = urlData.sourceUrl;
            if (!sourceUrl) {
                try {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    sourceUrl = tab.url;
                } catch (error) {
                    console.log('Could not get current tab URL:', error);
                }
            }

            if (!sourceUrl) {
                showError('No URL available. Please use auto-fill or navigate to a task page first.');
                return;
            }

            // Create markdown link format
            const markdownLink = `[${taskId}, ${taskTitle}](${sourceUrl})`;

            // Copy to clipboard
            await navigator.clipboard.writeText(markdownLink);
            
            // Clear the stored URL after use
            chrome.storage.local.remove(['sourceUrl']);

            showSuccess(`Task link copied to clipboard!`);

        } catch (error) {
            console.error('Copy task link error:', error);
            
            // Fallback copy method
            try {
                const markdownLink = `[${taskId}, ${taskTitle}](${sourceUrl || window.location.href})`;
                const textArea = document.createElement('textarea');
                textArea.value = markdownLink;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                showSuccess(`Task link copied to clipboard!`);
            } catch (fallbackError) {
                showError(`Error copying task link: ${error.message}`);
            }
        }
    }

    async function generateBranchAndCommit() {
        const apiKey = elements.apiKey.value.trim();
        const taskId = elements.taskId.value.trim();
        const taskTitle = elements.taskTitle.value.trim();
        const description = elements.taskDescription.value.trim();

        if (!apiKey) {
            showError('Please enter your Gemini API key in the Settings tab.');
            return;
        }

        if (!taskId || !taskTitle) {
            showError('Please enter at least Task ID and Title.');
            return;
        }

        // Check rate limits
        if (!(await checkAndUpdateRateLimit())) {
            return;
        }

        showLoading(true);
        hideMessages();

        try {
            const model = elements.geminiModel.value || 'gemini-2.0-flash-exp';
            const temperature = parseFloat(elements.temperature.value) || 0.3;
            
            // Check if there's stored urgent flag from auto-fill
            const storedData = await new Promise(resolve => {
                chrome.storage.local.get(['isUrgent'], resolve);
            });
            
            const result = await callGeminiAPI(apiKey, model, temperature, {
                taskId,
                taskTitle,
                description,
                isUrgent: storedData.isUrgent || false
            });

            if (result.branchName && result.commitMessage) {
                displayResults(result.branchName, result.commitMessage);
                
                // Get the source URL if available
                const urlData = await new Promise(resolve => {
                    chrome.storage.local.get(['sourceUrl'], resolve);
                });
                
                await saveToHistory({
                    taskId,
                    taskTitle,
                    description,
                    branchName: result.branchName,
                    commitMessage: result.commitMessage,
                    sourceUrl: urlData.sourceUrl || null,
                    timestamp: Date.now()
                });
                
                // Clear the stored URL after use
                chrome.storage.local.remove(['sourceUrl']);
            } else {
                showError('Invalid response from Gemini AI. Please try again.');
            }
        } catch (error) {
            console.error('Generation error:', error);
            showError(`Error: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    async function callGeminiAPI(apiKey, model, temperature, taskData) {
        // Get custom rules
        const rules = await new Promise(resolve => {
            chrome.storage.local.get(['branchRules', 'commitRules'], resolve);
        });

        const prompt = createPrompt(taskData, rules);
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: temperature,
                    maxOutputTokens: 1000,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            throw new Error('No response from Gemini AI');
        }

        return parseGeminiResponse(text);
    }

    function createPrompt(taskData, rules) {
        const branchRules = rules.branchRules || 'Use kebab-case, include task ID, be descriptive but concise';
        const commitRules = rules.commitRules || 'Use conventional commits format, be clear and descriptive';
        
        // Check if task is urgent and modify rules accordingly
        const isUrgent = taskData.isUrgent || false;
        const urgentBranchRules = isUrgent 
            ? 'Use hotfix/ prefix for urgent tasks (e.g., hotfix/fix_critical_bug_#TASK-123). ' + branchRules
            : branchRules;
        const urgentCommitRules = isUrgent 
            ? 'Start with "feat:" for urgent tasks (e.g., "feat: fix critical authentication bug #id"). ' + commitRules
            : commitRules;

        return `You are a helpful assistant for generating Git branch names and commit messages.

Task Information:
- Task ID: ${taskData.taskId}
- Title: ${taskData.taskTitle}
- Description: ${taskData.description || 'No description provided'}
- Priority: ${isUrgent ? 'URGENT' : 'Normal'}

Branch Naming Rules:
${urgentBranchRules}

Commit Message Rules:
${urgentCommitRules}

${isUrgent ? 'IMPORTANT: This is an URGENT task. Use hotfix/ prefix for branch and feat: prefix for commit message.' : ''}

Please generate:
1. A branch name following the rules above
2. A commit message following the rules above

Format your response exactly like this:
BRANCH: [branch-name-here]
COMMIT: [commit-message-here]

Make sure to include both BRANCH: and COMMIT: labels in your response.`;
    }

    function parseGeminiResponse(text) {
        const branchMatch = text.match(/BRANCH:\s*(.+)/i);
        const commitMatch = text.match(/COMMIT:\s*(.+)/i);

        return {
            branchName: branchMatch ? branchMatch[1].trim() : null,
            commitMessage: commitMatch ? commitMatch[1].trim() : null
        };
    }

    async function checkAndUpdateRateLimit() {
        const now = Date.now();
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['rateLimitData'], resolve);
        });

        let rateLimitData = data.rateLimitData || {
            minuteRequests: [],
            dayRequests: [],
            lastReset: now
        };

        // Clean old requests
        const oneMinuteAgo = now - 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        rateLimitData.minuteRequests = rateLimitData.minuteRequests.filter(time => time > oneMinuteAgo);
        rateLimitData.dayRequests = rateLimitData.dayRequests.filter(time => time > oneDayAgo);

        // Check limits
        if (rateLimitData.minuteRequests.length >= RATE_LIMITS.requests_per_minute) {
            showRateLimitWarning('Minute');
            return false;
        }

        if (rateLimitData.dayRequests.length >= RATE_LIMITS.requests_per_day) {
            showRateLimitWarning('Day');
            return false;
        }

        // Add current request
        rateLimitData.minuteRequests.push(now);
        rateLimitData.dayRequests.push(now);

        // Save updated data
        chrome.storage.local.set({ rateLimitData });
        
        // Update display after rate limit check
        updateRateLimitsDisplay();
        
        return true;
    }

    function checkRateLimit() {
        checkAndUpdateRateLimit().then(allowed => {
            if (!allowed) {
                elements.generateBtn.disabled = true;
            }
            updateRateLimitsDisplay();
        });
    }

    async function updateRateLimitsDisplay() {
        const now = Date.now();
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['rateLimitData'], resolve);
        });

        let rateLimitData = data.rateLimitData || {
            minuteRequests: [],
            dayRequests: [],
            lastReset: now
        };

        // Clean old requests
        const oneMinuteAgo = now - 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        rateLimitData.minuteRequests = rateLimitData.minuteRequests.filter(time => time > oneMinuteAgo);
        rateLimitData.dayRequests = rateLimitData.dayRequests.filter(time => time > oneDayAgo);

        const minuteCount = rateLimitData.minuteRequests.length;
        const dayCount = rateLimitData.dayRequests.length;

        // Update usage display
        elements.minuteUsage.textContent = `${minuteCount} / ${RATE_LIMITS.requests_per_minute}`;
        elements.dayUsage.textContent = `${dayCount} / ${RATE_LIMITS.requests_per_day}`;

        // Update progress bars
        const minutePercent = (minuteCount / RATE_LIMITS.requests_per_minute) * 100;
        const dayPercent = (dayCount / RATE_LIMITS.requests_per_day) * 100;

        elements.minuteBar.style.width = minutePercent + '%';
        elements.dayBar.style.width = dayPercent + '%';

        // Update progress bar colors based on usage
        updateProgressBarColor(elements.minuteBar, minutePercent);
        updateProgressBarColor(elements.dayBar, dayPercent);

        // Update reset time display
        const nextReset = getNextResetTime(rateLimitData.minuteRequests);
        if (nextReset && minuteCount >= RATE_LIMITS.requests_per_minute) {
            elements.rateLimitReset.innerHTML = `<small>Minute limit resets in ${nextReset}</small>`;
        } else {
            elements.rateLimitReset.innerHTML = '<small>Limits reset automatically</small>';
        }
    }

    function updateProgressBarColor(progressBar, percent) {
        progressBar.classList.remove('warning', 'danger');
        
        if (percent >= 90) {
            progressBar.classList.add('danger');
        } else if (percent >= 70) {
            progressBar.classList.add('warning');
        }
    }

    function getNextResetTime(requests) {
        if (requests.length === 0) return null;
        
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + 60 * 1000; // 1 minute from oldest request
        const timeUntilReset = resetTime - Date.now();
        
        if (timeUntilReset <= 0) return null;
        
        const seconds = Math.ceil(timeUntilReset / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes}m`;
        }
    }

    function showRateLimitWarning(period) {
        elements.rateLimitWarning.classList.remove('hidden');
        elements.rateLimitWarning.textContent = `⚠️ Rate limit reached for ${period}. Free tier: 15 requests/minute, 1,500 requests/day. Please wait.`;
        
        setTimeout(() => {
            elements.rateLimitWarning.classList.add('hidden');
            elements.generateBtn.disabled = false;
        }, period === 'Minute' ? 60000 : 3600000); // 1 minute or 1 hour
    }

    function displayResults(branchName, commitMessage) {
        elements.branchResult.textContent = branchName;
        elements.commitResult.textContent = commitMessage;
        elements.results.classList.remove('hidden');
    }

    async function saveToHistory(item) {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        history.unshift(item); // Add to beginning
        
        // Keep only last 50 items
        if (history.length > 50) {
            history.splice(50);
        }

        chrome.storage.local.set({ history });
    }

    async function loadHistory(searchTerm = '') {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        let history = data.history || [];
        
        // Filter history if search term provided
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase().trim();
            history = history.filter(item => 
                item.taskId.toLowerCase().includes(search) || 
                item.taskTitle.toLowerCase().includes(search)
            );
        }
        
        if (history.length === 0) {
            const message = searchTerm.trim() 
                ? `<div class="text-center text-gray-500 italic py-10 px-5">No history items found matching "${escapeHtml(searchTerm.trim())}"</div>`
                : '<div class="text-center text-gray-500 italic py-10 px-5">No generation history yet. Generate some branch names and commit messages to see them here!</div>';
            elements.historyContainer.innerHTML = message;
            return;
        }

        elements.historyContainer.innerHTML = history.map((item, originalIndex) => {
            // Find original index for proper deletion
            const allHistory = data.history || [];
            const realIndex = allHistory.findIndex(historyItem => 
                historyItem.timestamp === item.timestamp && 
                historyItem.taskId === item.taskId
            );
            
            const markdownLink = item.sourceUrl ? `[${item.taskId}, ${item.taskTitle}](${item.sourceUrl})` : '';
            
            // Highlight search terms in task ID and title
            const highlightedTaskId = highlightSearchTerm(item.taskId, searchTerm);
            const highlightedTitle = highlightSearchTerm(item.taskTitle, searchTerm);
            
            // Create title with link if URL exists, otherwise plain text
            const taskTitleHtml = item.sourceUrl 
                ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" class="text-primary no-underline font-semibold hover:underline hover:text-primary-dark" title="Open original task">${highlightedTaskId}: ${highlightedTitle}</a>`
                : `${highlightedTaskId}: ${highlightedTitle}`;
            
            return `
            <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4 relative" data-history-index="${realIndex}">
            <div class="absolute top-1 right-1 flex gap-1 ">
                <button class="bg-gray-50 ring-1 ring-gray-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-[100px] hover:bg-gray-100 transition-all duration-300" data-edit-index="${realIndex}" title="Edit this item">✏️</button>
                <button class="bg-red-50 ring-1 ring-red-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-[100px] hover:bg-red-100 transition-all duration-300" data-delete-index="${realIndex}">🗑️</button>
            </div>
                <div class="text-xs text-gray-500 mb-2.5">${new Date(item.timestamp).toLocaleString()}</div>

                <div class="bg-gray-50 p-2.5 rounded-md font-mono text-xs mb-2.5">
                <div class="flex flex-row items-center gap-2 mb-2">
                    <div class="font-semibold text-gray-700 mb-2 flex-1 text-balance">${taskTitleHtml}</div>
                    ${markdownLink ? `<button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-shrink-0 min-w-auto hover:bg-emerald-100 transition-all duration-300" data-copy-text="${escapeAttr(markdownLink)}" title="Copy markdown link">📋</button>` : ''}
                </div>
               
                    ${item.branchName ? ` 
                     <div class="flex flex-col">
                     <strong>Branch:</strong>
                    <div class="text-primary-dark flex flex-row gap-1 items-center">
                        <div class=" select-all w-full cursor-text bg-orange-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-orange-100 hover:border-gray-300 text-balance" title="Click to select all">
                            ${escapeHtml(item.branchName)}
                        </div>
                        <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${escapeAttr(item.branchName)}">
                            📋
                        </button>
                    </div>
                    
                    </div>` : ''}
                    
                    ${item.commitMessage ? `
                    <div class="flex flex-col">
                    <strong>Commit:</strong>
                    <div class="text-primary-dark flex flex-row gap-1 items-center">
                        <div class=" select-all cursor-text bg-blue-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-blue-100 hover:border-gray-300 text-balance" title="Click to select all">${escapeHtml(item.commitMessage)}</div> 
                        <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${escapeAttr(item.commitMessage)}">📋</button>
                    </div>
                   
                    </div>` : ''}
                    ${!item.branchName && !item.commitMessage ? `
                    <div class="text-secondary italic py-2 px-2 bg-purple-50 rounded text-center mb-1">
                        <em>📌 Task reference only (no generation performed)</em>
                    </div>` : ''}
                    <div class="flex gap-2 justify-start mt-2.5 pt-2.5 border-t border-gray-200">
                        ${item.commitMessage ? `<button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-full hover:bg-emerald-100 transition-all duration-300" data-commit-text="${escapeAttr(item.commitMessage)}" data-task-id="${escapeAttr(item.taskId)}">📋 Git console command</button>` : ''}
                        
                    </div>
                </div>
            </div>
        `;
        }).join('');

        // Add click listeners to copy buttons (branch/commit and markdown link)
        const copyButtons = elements.historyContainer.querySelectorAll('button[data-copy-text]');
        copyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const text = this.getAttribute('data-copy-text');
                copyText(text, this);
            });
        });

        // Add click listeners to git commit buttons
        const gitButtons = elements.historyContainer.querySelectorAll('button[data-commit-text]');
        gitButtons.forEach(button => {
            button.addEventListener('click', function() {
                const commitText = this.getAttribute('data-commit-text');
                const taskId = this.getAttribute('data-task-id');
                copyGitCommit(commitText, taskId, this);
            });
        });

        // Add click listeners to delete buttons
        const deleteButtons = elements.historyContainer.querySelectorAll('button[data-delete-index]');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-delete-index'));
                deleteHistoryItem(index);
            });
        });

        // Add click listeners to edit buttons
        const editButtons = elements.historyContainer.querySelectorAll('button[data-edit-index]');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-edit-index'));
                openEditModal(index);
            });
        });

        // Add click listeners to text areas for easy selection
        const textAreas = elements.historyContainer.querySelectorAll('span[title="Click to select all"]');
        textAreas.forEach(textArea => {
            textArea.addEventListener('click', function() {
                // Select all text when clicked
                const range = document.createRange();
                range.selectNodeContents(this);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });
    }

    function filterHistory() {
        const searchTerm = elements.historySearch.value;
        loadHistory(searchTerm);
    }

    function highlightSearchTerm(text, searchTerm) {
        if (!searchTerm.trim()) {
            return escapeHtml(text);
        }
        
        const escaped = escapeHtml(text);
        const escapedSearchTerm = escapeHtml(searchTerm.trim());
        const regex = new RegExp(`(${escapedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        
        return escaped.replace(regex, '<span class="bg-yellow-300 px-0.5 py-0.5 rounded-sm">$1</span>');
    }

    // Helper function to get domain from URL
    function getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return url; // Return original URL if parsing fails
        }
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper function to escape HTML attributes (including quotes)
    function escapeAttr(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function clearHistory() {
        if (confirm('Are you sure you want to clear all history?')) {
            chrome.storage.local.remove(['history']);
            elements.historyContainer.innerHTML = '<div class="text-center text-gray-500 italic py-10 px-5">No generation history yet. Generate some branch names and commit messages to see them here!</div>';
        }
    }

    async function deleteHistoryItem(index) {
        if (confirm('Are you sure you want to delete this history item?')) {
            const data = await new Promise(resolve => {
                chrome.storage.local.get(['history'], resolve);
            });

            const history = data.history || [];
            
            if (index >= 0 && index < history.length) {
                history.splice(index, 1);
                chrome.storage.local.set({ history }, () => {
                    loadHistory(); // Reload the history display
                });
            }
        }
    }

    function saveRules() {
        const data = {
            branchRules: elements.branchRules.value,
            commitRules: elements.commitRules.value
        };
        
        chrome.storage.local.set(data, () => {
            showTemporaryMessage(elements.rulesSaved);
        });
    }

    function saveDefaultRules() {
        // Save default rules silently without showing the success message
        const data = {
            branchRules: elements.branchRules.value,
            commitRules: elements.commitRules.value
        };
        
        chrome.storage.local.set(data);
    }

    function saveSettings() {
        const data = {
            geminiModel: elements.geminiModel.value,
            temperature: parseFloat(elements.temperature.value)
        };
        
        chrome.storage.local.set(data, () => {
            showTemporaryMessage(elements.settingsSaved);
        });
    }

    function updateTemperatureDisplay() {
        elements.temperatureValue.textContent = elements.temperature.value;
    }

    function showLoading(show) {
        if (show) {
            elements.loading.classList.remove('hidden');
        } else {
            elements.loading.classList.add('hidden');
        }
        elements.generateBtn.disabled = show;
    }

    function showError(message) {
        elements.error.textContent = message;
        elements.error.classList.remove('hidden');
    }

    function showSuccess(message) {
        const successEl = document.createElement('div');
        successEl.className = 'text-green-700 bg-green-100 p-2.5 rounded-md mt-2.5';
        successEl.textContent = message;
        elements.error.parentNode.insertBefore(successEl, elements.error);
        
        setTimeout(() => {
            successEl.remove();
        }, 3000);
    }

    function hideMessages() {
        elements.error.classList.add('hidden');
    }

    function showTemporaryMessage(element) {
        element.classList.remove('hidden');
        setTimeout(() => {
            element.classList.add('hidden');
        }, 2000);
    }

    async function exportData() {
        try {
            // Get all extension data
            const data = await new Promise(resolve => {
                chrome.storage.local.get(null, resolve);
            });
            
            // Create export object with metadata
            const exportData = {
                exportDate: new Date().toISOString(),
                exportVersion: "1.0",
                extensionName: "Branch & Commit Helper",
                data: {
                    // Settings
                    apiKey: data.apiKey || "",
                    geminiModel: data.geminiModel || "gemini-2.0-flash-exp",
                    temperature: data.temperature || 0.3,
                    
                    // Rules
                    branchRules: data.branchRules || "",
                    commitRules: data.commitRules || "",
                    
                    // History
                    history: data.history || [],
                    
                    // Rate limit data (optional)
                    rateLimitData: data.rateLimitData || null
                }
            };
            
            // Create and download file
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const filename = `branch-commit-helper-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showTemporaryMessage(elements.exportSuccess);
            
        } catch (error) {
            console.error('Export error:', error);
            showError('Failed to export data: ' + error.message);
        }
    }

    async function importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data structure
            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('Invalid backup file format');
            }
            
            // Confirm import
            const confirmMessage = `Import data from ${importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : 'unknown date'}?\n\nThis will replace:\n- API key and settings\n- Custom rules\n- History (${importData.data.history?.length || 0} items)\n\nCurrent data will be overwritten.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Import the data
            const dataToImport = {};
            
            // Import settings
            if (importData.data.apiKey !== undefined) dataToImport.apiKey = importData.data.apiKey;
            if (importData.data.geminiModel !== undefined) dataToImport.geminiModel = importData.data.geminiModel;
            if (importData.data.temperature !== undefined) dataToImport.temperature = importData.data.temperature;
            
            // Import rules
            if (importData.data.branchRules !== undefined) dataToImport.branchRules = importData.data.branchRules;
            if (importData.data.commitRules !== undefined) dataToImport.commitRules = importData.data.commitRules;
            
            // Import history
            if (importData.data.history !== undefined) dataToImport.history = importData.data.history;
            
            // Import rate limit data (optional)
            if (importData.data.rateLimitData !== undefined) dataToImport.rateLimitData = importData.data.rateLimitData;
            
            // Save to storage
            await new Promise(resolve => {
                chrome.storage.local.set(dataToImport, resolve);
            });
            
            // Reload the UI with imported data
            loadSavedData();
            updateRateLimitsDisplay();
            
            // Show success message
            showTemporaryMessage(elements.importSuccess);
            
            // Clear file input
            elements.importFileInput.value = '';
            
        } catch (error) {
            console.error('Import error:', error);
            elements.importError.textContent = 'Failed to import data: ' + error.message;
            elements.importError.classList.remove('hidden');
            setTimeout(() => {
                elements.importError.classList.add('hidden');
            }, 5000);
            
            // Clear file input
            elements.importFileInput.value = '';
        }
    }

    // Copy to clipboard function - make it global for HTML onclick
    window.copyToClipboard = function(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const text = element.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const copyBtn = element.parentNode.querySelector('.copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ Copied!';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 1000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const copyBtn = element.parentNode.querySelector('.copy-btn');
                if (copyBtn) {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 1000);
                }
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        });
    };

    // Copy text directly to clipboard
    window.copyText = function(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✅ Copied!';
            
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const originalText = buttonElement.textContent;
                buttonElement.textContent = '✅ Copied!';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                }, 1000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        });
    };

    // Copy git commit command to clipboard
    window.copyGitCommit = function(commitMessage, taskId, buttonElement) {
        // Extract the commit type and message from the commit message
        // Assume format like "feat: add authentication system" or just "add authentication system"
        let commitType = 'feat';
        let message = commitMessage;
        
        // Check if commit message already has a conventional commit format
        const conventionalMatch = commitMessage.match(/^(feat|fix|docs|style|refactor|test|chore)(\(.+?\))?\s*:\s*(.+)$/i);
        if (conventionalMatch) {
            commitType = conventionalMatch[1].toLowerCase();
            message = conventionalMatch[3];
        }
        
        // Replace double quotes with single quotes in the message to avoid shell conflicts
        message = message.replace(/"/g, "'");
        
        // Check if the message already contains the task ID to avoid duplication
        const taskIdPattern = new RegExp(`#${taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        const taskIdSuffix = taskIdPattern.test(message) ? '' : ` #${taskId}`;
        
        // Create git commit command
        const gitCommand = `git commit -m "${commitType}: ${message}${taskIdSuffix}" --no-verify`;
        
        navigator.clipboard.writeText(gitCommand).then(() => {
            // Show feedback
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✅ Copied!';
            
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy git command:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = gitCommand;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                const originalText = buttonElement.textContent;
                buttonElement.textContent = '✅ Copied!';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                }, 1000);
            } catch (err) {
                console.error('Fallback copy failed:', err);
            }
            document.body.removeChild(textArea);
        });
    };

    // Open Chrome Extension Shortcuts Page
    function openShortcutsPage() {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }

    // Edit History Item Functions
    let currentEditIndex = -1;

    async function openEditModal(index) {
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        if (index < 0 || index >= history.length) return;

        const item = history[index];
        currentEditIndex = index;

        // Debug: Log the item to see its structure
        console.log('Opening edit modal for item:', item);

        // Populate modal fields (handle both 'description' and 'taskDescription' for backwards compatibility)
        document.getElementById('editTaskId').value = item.taskId || '';
        document.getElementById('editTaskTitle').value = item.taskTitle || '';
        document.getElementById('editTaskDescription').value = item.description || item.taskDescription || '';
        document.getElementById('editSourceUrl').value = item.sourceUrl || '';
        document.getElementById('editBranchName').value = item.branchName || '';
        document.getElementById('editCommitMessage').value = item.commitMessage || '';

        // Show modal
        const modal = document.getElementById('editModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'items-center', 'justify-center');
    };

    function closeEditModal() {
        const modal = document.getElementById('editModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex', 'items-center', 'justify-center');
        currentEditIndex = -1;
        
        // Clear form fields
        document.getElementById('editTaskId').value = '';
        document.getElementById('editTaskTitle').value = '';
        document.getElementById('editTaskDescription').value = '';
        document.getElementById('editSourceUrl').value = '';
        document.getElementById('editBranchName').value = '';
        document.getElementById('editCommitMessage').value = '';
    };

    async function saveEditedItem() {
        if (currentEditIndex === -1) return;

        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });

        const history = data.history || [];
        if (currentEditIndex < 0 || currentEditIndex >= history.length) return;

        // Get updated values from form
        const updatedItem = {
            ...history[currentEditIndex],
            taskId: document.getElementById('editTaskId').value.trim(),
            taskTitle: document.getElementById('editTaskTitle').value.trim(),
            description: document.getElementById('editTaskDescription').value.trim(),
            sourceUrl: document.getElementById('editSourceUrl').value.trim() || null,
            branchName: document.getElementById('editBranchName').value.trim() || null,
            commitMessage: document.getElementById('editCommitMessage').value.trim() || null,
            timestamp: history[currentEditIndex].timestamp // Keep original timestamp
        };

        // Validate required fields
        if (!updatedItem.taskId || !updatedItem.taskTitle) {
            showError('Task ID and Title are required.');
            return;
        }

        // Update history
        history[currentEditIndex] = updatedItem;
        
        chrome.storage.local.set({ history }, () => {
            closeEditModal();
            loadHistory(); // Reload history to show changes
            showSuccess('History item updated successfully!');
        });
    };

    // Close modal when clicking outside
    document.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeEditModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeEditModal();
        }
    });

    // Auto-search and caching functionality
    async function autoSearchFromCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const currentUrl = tab.url;
            
            if (!currentUrl) return;
            
            // Get current page task data to check for matches
            let currentTaskData = null;
            try {
                currentTaskData = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_TASK_DATA' });
            } catch (error) {
                // Ignore errors if page doesn't support extraction
            }
            
            // Get history to search for matches
            const data = await new Promise(resolve => {
                chrome.storage.local.get(['history'], resolve);
            });
            
            const history = data.history || [];
            const matches = findPageMatches(history, currentUrl, currentTaskData);
            
            if (matches.length > 0) {
                // Switch to history tab and show matches
                switchTab('history');
                displayCachedResults(matches, currentUrl, currentTaskData);
                
                // Show notification about cached results
                showCacheNotification(matches.length);
            }
            
        } catch (error) {
            console.error('Auto-search error:', error);
            // Silently fail - don't interrupt user experience
        }
    }

    function findPageMatches(history, currentUrl, currentTaskData) {
        const matches = [];
        
        // Clean URL function to remove query parameters for better matching
        const cleanUrl = (url) => {
            try {
                const urlObj = new URL(url);
                return urlObj.origin + urlObj.pathname;
            } catch {
                return url;
            }
        };
        
        const cleanCurrentUrl = cleanUrl(currentUrl);
        
        for (const item of history) {
            let isMatch = false;
            let matchType = '';
            
            // 1. Exact URL match (highest priority)
            if (item.sourceUrl && cleanUrl(item.sourceUrl) === cleanCurrentUrl) {
                isMatch = true;
                matchType = 'exact-url';
            }
            // 2. Task ID match if available (second priority)
            else if (currentTaskData && currentTaskData.id && item.taskId === currentTaskData.id) {
                isMatch = true;
                matchType = 'task-id';
            }
            // 3. Task title similarity match (third priority)
            else if (currentTaskData && currentTaskData.title && item.taskTitle) {
                const similarity = calculateTextSimilarity(currentTaskData.title, item.taskTitle);
                if (similarity > 0.7) { // 70% similarity threshold
                    isMatch = true;
                    matchType = 'title-similarity';
                }
            }
            // 4. Domain match with task context (fourth priority)
            else if (item.sourceUrl && currentTaskData) {
                const itemDomain = getDomainFromUrl(item.sourceUrl);
                const currentDomain = getDomainFromUrl(currentUrl);
                if (itemDomain === currentDomain && currentTaskData.id && item.taskId.includes(currentTaskData.id.split('-')[0])) {
                    isMatch = true;
                    matchType = 'domain-context';
                }
            }
            
            if (isMatch) {
                matches.push({
                    ...item,
                    matchType,
                    originalIndex: history.indexOf(item)
                });
            }
        }
        
        // Sort matches by priority: exact-url > task-id > title-similarity > domain-context
        const priorityOrder = ['exact-url', 'task-id', 'title-similarity', 'domain-context'];
        matches.sort((a, b) => {
            const aPriority = priorityOrder.indexOf(a.matchType);
            const bPriority = priorityOrder.indexOf(b.matchType);
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            // If same priority, sort by timestamp (newest first)
            return b.timestamp - a.timestamp;
        });
        
        return matches;
    }

    function calculateTextSimilarity(text1, text2) {
        // Simple similarity calculation using common words
        const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        if (words1.length === 0 || words2.length === 0) return 0;
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    }

    async function displayCachedResults(matches, currentUrl, currentTaskData) {
        // Create special header for cached results
        const matchTypeLabels = {
            'exact-url': '🎯 Exact URL Match',
            'task-id': '🔗 Task ID Match', 
            'title-similarity': '📝 Similar Title',
            'domain-context': '🌐 Same Domain + Context'
        };
        
        // Group matches by type for better display
        const groupedMatches = {};
        matches.forEach(match => {
            if (!groupedMatches[match.matchType]) {
                groupedMatches[match.matchType] = [];
            }
            groupedMatches[match.matchType].push(match);
        });
        
        let cachedResultsHtml = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-blue-600 font-semibold">🔄 Auto-Search Results</span>
                    <span class="text-xs bg-blue-100 px-2 py-1 rounded">Found ${matches.length} cached item(s)</span>
                </div>
                <div class="text-sm text-blue-700 mb-2">
                    Previously generated content for this page detected! These results can be reused instead of generating new ones.
                </div>
                <div class="text-xs text-blue-600">
                    Current page: ${escapeHtml(getDomainFromUrl(currentUrl))}
                </div>
            </div>
        `;
        
        // Display matches grouped by type
        const priorityOrder = ['exact-url', 'task-id', 'title-similarity', 'domain-context'];
        
        for (const matchType of priorityOrder) {
            if (groupedMatches[matchType]) {
                cachedResultsHtml += `
                    <div class="mb-4">
                        <div class="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            ${matchTypeLabels[matchType]}
                            <span class="text-xs bg-gray-100 px-2 py-1 rounded">${groupedMatches[matchType].length}</span>
                        </div>
                        ${groupedMatches[matchType].map(item => createHistoryItemHtml(item, '', true)).join('')}
                    </div>
                `;
            }
        }
        
        // Add separator before regular history
        cachedResultsHtml += `
            <div class="border-t border-gray-300 pt-4 mt-6 mb-4">
                <div class="text-sm font-semibold text-gray-500 mb-2">📚 Other Recent History</div>
            </div>
        `;
        
        // Get all history to show non-matching items below
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['history'], resolve);
        });
        
        const allHistory = data.history || [];
        const matchingIndexes = new Set(matches.map(m => m.originalIndex));
        const otherHistory = allHistory.filter((_, index) => !matchingIndexes.has(index));
        
        const otherHistoryHtml = otherHistory.length > 0 
            ? otherHistory.slice(0, 10).map(item => createHistoryItemHtml(item, '', false)).join('')
            : '<div class="text-center text-gray-500 italic py-4">No other recent history</div>';
        
        elements.historyContainer.innerHTML = cachedResultsHtml + otherHistoryHtml;
        
        // Add event listeners for all buttons
        addHistoryEventListeners();
    }

    function createHistoryItemHtml(item, searchTerm = '', isCachedResult = false) {
        // Find original index for proper deletion
        const allHistory = JSON.parse(localStorage.getItem('temp_all_history') || '[]');
        const realIndex = allHistory.findIndex(historyItem => 
            historyItem.timestamp === item.timestamp && 
            historyItem.taskId === item.taskId
        );
        
        const markdownLink = item.sourceUrl ? `[${item.taskId}, ${item.taskTitle}](${item.sourceUrl})` : '';
        
        // Highlight search terms in task ID and title
        const highlightedTaskId = highlightSearchTerm(item.taskId, searchTerm);
        const highlightedTitle = highlightSearchTerm(item.taskTitle, searchTerm);
        
        // Create title with link if URL exists, otherwise plain text
        const taskTitleHtml = item.sourceUrl 
            ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" class="text-primary no-underline font-semibold hover:underline hover:text-primary-dark" title="Open original task">${highlightedTaskId}: ${highlightedTitle}</a>`
            : `${highlightedTaskId}: ${highlightedTitle}`;
        
        // Add special styling for cached results
        const containerClass = isCachedResult 
            ? "bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4 relative shadow-sm"
            : "bg-white border border-gray-200 rounded-lg p-4 mb-4 relative";
        
        const cachedBadge = isCachedResult 
            ? `<div class="absolute top-1 left-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">🔄 Cached</div>`
            : '';
        
        return `
            <div class="${containerClass}" data-history-index="${realIndex}">
                ${cachedBadge}
                <div class="absolute top-1 right-1 flex gap-1 ">
                    <button class="bg-gray-50 ring-1 ring-gray-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-[100px] hover:bg-gray-100 transition-all duration-300" data-edit-index="${realIndex}" title="Edit this item">✏️</button>
                    <button class="bg-red-50 ring-1 ring-red-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-[100px] hover:bg-red-100 transition-all duration-300" data-delete-index="${realIndex}">🗑️</button>
                </div>
                <div class="text-xs text-gray-500 mb-2.5">${new Date(item.timestamp).toLocaleString()}</div>

                <div class="bg-gray-50 p-2.5 rounded-md font-mono text-xs mb-2.5">
                <div class="flex flex-row items-center gap-2 mb-2">
                    <div class="font-semibold text-gray-700 mb-2 flex-1 text-balance">${taskTitleHtml}</div>
                    ${markdownLink ? `<button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-shrink-0 min-w-auto hover:bg-emerald-100 transition-all duration-300" data-copy-text="${escapeAttr(markdownLink)}" title="Copy markdown link">📋</button>` : ''}
                </div>
               
                    ${item.branchName ? ` 
                     <div class="flex flex-col">
                     <strong>Branch:</strong>
                    <div class="text-primary-dark flex flex-row gap-1 items-center">
                        <div class=" select-all w-full cursor-text bg-orange-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-orange-100 hover:border-gray-300 text-balance" title="Click to select all">
                            ${escapeHtml(item.branchName)}
                        </div>
                        <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${escapeAttr(item.branchName)}">
                            📋
                        </button>
                    </div>
                    
                    </div>` : ''}
                    
                    ${item.commitMessage ? `
                    <div class="flex flex-col">
                    <strong>Commit:</strong>
                    <div class="text-primary-dark flex flex-row gap-1 items-center">
                        <div class=" select-all cursor-text bg-blue-50 py-1.5 px-2 rounded border border-gray-200 font-mono break-all transition-all duration-300 hover:bg-blue-100 hover:border-gray-300 text-balance" title="Click to select all">${escapeHtml(item.commitMessage)}</div> 
                        <button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap hover:bg-emerald-100 h-auto transition-all duration-300" data-copy-text="${escapeAttr(item.commitMessage)}">📋</button>
                    </div>
                   
                    </div>` : ''}
                    ${!item.branchName && !item.commitMessage ? `
                    <div class="text-secondary italic py-2 px-2 bg-purple-50 rounded text-center mb-1">
                        <em>📌 Task reference only (no generation performed)</em>
                    </div>` : ''}

                    <div class="flex gap-2 justify-start mt-2.5 pt-2.5 border-t border-gray-200">
                        ${item.commitMessage ? `<button class="bg-emerald-50 ring-1 ring-emerald-400 text-black border-none px-3 py-1.5 rounded cursor-pointer text-xs font-medium whitespace-nowrap flex-1 max-w-full hover:bg-emerald-100 transition-all duration-300" data-commit-text="${escapeAttr(item.commitMessage)}" data-task-id="${escapeAttr(item.taskId)}">📋 Git console command</button>` : ''}
                        
                    </div>
                </div>
            </div>
        `;
    }

    function addHistoryEventListeners() {
        // Add click listeners to copy buttons (branch/commit and markdown link)
        const copyButtons = elements.historyContainer.querySelectorAll('button[data-copy-text]');
        copyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const text = this.getAttribute('data-copy-text');
                copyText(text, this);
            });
        });

        // Add click listeners to git commit buttons
        const gitButtons = elements.historyContainer.querySelectorAll('button[data-commit-text]');
        gitButtons.forEach(button => {
            button.addEventListener('click', function() {
                const commitText = this.getAttribute('data-commit-text');
                const taskId = this.getAttribute('data-task-id');
                copyGitCommit(commitText, taskId, this);
            });
        });

        // Add click listeners to delete buttons
        const deleteButtons = elements.historyContainer.querySelectorAll('button[data-delete-index]');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-delete-index'));
                deleteHistoryItem(index);
            });
        });

        // Add click listeners to edit buttons
        const editButtons = elements.historyContainer.querySelectorAll('button[data-edit-index]');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-edit-index'));
                openEditModal(index);
            });
        });

        // Add click listeners to text areas for easy selection
        const textAreas = elements.historyContainer.querySelectorAll('div[title="Click to select all"]');
        textAreas.forEach(textArea => {
            textArea.addEventListener('click', function() {
                // Select all text when clicked
                const range = document.createRange();
                range.selectNodeContents(this);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });
    }

    function showCacheNotification(matchCount) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium';
        notification.innerHTML = `🔄 Found ${matchCount} cached result(s) for this page!`;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    // Auto-search and caching functionality - END

})();