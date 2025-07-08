import {
  authenticateUser,
  getUserOptions,
  updateUserActiveStatus,
  updateUserStatus,
  updateUserCustomStatus,
  clearUserCustomStatus,
  getCurrentToken,
  handleAuthError
} from "./helpers.js";

const loadHandler = () => {
  const $loader = document.getElementById('loader');
  if ($loader) $loader.style.display = 'flex';
  const onAuthSuccess = () => {
    try {
      loadUserActiveStatus();
    } catch (error) {}
  };
  authenticateUser(onAuthSuccess);
  getUserOptions();
};

const logInHandler = async () => {
  const login = document.getElementById('login-id-input').value
  const password = document.getElementById('password-input').value
  const statusElement = document.getElementById('status')
  statusElement.textContent = ''
  try {
    const res = await fetch('https://chat.twntydigital.de/api/v4/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        login_id: login,
        password: password,
        device_id: 'chrome_extension_' + chrome.runtime.id
      }),
      credentials: 'omit'
    })
    if (res.ok) {
      const token = res.headers.get('Token')
      let respData
      try {
        respData = await res.json()
      } catch (e) {
        statusElement.textContent = 'Failed to parse server response'
        statusElement.style.color = 'red'
        return
      }
      if (!token && !respData.token) {
        statusElement.textContent = 'Authentication successful but no token received'
        statusElement.style.color = 'red'
        return
      }
      const authToken = token || respData.token
      chrome.storage.sync.set({
        MMAuthToken: authToken, 
        MMUserId: respData.id, 
        MMUsername: respData.username || login
      }, () => {
        loadHandler()
      })
    } else {
      let errorMessage = 'Login failed'
      try {
        const errorData = await res.json()
        errorMessage = errorData.message || errorMessage
      } catch (e) {}
      statusElement.textContent = errorMessage
      statusElement.style.color = 'red'
    }
  } catch (error) {
    statusElement.textContent = 'Connection error. Please try again.'
    statusElement.style.color = 'red'
  }
}

const logOutHandler = () => {
  chrome.storage.sync.clear(() => {
    const $singInView = document.getElementById('sing-in-view')
    const $homeView = document.getElementById('home-view')
    $singInView.style.display = 'block'
    $homeView.style.display = 'none'
  })
}

const personalTokenSubmitHandler = async () => {
  const token = document.getElementById('personal-token-input').value
  const statusElement = document.getElementById('token-status')
  statusElement.textContent = ''
  if (!token || token.trim() === '') {
    statusElement.textContent = 'Please enter a valid token'
    statusElement.style.color = 'red'
    return
  }
  try {
    const response = await fetch('https://chat.twntydigital.de/api/v4/users/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'omit'
    })
    if (!response.ok) {
      statusElement.textContent = 'Invalid token. Please check and try again.'
      statusElement.style.color = 'red'
      return
    }
    const userData = await response.json()
    chrome.storage.sync.set({
      MMAccessToken: token,
      MMUsername: userData.username,
      MMUserId: userData.id
    }, () => {
      loadHandler()
    })
  } catch (error) {
    statusElement.textContent = 'Connection error. Please try again.'
    statusElement.style.color = 'red'
  }
}

const saveOptions = async () => {
  const status = document.getElementById('user-status').value
  const text = document.getElementById('user-status-text').value
  const emoji = document.getElementById('emoji').value.trim()
  const showMeetingTitle = document.getElementById('show-meeting-title').checked
  const $button = document.getElementById('save-options-button')
  chrome.storage.sync.set({
    userStatus: status,
    userStatusText: text,
    userEmoji: emoji,
    showMeetingTitle: showMeetingTitle
  }, () => {
    $button.innerText = 'Saved'
    setTimeout(() => ($button.textContent = 'Save'), 750)
  })
}

