# Gradescope Integration Setup Guide

This guide explains how to set up the Gradescope assignment syncing feature for Overdue.

## Overview

The Gradescope integration allows users to:
- Connect their Gradescope account to automatically import assignments
- Sync assignments daily via GitHub Actions
- Resolve conflicts when Gradescope assignments match existing manual entries

## Prerequisites

1. Appwrite Cloud account with the Overdue project configured
2. GitHub repository for running the sync workflow
3. Vercel deployment (or similar) for the Next.js frontend

### Important Note for SSO Users
Users who log in to Gradescope via **School Credentials** (Canvas/Blackboard/SSO) must set a direct password on their Gradescope account to use this integration:
1. Go to [Reset Password](https://www.gradescope.com/reset_password).
2. Enter the school email address associated with the account.
3. Follow the email instructions to set a password.
4. Use this password to connect in the app (SSO login will still work for the website).

## Setup Steps

### 1. Generate Encryption Key

Generate a 32-byte encryption key for securing Gradescope session tokens:

```bash
openssl rand -base64 32
```

Save this key - you'll need it for both local development and GitHub Actions.

### 2. Appwrite Database Schema

#### Update `assignment` Collection

Add the following attributes to your existing `assignment` collection in Appwrite Console:

| Attribute | Type | Size | Required | Default |
|-----------|------|------|----------|---------|
| `source` | String | 255 | No | `manual` |
| `gradescopeId` | String | 255 | No | - |
| `gradescopeCourseId` | String | 255 | No | - |
| `gradescopeCourseName` | String | 255 | No | - |

#### Update `courses` Collection

Add the following attributes to your `courses` collection to support grade storage:

| Attribute | Type | Size | Required | Description |
|-----------|------|------|----------|-------------|
| `gradedItems` | String | 100000 | No | Stores JSON array of graded items |
| `gradeWeights` | String | 5000 | No | Stores JSON array of grade categories |

#### Create `conflicts` Collection

Create a new collection named `conflicts` with these attributes:

| Attribute | Type | Required | Default |
|-----------|------|----------|---------|
| `userId` | String | Yes | - |
| `manualAssignmentId` | String | Yes | - |
| `gradescopeTitle` | String | Yes | - |
| `gradescopeDeadline` | DateTime | Yes | - |
| `gradescopeCourseId` | String | Yes | - |
| `gradescopeCourseName` | String | Yes | - |
| `gradescopeData` | String | Yes | - |
| `resolved` | Boolean | Yes | `false` |
| `resolution` | String | No | - |
| `resolvedAt` | DateTime | No | - |

**Indexes:**
- `userId` (Key)
- `resolved` (Key)

**Permissions:**
Set document-level permissions in your collection settings.

### 3. Appwrite API Key

Create an API key in Appwrite Console with these scopes:
- `users.read`
- `users.write`
- `databases.read`
- `databases.write`

### 4. Environment Variables

#### Local Development (`.env.local`)

```bash
# Gradescope Integration
GRADESCOPE_ENCRYPTION_KEY=your-base64-encoded-32-byte-key

# Appwrite Admin (for API routes)
APPWRITE_API_KEY=your-appwrite-api-key
```

#### Vercel Environment Variables

Add these variables in your Vercel project settings:
- `GRADESCOPE_ENCRYPTION_KEY`
- `APPWRITE_API_KEY`

#### GitHub Repository Secrets

Add these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Value |
|-------------|-------|
| `APPWRITE_ENDPOINT` | `https://nyc.cloud.appwrite.io/v1` |
| `APPWRITE_PROJECT_ID` | `6971c59b000e2766561b` |
| `APPWRITE_API_KEY` | Your Appwrite API key |
| `GRADESCOPE_ENCRYPTION_KEY` | Your encryption key |

### 5. Deploy Changes

1. Push the code changes to your repository
2. Vercel will automatically deploy the frontend updates
3. The GitHub Actions workflow will start running daily at 3:00 AM EST

## Usage

### Connecting to Gradescope

1. Log in to Overdue
2. Go to Settings > Gradescope tab
3. Enter your Gradescope email and password
4. Click "Connect to Gradescope"

Your credentials are used once to obtain a session token, then discarded. Only the encrypted session token is stored.

### Syncing Assignments

Assignments sync automatically every day at 3:00 AM EST. The sync process:

1. Fetches all connected users
2. For each user, logs into Gradescope with their session token
3. Fetches courses and assignments
4. For each assignment:
   - If it matches an existing Gradescope ID: updates the deadline if changed
   - If it matches a similar manual assignment: creates a conflict
   - Otherwise: creates a new assignment

### Resolving Conflicts

When the sync finds potential duplicates:

1. A banner appears in the Gradescope settings section
2. Click "Resolve Conflicts" to view them
3. For each conflict, choose:
   - **Keep Mine**: Ignore the Gradescope version
   - **Use Gradescope**: Update your assignment with Gradescope data
   - **Keep Both**: Create a separate entry for the Gradescope assignment

### Disconnecting

1. Go to Settings > Gradescope tab
2. Click "Disconnect"
3. Your session token is removed, but synced assignments remain

## Troubleshooting

### "Session expired" message

Gradescope sessions typically last 30 days. If your session expires:
1. Go to Settings > Gradescope
2. Enter your credentials again
3. Click "Connect"

### SSO / School Credentials Users

This integration requires a password to generate a session token. If users normally log in via SSO (School Credentials):
1. They should go to Gradescope's "Forgot Password" page.
2. Enter their school email address.
3. Follow the email instructions to set a password.
4. They can now use this password to connect their account while still maintaining SSO access.

### Sync not running

Check the GitHub Actions tab in your repository:
1. Verify the workflow is enabled
2. Check for any errors in the run logs
3. Ensure all secrets are correctly configured

### Assignments not syncing

The sync requires:
- A valid Gradescope session
- Assignments with due dates
- The Gradescope API to be accessible

Check the sync logs in GitHub Actions for specific errors.

## Security Notes

1. **Passwords are never stored** - Only used once to obtain a session token
2. **Session tokens are encrypted** - Using AES-256-GCM encryption
3. **Encryption key is secret** - Stored only in environment variables
4. **User isolation** - Each user can only access their own data
5. **HTTPS only** - All communication uses TLS

## Technical Details

### Architecture

```
User Browser
     │
     ▼
Next.js Frontend (Vercel)
     │
     ├──► /api/gradescope/connect ──► Gradescope Login ──► Encrypted Token ──► Appwrite User Prefs
     │
     └──► /api/gradescope/status ──► Appwrite User Prefs

GitHub Actions (Daily)
     │
     ▼
Python Sync Script
     │
     ├──► Appwrite Users API ──► Get connected users
     │
     ├──► Gradescope API ──► Fetch assignments
     │
     └──► Appwrite Database ──► Create/Update assignments & conflicts
```

### Files

| File | Purpose |
|------|---------|
| `src/app/api/gradescope/connect/route.ts` | Connect endpoint |
| `src/app/api/gradescope/disconnect/route.ts` | Disconnect endpoint |
| `src/app/api/gradescope/status/route.ts` | Status check endpoint |
| `src/components/pages/GradescopeSyncSection.tsx` | Settings UI |
| `src/app/conflicts/page.tsx` | Conflict resolution page |
| `src/store/gradescopeStore.ts` | Client-side state |
| `src/lib/gradescope/encryption.ts` | Token encryption |
| `src/lib/appwrite/conflicts.ts` | Conflicts CRUD |
| `scripts/sync_gradescope.py` | Python sync script |
| `.github/workflows/sync-gradescope.yml` | GitHub Actions workflow |

## Limitations

1. **Gradescope API**: Gradescope doesn't have an official public API. The integration uses web endpoints that may change.
2. **Session duration**: Sessions expire after ~30 days, requiring reconnection.
3. **Course mapping**: Gradescope courses don't automatically map to your Overdue courses.
4. **Manual sync**: Currently no manual sync trigger (runs daily only).
