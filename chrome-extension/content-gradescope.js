// Gradescope Assignment Submission Detector
console.log('Overdue Sync: Gradescope content script loaded');

// Track if we've already processed a submission to avoid duplicates
let submissionProcessed = false;

// Function to detect submission success
function detectSubmissionSuccess() {
  // Gradescope shows various confirmation messages
  const confirmationSelectors = [
    '.alert-success:contains("submitted")',
    '.alert-success:contains("Submission successful")',
    '[class*="submission"][class*="success"]',
    'div:contains("Your submission has been received")',
    'div:contains("successfully submitted")'
  ];

  // Check if any confirmation element exists
  for (const selector of confirmationSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (element.textContent.toLowerCase().includes('submit') &&
          element.textContent.toLowerCase().includes('success')) {
        return true;
      }
    }
  }

  // Check for submission status badge
  const statusBadges = document.querySelectorAll('.submissionStatus, [class*="submission-status"]');
  for (const badge of statusBadges) {
    if (badge.textContent.toLowerCase().includes('submitted') ||
        badge.textContent.toLowerCase().includes('graded')) {
      return true;
    }
  }

  // Check URL patterns
  if (window.location.href.includes('/submissions/') &&
      document.querySelector('.alert-success, [class*="success"]')) {
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

  console.log('Overdue Sync: Gradescope submission detected! Triggering sync...');
  submissionProcessed = true;

  // Send message to background script
  chrome.runtime.sendMessage({
    type: 'GRADESCOPE_SUBMISSION_DETECTED',
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  // Show visual confirmation to user
  showNotification('Syncing Gradescope assignment...', 'success');
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
    'button:contains("Submit"),' +
    'input[type="submit"],' +
    'button[type="submit"],' +
    '[class*="submit"][class*="button"]'
  );

  submitButtons.forEach(button => {
    if (button.textContent.toLowerCase().includes('submit') ||
        button.value?.toLowerCase().includes('submit')) {
      button.addEventListener('click', () => {
        console.log('Overdue Sync: Submit button clicked');
        // Wait a bit for the submission to process
        setTimeout(() => {
          if (detectSubmissionSuccess()) {
            triggerSync();
          }
        }, 2000);
      });
    }
  });
}

// Monitor for URL changes and DOM updates
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

  // Check for submission success messages that appear dynamically
  if (!submissionProcessed && detectSubmissionSuccess()) {
    setTimeout(triggerSync, 500);
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
