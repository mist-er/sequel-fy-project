# Quick Debugging Guide for Owner Dashboard Bookings

## Issue: Bookings not showing in owner dashboard

### Step 1: Check Browser Console
1. Open owner dashboard
2. Press F12 to open DevTools
3. Click "Console" tab
4. Look for any red error messages
5. Check if you see: "Error loading venues" or "Error loading bookings"

### Step 2: Verify User is Logged In as Owner
```javascript
// In browser console, type:
JSON.parse(localStorage.getItem('user'))
// Should show: { role: 'owner', _id: '...', name: '...' }
```

### Step 3: Check if Venues Exist
1. Go to "My Venues" tab
2. Do you see any venues?
3. If NO venues exist, create one first!

### Step 4: Check if Bookings Exist
Open browser console and run:
```javascript
fetch('http://localhost:3000/api/bookings')
  .then(r => r.json())
  .then(data => console.log('All bookings:', data.bookings))
```

### Step 5: Check Booking Tab Elements
In browser console:
```javascript
console.log('Bookings list element:', document.getElementById('bookingsList'));
console.log('No bookings element:', document.getElementById('noBookings'));
console.log('Status filter:', document.getElementById('bookingStatusFilter'));
```

### Step 6: Manual Test - Call Function Directly
In browser console:
```javascript
// Check if function exists
console.log(typeof loadOwnerBookings);
// Should show: "function"

// Call it manually
loadOwnerBookings();
```

### Common Issues:

**No bookings created yet**
- Solution: Login as organizer, book a venue owned by this owner

**Wrong user role**
- Solution: Make sure you're logged in as 'owner', not 'organizer'

**Venues don't belong to this owner**
- Solution: Check venue's owner field matches current user's _id

**API endpoint error**
- Solution: Check backend is running on port 3000
- Test: http://localhost:3000/api/bookings

**JavaScript not loaded**
- Solution: Hard refresh (Ctrl+Shift+R)
- Check: View page source, search for "BOOKING MANAGEMENT FUNCTIONS"
