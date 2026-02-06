// Popup UI Logic
const messageEl = document.getElementById('message');
const syncMoodleBtn = document.getElementById('syncMoodle');
const syncGradescopeBtn = document.getElementById('syncGradescope');
const syncBothBtn = document.getElementById('syncBoth');
const appUrlInput = document.getElementById('appUrl');
const saveSettingsBtn = document.getElementById('saveSettings');

// Show message
function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 4000);
}

// Set button loading state
function setButtonLoading(button, loading) {
  if (loading) {
    button.disabled = true;
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.innerHTML = '';
    button.appendChild(spinner);
    button.appendChild(document.createTextNode(' Syncing...'));
  } else {
    button.disabled = false;
  }
}

// Trigger sync
async function triggerSync(platform) {
  const button = platform === 'moodle' ? syncMoodleBtn :
                 platform === 'gradescope' ? syncGradescopeBtn :
                 syncBothBtn;

  const originalHTML = button.innerHTML;
  setButtonLoading(button, true);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MANUAL_SYNC',
      platform: platform
    });

    if (response && response.success) {
      if (platform === 'both') {
        const moodleSuccess = response.moodle?.success ? '✓' : '✗';
        const gradescopeSuccess = response.gradescope?.success ? '✓' : '✗';
        showMessage(`Sync complete! Moodle ${moodleSuccess} | Gradescope ${gradescopeSuccess}`, 'success');
      } else {
        const updated = response.data?.updated || 0;
        const created = response.data?.created || 0;
        showMessage(`Synced! Updated ${updated}, created ${created}`, 'success');
      }
    } else {
      showMessage('Sync failed. Make sure you\'re logged into Overdue.', 'error');
    }
  } catch (error) {
    console.error('Sync error:', error);
    showMessage('Error: ' + error.message, 'error');
  } finally {
    button.innerHTML = originalHTML;
    button.disabled = false;
  }
}

// Load settings
async function loadSettings() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_APP_URL' });
  if (response && response.appUrl) {
    appUrlInput.value = response.appUrl;
  }
}

// Save settings
async function saveSettings() {
  const appUrl = appUrlInput.value.trim();

  if (!appUrl) {
    showMessage('Please enter an app URL', 'error');
    return;
  }

  // Validate URL format
  try {
    new URL(appUrl);
  } catch {
    showMessage('Invalid URL format', 'error');
    return;
  }

  const originalText = saveSettingsBtn.textContent;
  saveSettingsBtn.textContent = 'Saving...';
  saveSettingsBtn.disabled = true;

  try {
    await chrome.runtime.sendMessage({
      type: 'SET_APP_URL',
      appUrl: appUrl
    });

    showMessage('Settings saved!', 'success');
  } catch (error) {
    showMessage('Failed to save settings', 'error');
  } finally {
    saveSettingsBtn.textContent = originalText;
    saveSettingsBtn.disabled = false;
  }
}

// Event listeners
syncMoodleBtn.addEventListener('click', () => triggerSync('moodle'));
syncGradescopeBtn.addEventListener('click', () => triggerSync('gradescope'));
syncBothBtn.addEventListener('click', () => triggerSync('both'));
saveSettingsBtn.addEventListener('click', saveSettings);

// Initialize
loadSettings();
