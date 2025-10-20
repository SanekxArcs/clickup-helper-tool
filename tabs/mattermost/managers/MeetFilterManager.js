export class MeetFilterManager {
    constructor(tab) {
        this.tab = tab;
    }

    async loadFilteredRooms() {
        try {
            const result = await chrome.storage.sync.get(['filteredRooms']);
            this.tab.filteredRooms = result.filteredRooms || [];
            this.displayFilteredRooms();
        } catch (error) {
            console.error('Failed to load filtered rooms:', error);
            this.tab.filteredRooms = [];
        }
    }

    displayFilteredRooms() {
        const listElement = document.getElementById('meet-filter-list');
        const emptyElement = document.getElementById('meet-filter-empty');
        
        if (!listElement || !emptyElement) return;
        
        if (this.tab.filteredRooms.length === 0) {
            listElement.innerHTML = '';
            emptyElement.classList.remove('hidden');
            return;
        }
        
        emptyElement.classList.add('hidden');
        listElement.innerHTML = this.tab.filteredRooms.map(room => this.createFilteredRoomHTML(room)).join('');
        
        // Add event listeners for delete buttons
        listElement.querySelectorAll('.remove-meet-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomCode = e.currentTarget.getAttribute('data-room-code');
                this.removeMeetFilter(roomCode);
            });
        });
    }

    createFilteredRoomHTML(roomCode) {
        return `
            <div class="flex items-center justify-between p-3 border bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="flex items-center space-x-3">
                    <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <div>
                        <div class="font-medium text-gray-800">${roomCode}</div>
                        <div class="text-xs text-gray-500">Status will not auto-update in this room</div>
                    </div>
                </div>
                <button class="remove-meet-filter-btn ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors" data-room-code="${roomCode}" title="Remove filter">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
    }

    async addMeetFilter() {
        const input = document.getElementById('meet-room-code-input');
        if (!input) return;
        
        const roomCode = input.value.trim().toLowerCase();
        
        if (!roomCode) {
            this.tab.showMessage('Please enter a room code', 'error');
            return;
        }
        
        if (this.tab.filteredRooms.includes(roomCode)) {
            this.tab.showMessage('This room is already in the filter list', 'warning');
            return;
        }
        
        this.tab.filteredRooms.push(roomCode);
        console.log('📌 [ADD FILTER DEBUG] Added room:', roomCode);
        console.log('📌 [ADD FILTER DEBUG] All filtered rooms:', this.tab.filteredRooms);
        
        await this.saveFilteredRooms();
        
        // Verify save
        const verify = await chrome.storage.sync.get(['filteredRooms']);
        console.log('📌 [ADD FILTER DEBUG] Verified in storage:', verify.filteredRooms);
        
        this.displayFilteredRooms();
        input.value = '';
        this.tab.showMessage(`Room "${roomCode}" added to filter`, 'success');
    }

    async removeMeetFilter(roomCode) {
        if (confirm(`Remove "${roomCode}" from filter?`)) {
            this.tab.filteredRooms = this.tab.filteredRooms.filter(room => room !== roomCode);
            await this.saveFilteredRooms();
            this.displayFilteredRooms();
            this.tab.showMessage(`Room "${roomCode}" removed from filter`, 'success');
        }
    }

    async saveFilteredRooms() {
        try {
            await chrome.storage.sync.set({ filteredRooms: this.tab.filteredRooms });
        } catch (error) {
            console.error('Failed to save filtered rooms:', error);
        }
    }

    isRoomFiltered(roomCode) {
        return this.tab.filteredRooms.some(room => room === roomCode.toLowerCase());
    }
}
