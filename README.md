# 🚀 Branch & Commit Helper

A powerful Chrome extension that generates intelligent branch names and commit messages using Google's Gemini AI, with advanced auto-search and workflow automation for ClickUp and GitLab integration. Features an advanced Pomodoro timer system with workday management, lunch budget tracking, and productivity statistics, plus environment context menu for seamless development workflow switching.

## ✨ Key Features

### 🎯 **AI-Powered Generation**
- **Branch Names**: Automatically generates meaningful branch names following best practices
- **Commit Messages**: Creates clear, descriptive commit messages using conventional commit format
- **Custom Rules**: Define your own naming conventions and message formats
- **Multiple AI Models**: Support for Gemini 2.0 Flash, 1.5 Flash, and 1.5 Pro
- **Priority-Based Prefixes**: Automatic hotfix/ prefix for urgent tasks, feature/ for normal tasks
- **Individual Regeneration**: Regenerate only branch names or commit messages separately
- **Smart Variations**: Each regeneration creates fresh content while maintaining consistency

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

### ⚡ **Workflow Automation**
- **Context-Aware Auto-Fill**: Different behavior for ClickUp vs GitLab pages
- **Smart Page Detection**: Only runs auto-search on relevant pages (prevents random page interference)
- **Automatic History Updates**: Updates GitLab URLs and branch names when visiting MR pages
- **Priority Detection**: Automatically detects urgent keywords and sets priority levels
- **Template Integration**: Easy transfer of history data to Templates tab
- **Environment Context Menu**: Right-click context menu for quick environment switching (dev/test/prod)
- **Smart URL Handling**: Preserves paths, queries, and fragments when switching environments

### 🎨 **Modern UI & UX**
- **Modular Tab Architecture**: Separate folders and files for each feature (Generate, History, Templates, Pomodoro, Settings)
- **Visual Highlighting**: Blue borders and backgrounds for highlighted history items
- **Toast Notifications**: Success/error feedback for all operations
- **Copy Buttons**: One-click copying for branch names, commit messages, and Git commands
- **Color-Coded Status**: Visual status indicators with customizable colors
- **Smooth Animations**: Highlight fading and smooth scrolling effects

### 🛠️ **Developer Tools**
- **Git Command Generation**: Ready-to-use git commit commands
- **Markdown Link Creation**: Generate markdown links for task references
- **Branch/Commit History**: Track all generated code across projects
- **Template System**: Save and reuse common patterns
- **Export/Import**: Complete data backup and migration

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

### 3. **Usage**

#### **Auto-Search Workflow (Recommended)**
1. **ClickUp**: Navigate to any ClickUp task page (`https://app.clickup.com/t/`)
2. **GitLab**: Navigate to any GitLab merge request page (`/-/merge_requests/`)
3. Open the extension - it will automatically:
   - Search your history for the task
   - If found: Switch to History tab and highlight the matching item
   - If not found: Auto-fill the Generate tab with page data
4. Generate branch names and commit messages as needed

#### **Manual Workflow**
1. Open the extension on any page
2. Fill in task details manually or click "Auto-fill from Page"
3. Click "Generate" to create branch name and commit message
4. **Use regeneration options:**
   - **🔄 Regenerate** (individual): Click the regenerate button next to branch or commit to regenerate only that component
   - **🔄 Regenerate Both**: Regenerate both branch name and commit message with one click
   - All regenerations maintain the original task data while creating new variations
5. Copy the results with one-click buttons

#### **Pomodoro Timer Workflow**
1. Go to the **Pomodoro** tab
2. Set your workday hours (start time, end time)
3. Click "Start" to begin your work session
4. Timer runs in the background even when popup is closed
5. Use "Lunch" button to track lunch breaks (shows remaining budget)
6. View daily statistics and manage your productivity
7. Access password-protected history for long-term tracking

#### **Environment Switching**
1. Right-click on any web page
2. Select "Go to Dev Environment" from context menu
3. Choose your target environment (localhost, test server, etc.)
4. Page opens in new tab with same path preserved

## 🍅 Pomodoro Timer System

### **Workday Management**
- **Custom Workday Hours**: Set your preferred start and end times (e.g., 9:00 AM - 6:00 PM)
- **Automatic Lunch Calculation**: System calculates recommended lunch time based on workday duration
- **Flexible Scheduling**: Adjust work patterns to match your schedule

### **Advanced Timer Features**
- **Persistent Background Timer**: Timer continues running even when extension popup is closed
- **Auto-Start/Stop**: Automatically manages timer state based on workday schedule
- **Loop System**: Seamlessly cycles between work sessions and breaks
- **Big Timer Display**: Large, prominent timer with visual pulse animations during active sessions
- **Real-Time Synchronization**: Popup UI stays in sync with background timer state

