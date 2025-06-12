# 🚀 Branch & Commit Helper

A powerful Chrome extension that generates intelligent branch names and commit messages using Google's Gemini AI, designed to streamline your development workflow.

## ✨ Features

### 🎯 **AI-Powered Generation**
- **Branch Names**: Automatically generates meaningful branch names following best practices
- **Commit Messages**: Creates clear, descriptive commit messages
- **Custom Rules**: Define your own naming conventions and message formats
- **Multiple AI Models**: Support for Gemini 2.0 Flash, 1.5 Flash, and 1.5 Pro

### ⌨️ **Keyboard Shortcuts**
- **Quick Access**: `Ctrl+Shift+G` (Windows/Linux) / `Cmd+Shift+G` (Mac) - Open extension
- **Quick Generate**: `Ctrl+Shift+B` / `Cmd+Shift+B` - Auto-fill and generate instantly
- **Auto-fill Only**: `Ctrl+Shift+A` / `Cmd+Shift+A` - Extract data without generating
- **Customizable**: Set your own keyboard shortcuts for any action

### 📊 **Smart Rate Limiting**
- **Visual Progress Bars**: Real-time usage tracking for API limits
- **Color-Coded Warnings**: Green, yellow, red indicators for usage levels
- **Automatic Reset**: Intelligent handling of per-minute and per-day limits
- **Usage Prevention**: Blocks requests when limits are reached

### 📚 **History Management**
- **Persistent History**: Saves all generated branches and commits
- **Search & Filter**: Real-time search through your generation history
- **Edit History**: Modify saved items with full editing modal
- **Source Tracking**: Links back to original task pages

### 💾 **Data Management**
- **Export/Import**: Complete backup and restore functionality
- **Cross-Device Sync**: Transfer settings between devices
- **Version Control**: Metadata tracking for data compatibility
- **Selective Import**: Choose what data to restore

### 🎨 **Auto-Fill Integration**
- **Page Detection**: Automatically extracts task data from supported pages
- **Context Menu**: Right-click to extract task information
- **URL Tracking**: Maintains links to source pages
- **Smart Parsing**: Recognizes task IDs, titles, and descriptions

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
1. Navigate to your task management page (Jira, Azure DevOps, etc.)
2. Use `Ctrl+Shift+A` to auto-fill task data
3. Use `Ctrl+Shift+B` to generate instantly
4. Copy the generated branch name and commit message

## 🛠️ Supported Platforms

### **Task Management:**
- Jira
- Azure DevOps
- GitHub Issues
- Trello
- Asana
- Linear
- Monday.com
- ClickUp

### **General Support:**
- Any webpage with structured task information
- Context menu extraction for any text selection

## ⚙️ Configuration

### **Custom Rules**
Define your own patterns in the Rules tab:

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

### **AI Settings**
- **Model Selection**: Choose between Gemini models
- **Temperature**: Adjust creativity (0.0 = conservative, 1.0 = creative)
- **Rate Limits**: Monitor API usage automatically

## 📖 Advanced Features

### **Keyboard Shortcuts Customization**
1. Go to Settings → Keyboard Shortcuts
2. Click "Set" next to any shortcut
3. Press your desired key combination
4. Must include `Ctrl/Cmd + Shift + Letter`

### **Data Export/Import**
1. **Export**: Settings → Export Data → Downloads JSON backup
2. **Import**: Settings → Import Data → Select backup file
3. **Migration**: Perfect for moving between devices or browsers

### **History Search**
- Type in the search box to filter history
- Searches both task IDs and titles
- Results update in real-time
- Highlighted matches for easy scanning

## 🔧 Development

### **Project Structure**
```
├── popup.html          # Main UI interface
├── popup.js            # Core logic and functionality
├── background.js       # Service worker for keyboard shortcuts
├── content.js          # Page content extraction
├── custom.css          # Custom styling
├── manifest.json       # Extension configuration
└── icons/              # Extension icons
```

### **Key Files**
- **popup.js**: Main extension logic (1,500+ lines)
- **background.js**: Command handlers for shortcuts
- **content.js**: Page parsing and data extraction
- **popup.html**: Complete UI with 4-tab interface

### **Technologies Used**
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN)
- **API**: Google Gemini API
- **Storage**: Chrome Extension Local Storage
- **Architecture**: Chrome Extension Manifest V3

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### **Development Setup**
1. Clone the repo
2. Load unpacked extension in Chrome
3. Make changes and reload extension
4. Test on various task management platforms

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### **Common Issues**
- **API Key Issues**: Verify key is valid and has quota
- **Auto-fill Not Working**: Check if page is supported
- **Shortcuts Not Working**: Verify no conflicts with other extensions

### **Getting Help**
- Check the documentation files in the repository
- Review the code for implementation details
- Open an issue for bugs or feature requests

## 🚀 Version History

- **v1.0.0**: Initial release with core features
- **Latest**: Full-featured extension with advanced capabilities

## 🎯 Roadmap

- Git integration for direct branch creation
- Team collaboration features
- Additional AI model support
- Enterprise features
- Browser extension marketplace publication

---

**Made with ❤️ for developers who value efficient workflows**