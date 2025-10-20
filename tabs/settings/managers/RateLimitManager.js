export class RateLimitManager {
    constructor(tab, elements) {
        this.tab = tab;
        this.elements = elements;

        // Model rate limits configuration
        this.modelRateLimits = {
            'gemini-2.5-flash-lite': {
                requests_per_minute: 15,
                requests_per_day: 1000,
                tokens_per_minute: 250000
            }
        };

        this.rateLimits = {
            requests_per_minute: 15,
                requests_per_day: 1000,
                tokens_per_minute: 250000
        };
    }

    /**
     * Check if a request is within rate limits and update tracking
     */
    async checkAndUpdateRateLimit() {
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
        if (rateLimitData.minuteRequests.length >= this.rateLimits.requests_per_minute) {
            return false;
        }

        if (rateLimitData.dayRequests.length >= this.rateLimits.requests_per_day) {
            return false;
        }

        // Add current request
        rateLimitData.minuteRequests.push(now);
        rateLimitData.dayRequests.push(now);

        // Save updated data
        chrome.storage.local.set({ rateLimitData });
        
        // Update display after rate limit check
        this.updateRateLimitsDisplay();
        
        return true;
    }

    /**
     * Get rate limits for the currently selected model
     */
    getCurrentRateLimits() {
        return this.modelRateLimits['gemini-2.5-flash-lite'];
    }

    /**
     * Update the rate limits display UI
     */
    async updateRateLimitsDisplay() {
        const now = Date.now();
        const storageKey = 'rateLimits_gemini-2.5-flash-lite';
        const currentLimits = this.getCurrentRateLimits();
        
        const data = await new Promise(resolve => {
            chrome.storage.local.get([storageKey], resolve);
        });

        let rateLimitData = data[storageKey] || {
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

        // Update usage display with dynamic limits
        if (this.elements.minuteUsage) {
            this.elements.minuteUsage.textContent = `${minuteCount} / ${currentLimits.requests_per_minute}`;
        }
        if (this.elements.dayUsage) {
            this.elements.dayUsage.textContent = `${dayCount} / ${currentLimits.requests_per_day}`;
        }

        // Update progress bars with dynamic limits
        const minutePercent = (minuteCount / currentLimits.requests_per_minute) * 100;
        const dayPercent = (dayCount / currentLimits.requests_per_day) * 100;

        if (this.elements.minuteBar) {
            this.elements.minuteBar.style.width = minutePercent + '%';
            this.updateProgressBarColor(this.elements.minuteBar, minutePercent);
        }
        
        if (this.elements.dayBar) {
            this.elements.dayBar.style.width = dayPercent + '%';
            this.updateProgressBarColor(this.elements.dayBar, dayPercent);
        }

        // Update reset time display
        const nextReset = this.getNextResetTime(rateLimitData.minuteRequests);
        if (this.elements.rateLimitReset) {
            if (nextReset && minuteCount >= currentLimits.requests_per_minute) {
                this.elements.rateLimitReset.innerHTML = `<small>Minute limit resets in ${nextReset}</small>`;
            } else {
                this.elements.rateLimitReset.innerHTML = '<small>Limits reset automatically</small>';
            }
        }
    }

    /**
     * Update the color of progress bar based on percentage
     */
    updateProgressBarColor(progressBar, percent) {
        progressBar.classList.remove('warning', 'danger');
        
        if (percent >= 90) {
            progressBar.classList.add('danger');
        } else if (percent >= 70) {
            progressBar.classList.add('warning');
        }
    }

    /**
     * Calculate time until rate limit resets
     */
    getNextResetTime(requests) {
        if (requests.length === 0) return null;
        
        const oldestRequest = Math.min(...requests);
        const resetTime = oldestRequest + 60 * 1000; // 1 minute after oldest request
        const now = Date.now();
        
        if (resetTime <= now) return null;
        
        const seconds = Math.ceil((resetTime - now) / 1000);
        return seconds > 60 ? `${Math.ceil(seconds / 60)}m` : `${seconds}s`;
    }
}
