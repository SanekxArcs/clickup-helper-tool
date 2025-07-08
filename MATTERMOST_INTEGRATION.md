# Mattermost Integration

This extension now includes full Mattermost status management functionality, integrated from the separate mattermost-status-updater plugin.

## Features

### 🔐 Authentication
- **Password Authentication**: Sign in with your email/username and password
- **Personal Access Token**: Use a personal access token for enhanced security
- **Persistent Sessions**: Stay logged in across browser sessions

### 📊 Status Management
- **Quick Status Updates**: Instantly switch between Online, Away, Do Not Disturb, and Offline
- **Custom Status Messages**: Set personalized status text with emoji support
- **Bulk Operations**: Update both status and custom message simultaneously

### 🎯 Google Meet Integration
- **Auto-Status Updates**: Automatically set your status to "Do Not Disturb" when joining Google Meet
- **Meeting Detection**: Smart detection of active Google Meet sessions
- **Custom Meeting Status**: Configure specific status, emoji, and text for meetings
- **Meeting Title Integration**: Optionally include meeting titles in your status

### ⚙️ Configuration Options
- **Flexible Settings**: Customize all aspects of status updates
- **Google Meet Toggle**: Enable/disable automatic meeting status updates
- **Status Preferences**: Choose your preferred meeting status (DND, Away, Online)
- **Message Templates**: Set default messages for different scenarios

## Setup Instructions

### 1. Open the Mattermost Tab
Click on the "Mattermost" tab in the ClickUp Helper extension popup.

### 2. Authentication
Choose one of the authentication methods:

#### Option A: Password Authentication
1. Enter your email or username
2. Enter your password
3. Click "Sign In"

#### Option B: Personal Access Token
1. Generate a personal access token in your Mattermost account:
   - Go to **Account Settings** → **Security** → **Personal Access Tokens**
   - Click **Create New Token**
   - Give it a description and appropriate permissions
   - Copy the generated token
2. Paste the token in the "Personal Access Token" field
3. Click "Connect with Token"

### 3. Configure Settings
1. **Custom Status**:
   - Set your preferred emoji (e.g., "calendar", "coffee", "meeting")
   - Set your default status text
2. **Google Meet Integration**:
   - Toggle on "Auto-update status during meetings"
   - Choose your meeting status (recommended: "Do Not Disturb")
   - Set meeting emoji and status text
   - Optionally enable "Show meeting title in status"
3. Click "Save All Settings"

## Google Meet Integration

### How It Works
When you join a Google Meet session, the extension:
1. Detects you've entered a meeting room
2. Automatically updates your Mattermost status to your configured meeting status
3. Sets a custom status message with your chosen emoji and text
4. Optionally includes the meeting title in your status

When you leave the meeting:
1. Automatically resets your status to "Online"
2. Clears the custom status message

### Meeting Detection
The extension uses multiple methods to detect active meetings:
- Camera/microphone control buttons
- Meeting controls interface
- End call button presence
- URL pattern matching
- Meeting container elements

### Customization
You can customize:
- **Meeting Status**: Online, Away, Do Not Disturb, or Offline
- **Meeting Emoji**: Any emoji name (e.g., calendar, video_camera, meeting)
- **Status Text**: Custom message for meetings
- **Title Display**: Whether to show meeting titles in your status

## Usage Tips

### Quick Status Updates
Use the colored status buttons for instant status changes:
- 🟢 **Online**: Available and active
- 🟡 **Away**: Temporarily away from desk
- 🔴 **Do Not Disturb**: Focus mode, avoid interruptions
- ⚫ **Offline**: Not available

### Custom Status Best Practices
- Keep status text concise and professional
- Use standard emoji names for better compatibility
- Update your status to reflect your current activity
- Clear outdated custom statuses regularly

### Troubleshooting
- **Connection Issues**: Use the "Test Connection" button to verify your authentication
- **Meeting Detection**: Ensure you're on a Google Meet URL with the pattern `https://meet.google.com/xxx-xxxx-xxx`
- **Status Not Updating**: Check that Google Meet integration is enabled in settings
- **Authentication Errors**: Try logging out and logging back in
- **400 Status Error**: If you see "Invalid or missing user_id" errors, this indicates an API endpoint issue that should be resolved with the latest updates

### Common Issues and Solutions
- **Status Update Failures**: The extension uses the `/users/me/status` endpoint with proper `user_id` in the request body
- **Custom Status Issues**: Custom status updates use the `/users/me/status/custom` endpoint without user_id in the body
- **Token Authentication**: Personal access tokens are recommended for better security and reliability

## Security Notes
- Personal access tokens are more secure than passwords
- Tokens are stored locally in your browser's extension storage
- No credentials are sent to external servers except Mattermost
- You can revoke tokens anytime from your Mattermost account settings

## Integration with ClickUp Helper
The Mattermost functionality is fully integrated into the ClickUp Helper extension:
- Shared storage for settings and authentication
- Consistent UI design and user experience
- Combined context menus and keyboard shortcuts
- Unified notification system

## Technical Details
- **API Version**: Mattermost API v4
- **Server**: Configured for `chat.twntydigital.de`
- **Permissions**: Requires `storage`, `tabs`, and host permissions for `*.twntydigital.de` and `meet.google.com`
- **Content Scripts**: Automatically injected on Google Meet pages for meeting detection
