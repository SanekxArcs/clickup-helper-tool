// Script to clean up duplicate meeting entries and keep only the middle entry
// This script will help remove duplicate meeting entries from the history

chrome.storage.sync.get(['meetHistory'], (result) => {
    const history = result.meetHistory || [];
    console.log('Current history entries:', history.length);
    
    // Group entries by roomId
    const groupedByRoom = {};
    history.forEach(entry => {
        if (!groupedByRoom[entry.roomId]) {
            groupedByRoom[entry.roomId] = [];
        }
        groupedByRoom[entry.roomId].push(entry);
    });
    
    // Process each room's entries
    const cleanedHistory = [];
    
    Object.keys(groupedByRoom).forEach(roomId => {
        const roomEntries = groupedByRoom[roomId];
        
        if (roomEntries.length === 1) {
            // Single entry, keep it
            cleanedHistory.push(roomEntries[0]);
        } else if (roomEntries.length > 1) {
            // Multiple entries, find the one with actual duration (not 0m)
            const entriesWithDuration = roomEntries.filter(entry => {
                if (!entry.endTime) return false; // Skip ongoing meetings
                const duration = entry.endTime - entry.startTime;
                return duration > 60000; // More than 1 minute
            });
            
            if (entriesWithDuration.length > 0) {
                // Keep the entry with the longest duration
                const bestEntry = entriesWithDuration.reduce((best, current) => {
                    const bestDuration = best.endTime - best.startTime;
                    const currentDuration = current.endTime - current.startTime;
                    return currentDuration > bestDuration ? current : best;
                });
                cleanedHistory.push(bestEntry);
                console.log(`Kept entry for room ${roomId} with duration:`, Math.floor((bestEntry.endTime - bestEntry.startTime) / 60000) + 'm');
            } else {
                // No entries with significant duration, keep the most recent
                const mostRecent = roomEntries.reduce((latest, current) => {
                    return current.startTime > latest.startTime ? current : latest;
                });
                cleanedHistory.push(mostRecent);
                console.log(`Kept most recent entry for room ${roomId}`);
            }
        }
    });
    
    console.log(`Cleaned history: ${history.length} -> ${cleanedHistory.length} entries`);
    
    // Save the cleaned history
    chrome.storage.sync.set({ meetHistory: cleanedHistory }, () => {
        console.log('History cleaned successfully!');
        console.log('Cleaned entries:', cleanedHistory);
    });
});