import {getMeetingTitle, isMeetingCodeInMeetingTitle, updateUserStatus, updateUserCustomStatus, clearUserCustomStatus} from "./scripts/helpers.js";

const titleUpdateListeners = {};

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      userStatus: "dnd",
      userStatusText: "I'm on a meet",
      userEmoji: "calendar",
      showMeetingTitle: false
    });
  }
  chrome.tabs.create({
    url: chrome.runtime.getURL('options.html'),
  })
})

chrome.runtime.onMessage.addListener(function (request, sender) {
  chrome.storage.sync.get(
    {
      MMAuthToken: '',
      MMUserId: '',
      MMAccessToken: '',
      userStatus: 'dnd',
      userStatusText: "I'm on a meet",
      userEmoji: 'calendar',
      showMeetingTitle: false
    },
    function ({MMAuthToken, MMUserId, MMAccessToken, userStatus, userStatusText, userEmoji, showMeetingTitle}) {
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
        updateUserCustomStatus(MMUserId, userStatusText || "I'm on a meet", emoji, token).then(result => {
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
            updateUserCustomStatus(MMUserId, newStatusText, emoji, token).then(result => {
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
