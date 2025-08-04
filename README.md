# 🚀 ClickUp Helper Tool

A comprehensive Chrome extension that streamlines development workflows with AI-powered generation, Mattermost integration, and advanced project management tools. Features intelligent auto-search, Google Meet integration, and seamless ClickUp/GitLab workflow automation.

## ✨ Key Features

### 🎯 **AI-Powered Generation**
- **Branch Names**: Automatically generates meaningful branch names following best practices
- **Commit Messages**: Creates clear, descriptive commit messages using conventional commit format
- **Time Estimation**: AI-powered task time estimation for Junior/Mid/Senior developers
- **Custom Rules**: Define your own naming conventions and message formats
- **Multiple AI Models**: Support for Gemini 2.0 Flash, 1.5 Flash, and 1.5 Pro
- **Priority-Based Prefixes**: Automatic hotfix/ prefix for urgent tasks, feature/ for normal tasks
- **Individual Regeneration**: Regenerate only branch names or commit messages separately
- **Smart Variations**: Each regeneration creates fresh content while maintaining consistency

### 💬 **Mattermost Integration**
- **Quick Status Updates**: One-click status changes (Online, Away, DND, Offline)
- **Custom Status Presets**: Create and manage multiple custom status presets with emoji, title, duration, and availability
- **Google Meet Auto-Status**: Automatically set "Do Not Disturb" status during Google Meet sessions
- **Meeting History**: Track all Google Meet sessions with duration, participants, and room details
- **Authentication Options**: Support for both password and personal access token authentication
- **Persistent Sessions**: Stay logged in across browser sessions
- **Status Management**: Update your Mattermost status directly from the extension
- **Meeting Detection**: Smart detection of active Google Meet sessions with automatic status updates

### 🎥 **Google Meet Integration**
- **Automatic Status Updates**: Sets Mattermost status to DND when joining meetings
- **Meeting History Tracking**: Records all meeting sessions with detailed metadata
- **Duplicate Prevention**: Advanced safeguards to prevent duplicate history entries
- **Meeting Duration Tracking**: Accurate time tracking for all meetings
- **Room Information**: Stores meeting room IDs and participant details
- **History Management**: View, search, and delete individual meeting history entries
- **Cleanup Tools**: Dedicated tools to remove duplicate meeting entries

### 🔍 **Smart Auto-Search & Auto-Fill**
- **ClickUp Integration**: Automatically detects ClickUp task pages and searches history
- **GitLab Integration**: Extracts task IDs from GitLab merge request pages and branch names
- **History-First Approach**: Always searches history first, then falls back to page extraction
- **Auto-Tab Switching**: When task found in history, automatically switches to History tab and highlights the item
- **GitLab URL Tracking**: Automatically stores and updates GitLab merge request URLs in history items
- **Branch Name Synchronization**: Compares and updates branch names from GitLab pages

### 📚 **Advanced History Management**
- **Persistent History** (100 items): Saves all generated branches and commits with full metadata
- **Search & Filter**: Real-time search through history by task ID or title
- **Status Tracking**: 12 different status categories (In Progress, Code Review, Completed, etc.)
- **Edit History**: Full editing modal for modifying saved items
- **GitLab Integration**: Displays GitLab merge request URLs as clickable links
- **Source Tracking**: Links back to original ClickUp/GitLab pages
- **Auto-Search Indicators**: Visual feedback when auto-search is performed
- **Individual Item Deletion**: Delete specific history entries with confirmation
- **Bulk Operations**: Clear all history or export data

### ⚡ **Workflow Automation**
- **Context-Aware Auto-Fill**: Different behavior for ClickUp vs GitLab pages
- **Smart Page Detection**: Only runs auto-search on relevant pages (prevents random page interference)
- **Automatic History Updates**: Updates GitLab URLs and branch names when visiting MR pages
- **Priority Detection**: Automatically detects urgent keywords and sets priority levels
- **Template Integration**: Easy transfer of history data to Templates tab
- **Environment Context Menu**: Right-click context menu for quick environment switching (dev/test/prod)
- **Smart URL Handling**: Preserves paths, queries, and fragments when switching environments

### 🎨 **Modern UI & UX**
- **Modular Tab Architecture**: Separate folders and files for each feature (Generate, History, Templates, Settings, Mattermost)
- **Visual Highlighting**: Blue borders and backgrounds for highlighted history items
- **Toast Notifications**: Success/error feedback for all operations
- **Copy Buttons**: One-click copying for branch names, commit messages, and Git commands
- **Color-Coded Status**: Visual status indicators with customizable colors
- **Smooth Animations**: Highlight fading and smooth scrolling effects
- **Responsive Design**: Clean, modern interface that works across different screen sizes

