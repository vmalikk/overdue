// Moodle Assignment Submission Detector
console.log('Overdue Sync: Moodle content script loaded');

// Track if we've already processed a submission to avoid duplicates
let submissionProcessed = false;

// Function to detect submission success
function detectSubmissionSuccess() {
  // Moodle shows confirmation messages after successful submission
  const confirmationSelectors = [
    '.submissionstatussubmitted',
    '.statusdisplay.submitted',
    '[class*="submission-status"][class*="submitted"]',
    'div:contains("Submitted for grading")',
    'div:contains("Assignment submitted")',
    '.alert-success:contains("submitted")'
  ];

  // Check if any confirmation element exists
  for (const selector of confirmationSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.toLowerCase().includes('submit')) {
      return true;
    }
  }

  // Check URL for submission confirmation
  if (window.location.href.includes('submissionconfirmation') ||
      window.location.search.includes('submitted=1')) {
    return true;
  }

  return false;
}

// Function to trigger sync
async function triggerSync() {
  if (submissionProcessed) {
    console.log('Overdue Sync: Submission already processed, skipping');
    return;
  }

  console.log('Overdue Sync: Moodle submission detected! Triggering sync...');
  submissionProcessed = true;

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'MOODLE_SUBMISSION_DETECTED',
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  // Show visual confirmation to user
  showNotification('Syncing Moodle assignment...', 'success');
}

// Function to show notification on page
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remove after 4 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(400px)';
    notification.style.transition = 'all 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Listen for submit button clicks
function attachSubmitListeners() {
  const submitButtons = document.querySelectorAll(
    'input[type="submit"][name="submitbutton"],' +
    'button[name="submitbutton"],' +
    'input[value*="Submit assignment"],' +
    'button:contains("Submit assignment")'
  );

  submitButtons.forEach(button => {
    button.addEventListener('click', () => {
      console.log('Overdue Sync: Submit button clicked');
      // Wait a bit for the submission to process
      setTimeout(() => {
        if (detectSubmissionSuccess()) {
          triggerSync();
        }
      }, 2000);
    });
  });
}

// Monitor for URL changes (SPAs)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (lastUrl !== window.location.href) {
    lastUrl = window.location.href;
    submissionProcessed = false; // Reset for new page

    // Check if we're on a submission confirmation page
    if (detectSubmissionSuccess()) {
      setTimeout(triggerSync, 1000);
    }
  }
});

// Start monitoring
urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial setup
attachSubmitListeners();

// Check on page load if we're already on a confirmation page
if (detectSubmissionSuccess()) {
  setTimeout(triggerSync, 1000);
}

// Re-attach listeners when DOM changes (for dynamic content)
const domObserver = new MutationObserver(() => {
  attachSubmitListeners();
});

domObserver.observe(document.body, {
  childList: true,
  subtree: true
});
