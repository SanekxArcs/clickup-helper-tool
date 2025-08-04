// Debug script to check Google Meet history storage and functionality
// Run this in the console to see what meet history data is available

async function debugMeetHistory() {
    try {
        console.log('=== GOOGLE MEET HISTORY DEBUG ===');
        
        // Check current storage
        const allData = await chrome.storage.sync.get(null);
        console.log('\n=== ALL STORAGE DATA ===');
        console.log(allData);
        
        // Check meet-specific data
        const meetData = await chrome.storage.sync.get([
            'meetHistory',
            'currentMeetingEntryId',
            'meetingStatus',
            'meetingEmoji', 
            'meetingText',
            'showMeetingTitle',
            'google-meet-integration'
        ]);
        console.log('\n=== MEET HISTORY DATA ===');
        console.log(meetData);
        
        console.log('\n=== MEET HISTORY ANALYSIS ===');
        console.log('Meet History Array:', meetData.meetHistory);
        console.log('History Length:', meetData.meetHistory?.length || 0);
        console.log('Current Meeting ID:', meetData.currentMeetingEntryId);
        console.log('Google Meet Integration Enabled:', meetData['google-meet-integration']);
        
        // Test adding a sample entry
        console.log('\n=== TESTING SAMPLE ENTRY ===');
        const testEntry = {
            id: Date.now().toString(),
            meetingTitle: 'Test Meeting - ' + new Date().toLocaleTimeString(),
            status: 'dnd',
            statusText: 'In a test meeting',
            startTime: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };
        
        const currentHistory = meetData.meetHistory || [];
        const newHistory = [testEntry, ...currentHistory];
        
        await chrome.storage.sync.set({ meetHistory: newHistory });
        console.log('Added test entry:', testEntry);
        
        // Verify it was saved
        const updatedData = await chrome.storage.sync.get(['meetHistory']);
        console.log('Updated history length:', updatedData.meetHistory?.length || 0);
        
        return {
            original: meetData,
            testEntry: testEntry,
            updated: updatedData
        };
    } catch (error) {
        console.error('Error in meet history debug:', error);
    }
}

// Function to clear meet history for testing
async function clearMeetHistoryDebug() {
    try {
        await chrome.storage.sync.set({ meetHistory: [] });
        console.log('Meet history cleared for testing');
    } catch (error) {
        console.error('Error clearing meet history:', error);
    }
}

// Function to simulate a meeting session
async function simulateMeetingSession(title = 'Debug Test Meeting') {
    try {
        console.log('=== SIMULATING MEETING SESSION ===');
        
        // Simulate meeting start
        const entry = {
            id: Date.now().toString(),
            meetingTitle: title,
            status: 'dnd',
            statusText: 'In a meeting: ' + title,
            startTime: new Date().toISOString(),
            timestamp: new Date().toISOString()
        };
        
        const currentHistory = (await chrome.storage.sync.get(['meetHistory'])).meetHistory || [];
        const newHistory = [entry, ...currentHistory];
        
        await chrome.storage.sync.set({ 
            meetHistory: newHistory,
            currentMeetingEntryId: entry.id
        });
        
        console.log('Meeting started:', entry);
        
        // Simulate meeting end after 2 seconds
        setTimeout(async () => {
            try {
                const data = await chrome.storage.sync.get(['meetHistory', 'currentMeetingEntryId']);
                const history = data.meetHistory || [];
                const entryIndex = history.findIndex(e => e.id === entry.id);
                
                if (entryIndex !== -1) {
                    history[entryIndex].endTime = new Date().toISOString();
                    await chrome.storage.sync.set({ 
                        meetHistory: history,
                        currentMeetingEntryId: null
                    });
                    console.log('Meeting ended:', history[entryIndex]);
                }
            } catch (error) {
                console.error('Error ending meeting:', error);
            }
        }, 2000);
        
        return entry;
    } catch (error) {
        console.error('Error simulating meeting:', error);
    }
}

// Run the debug function
console.log('Google Meet History Debug Tools Loaded');
console.log('Available functions:');
console.log('- debugMeetHistory() - Check current storage state');
console.log('- clearMeetHistoryDebug() - Clear history for testing');
console.log('- simulateMeetingSession(title) - Simulate a meeting session');

// Auto-run debug
debugMeetHistory();