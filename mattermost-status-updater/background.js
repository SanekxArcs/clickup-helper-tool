import {getMeetingTitle, isMeetingCodeInMeetingTitle, updateUserStatus, updateUserCustomStatus, clearUserCustomStatus} from "./scripts/helpers.js";

const titleUpdateListeners = {};
let activeModeTimer = null;

const startActiveMode = (interval) => {
  stopActiveMode(); // Clear any existing timer
  
  const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds
  
  activeModeTimer = setInterval(async () => {
    chrome.storage.sync.get(['MMUserId', 'MMAuthToken', 'MMAccessToken', 'activeModeEnabled'], async function(items) {
      const { MMUserId, MMAuthToken, MMAccessToken, activeModeEnabled } = items;
      
      // Check if active mode is still enabled
      if (!activeModeEnabled) {
        stopActiveMode();
        return;
      }
      
      const token = MMAccessToken || MMAuthToken;
      if (!token || !MMUserId) {
        return;
      }
      
      try {
        await updateUserStatus(MMUserId, 'online', token);
        console.log('Active mode: Status set to online');
      } catch (error) {
        console.error('Active mode: Error setting status to online:', error);
      }
    });
  }, intervalMs);
  
  console.log(`Active mode started with ${interval} minute interval`);
};

const stopActiveMode = () => {
  if (activeModeTimer) {
    clearInterval(activeModeTimer);
    activeModeTimer = null;
    console.log('Active mode stopped');
  }
};

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      userStatus: "dnd",
      userStatusText: "I'm on a meet",
      userEmoji: "calendar",
      showMeetingTitle: false,
      activeModeEnabled: false,
      activeModeInterval: 5,
      statusDuration: 0
    });
  }
  chrome.tabs.create({
    url: chrome.runtime.getURL('options.html'),
  })
})

// Initialize active mode on startup if enabled
chrome.storage.sync.get(['activeModeEnabled', 'activeModeInterval'], function(items) {
  if (items.activeModeEnabled) {
    startActiveMode(items.activeModeInterval || 5);
  }
});

chrome.runtime.onMessage.addListener(function (request, sender) {
  // Handle active mode toggle
  if (request.action === 'toggleActiveMode') {
    if (request.enabled) {
      startActiveMode(request.interval || 5);
    } else {
      stopActiveMode();
    }
    return;
  }
  
  chrome.storage.sync.get(
    {
      MMAuthToken: '',
      MMUserId: '',
      MMAccessToken: '',
      userStatus: 'dnd',
      userStatusText: "I'm on a meet",
      userEmoji: 'calendar',
      showMeetingTitle: false,
      statusDuration: 0
    },
    function ({MMAuthToken, MMUserId, MMAccessToken, userStatus, userStatusText, userEmoji, showMeetingTitle, statusDuration}) {
      const token = MMAccessToken || MMAuthToken;
      if (!token) {
        return;
      }
      if (!MMUserId) {
        return;
      }
      const emoji = userEmoji || 'calendar';
      if (request.state === 'googleMeetStarted') {
        const tabId = sender.tab.id;
        updateUserCustomStatus(MMUserId, userStatusText || "I'm on a meet", emoji, token, statusDuration || 0).then(result => {
          if (result.error) {
          } else {
            updateUserStatus(MMUserId, userStatus, token).then(result => {
              if (result.error) {
              }
            });
          }
        });
        if (showMeetingTitle) {
          if (titleUpdateListeners[tabId]) {
            chrome.tabs.onUpdated.removeListener(titleUpdateListeners[tabId]);
          }
          const titleUpdateListener = function(updatedTabId, changeInfo) {
            if (updatedTabId !== tabId || !changeInfo.title) {
              return;
            }
            const meetingTitle = getMeetingTitle(changeInfo.title);
            if (!meetingTitle) {
              return;
            }
            if (isMeetingCodeInMeetingTitle(meetingTitle)) {
              return;
            }
            const newStatusText = `${userStatusText || "I'm on a meet"} (${meetingTitle})`;
            updateUserCustomStatus(MMUserId, newStatusText, emoji, token, statusDuration || 0).then(result => {
              if (result.error) {
              } else {
                if (titleUpdateListeners[tabId]) {
                  chrome.tabs.onUpdated.removeListener(titleUpdateListeners[tabId]);
                  delete titleUpdateListeners[tabId];
                }
              }
            });
          };
          titleUpdateListeners[tabId] = titleUpdateListener;
          chrome.tabs.onUpdated.addListener(titleUpdateListener);
        }
      }
      if (request.state === 'googleMeetFinished') {
        const tabId = sender.tab.id;
        if (titleUpdateListeners[tabId]) {
          chrome.tabs.onUpdated.removeListener(titleUpdateListeners[tabId]);
          delete titleUpdateListeners[tabId];
        }
        chrome.tabs.query({url: "https://meet.google.com/*-*-*"}, function (tabs) {
          if (tabs.length > 1) {
            return;
          }
          updateUserStatus(MMUserId, 'online', token).then(result => {
            if (result.error) {
            } else {
              clearUserCustomStatus(token).then(result => {
                if (result.error) {
                }
              });
            }
          });
        });
      }
    }
  );
});
