# eFinder - Venue Booking System Testing Guide

## Prerequisites
- Node.js v14+ installed
- MongoDB running
- Both frontend and backend servers running

## Starting the Application

### Backend Server
```bash
cd backend
npm install
npm run dev
```
Server runs on: http://localhost:3000

### Frontend Server
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: http://localhost:8080

---

## Complete Workflow Test

### Step 1: Create Test Owner Account
1. Navigate to: `http://localhost:8080/pages/signup.html`
2. Fill in signup form:
   - **Name**: Test Owner
   - **Email**: owner@test.com
   - **Password**: password123
   - **Role**: **OWNER** ⚠️ (Important!)
3. Click "Sign Up"
4. Login with the credentials

### Step 2: Add a Venue (as Owner)
1. From owner dashboard, click "**Add New Venue**" button
2. Fill in venue details:
   - **Venue Name**: Grand Ballroom Osu
   - **Description**: Beautiful event venue in the heart of Osu
   - **Location**: Oxford Street, Osu (or any Osu location)
   - **Category**: Wedding
   - **Capacity**: 200
   - **Price**: 5000
   - **Contact Email**: owner@test.com
   - **Contact Phone**: +233123456789
3. Upload venue photos (optional but recommended)
4. Click "**Add Venue**"
5. ✅ **Verify**: Venue appears in "My Venues" tab

### Step 3: Create Test Organizer Account
1. **Logout** from owner account (top right menu)
2. Go to signup page again: `http://localhost:8080/pages/signup.html`
3. Create organizer account:
   - **Name**: Test Organizer
   - **Email**: organizer@test.com
   - **Password**: password123
   - **Role**: **ORGANIZER** ⚠️ (Important!)
4. Login with organizer credentials

### Step 4: Browse and Book a Venue (as Organizer)
1. From organizer dashboard, ensure you're on "**Browse Venues**" tab
2. Find the "Grand Ballroom Osu" venue
3. Click "**Book Now**" button
4. Fill in booking form:
   - **Event Name**: Wedding Reception
   - **Event Date**: Select a future date (e.g., 2025-12-25)
   - **Start Time**: 18:00
   - **End Time**: 23:00
   - **Notes**: Need floral decorations and DJ setup
5. Click "**Submit Booking**"
6. ✅ **Verify**: 
   - Success message appears
   - Go to "My Bookings" tab
   - Booking shows with status "**PENDING**" (blue badge)
   - Payment status shows "**UNPAID**" (yellow badge)

### Step 5: Approve Booking (as Owner)
1. **Logout** from organizer account
2. **Login** as owner (owner@test.com / password123)
3. Click "**Bookings**" tab in sidebar
4. ✅ **Verify**: You should see:
   - "Wedding Reception" booking listed
   - Status: **PENDING** (blue badge)
   - Payment Status: **UNPAID** (yellow badge)
   - Venue: Grand Ballroom Osu
   - Organizer: Test Organizer
   - Event details (date, time, cost)
   - Two buttons: "**Approve**" (green) and "**Reject**" (red)

5. Click the green "**Approve**" button
6. Confirm in the popup dialog
7. ✅ **Verify**:
   - Success message: "Booking approved successfully"
   - Status changes to "**APPROVED**" (orange badge)
   - Approve/Reject buttons disappear
   - Dashboard stats update (Total Bookings count)

### Step 6: Make Payment (as Organizer)
1. **Logout** from owner account
2. **Login** as organizer
3. Go to "**My Bookings**" tab
4. Find the approved booking
5. ✅ **Verify**:
   - Status shows "**APPROVED**" (orange badge)
   - "**Make Payment**" button is visible
6. Click "**Make Payment**" button
7. Enter payment details:
   - **Payment Method**: Mobile Money
   - **Transaction ID**: TXN123456789
8. Submit payment
9. ✅ **Verify**:
   - Success message appears
   - Status changes to "**CONFIRMED**" (green badge)
   - Payment status changes to "**PAID**" (green badge)
   - "Edit" and "Cancel" buttons are now disabled

### Step 7: Verify Revenue Update (as Owner)
1. **Logout** from organizer account
2. **Login** as owner
3. Check dashboard overview
4. ✅ **Verify**:
   - **Total Revenue**: Shows GHS 5,000 (or your venue price)
   - **Total Bookings**: Shows 1
   - In Bookings tab: Status shows "**CONFIRMED**"
   - Payment info is visible

---

## Testing Additional Features

### Favorites Feature (Organizer)
1. Login as organizer
2. Browse venues
3. Click the ❤️ heart icon on any venue card
4. ✅ **Verify**: Heart icon turns red/filled
5. Click "**Favorites**" tab in sidebar
6. ✅ **Verify**: Venue appears in favorites list
7. Click heart icon again to remove
8. ✅ **Verify**: Venue removed from favorites

