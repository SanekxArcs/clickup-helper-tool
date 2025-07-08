const API_BASE_URL = 'https://chat.twntydigital.de/api/v4';

/**
 * A centralized fetch wrapper for making API calls to Mattermost.
 * @param {string} endpoint - The API endpoint (e.g., 'users/me').
 * @param {object} options - Configuration for the fetch call.
 * @returns {Promise<object>} - The JSON response from the API.
 * @throws {Error} - Throws an error with API message on failure.
 */
const apiFetch = async (endpoint, options = {}) => {
    const config = {
        method: 'GET',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers,
        },
        credentials: 'omit',
    };

    if (config.body) {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
        const error = new Error(errorData.message || 'API request failed');
        error.authError = response.status === 401;
        throw error;
    }

    // Handle successful responses that have no body content (e.g., DELETE)
    return response.status === 204 || response.headers.get('Content-Length') === '0' ? { success: true } : response.json();
};

/**
 * Authenticates the user and updates the UI.
 * @param {function} [onSuccess] - Optional callback to run on successful authentication.
 * @param {function} [onFailure] - Optional callback to run on failed authentication.
 */
export const authenticateUser = (onSuccess, onFailure) => {
    console.log('Authentication process started');

    // Get DOM elements
    const $loader = document.getElementById('loader');
    const $signInView = document.getElementById('sign-in-view');
    const $homeView = document.getElementById('home-view');

    // Show loader initially
    if ($loader) $loader.style.display = 'flex';
    if ($signInView) $signInView.style.display = 'none';
    if ($homeView) $homeView.style.display = 'none';

    // Set a timeout to prevent the loader from being stuck indefinitely
    const loaderTimeout = setTimeout(() => {
        console.log('Loader timeout reached, showing sign-in view');
        if ($loader) $loader.style.display = 'none';
        if ($signInView) $signInView.style.display = 'block';
        if (onFailure) onFailure();
    }, 10000); // 10 seconds timeout

    chrome.storage.sync.get(['MMAuthToken', 'MMAccessToken', 'MMUsername'], async function (items) {
        try {
            const {MMAuthToken, MMAccessToken, MMUsername} = items;
            const token = MMAccessToken || MMAuthToken;

            // If no token is found, show sign in view
            if (!token) {
                console.log('No authentication token found');
                clearTimeout(loaderTimeout);
                if ($loader) $loader.style.display = 'none';
                if ($signInView) $signInView.style.display = 'block';
                if (onFailure) onFailure();
                return;
            }

            console.log('Validating token...');

            try {
                const responseData = await apiFetch('users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('User data retrieved successfully');

                // Store user ID in Chrome storage
                chrome.storage.sync.set({MMUserId: responseData.id});

                const $accessToken = document.getElementById('access-token');
                const $userName = document.getElementById('user-name');

                if ($accessToken) $accessToken.innerText = MMAccessToken ? 'Yes' : 'No';
                if ($userName) $userName.innerText = MMUsername || responseData.username;

                // Show the home view with user information
                clearTimeout(loaderTimeout);
                if ($loader) $loader.style.display = 'none';
                if ($signInView) $signInView.style.display = 'none';
                if ($homeView) $homeView.style.display = 'block';
                if (onSuccess) onSuccess();
            } catch (fetchError) {
                console.error('Token validation failed:', fetchError.message);
                clearTimeout(loaderTimeout);
                if ($loader) $loader.style.display = 'none';
                if ($signInView) $signInView.style.display = 'block';
                if (onFailure) onFailure();
            }
        } catch (e) {
            console.error('Authentication error:', e);
            clearTimeout(loaderTimeout);
            if ($loader) $loader.style.display = 'none';
            if ($signInView) $signInView.style.display = 'block';
            if (onFailure) onFailure();
        }
    });
};

export const getUserOptions = () => {
    chrome.storage.sync.get({
        userStatus: 'dnd',
        userStatusText: "I'm on a meet",
        userEmoji: 'calendar',
        showMeetingTitle: false
    }, function (items) {
        const {userStatus, userStatusText, userEmoji, showMeetingTitle} = items

        const $userStatus = document.getElementById('user-status')
        const $userStatusText = document.getElementById('user-status-text')
        const $userEmoji = document.getElementById('emoji')
        const $showMeetingTitle = document.getElementById('show-meeting-title')

        $userStatus.value = userStatus
        $userStatusText.value = userStatusText
        if ($userEmoji && userEmoji) {
            $userEmoji.value = userEmoji
        }
        $showMeetingTitle.checked = showMeetingTitle
    })
}

export const getMeetingTitle = (pageTitle) => {
    const meetingTitleRegExp = /(?<=Meet(\u00A0|\s)([–\-]) ).*/
    const meetingTitleMatch = pageTitle.match(meetingTitleRegExp)

    if (!meetingTitleMatch) {
        return null
    }

    return meetingTitleMatch[0]
}

export const isMeetingCodeInMeetingTitle = (meetingTitle) => {
    const googleMeetingCodeRegExp = /[a-zA-Z]{3}-[a-zA-Z]{4}-[a-zA-Z]{3}/

    const result = meetingTitle.match(googleMeetingCodeRegExp)

    return !!result;
}

/**
 * Updates a user's active status in Mattermost
 * @param {string} userId - The Mattermost user ID
 * @param {boolean} isActive - Whether the user should be active (true) or inactive (false)
 * @param {string} token - The authentication token
 * @returns {Promise<object>} - Response data or error
 */
export const updateUserActiveStatus = async (userId, isActive, token) => {
    if (!userId || !token) {
        console.error('Missing required parameters for updating active status');
        return { error: 'Missing userId or token' };
    }
    try {
        console.log(`Updating user ${userId} active status to: ${isActive}`);
        const data = await apiFetch(`users/${userId}/active`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: { active: isActive }
        });
        console.log('Active status updated successfully:', data);
        return data;
    } catch (error) {
        console.error('Error updating active status:', error);
        return { error: error.message || 'Unknown error occurred' };
    }
};