### 🛠️ **Developer Tools**
- **Git Command Generation**: Ready-to-use git commit commands
- **Markdown Link Creation**: Generate markdown links for task references
- **Branch/Commit History**: Track all generated code across projects
- **Template System**: Save and reuse common patterns
- **Export/Import**: Complete data backup and migration
- **Debug Tools**: Comprehensive error handling and debugging capabilities
- **Cleanup Utilities**: Tools to manage and clean duplicate data

## 🚀 Quick Start

### 1. **Installation**
1. Clone or download this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder

### 2. **Setup**
1. Get a free [Gemini API key](https://makersuite.google.com/app/apikey)
2. Open the extension and go to **Settings** tab
3. Enter your API key
4. Customize your generation rules (optional)
5. Configure Mattermost integration (optional)

### 3. **Usage**

#### **Auto-Search Workflow (Recommended)**
1. **ClickUp**: Navigate to any ClickUp task page (`https://app.clickup.com/t/`)
2. **GitLab**: Navigate to any GitLab merge request page (`/-/merge_requests/`)
3. Open the extension - it will automatically:
   - Search your history for the task
   - If found: Switch to History tab and highlight the matching item
   - If not found: Auto-fill the Generate tab with page data
4. Generate branch names and commit messages as needed

#### **Mattermost Integration**
1. Go to **Mattermost** tab
2. Authenticate with your Mattermost server
3. Use quick status buttons or create custom status presets
4. Enable Google Meet integration for automatic status updates
5. View and manage your meeting history

#### **Manual Workflow**
1. Open the extension on any page
2. Fill in task details manually or click "Auto-fill from Page"
3. Click "Generate" to create branch name and commit message
4. **Use regeneration options:**
   - **🔄 Regenerate** (individual): Click the regenerate button next to branch or commit to regenerate only that component
   - **🔄 Regenerate Both**: Regenerate both branch name and commit message with one click
   - All regenerations maintain the original task data while creating new variations
5. Copy the results with one-click buttons

#### **Environment Switching**
1. Right-click on any web page
2. Select "Go to Dev Environment" from context menu
3. Choose your target environment (localhost, test server, etc.)
4. Page opens in new tab with same path preserved

## 🎯 Mattermost Features

### **Status Management**
- **Quick Status Updates**: One-click buttons for Online, Away, DND, and Offline
- **Custom Status Presets**: Create multiple reusable status presets with:
  - Custom emoji
  - Status title/message
  - Duration (minutes or permanent)
  - Availability status (Online/Away/DND/Offline)
- **Preset Management**: Edit, delete, and organize your custom status presets
- **One-Click Application**: Apply any preset instantly with a single click

### **Google Meet Integration**
- **Automatic Status Updates**: Automatically sets status to DND when joining Google Meet
- **Meeting Detection**: Smart detection of Google Meet sessions
- **Configurable Settings**: Customize meeting status, emoji, and message
- **Status Restoration**: Automatically restores previous status when meeting ends

### **Meeting History**
- **Comprehensive Tracking**: Records all Google Meet sessions with:
  - Meeting duration
  - Room ID and meeting details
  - Start and end times
  - Participant information
- **History Management**: View, search, and delete individual meeting entries
- **Duplicate Prevention**: Advanced safeguards to prevent duplicate entries
- **Cleanup Tools**: Dedicated utilities to remove duplicate meeting history

### **Authentication**
- **Multiple Auth Methods**: Support for password and personal access token authentication
- **Secure Storage**: Credentials stored securely in Chrome's encrypted storage
- **Persistent Sessions**: Stay logged in across browser sessions
- **Connection Testing**: Built-in connection testing and validation

## 🏗️ Environment Context Menu

### **Quick Environment Switching**
- **Right-Click Context Menu**: Access environment switching from any web page
- **Multiple Environments**: Predefined environments for development workflows
  - `localhost:3000` - Local development server
  - `localhost:8080` - Alternative local server
  - `test-server.com` - Testing environment
  - `staging-server.com` - Staging environment

### **Smart URL Handling**
- **Path Preservation**: Maintains the current page path when switching environments
- **Query Parameter Support**: Preserves URL parameters and fragments
- **Protocol Handling**: Automatically handles HTTP/HTTPS protocols
- **New Tab Opening**: Opens the switched environment in a new tab for easy comparison

### **Developer Workflow Integration**
- **Seamless Testing**: Quickly switch between local, test, and production environments
- **Context Preservation**: Maintains your current location in the application
- **One-Click Access**: No need to manually edit URLs or bookmark different environments

## 🌐 Supported Platforms

### **Primary Integration:**
- **ClickUp**: Full auto-search and task extraction
- **GitLab**: Merge request integration with branch name sync
- **Mattermost**: Complete status management and Google Meet integration
- **Google Meet**: Automatic meeting detection and history tracking

### **General Support:**
- Any webpage with structured task information
- Manual data entry for any task management system
- Context menu extraction for text selections

## 📋 How Auto-Search Works

### **ClickUp Task Pages** (`https://app.clickup.com/t/`)
1. Extension automatically extracts task ID from page
2. Searches history for matching task ID
3. **If found in history**: Switches to History tab and highlights the item
4. **If not found**: Auto-fills Generate tab with ClickUp page data
5. Shows toast notification about the action taken

### **GitLab Merge Request Pages** (`/-/merge_requests/`)
1. Extension extracts task ID and branch name from MR page
2. Searches history for matching task ID
3. **If found in history**:
   - Updates history with GitLab MR URL (if different/missing)
   - Compares branch names and updates if different (GitLab page takes precedence)
   - Switches to History tab and highlights the item
   - Shows notification about what was updated
4. **If not found**: Auto-fills Generate tab with GitLab data

### **Google Meet Pages**
1. Automatically detects when joining/leaving Google Meet sessions
2. Updates Mattermost status based on configured settings
3. Records meeting details in history
4. Prevents duplicate entries with advanced detection logic

### **Other Pages**
- No automatic processing (prevents interference)
- Manual auto-fill still available via button

## ⚙️ Extension Tabs Overview

### 🎯 **Generate Tab**
- AI-powered branch and commit generation
- Auto-search integration for ClickUp and GitLab
- Priority-based prefix selection (feature/, hotfix/)
- Real-time priority indicators
- Copy buttons for quick workflow integration
- **Individual regeneration**: Regenerate only branch name or commit message
- **Batch regeneration**: Regenerate both branch and commit with one click
- Smart history updates when regenerating individual components
- Time estimation for development tasks

### 📚 **History Tab**
- Complete history of all generated items (100 items)
- Advanced search and filtering capabilities
- 12 status categories with color coding
- Edit functionality with comprehensive modal
- GitLab merge request URL display and management
- Auto-highlighting when items found via auto-search
- Template integration buttons
- Individual item deletion with confirmation

### 💬 **Mattermost Tab**
- Quick status update buttons (Online, Away, DND, Offline)
- Custom status preset management
- Google Meet integration settings
- Meeting history display and management
- Authentication and connection management
- Status clearing and preset application

### 📝 **Templates Tab**
- Save and reuse common task patterns
- Quick template application
- Integration with history data
- Customizable template fields

### ⚙️ **Settings Tab**
- Gemini API key configuration
- Model selection (2.0 Flash, 1.5 Flash, 1.5 Pro)
- Temperature adjustment for AI creativity
- Custom branch and commit rules
- Data export/import functionality
- Extension configuration options

## 🔧 Configuration

### **Custom Rules**
Define your own patterns in the Settings tab:

**Branch Rules Example:**
```
Use feature/ prefix for new features
Use bugfix/ prefix for bug fixes  
Use hotfix/ prefix for urgent fixes
Keep names under 50 characters
Use kebab-case formatting
Include task ID when available
```

**Commit Rules Example:**
```
Start with task ID in brackets if available
Use present tense verbs
Be descriptive but concise
Include context about what was changed
Mention breaking changes if any
Follow conventional commit format when possible
```

### **Priority System**
- **Low/Normal**: `feature/` prefix, `feat:` commit prefix
- **High**: `feature/` prefix, `feat:` commit prefix (with HIGH priority note)
- **Urgent**: `hotfix/` prefix, `fix:` commit prefix (immediate attention)
- **Auto-Detection**: Scans task content for urgent keywords

### **Mattermost Configuration**
- **Server URL**: Your Mattermost server address
- **Authentication**: Choose between password or personal access token
- **Google Meet Settings**: Configure automatic status updates
- **Custom Status Presets**: Create and manage reusable status configurations

## 🏗️ Architecture

### **Project Structure**
```
├── popup-main.js          # Main application entry point
├── popup.html             # Main UI interface  
├── background.js          # Service worker and Google Meet integration
├── content.js            # Page content extraction
├── mattermost-meet-integration.js  # Google Meet detection
├── manifest.json         # Extension configuration
├── shared/               # Shared utilities
│   ├── utils.js         # Common utility functions
│   ├── tab-manager.js   # Tab switching logic
│   └── mattermost-api.js # Mattermost API integration
└── tabs/                # Modular tab structure
    ├── generate/        # Generation functionality
    │   ├── generate.html
    │   └── generate.js
    ├── history/         # History management
    │   ├── history.html
    │   └── history.js
    ├── mattermost/      # Mattermost integration
    │   ├── mattermost.html
    │   └── mattermost.js
    ├── templates/       # Template system
    └── settings/        # Configuration
```

### **Key Technologies**
- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **Styling**: Tailwind CSS (via CDN)
- **API**: Google Gemini API, Mattermost API
- **Storage**: Chrome Extension Sync Storage
- **Architecture**: Chrome Extension Manifest V3
- **Module System**: ES6 imports/exports for clean code organization
- **Background Processing**: Service worker for Google Meet integration


## 🎯 Roadmap

### **Near Term**
- Improved duplicate detection and cleanup tools
- Advanced meeting analytics and reporting

## 📋 API Usage

### **Rate Limits (Free Tier)**
- **Per Minute**: 15 requests
- **Per Day**: 1,500 requests
- **Automatic Tracking**: Visual progress bars
- **Smart Blocking**: Prevents API errors

### **Supported Models**
- `gemini-2.0-flash-exp` - Latest experimental model
- `gemini-1.5-flash` - Fast, efficient responses  
- `gemini-1.5-pro` - High-quality, detailed responses

### **Mattermost API**
- **Authentication**: Personal access tokens and password authentication
- **Status Updates**: Real-time status management
- **Custom Status**: Full custom status support with emoji and duration
- **User Information**: Profile and presence data

## 🔒 Privacy & Security

- **Local Storage Only**: All data stored locally in browser
- **No Telemetry**: No usage tracking or analytics
- **API Key Security**: Keys stored securely in Chrome's encrypted storage
- **Mattermost Security**: Credentials encrypted and stored locally
- **Open Source**: Full code transparency
- **Data Control**: Complete export/import for user data ownership
- **Meeting Privacy**: Meeting data stored locally, never transmitted

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`feature/amazing-feature`)
3. Make your changes following the modular architecture
4. Test thoroughly on ClickUp, GitLab, and Mattermost integration
5. Submit a pull request

