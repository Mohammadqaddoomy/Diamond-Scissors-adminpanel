document.addEventListener('DOMContentLoaded', function() {
    try {
        // Use the global db instance initialized in admin.html
        console.log('Checking Firestore initialization...');
        if (!window.db) {
            console.log('Waiting for Firestore to initialize...');
            return;
        }
        console.log('Firestore initialized');
        
        // Initialize logout button
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            try {                await firebase.auth().signOut();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Error signing out:', error);
                alert('Error signing out: ' + error.message);
            }
        });

        // Load initial data
        loadAllBookings();
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        alert('Error initializing admin panel: ' + error.message);
    }

    // Event Listeners
    document.getElementById('todayBtn').addEventListener('click', loadTodayBookings);
    document.getElementById('allBtn').addEventListener('click', loadAllBookings);
    document.getElementById('filterBtn').addEventListener('click', filterBookings);
});

async function loadAllBookings() {
    try {
        console.log('Loading all bookings...');
        if (!window.db) {
            console.error('Firestore not initialized');
            return;
        }

        // Clear previous content
        const bookingsList = document.getElementById('bookingsList');
        bookingsList.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>';

        const snapshot = await window.db.collection('reservations')
            .orderBy('date', 'desc')
            .get();
        
        console.log('Bookings retrieved:', snapshot.size);
        if (snapshot.empty) {
            console.log('No bookings found in the collection');
        } else {
            snapshot.forEach(doc => {
                console.log('Document data:', doc.id, doc.data());
            });
        }
        displayBookings(snapshot);
        document.getElementById('bookingsTitle').textContent = 'All Bookings';
    } catch (error) {
        console.error('Error loading bookings:', error);
        alert('Error loading bookings: ' + error.message);
    }
}

async function loadTodayBookings() {
    try {
        const today = new Date().toISOString().split('T')[0];
        let snapshot;
        
        try {
            // Try with compound query first
            snapshot = await db.collection('reservations')
                .where('date', '==', today)
                .orderBy('time')
                .get();
        } catch (indexError) {
            if (indexError.code === 'failed-precondition') {
                // Fallback to simple query if index doesn't exist
                console.log('Index not available, falling back to basic query');
                snapshot = await db.collection('reservations')
                    .where('date', '==', today)
                    .get();
            } else {
                throw indexError;
            }
        }
        
        displayBookings(snapshot);
        document.getElementById('bookingsTitle').textContent = "Today's Bookings";
    } catch (error) {
        console.error('Error loading today\'s bookings:', error);
        alert('Error loading bookings: ' + error.message);
    }
}

async function filterBookings() {
    const filterDate = document.getElementById('filterDate').value;
    if (!filterDate) {
        alert('Please select a date');
        return;
    }

    try {
        let snapshot;
        
        try {
            // Try with compound query first
            snapshot = await db.collection('reservations')
                .where('date', '==', filterDate)
                .orderBy('time')
                .get();
        } catch (indexError) {
            if (indexError.code === 'failed-precondition') {
                // Fallback to simple query if index doesn't exist
                console.log('Index not available, falling back to basic query');
                snapshot = await db.collection('reservations')
                    .where('date', '==', filterDate)
                    .get();
            } else {
                throw indexError;
            }
        }
        
        displayBookings(snapshot);
        document.getElementById('bookingsTitle').textContent = `Bookings for ${filterDate}`;
    } catch (error) {
        console.error('Error filtering bookings:', error);
        alert('Error filtering bookings: ' + error.message);
    }
}

function displayBookings(snapshot) {
    console.log('Displaying bookings...');
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) {
        console.error('Could not find bookingsList element');
        return;
    }
    bookingsList.innerHTML = '';

    if (!snapshot || snapshot.empty) {
        console.log('No bookings to display');
        bookingsList.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center">No bookings found</td></tr>';
        return;
    }

    snapshot.forEach((doc) => {
        const booking = doc.data();
        console.log('Processing booking:', booking);
        
        if (!booking.name || !booking.date || !booking.time) {
            console.warn('Skipping invalid booking:', doc.id);
            return;
        }
        
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-gray-50';
        
        // Format the date and time for display
        const displayDate = booking.date || 'N/A';
        const displayTime = booking.time || 'N/A';
        
        row.innerHTML = `
            <td class="px-6 py-4">${booking.name || 'N/A'}</td>
            <td class="px-6 py-4">${booking.phone || 'N/A'}</td>
            <td class="px-6 py-4">${displayDate}</td>
            <td class="px-6 py-4">${displayTime}</td>
            <td class="px-6 py-4">${booking.service || 'N/A'}</td>
            <td class="px-6 py-4">
                <button onclick="deleteBooking('${doc.id}')" 
                        class="text-red-600 hover:text-red-900 font-medium">
                    Delete
                </button>
            </td>
        `;
        
        bookingsList.appendChild(row);
    });
}

async function deleteBooking(bookingId) {
    if (!confirm('Are you sure you want to delete this booking?')) {
        return;
    }

    try {
        await db.collection('reservations').doc(bookingId).delete();
        alert('Booking deleted successfully');
        // Refresh the current view
        document.getElementById('bookingsTitle').textContent.includes('Today') 
            ? loadTodayBookings() 
            : loadAllBookings();
    } catch (error) {
        console.error('Error deleting booking:', error);
        alert('Error deleting booking: ' + error.message);
    }
}

// Test function to verify Firestore access
async function testFirestoreAccess() {
    try {
        console.log('Testing Firestore access...');
        const testDoc = await db.collection('reservations').add({
            test: 'test',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Test document written with ID:', testDoc.id);
        
        const docSnapshot = await testDoc.get();
        console.log('Test document data:', docSnapshot.data());
        
        await testDoc.delete();
        console.log('Test document deleted successfully');
        
        return true;
    } catch (error) {
        console.error('Firestore access test failed:', error);
        return false;
    }
}

// Add test button temporarily
document.addEventListener('DOMContentLoaded', function() {
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Firebase';
    testBtn.className = 'bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded';
    testBtn.onclick = testFirestoreAccess;
    document.querySelector('.flex.space-x-4').appendChild(testBtn);
});