/**
 * Updates a user's status in Mattermost (online, away, dnd, offline)
 * @param {string} userId - The Mattermost user ID
 * @param {string} status - The status to set (online, away, dnd, offline)
 * @param {string} token - The authentication token
 * @returns {Promise<object>} - Response data or error
 */
export const updateUserStatus = async (userId, status, token) => {
    if (!userId || !status || !token) {
        return { error: 'Missing userId, status, or token' };
    }
    if (!['online', 'away', 'dnd', 'offline'].includes(status)) {
        return { error: 'Invalid status value' };
    }

    try {
        console.log(`Updating user status to: ${status}`);
        const data = await apiFetch('users/me/status', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: {
                user_id: userId,
                status: status
            }
        });
        console.log('User status updated successfully:', data);
        return data;
    } catch (error) {
        console.error('Error updating user status:', error);
        return { error: error.message || 'Unknown error occurred' };
    }
};

/**
 * Updates a user's custom status in Mattermost (text and emoji)
 * @param {string} userId - The Mattermost user ID
 * @param {string} text - The status text to set
 * @param {string} emoji - The emoji to set (e.g., "calendar")
 * @param {string} token - The authentication token.
 * @returns {Promise<object>} - Response data or error
 */
export const updateUserCustomStatus = async (userId, text, emoji, token) => {
    if (!userId || !token) {
        return { error: 'Missing userId or token' };
    }
    try {
        // This avoids setting a default when we intend to clear the status (empty text and emoji).
        if ((!emoji || emoji.trim() === '') && (text && text.trim() !== '')) {
            console.log('No emoji provided for status text, using default "calendar" emoji');
            emoji = "calendar"; // Default emoji for status
        }
        
        // Ensure emoji adheres to Mattermost's requirements (1-64 lowercase alphanumeric chars)
        emoji = emoji.trim().toLowerCase();
        
        // Validate emoji format
        if (emoji && !/^[a-z0-9_]+$/.test(emoji)) {
            console.error('Invalid emoji format:', emoji);
            return { error: 'Emoji must contain only lowercase letters, numbers, and underscores' };
        }

        console.log(`Updating user custom status: ${text} with emoji: ${emoji}`);
        
        // Per the API documentation, the body should be a flat object.
        // The /me endpoint implies the user, so user_id is not needed in the body.
        const requestBody = {
            emoji: emoji,
            text: text || ""
        };

        const data = await apiFetch('users/me/status/custom', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: requestBody
        });
        console.log('Custom status updated successfully:', data);
        return data;
    } catch (error) {
        console.error('Error updating custom status:', error);
        return { error: error.message || 'Unknown error occurred' };
    }
};

/**
 * Clears a user's custom status in Mattermost.
 * @param {string} token - The authentication token.
 * @returns {Promise<object>} - Response data or error.
 */
export const clearUserCustomStatus = async (token) => {
    if (!token) {
        return { error: 'Missing token' };
    }
    try {
        console.log('Clearing user custom status...');
        const data = await apiFetch('users/me/status/custom', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return data;
    } catch (error) {
        console.error('Error clearing custom status:', error);
        return { error: error.message || 'Unknown error occurred' };
    }
};

/**
 * Gets the current token from Chrome storage
 * @returns {Promise<string|null>} - The token or null if not found
 */
export const getCurrentToken = () => {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['MMAuthToken', 'MMAccessToken'], (items) => {
            const token = items.MMAccessToken || items.MMAuthToken || null;
            resolve(token);
        });
    });
};

/**
 * Handle authentication errors by clearing tokens and redirecting if needed
 * @param {boolean} redirect - Whether to redirect to login page
 */
export const handleAuthError = (redirect = false) => {
    console.log('Handling auth error, clearing tokens');
    chrome.storage.sync.remove(['MMAuthToken', 'MMAccessToken']);
    
    if (redirect && window.location.href.includes('options.html')) {
        window.location.reload();
    }
};