### **Development Setup**
1. Clone the repo
2. Load unpacked extension in Chrome (`chrome://extensions/`)
3. Make changes and reload extension
4. Test auto-search on ClickUp task pages and GitLab MR pages
5. Verify Mattermost integration and Google Meet functionality
6. Test history integration and tab switching

### **Code Guidelines**
- Follow ES6+ module patterns
- Use the shared utilities in `/shared/`
- Keep tab-specific code in respective `/tabs/` folders
- Maintain consistent error handling and notifications
- Test auto-search scenarios thoroughly
- Ensure Mattermost API integration follows best practices

## 🆘 Support & Troubleshooting

### **Common Issues**
- **Auto-search not working**: Ensure you're on a ClickUp task page or GitLab MR page
- **History not updating**: Check that the task ID matches between pages
- **API Key Issues**: Verify key is valid and has quota remaining
- **Extension not loading**: Try reloading the extension in `chrome://extensions/`
- **API rate limits reached**: Wait 1 minute or use fewer requests
- **Context menu not appearing**: Ensure extension has proper permissions, try reloading the extension
- **Mattermost connection issues**: Verify server URL and credentials
- **Google Meet not detected**: Ensure you're on a Google Meet page and integration is enabled
- **Meeting history duplicates**: Use the cleanup tools in the Mattermost tab

### **Debug Tips**
- Open DevTools Console to see auto-search logs
- Check the Network tab for API calls
- Verify page URLs match the expected patterns
- Test with known working ClickUp tasks
- **Time Estimation**: Check API key settings and rate limits if estimation fails
- **Context Menu**: Test right-click menu on different websites to verify functionality
- **Mattermost**: Check browser console for authentication and API errors
- **Google Meet**: Verify meeting detection logs in background script

### **Getting Help**
- Check the implementation documentation in project files
- Review the modular code structure for implementation details
- Open an issue for bugs or feature requests
- Include console logs and page URLs when reporting issues
- For Mattermost issues, include server version and authentication method

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Made with ❤️ for developers who value efficient workflows and seamless ClickUp/GitLab/Mattermost integration**