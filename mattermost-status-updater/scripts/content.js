
chrome.runtime.sendMessage({
  state: 'googleMeetStarted',
});

window.addEventListener('beforeunload', function (e) {
  chrome.runtime.sendMessage({
    state: 'googleMeetFinished',
  });
});

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    console.log('Meet tab is now visible');
  } else {
    console.log('Meet tab is now hidden');
  }
});
