# Overdue Sync Chrome Extension

Automatically detects when you submit assignments on Moodle or Gradescope and instantly syncs them to your Overdue tracker.

## Features

- 🔄 **Auto-Sync on Submission**: Automatically triggers sync when you submit an assignment
- ⚡ **Instant Detection**: Detects Moodle and Gradescope submissions in real-time
- 🎯 **Manual Sync**: Sync anytime with one click from the extension popup
- 🔔 **Desktop Notifications**: Get notified when syncs complete
- 🎨 **Clean UI**: Simple, modern popup interface

## Installation

### Step 1: Create Extension Icons

Before installing, you need to create three icon files in the `chrome-extension/icons/` folder:

```bash
cd chrome-extension
mkdir icons
```

Create three PNG icons:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Quick Tip**: You can use any image editor or online tool to create a simple colored square with the letter "O" for Overdue. All three can be the same image at different sizes.

### Step 2: Load Extension in Chrome

1. Open Google Chrome
2. Go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `chrome-extension` folder from your project
6. The extension should now appear in your extensions list!

### Step 3: Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "Overdue Assignment Sync"
3. Click the pin icon to keep it visible

## Configuration

### Set Your App URL

1. Click the extension icon
2. Scroll to Settings
3. Enter your Overdue app URL (e.g., `https://overdue.vercel.app`)
4. Click "Save Settings"

**Important**: Make sure you're logged into your Overdue app in the same browser!

## Usage

### Automatic Sync

The extension automatically detects submissions:

1. **Moodle**: When you click "Submit assignment" and the submission confirms
2. **Gradescope**: When you submit and see the success message

You'll see a notification on the page and a Chrome desktop notification when sync completes.

### Manual Sync

Click the extension icon and choose:
- **Sync Moodle Now**: Sync only Moodle assignments
- **Sync Gradescope Now**: Sync only Gradescope assignments
- **Sync Both**: Sync both platforms at once

## How It Works

1. **Content Scripts**: Run on Moodle and Gradescope pages to detect submit button clicks
2. **Detection**: Monitors for submission confirmation messages and URL changes
3. **Background Worker**: Receives messages and triggers your Overdue API
4. **Sync**: Calls `/api/moodle/sync` or `/api/gradescope/sync` on your app
5. **Notification**: Shows success/error notifications

## Troubleshooting

### Sync not working?

**Check these:**
1. ✅ You're logged into Overdue in the same browser
2. ✅ Extension has correct App URL in settings
3. ✅ You've connected Moodle/Gradescope in Overdue settings
4. ✅ Extension is enabled in `chrome://extensions/`

### Not detecting submissions?

**Try:**
1. Refresh the Moodle/Gradescope page
2. Check browser console (F12) for errors
3. Disable and re-enable the extension
4. Manually sync from extension popup to test connection

### Notifications not showing?

**Allow notifications:**
1. Go to `chrome://settings/content/notifications`
2. Make sure Chrome can show notifications
3. Check that the extension has notification permission

## Development

### Files

```
chrome-extension/
├── manifest.json           # Extension configuration
├── background.js          # Service worker (handles syncing)
├── content-moodle.js      # Moodle page script
├── content-gradescope.js  # Gradescope page script
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

### Updating the Extension

After making changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the Overdue Sync card
3. Reload any open Moodle/Gradescope tabs

### Testing

1. **Moodle Test**: Go to any Moodle assignment, click submit
2. **Gradescope Test**: Submit any Gradescope assignment
3. **Manual Test**: Click extension icon → "Sync Both"

Check the browser console (F12) for logs starting with "Overdue Sync:".

## Privacy

This extension:
- ✅ Only runs on Moodle and Gradescope websites
- ✅ Only syncs when you explicitly submit assignments
- ✅ Stores your Overdue app URL locally
- ✅ Uses your existing Overdue login cookies
- ❌ Does NOT collect or transmit any personal data
- ❌ Does NOT track your browsing

## Support

Having issues? Check:
1. Main Overdue app settings - ensure Moodle/Gradescope are connected
2. Browser console for error messages
3. Extension popup for sync errors

## License

Part of the Overdue assignment tracker project.
