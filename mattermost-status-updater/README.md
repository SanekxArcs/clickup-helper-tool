# twnty Mattermost Status Updater

A Chrome browser extension that automatically updates your Mattermost status when you join or leave Google Meet sessions. This extension is specifically configured for twnty's Mattermost instance at `chat.twntydigital.de`.

## Overview

This extension seamlessly integrates with Google Meet and Mattermost to provide automatic status management. When you join a Google Meet, your Mattermost status is automatically updated to indicate you're in a meeting. When you leave the meeting, your status returns to online and the custom status is cleared.

## Features

### Core Functionality
- **Automatic Status Detection**: Detects when Google Meet sessions start and end
- **Real-time Status Updates**: Instantly updates your Mattermost status via API calls
- **Smart Meeting Detection**: Only triggers on actual Google Meet rooms (URLs matching `https://meet.google.com/*-*-*`)
- **Multiple Tab Support**: Intelligently handles multiple Google Meet tabs - only clears status when all meetings are closed

### Customizable Options
- **Custom Status Messages**: Set your own "in meeting" status text (default: "I'm on a meet")
- **Status Types**: Choose from Online, Away, Offline, or Do Not Disturb (default: Do Not Disturb)
- **Meeting Title Display**: Optionally include the actual meeting title in your status
- **Smart Title Parsing**: Automatically extracts meeting titles from Google Meet page titles
- **Meeting Code Filtering**: Excludes generic meeting codes from status display

### Authentication Methods
- **Username/Password Login**: Standard Mattermost credentials
- **Personal Access Token**: More secure authentication using Mattermost personal access tokens
- **Persistent Sessions**: Remembers your authentication between browser sessions

## Technical Architecture

### Extension Structure
```
mattermost-status-updater/
├── manifest.json           # Extension configuration and permissions
├── background.js           # Service worker handling API calls
├── options.html           # Configuration UI
├── scripts/
│   ├── content.js         # Injected into Google Meet pages
│   ├── options.js         # Options page functionality
│   └── helpers.js         # Utility functions
└── icons/                 # Extension icons (16px, 48px, 128px)
```

### Key Components

#### Content Script (`content.js`)
- Injected into all Google Meet pages matching the pattern `https://meet.google.com/*-*-*`
- Sends `googleMeetStarted` message when page loads
- Sends `googleMeetFinished` message when page unloads (beforeunload event)

#### Background Service Worker (`background.js`)
- Handles all Mattermost API communications
- Listens for messages from content scripts
- Manages status updates and custom status text
- Implements smart logic for multiple tab scenarios
- Monitors page title changes to extract meeting names

#### Options Page (`options.html` + `options.js`)
- Provides user-friendly configuration interface
- Handles authentication (login/logout)
- Manages user preferences and settings
- Styled with Bootstrap 5 for modern UI

#### Helper Functions (`helpers.js`)
- `authenticateUser()`: Validates stored credentials against Mattermost API
- `getMeetingTitle()`: Extracts meeting title from Google Meet page titles using regex
- `isMeetingCodeInMeetingTitle()`: Identifies and filters out generic meeting codes

## Installation

### Method 1: Developer Mode (Recommended for Development)

