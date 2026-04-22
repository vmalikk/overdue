// Background Service Worker for Overdue Sync Extension
console.log('Overdue Sync: Background service worker initialized');

// Configuration
const DEFAULT_APP_URL = 'https://overdue.vercel.app'; // Update this to your actual deployed URL

// Get app URL from storage or use default
async function getAppUrl() {
  const result = await chrome.storage.sync.get(['appUrl']);
  return result.appUrl || DEFAULT_APP_URL;
}

// Trigger Moodle sync
async function triggerMoodleSync() {
  try {
    const appUrl = await getAppUrl();
    console.log('Overdue Sync: Triggering Moodle sync...');

    const response = await fetch(`${appUrl}/api/moodle/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Overdue Sync: Moodle sync successful', data);

      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Moodle Sync Complete',
        message: `Updated ${data.updated || 0} assignments, created ${data.created || 0} new`,
        priority: 2
      });

      return { success: true, data };
    } else {
      console.error('Overdue Sync: Moodle sync failed', response.status);

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Moodle Sync Failed',
        message: 'Could not sync. Make sure you\'re logged into Overdue.',
        priority: 2
      });

      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error('Overdue Sync: Moodle sync error', error);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Moodle Sync Error',
      message: error.message || 'An error occurred during sync',
      priority: 2
    });

    return { success: false, error: error.message };
  }
}

// Trigger Gradescope sync
async function triggerGradescopeSync() {
  try {
    const appUrl = await getAppUrl();
    console.log('Overdue Sync: Triggering Gradescope sync...');

    const response = await fetch(`${appUrl}/api/gradescope/sync`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Overdue Sync: Gradescope sync successful', data);

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Gradescope Sync Complete',
        message: `Updated ${data.updated || 0} assignments, created ${data.created || 0} new`,
        priority: 2
      });

      return { success: true, data };
    } else {
      console.error('Overdue Sync: Gradescope sync failed', response.status);

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Gradescope Sync Failed',
        message: 'Could not sync. Make sure you\'re logged into Overdue.',
        priority: 2
      });

      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.error('Overdue Sync: Gradescope sync error', error);

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Gradescope Sync Error',
      message: error.message || 'An error occurred during sync',
      priority: 2
    });

    return { success: false, error: error.message };
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Overdue Sync: Received message', message);

  if (message.type === 'MOODLE_SUBMISSION_DETECTED') {
    // Trigger Moodle sync
    triggerMoodleSync().then(result => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GRADESCOPE_SUBMISSION_DETECTED') {
    // Trigger Gradescope sync
    triggerGradescopeSync().then(result => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'MANUAL_SYNC') {
    // Manual sync from popup
    const platform = message.platform;
    if (platform === 'moodle') {
      triggerMoodleSync().then(result => {
        sendResponse(result);
      });
    } else if (platform === 'gradescope') {
      triggerGradescopeSync().then(result => {
        sendResponse(result);
      });
    } else if (platform === 'both') {
      Promise.all([
        triggerMoodleSync(),
        triggerGradescopeSync()
      ]).then(results => {
        sendResponse({
          success: true,
          moodle: results[0],
          gradescope: results[1]
        });
      });
    }
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_APP_URL') {
    getAppUrl().then(url => {
      sendResponse({ appUrl: url });
    });
    return true;
  }

  if (message.type === 'SET_APP_URL') {
    chrome.storage.sync.set({ appUrl: message.appUrl }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Extension installed/updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Overdue Sync: Extension installed');

    // Show welcome notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Overdue Sync Installed',
      message: 'Extension will now detect Moodle & Gradescope submissions automatically!',
      priority: 2
    });
  } else if (details.reason === 'update') {
    console.log('Overdue Sync: Extension updated');
  }
});
