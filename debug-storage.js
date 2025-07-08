// Debug script to check what's stored in Chrome storage
// Run this in the console to see what authentication data is available

async function debugMattermostStorage() {
    try {
        const allData = await chrome.storage.sync.get(null);
        console.log('=== ALL CHROME STORAGE DATA ===');
        console.log(allData);
        
        console.log('\n=== MATTERMOST SPECIFIC DATA ===');
        const mattermostData = await chrome.storage.sync.get([
            'mattermostSettings', 
            'MMAuthToken', 
            'MMAccessToken', 
            'MMUsername', 
            'MMUserId', 
            'serverUrl'
        ]);
        console.log(mattermostData);
        
        console.log('\n=== AUTHENTICATION STATUS ===');
        console.log('Has Auth Token:', !!mattermostData.MMAuthToken);
        console.log('Has Access Token:', !!mattermostData.MMAccessToken);
        console.log('Has User ID:', !!mattermostData.MMUserId);
        console.log('Has Username:', !!mattermostData.MMUsername);
        console.log('Server URL (auth):', mattermostData.serverUrl);
        console.log('Server URL (settings):', mattermostData.mattermostSettings?.serverUrl);
        
        return mattermostData;
    } catch (error) {
        console.error('Error checking storage:', error);
    }
}

// Run the debug function
debugMattermostStorage();
