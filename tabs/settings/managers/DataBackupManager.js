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
            // Get all extension data
            const data = await new Promise(resolve => {
                chrome.storage.local.get(null, resolve);
            });
            
            // Create export object with metadata
            const exportData = {
                exportDate: new Date().toISOString(),
                exportVersion: "1.0",
                extensionName: "Branch & Commit Helper",
                data: {
                    // Settings
                    apiKey: data.apiKey || "",
                    geminiModel: data.geminiModel || "gemini-2.5-flash",
                    temperature: data.temperature || 0.3,
                    
                    // Rules
                    branchRules: data.branchRules || "",
                    commitRules: data.commitRules || "",
                    
                    // History
                    history: data.history || [],
                    
                    // Rate limit data (optional)
                    rateLimitData: data.rateLimitData || null
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
            const dataToImport = {};
            
            // Import settings
            if (importData.data.apiKey !== undefined) dataToImport.apiKey = importData.data.apiKey;
            if (importData.data.geminiModel !== undefined) dataToImport.geminiModel = importData.data.geminiModel;
            if (importData.data.temperature !== undefined) dataToImport.temperature = importData.data.temperature;
            
            // Import rules
            if (importData.data.branchRules !== undefined) dataToImport.branchRules = importData.data.branchRules;
            if (importData.data.commitRules !== undefined) dataToImport.commitRules = importData.data.commitRules;
            
            // Import history
            if (importData.data.history !== undefined) dataToImport.history = importData.data.history;
            
            // Import rate limit data (optional)
            if (importData.data.rateLimitData !== undefined) dataToImport.rateLimitData = importData.data.rateLimitData;
            
            // Save to storage
            await new Promise(resolve => {
                chrome.storage.local.set(dataToImport, resolve);
            });
            
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