### **Lunch Budget System**
- **Smart Lunch Tracking**: Tracks lunch time with budget-based controls
- **Real-Time Budget Display**: Shows remaining lunch minutes on the lunch button
- **Visual Feedback**: Button colors indicate budget status (green/orange/red/gray)
- **Overuse Prevention**: Prevents lunch timer when budget is exhausted
- **Automatic Calculations**: Lunch budget calculated based on workday duration

### **Statistics & History**
- **Daily Tracking**: Comprehensive statistics for work time, break time, and lunch time
- **Precise Time Format**: All times displayed in H:MM:SS format for accuracy
- **Persistent Data**: Statistics saved and accumulated across sessions
- **Password Protection**: Secure access to historical productivity data
- **Profile Management**: Multiple timer profiles for different work patterns

### **User Interface**
- **Intuitive Controls**: Simple start/stop/pause buttons with clear visual states
- **Status Indicators**: Clear display of current timer state and remaining time
- **Debug Information**: Built-in debug panel for troubleshooting (show/hide toggle)
- **Force Refresh**: Manual UI refresh button for resolving sync issues
- **Responsive Design**: Clean, modern interface optimized for extension popup

## 🌐 Environment Context Menu

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

## � Supported Platforms

### **Primary Integration:**
- **ClickUp**: Full auto-search and task extraction
- **GitLab**: Merge request integration with branch name sync

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

### 📚 **History Tab**
- Complete history of all generated items (100 items)
- Advanced search and filtering capabilities
- 12 status categories with color coding
- Edit functionality with comprehensive modal
- GitLab merge request URL display and management
- Auto-highlighting when items found via auto-search
- Template integration buttons

### 📝 **Templates Tab**
- Save and reuse common task patterns
- Quick template application
- Integration with history data
- Customizable template fields

### 🍅 **Pomodoro Tab**
- **Advanced Workday Management**: Set custom workday hours with automatic lunch calculation
- **Persistent Timer System**: Timer continues running even when popup is closed
- **Smart Auto-Start/Stop**: Automatically starts/stops timers based on workday schedule
- **Lunch Budget System**: Real-time lunch time tracking with budget alerts and overuse prevention
- **Comprehensive Statistics**: Daily work/break/lunch tracking with H:MM:SS format display
- **Password-Protected History**: Secure access to historical productivity data
- **Profile Management**: Multiple timer profiles for different work patterns
- **Big Timer Display**: Large, easy-to-read timer with pulse animations
- **Background Synchronization**: Full sync between popup UI and background timer state
- **Debug Information**: Built-in debugging panel for troubleshooting timer issues

### ⚙️ **Settings Tab**
- Gemini API key configuration
- Model selection (2.0 Flash, 1.5 Flash, 1.5 Pro)
- Temperature adjustment for AI creativity
- Custom branch and commit rules
- Data export/import functionality

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

## 🏗️ Architecture

### **Project Structure**
```
├── popup-main.js          # Main application entry point
├── popup-new.html         # Main UI interface  
├── background.js          # Service worker
├── content.js            # Page content extraction
├── manifest.json         # Extension configuration
├── shared/               # Shared utilities
│   ├── utils.js         # Common utility functions
│   └── tab-manager.js   # Tab switching logic
└── tabs/                # Modular tab structure
    ├── generate/        # Generation functionality
    │   ├── generate.html
    │   └── generate.js
    ├── history/         # History management
    │   ├── history.html
    │   └── history.js
    ├── templates/       # Template system
    ├── pomodoro/        # Pomodoro timer
    └── settings/        # Configuration
```

### **Key Technologies**
- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **Styling**: Tailwind CSS (via CDN)
- **API**: Google Gemini API
- **Storage**: Chrome Extension Local Storage
- **Architecture**: Chrome Extension Manifest V3
- **Module System**: ES6 imports/exports for clean code organization
## 🚀 Version History

### **v2.2.0** - Current (Enhanced Generation Features)
- ✅ **Individual Regeneration**: Separate regeneration buttons for branch names and commit messages
- ✅ **Smart Regeneration**: Regenerate only the component you need while preserving the other
- ✅ **Batch Regeneration**: Regenerate both branch and commit with a single "Regenerate Both" button
- ✅ **History Integration**: Regenerated content automatically updates history entries
- ✅ **Enhanced UX**: Improved button layout with clear visual separation between copy and regenerate actions
- ✅ **Loading States**: All regeneration buttons properly disabled during API calls
- ✅ **Error Handling**: Comprehensive error handling for individual regeneration failures

