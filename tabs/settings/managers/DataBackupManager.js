import { Utils } from '../../../shared/utils.js';
import { ToastManager } from '../../../shared/toast-manager.js';

export class DataBackupManager {
    constructor(tab, elements) {
        this.tab = tab;
        this.elements = elements;
    }

    /**
     * Export all extension data to a JSON file
     */
    async exportData() {
        try {
            // Get all extension data from local and sync storage
            const [localData, syncData] = await Promise.all([
                new Promise(resolve => chrome.storage.local.get(null, resolve)),
                new Promise(resolve => chrome.storage.sync.get(null, resolve))
            ]);
            
            // Create export object with metadata
            const exportData = {
                exportDate: new Date().toISOString(),
                exportVersion: "1.2",
                extensionName: "Branch & Commit Helper",
                data: {
                    // Settings
                    apiKey: localData.apiKey || "",
                    geminiModel: localData.geminiModel || "gemini-2.5-flash",
                    temperature: localData.temperature || 0.3,
                    
                    // Rules
                    branchRules: localData.branchRules || "",
                    commitRules: localData.commitRules || "",
                    
                    // History
                    history: localData.history || [],
                    
                    // Rate limit data (optional)
                    rateLimitData: localData.rateLimitData || null,

                    // Templates Settings
                    templatesSettings: localData.templatesSettings || {},

                    // Mattermost Settings & Auth
                    mattermostSettings: syncData.mattermostSettings || {},
                    MMAuthToken: syncData.MMAuthToken || "",
                    MMAccessToken: syncData.MMAccessToken || "",
                    MMUsername: syncData.MMUsername || "",
                    MMUserId: syncData.MMUserId || "",
                    serverUrl: syncData.serverUrl || "",

                    // Meet Integration
                    filteredRooms: syncData.filteredRooms || [],
                    customRoomsConfig: syncData.customRoomsConfig || []
                }
            };
            
            // Create and download file
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const filename = `branch-commit-helper-backup-${new Date().toISOString().split('T')[0]}.json`;
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            ToastManager.success('✅ Data exported successfully!');
            
        } catch (error) {
            console.error('Export error:', error);
            ToastManager.error('❌ Failed to export data: ' + error.message);
        }
    }

    /**
     * Import extension data from a JSON file
     */
    async importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate import data structure
            if (!importData.data || typeof importData.data !== 'object') {
                throw new Error('Invalid backup file format');
            }
            
            // Confirm import
            const confirmMessage = `Import data from ${importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : 'unknown date'}?\n\nThis will replace:\n- API key and settings\n- Custom rules\n- History (${importData.data.history?.length || 0} items)\n\nCurrent data will be overwritten.`;
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            // Import the data
            const localDataToImport = {};
            const syncDataToImport = {};
            
            // Import settings (Local)
            if (importData.data.apiKey !== undefined) localDataToImport.apiKey = importData.data.apiKey;
            if (importData.data.geminiModel !== undefined) localDataToImport.geminiModel = importData.data.geminiModel;
            if (importData.data.temperature !== undefined) localDataToImport.temperature = importData.data.temperature;
            
            // Import rules (Local)
            if (importData.data.branchRules !== undefined) localDataToImport.branchRules = importData.data.branchRules;
            if (importData.data.commitRules !== undefined) localDataToImport.commitRules = importData.data.commitRules;
            
            // Import history (Local)
            if (importData.data.history !== undefined) localDataToImport.history = importData.data.history;
            
            // Import rate limit data (Local)
            if (importData.data.rateLimitData !== undefined) localDataToImport.rateLimitData = importData.data.rateLimitData;

            // Import Templates Settings (Local)
            if (importData.data.templatesSettings !== undefined) localDataToImport.templatesSettings = importData.data.templatesSettings;

            // Import Mattermost Settings & Auth (Sync)
            if (importData.data.mattermostSettings !== undefined) syncDataToImport.mattermostSettings = importData.data.mattermostSettings;
            if (importData.data.MMAuthToken !== undefined) syncDataToImport.MMAuthToken = importData.data.MMAuthToken;
            if (importData.data.MMAccessToken !== undefined) syncDataToImport.MMAccessToken = importData.data.MMAccessToken;
            if (importData.data.MMUsername !== undefined) syncDataToImport.MMUsername = importData.data.MMUsername;
            if (importData.data.MMUserId !== undefined) syncDataToImport.MMUserId = importData.data.MMUserId;
            if (importData.data.serverUrl !== undefined) syncDataToImport.serverUrl = importData.data.serverUrl;

            // Import Meet Integration (Sync)
            if (importData.data.filteredRooms !== undefined) syncDataToImport.filteredRooms = importData.data.filteredRooms;
            if (importData.data.customRoomsConfig !== undefined) syncDataToImport.customRoomsConfig = importData.data.customRoomsConfig;
            
            // Save to storage
            await Promise.all([
                new Promise(resolve => chrome.storage.local.set(localDataToImport, resolve)),
                new Promise(resolve => chrome.storage.sync.set(syncDataToImport, resolve))
            ]);
            
            // Notify main tab to reload
            this.tab.loadSavedData();
            
            // Show success message
            ToastManager.success('✅ Data imported successfully!');
            
            // Clear file input
            this.elements.importFileInput.value = '';
            
        } catch (error) {
            console.error('Import error:', error);
            ToastManager.error('❌ Failed to import data: ' + error.message);
            
            // Clear file input
            this.elements.importFileInput.value = '';
        }
    }
}