const loadUserActiveStatus = () => {
  chrome.storage.sync.get(['MMUserId', 'MMAuthToken', 'MMAccessToken'], async function (items) {
    const { MMUserId, MMAuthToken, MMAccessToken } = items
    const token = MMAccessToken || MMAuthToken
    if (!MMUserId || !token) {
      return
    }
    try {
      const response = await fetch(`https://chat.twntydigital.de/api/v4/users/${MMUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'omit'
      })
      if (response.ok) {
        const userData = await response.json()
        const activeCheckbox = document.getElementById('active-status-toggle')
        if (activeCheckbox) {
          activeCheckbox.checked = userData.delete_at === 0
          chrome.storage.sync.set({ userActiveStatus: userData.delete_at === 0 })
          updateActiveStatusMessage(userData.delete_at === 0)
        }
      }
    } catch (error) {}
  })
}

const updateActiveStatusMessage = (isActive) => {
  const messageElement = document.getElementById('active-status-message')
  if (messageElement) {
    messageElement.textContent = isActive ? 'Your account is active' : 'Your account is inactive'
    messageElement.style.color = isActive ? '#3EDC99' : '#E74C3C'
  }
}

const activeStatusToggleHandler = async () => {
  const activeCheckbox = document.getElementById('active-status-toggle')
  const isActive = activeCheckbox.checked
  const messageElement = document.getElementById('active-status-message')
  chrome.storage.sync.get(['MMUserId', 'MMAuthToken', 'MMAccessToken'], async function (items) {
    const { MMUserId, MMAuthToken, MMAccessToken } = items
    const token = MMAccessToken || MMAuthToken
    if (!MMUserId || !token) {
      if (messageElement) {
        messageElement.textContent = 'Error: Missing authentication data'
        messageElement.style.color = '#E74C3C'
      }
      return
    }
    if (messageElement) {
      messageElement.textContent = 'Updating...'
      messageElement.style.color = '#CBD1DC'
    }
    try {
      const result = await updateUserActiveStatus(MMUserId, isActive, token)
      if (result.error) {
        if (messageElement) {
          messageElement.textContent = `Error: ${result.error}`
          messageElement.style.color = '#E74C3C'
        }
        chrome.storage.sync.get(['userActiveStatus'], function(data) {
          activeCheckbox.checked = data.userActiveStatus || false
        })
      } else {
        chrome.storage.sync.set({ userActiveStatus: isActive })
        updateActiveStatusMessage(isActive)
      }
    } catch (error) {
      if (messageElement) {
        messageElement.textContent = 'Error occurred while updating'
        messageElement.style.color = '#E74C3C'
      }
      chrome.storage.sync.get(['userActiveStatus'], function(data) {
        activeCheckbox.checked = data.userActiveStatus || false
      })
    }
  })
}

const updateStatusHandler = async () => {
  const statusSelect = document.getElementById('user-status')
  const status = statusSelect.value
  const messageElement = document.getElementById('status-update-message')
  try {
    messageElement.textContent = 'Updating status...'
    messageElement.style.color = '#CBD1DC'
    const token = await getCurrentToken()
    const { MMUserId } = await chrome.storage.sync.get('MMUserId');
    if (!token || !MMUserId) {
      messageElement.textContent = 'Authentication error: No token or user ID found'
      messageElement.style.color = '#E74C3C'
      return
    }
    const result = await updateUserStatus(MMUserId, status, token)
    if (result.error) {
      messageElement.textContent = `Error: ${result.error}`
      messageElement.style.color = '#E74C3C'
      if (result.authError) {
        handleAuthError(true)
      }
      return
    }
    messageElement.textContent = `Status updated to ${status} successfully`
    messageElement.style.color = '#3EDC99'
    setTimeout(() => {
      messageElement.textContent = ''
    }, 3000)
  } catch (error) {
    messageElement.textContent = 'An unexpected error occurred'
    messageElement.style.color = '#E74C3C'
  }
}

const updateCustomStatusHandler = async () => {
  const statusText = document.getElementById('user-status-text').value
  let emoji = document.getElementById('emoji').value.trim()
  const messageElement = document.getElementById('status-update-message')
  try {
    messageElement.textContent = 'Updating custom status...'
    messageElement.style.color = '#CBD1DC'
    const token = await getCurrentToken()
    const { MMUserId } = await chrome.storage.sync.get('MMUserId');
    if (!token || !MMUserId) {
      messageElement.textContent = 'Authentication error: No token or user ID found'
      messageElement.style.color = '#E74C3C'
      return
    }
    if (emoji && !/^[a-z0-9_]+$/.test(emoji)) {
      messageElement.textContent = 'Error: Emoji must contain only lowercase letters, numbers, and underscores'
      messageElement.style.color = '#E74C3C'
      return
    }
    const result = await updateUserCustomStatus(MMUserId, statusText, emoji, token)
    if (result.error) {
      messageElement.textContent = `Error: ${result.error}`
      messageElement.style.color = '#E74C3C'
      if (result.authError) {
        handleAuthError(true)
      }
      return
    }
    messageElement.textContent = `Custom status updated successfully`
    messageElement.style.color = '#3EDC99'
    setTimeout(() => {
      messageElement.textContent = ''
    }, 3000)
  } catch (error) {
    messageElement.textContent = 'An unexpected error occurred'
    messageElement.style.color = '#E74C3C'
  }
}

const resetStatusHandler = async () => {
  const messageElement = document.getElementById('status-update-message');
  try {
    messageElement.textContent = 'Resetting status...';
    messageElement.style.color = '#CBD1DC';
    const token = await getCurrentToken();
    const { MMUserId } = await chrome.storage.sync.get('MMUserId');
    if (!token || !MMUserId) {
      messageElement.textContent = 'Authentication error: No token or user ID found';
      messageElement.style.color = '#E74C3C';
      return;
    }
    const statusResult = await updateUserStatus(MMUserId, 'online', token);
    if (statusResult.error) {
      messageElement.textContent = `Error: ${statusResult.error}`;
      messageElement.style.color = '#E74C3C';
      if (statusResult.authError) handleAuthError(true);
      return;
    }
    const customStatusResult = await clearUserCustomStatus(token);
    if (customStatusResult.error) {
      messageElement.textContent = `Error: ${customStatusResult.error}`;
      messageElement.style.color = '#E74C3C';
      if (customStatusResult.authError) handleAuthError(true);
      return;
    }
    messageElement.textContent = 'Status reset successfully!';
    messageElement.style.color = '#3EDC99';
    setTimeout(() => {
      messageElement.textContent = '';
    }, 3000);
  } catch (error) {
    messageElement.textContent = 'An unexpected error occurred during reset.';
    messageElement.style.color = '#E74C3C';
  }
};

const addSafeEventListener = (elementId, eventType, handler) => {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener(eventType, handler);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadHandler();
  addSafeEventListener('login-button', 'click', logInHandler);
  addSafeEventListener('log-out-button', 'click', logOutHandler);
  addSafeEventListener('personal-token-button', 'click', personalTokenSubmitHandler);
  addSafeEventListener('save-options-button', 'click', saveOptions);
  addSafeEventListener('active-status-toggle', 'change', activeStatusToggleHandler);
  addSafeEventListener('update-status-button', 'click', updateStatusHandler);
  addSafeEventListener('update-custom-status-button', 'click', updateCustomStatusHandler);
  addSafeEventListener('reset-status-button', 'click', resetStatusHandler);
});