1. **Download the Extension**
   ```bash
   git clone https://github.com/your-repo/mattermost-status-updater.git
   cd mattermost-status-updater
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the extension directory

3. **Initial Setup**
   - The extension will automatically open the options page upon installation
   - Configure your Mattermost credentials and preferences

### Method 2: Chrome Web Store
*Note: This extension may not be available on the Chrome Web Store as it's configured for a specific Mattermost instance.*

## Configuration

### Authentication Setup

#### Option 1: Username/Password
1. Open the extension options page
2. Enter your Mattermost email/username and password
3. Click "Log in"

#### Option 2: Personal Access Token (Recommended)
1. In Mattermost, go to Account Settings → Security → Personal Access Tokens
2. Create a new token with appropriate permissions
3. Copy the token to the extension options page
4. Click "Save"

### Status Preferences

#### Basic Settings
- **Status Type**: Choose what status to set during meetings
  - Online ✓
  - Away 🕐
  - Offline ✗
  - Do Not Disturb (default)

- **Status Text**: Custom message displayed during meetings
  - Default: "I'm on a meet"
  - Can include emojis and custom text

#### Advanced Settings
- **Show Meeting Title**: When enabled, includes the actual Google Meet title in your status
  - Example: "I'm on a meet (Weekly Team Standup)"
  - Automatically filters out generic meeting codes (e.g., "abc-defg-hij")

## API Integration

### Mattermost API Endpoints Used

#### User Status Update
```http
PUT https://chat.twntydigital.de/api/v4/users/me/status
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "user_id": "user_id_here",
  "status": "dnd"
}
```

#### Custom Status Update
```http
PUT https://chat.twntydigital.de/api/v4/users/me/status/custom
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "emoji": "calendar",
  "text": "I'm on a meet"
}
```

#### Custom Status Removal
```http
DELETE https://chat.twntydigital.de/api/v4/users/me/status/custom
Authorization: Bearer {access_token}
```

#### User Authentication Verification
```http
GET https://chat.twntydigital.de/api/v4/users/me
Authorization: Bearer {access_token}
```

### Permissions Required

The extension requests the following Chrome permissions:
- `storage`: Store user credentials and preferences
- `scripting`: Inject content scripts into Google Meet pages
- `tabs`: Monitor tab updates and detect meeting titles
- `host_permissions`: Access to `*.twntydigital.de/*` for API calls

## Workflow Logic

### Meeting Start Sequence
1. User navigates to a Google Meet URL
2. Content script detects page load and sends `googleMeetStarted` message
3. Background script receives message and retrieves stored credentials
4. API call updates Mattermost status to configured value (default: "dnd")
5. API call sets custom status with calendar emoji and configured text
6. If "Show Meeting Title" is enabled, listens for title changes to extract meeting name
7. Updates custom status with meeting title if found and valid

### Meeting End Sequence
1. User closes Google Meet tab or navigates away
2. Content script `beforeunload` event sends `googleMeetFinished` message
3. Background script checks for other open Google Meet tabs
4. If no other meetings are active:
   - Resets status to "online"
   - Removes custom status entirely
5. If other meetings are still active, no changes are made

### Title Extraction Logic
The extension uses sophisticated regex patterns to extract meaningful meeting titles:

```javascript
// Extracts title after "Meet – " or "Meet - "
const meetingTitleRegExp = /(?<=Meet(\u00A0|\s)([–\-]) ).*/

// Detects generic meeting codes (abc-defg-hij format)
const googleMeetingCodeRegExp = /[a-zA-Z]{3}-[a-zA-Z]{4}-[a-zA-Z]{3}/
```

## Data Storage

The extension uses Chrome's sync storage to persist:
- `MMAuthToken`: Legacy authentication token
- `MMAccessToken`: Personal access token
- `MMUserId`: Mattermost user ID
- `MMUsername`: Display username
- `userStatus`: Preferred meeting status ("dnd", "away", etc.)
- `userStatusText`: Custom status message
- `showMeetingTitle`: Boolean for title display preference

## Security Considerations

### Data Protection
- All credentials are stored using Chrome's secure sync storage
- API calls use HTTPS encryption
- No sensitive data is logged or transmitted insecurely

### Token Management
- Personal access tokens are recommended over username/password
- Tokens can be revoked from Mattermost at any time
- Extension validates tokens before use

### Permissions
- Extension only requests minimal necessary permissions
- Content scripts are limited to Google Meet domains
- API access is restricted to twnty's Mattermost instance

## Troubleshooting

### Common Issues

#### Status Not Updating
1. Verify Mattermost credentials in options page
2. Check that you're logged into the correct Mattermost instance
3. Ensure the extension has necessary permissions
4. Try refreshing the Google Meet page

#### Meeting Title Not Showing
1. Enable "Show Meeting Title" in options
2. Verify the meeting has a custom title (not just a meeting code)
3. Allow time for the title to load after joining the meeting

#### Authentication Errors
1. Try logging out and back in
2. Generate a new personal access token
3. Verify the token has appropriate permissions in Mattermost

### Debug Information
Enable Chrome Developer Tools and check the console for error messages:
1. Right-click on the extension icon → "Inspect popup"
2. Go to `chrome://extensions/` → "Details" → "Inspect views: background page"

## Development

### Local Development Setup
1. Clone the repository
2. Make your changes
3. Load the extension in Chrome developer mode
4. Test with Google Meet sessions

### Code Style
- Modern ES6+ JavaScript with modules
- Bootstrap 5 for UI components
- Chrome Manifest V3 compliance
- Comprehensive error handling

### Testing
- Test with multiple Google Meet tabs
- Verify status updates in Mattermost
- Test authentication methods
- Validate meeting title extraction

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request with detailed description

### Development Guidelines
- Follow existing code style and patterns
- Add comments for complex logic
- Test all authentication methods
- Verify Chrome extension best practices

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

- Mattermost team for providing comprehensive API documentation
- twnty Digital for the Mattermost instance and requirements
- Chrome Extensions team for excellent developer documentation
- Bootstrap team for the UI framework
- Special thanks to the open-source community for their contributions and support.