### Filters (Organizer)
1. In "Browse Venues" tab
2. **Location Filter**: Select "Osu Badu"
   - ✅ **Verify**: Only venues in Osu Badu show
3. **Category Filter**: Select "Wedding"
   - ✅ **Verify**: Only wedding venues show
4. **Availability Filter**: Select "Available"
   - ✅ **Verify**: Only active venues show
5. Clear all filters
   - ✅ **Verify**: All venues return

### Booking Management (Organizer)
1. Create a new booking (follow Step 4)
2. Before owner approves, go to "My Bookings"
3. Click "**Edit**" button
4. ✅ **Verify**: Can modify booking details
5. Click "**Cancel**" button
6. ✅ **Verify**: Booking status changes to "CANCELLED"

### Reject Booking (Owner)
1. Create a new booking as organizer
2. Login as owner
3. Go to Bookings tab
4. Click "**Reject**" button
5. Enter rejection reason (optional)
6. Submit
7. ✅ **Verify**: Status changes to "**REJECTED**" (red badge)

---

## API Endpoints to Test

### Users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user by ID

### Venues
- `POST /api/venues` - Create venue
- `GET /api/venues` - Get all venues
- `GET /api/venues/:id` - Get venue by ID
- `GET /api/venues/owner/:ownerId` - Get venues by owner
- `PUT /api/venues/:id` - Update venue
- `DELETE /api/venues/:id` - Delete venue

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `GET /api/bookings/organizer/:organizerId` - Get bookings by organizer
- `GET /api/bookings/venue/:venueId` - Get bookings by venue
- `PUT /api/bookings/:id` - Update booking
- `PATCH /api/bookings/:id/status` - Update booking status
- `PATCH /api/bookings/:id/approve` - Approve booking (owner)
- `PATCH /api/bookings/:id/reject` - Reject booking (owner)
- `DELETE /api/bookings/:id` - Cancel booking

### Payments
- `POST /api/payments/mark-paid/:bookingId` - Mark booking as paid
- `GET /api/payments/booking/:bookingId` - Get payment status
- `POST /api/payments/refund/:bookingId` - Process refund

### Favorites
- `POST /api/favorites/:userId/add/:venueId` - Add to favorites
- `DELETE /api/favorites/:userId/remove/:venueId` - Remove from favorites
- `GET /api/favorites/:userId` - Get user favorites
- `POST /api/favorites/:userId/toggle/:venueId` - Toggle favorite

---

## Troubleshooting

### Bookings Not Showing for Owner
**Problem**: Owner dashboard shows "No bookings yet"

**Solutions**:
1. Hard refresh page (Ctrl+Shift+R)
2. Check browser console (F12) for errors
3. Verify bookings exist for owner's venues
4. Ensure logged in as correct owner account

**Debug in Console**:
```javascript
// Check current user
console.log(JSON.parse(localStorage.getItem('user')));

// Manually trigger load
loadOwnerBookings();

// Check bookings data
console.log(allBookings);
```

### Payment Button Not Showing
**Problem**: Organizer can't see payment button

**Solution**:
- Booking must be **APPROVED** by owner first
- Status must be "approved", not "pending"
- Refresh the page after approval

### Filters Not Working
**Problem**: Selecting filters doesn't update venue list

**Solutions**:
1. Check browser console for JavaScript errors
2. Verify dashboard-script.js is loaded
3. Hard refresh (Ctrl+Shift+R)

### Backend Errors
**Problem**: 500 errors or connection refused

**Solutions**:
1. Check MongoDB is running
2. Verify backend server is running on port 3000
3. Check backend terminal for error messages
4. Ensure `.env` file has correct MongoDB URI

---

## Expected Behavior Summary

### Booking Status Flow
```
pending → approved (owner) → confirmed (after payment)
        ↓
     rejected
```

### Payment Status Flow
```
unpaid → paid → (optionally) refunded
```

### User Permissions
- **Organizer**: Can create bookings, add favorites, make payments
- **Owner**: Can approve/reject bookings, manage venues, view revenue

### Status Badges
- **PENDING**: Blue (info)
- **APPROVED**: Orange (warning)
- **CONFIRMED**: Green (success)
- **CANCELLED**: Gray (secondary)
- **REJECTED**: Red (danger)
- **UNPAID**: Yellow (warning)
- **PAID**: Green (success)
- **REFUNDED**: Red (danger)

---

## Test Data Cleanup

To reset and test again:
1. Delete test users from MongoDB
2. Delete test venues
3. Delete test bookings
4. Clear browser localStorage: `localStorage.clear()`

---

## Contact for Issues

If you encounter bugs or issues during testing:
1. Check browser console for errors
2. Check backend terminal for server errors
3. Verify MongoDB connection
4. Document the exact steps to reproduce
5. Include error messages and screenshots