### **v2.1.0** - Advanced Productivity Features
- ✅ **Advanced Pomodoro Timer**: Complete workday management with persistent background timer
- ✅ **Lunch Budget System**: Real-time lunch tracking with budget controls and visual feedback
- ✅ **Statistics & History**: Comprehensive daily tracking with H:MM:SS precision and password protection
- ✅ **Timer Persistence**: Timer continues running when popup is closed, with full background synchronization
- ✅ **Environment Context Menu**: Right-click menu for quick environment switching (dev/test/prod)
- ✅ **Smart URL Handling**: Preserves paths, queries, and fragments when switching environments
- ✅ **Auto-Start/Stop**: Intelligent timer management based on workday schedule
- ✅ **Profile Management**: Multiple timer profiles for different work patterns
- ✅ **Debug Tools**: Built-in debugging panel and force refresh capabilities
- ✅ **UI Enhancements**: Big timer display with pulse animations and improved visual feedback

### **v2.0.0** - Modular Architecture
- ✅ **Complete Modularization**: Separated tabs into individual folders and files
- ✅ **Advanced Auto-Search**: ClickUp and GitLab integration with history-first approach
- ✅ **Auto-Tab Switching**: Automatically switches to History tab when tasks found
- ✅ **GitLab Integration**: Full merge request URL tracking and branch name synchronization
- ✅ **Visual Highlighting**: Auto-highlights matching items in History tab
- ✅ **Enhanced History**: 12 status categories, edit modal, search/filter
- ✅ **Smart Notifications**: Context-aware toast messages for all operations
- ✅ **Priority Detection**: Automatic urgent/high priority detection and prefixes
- ✅ **Modern UI**: Improved styling, animations, and user experience

### **v1.0.0** - Legacy (Monolithic)
- Basic generation functionality
- Simple history management
- Manual data entry
- Single-file architecture

## 🎯 Roadmap

### **Near Term**
- Additional GitLab features (issue tracking, pipeline integration)
- Enhanced ClickUp integration (custom fields, time tracking)
- Keyboard shortcuts restoration
- Browser extension marketplace publication

### **Long Term**
- Git integration for direct branch creation
- Team collaboration features
- Additional AI model support (OpenAI, Claude)
- Enterprise features and SSO
- Multi-repository management
- Advanced analytics and reporting

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

## 🔒 Privacy & Security

- **Local Storage Only**: All data stored locally in browser
- **No Telemetry**: No usage tracking or analytics
- **API Key Security**: Keys stored securely in Chrome's encrypted storage
- **Open Source**: Full code transparency
- **Data Control**: Complete export/import for user data ownership

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`feature/amazing-feature`)
3. Make your changes following the modular architecture
4. Test thoroughly on ClickUp and GitLab pages
5. Submit a pull request

### **Development Setup**
1. Clone the repo
2. Load unpacked extension in Chrome (`chrome://extensions/`)
3. Make changes and reload extension
4. Test auto-search on ClickUp task pages and GitLab MR pages
5. Verify history integration and tab switching

### **Code Guidelines**
- Follow ES6+ module patterns
- Use the shared utilities in `/shared/`
- Keep tab-specific code in respective `/tabs/` folders
- Maintain consistent error handling and notifications
- Test auto-search scenarios thoroughly

## 🆘 Support & Troubleshooting

### **Common Issues**
- **Auto-search not working**: Ensure you're on a ClickUp task page or GitLab MR page
- **History not updating**: Check that the task ID matches between pages
- **API Key Issues**: Verify key is valid and has quota remaining
- **Extension not loading**: Try reloading the extension in `chrome://extensions/`
- **Pomodoro timer not persisting**: Check that background script is running, use "Force Refresh UI" button
- **Lunch budget not updating**: Verify workday hours are set correctly, restart timer if needed
- **Context menu not appearing**: Ensure extension has proper permissions, try reloading the extension
- **Statistics not accurate**: Check that timer has been running for full sessions, verify time format settings

### **Debug Tips**
- Open DevTools Console to see auto-search logs
- Check the Network tab for API calls
- Verify page URLs match the expected patterns
- Test with known working ClickUp tasks
- **Pomodoro Debug**: Use the built-in debug panel in Pomodoro tab to view timer state and logs
- **Timer Issues**: Try "Force Refresh UI" button to resync popup with background timer
- **Context Menu**: Test right-click menu on different websites to verify functionality

### **Getting Help**
- Check the implementation documentation in `/test-implementation.md`
- Review the modular code structure for implementation details
- Open an issue for bugs or feature requests
- Include console logs and page URLs when reporting issues

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Made with ❤️ for developers who value efficient workflows and seamless ClickUp/GitLab integration**