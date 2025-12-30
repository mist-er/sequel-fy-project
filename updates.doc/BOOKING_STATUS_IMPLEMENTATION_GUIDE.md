# Booking Status & Conflict Detection Implementation Guide

## Current System Analysis

### What's Already Implemented ✓
1. **Booking Status Field** - Database model has `status` field with values: `pending`, `confirmed`, `cancelled`
2. **Basic Time Conflict Detection** - `isTimeConflict()` helper method exists in BookingController
3. **Availability Check Endpoint** - `/api/bookings/venue/:venueId/availability` endpoint exists
4. **Date Filtering** - Bookings are indexed by venue and date for performance

### What Needs Enhancement 🔧

---

## Implementation Strategy (Complete Solution)

### **PHASE 1: Backend Enhancements**

#### 1.1 Create a Dedicated Availability Service
**File:** `backend/src/services/availabilityService.js` (NEW)

This service will handle:
- Venue availability checking
- Booking conflict detection
- Status-based filtering
- Time slot availability

```javascript
// Key methods needed:
- checkVenueAvailability(venueId, date, startTime, endTime)
- getVenueBookingsForDate(venueId, date)
- getBookingStatus(venueId, date) → Returns "Available", "Pending", "Confirmed"
- detectConflicts(venueId, date, startTime, endTime)
- getAvailableTimeSlots(venueId, date)
```

#### 1.2 Enhance Booking Model
**File:** `backend/src/models/Booking.js` (MODIFY)

Add:
- `availabilityStatus` virtual field that shows "Available/Pending/Confirmed"
- Index for faster conflict detection: `bookingSchema.index({ venue: 1, eventDate: 1, status: 1 })`
- Static methods for conflict checking

#### 1.3 Create New API Endpoints
**File:** `backend/src/routes/bookings.js` (MODIFY)

Add these endpoints:

```
GET /api/bookings/venue/:venueId/availability
  - Query: date, start_time, end_time
  - Response: { available: bool, status: "Available|Pending|Confirmed", conflicts: [] }

GET /api/bookings/venue/:venueId/calendar
  - Query: month, year
  - Response: Calendar view with booked/pending/available dates

GET /api/bookings/venue/:venueId/status
  - Query: date
  - Response: { status: "Available|Pending|Confirmed", bookingCount: 0, details: [] }
```

#### 1.4 Update Booking Controller
**File:** `backend/src/controllers/bookingController.js` (MODIFY)

Enhance `createBooking()` method:
- Before creating, check for conflicts with **pending AND confirmed** bookings
- Return detailed conflict information
- Prevent double booking with transaction

```javascript
// Add this validation BEFORE creating booking:
const conflicts = await Booking.find({
  venue: venue_id,
  eventDate: new Date(event_date),
  status: { $in: ['pending', 'confirmed'] },
  $or: [
    { startTime: { $lt: end_time }, endTime: { $gt: start_time } }
  ]
});

if (conflicts.length > 0) {
  return res.status(409).json({
    message: 'Time slot conflict detected',
    conflicts: conflicts,
    availableSlots: await getAvailableSlots()
  });
}
```

#### 1.5 Add Helper Methods
**File:** `backend/src/controllers/bookingController.js` (ADD)

```javascript
static async getBookingStatusForDate(venueId, date) {
  // Check what bookings exist for a date
  // Return: "Available", "Pending", "Confirmed"
}

static async getConflictingBookings(venueId, date, startTime, endTime) {
  // Get all bookings that overlap with requested time
}

static async getAvailableTimeSlots(venueId, date) {
  // Return array of available time slots: ["09:00-10:00", "14:00-18:00"]
}
```

---

### **PHASE 2: Frontend Enhancements**

#### 2.1 Create Availability Checker Component
**File:** `frontend/scripts/availabilityChecker.js` (NEW)

```javascript
class AvailabilityChecker {
  constructor(venueId, apiBase) {
    this.venueId = venueId;
    this.apiBase = apiBase;
  }

  async checkAvailability(date, startTime, endTime) {
    // Returns: { available, status, conflicts, message }
  }

  async getCalendarStatus(month, year) {
    // Returns calendar with color coding
  }

  getStatusBadgeColor(status) {
    // Returns CSS class or color based on status
  }
}
```

#### 2.2 Update Organizer Dashboard
**File:** `frontend/pages/organizer-dashboard.html` (MODIFY)

Add these UI elements:

**1. Venue Selection with Status Display:**
```html
<div class="venue-selector">
  <select id="venueSelect" onchange="onVenueSelected()">
    <option value="">Select Venue...</option>
  </select>
  <div id="venueStatus" class="status-badge">
    Status: <span id="statusDisplay"></span>
  </div>
</div>
```

**2. Calendar Picker with Availability:**
```html
<div class="availability-calendar">
  <input type="date" id="eventDate" onchange="checkDateAvailability()">
  <div id="dateStatus" class="status-display">
    <!-- Shows: Available / Pending / Confirmed -->
  </div>
</div>
```

**3. Time Slot Selector:**
```html
<div class="time-selection">
  <div class="form-group">
    <label>Start Time</label>
    <input type="time" id="startTime" onchange="checkTimeConflict()">
  </div>
  <div class="form-group">
    <label>End Time</label>
    <input type="time" id="endTime" onchange="checkTimeConflict()">
  </div>
  <div id="timeConflictAlert" class="alert alert-warning" style="display:none;">
    <!-- Conflicts shown here -->
  </div>
</div>
```

**4. Real-time Availability Status:**
```html
<div class="availability-status">
  <div id="availabilityIcon"></div>
  <p id="availabilityMessage"></p>
  <div id="conflictsList" class="conflicts-list"></div>
</div>
```

#### 2.3 JavaScript Logic for Frontend
**File:** `frontend/scripts/bookingForm.js` (MODIFY/CREATE)

```javascript
// Real-time availability checking
async function checkDateAvailability() {
  const venueId = document.getElementById('venueSelect').value;
  const date = document.getElementById('eventDate').value;
  
  if (!venueId || !date) return;
  
  const response = await fetch(
    `${API_BASE}/bookings/venue/${venueId}/availability?date=${date}`
  );
  const data = await response.json();
  
  updateStatusDisplay(data);
}

async function checkTimeConflict() {
  const venueId = document.getElementById('venueSelect').value;
  const date = document.getElementById('eventDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  
  if (!venueId || !date || !startTime || !endTime) return;
  
  const response = await fetch(
    `${API_BASE}/bookings/venue/${venueId}/availability?date=${date}&start_time=${startTime}&end_time=${endTime}`
  );
  const data = await response.json();
  
  if (!data.available) {
    showConflictWarning(data.conflicting_bookings);
  }
}

function updateStatusDisplay(data) {
  const statusElement = document.getElementById('dateStatus');
  let statusClass = 'status-available';
  let statusText = 'Available';
  
  if (data.total_bookings_on_date > 0) {
    statusClass = 'status-pending';
    statusText = 'Has Pending/Confirmed Bookings';
  }
  
  statusElement.innerHTML = `
    <span class="status-badge ${statusClass}">
      ${statusText}
    </span>
  `;
}

function showConflictWarning(conflicts) {
  const alertElement = document.getElementById('timeConflictAlert');
  const conflictsList = document.getElementById('conflictsList');
  
  alertElement.style.display = 'block';
  conflictsList.innerHTML = `
    <h6>Conflicting Bookings:</h6>
    <ul>
      ${conflicts.map(b => `
        <li>${b.eventName} (${b.startTime} - ${b.endTime})</li>
      `).join('')}
    </ul>
  `;
}
```

#### 2.4 Add CSS for Status Display
**File:** `frontend/styles/custom.css` (ADD)

```css
/* Status Badge Colors */
.status-badge {
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
  display: inline-block;
  margin: 10px 0;
}

.status-available {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-confirmed {
  background-color: #cfe2ff;
  color: #084298;
  border: 1px solid #b6d4fe;
}

/* Conflict Display */
.conflicts-list {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 12px;
  margin: 10px 0;
  border-radius: 4px;
}

.conflicts-list h6 {
  margin: 0 0 8px 0;
  color: #856404;
}

.conflicts-list ul {
  margin: 0;
  padding-left: 20px;
}

.conflicts-list li {
  margin: 4px 0;
  color: #856404;
}

/* Availability Display */
.availability-status {
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
  text-align: center;
}

.availability-status.available {
  background: #d4edda;
  color: #155724;
}

.availability-status.unavailable {
  background: #f8d7da;
  color: #721c24;
}

#availabilityIcon {
  font-size: 32px;
  margin-bottom: 10px;
}

.availability-status.available #availabilityIcon::before {
  content: "✓";
  color: #28a745;
}

.availability-status.unavailable #availabilityIcon::before {
  content: "✗";
  color: #dc3545;
}
```

---

### **PHASE 3: Owner Dashboard Enhancements**

#### 3.1 Booking Overview Widget
**File:** `frontend/pages/owner-dashboard.html` (MODIFY)

Add a section to show:
- Total bookings (by status)
- Upcoming bookings
- Pending confirmations
- Availability calendar

```html
<div class="booking-overview">
  <div class="row">
    <div class="col-md-3">
      <div class="status-card available">
        <h6>Available</h6>
        <p class="count" id="availableCount">0</p>
      </div>
    </div>
    <div class="col-md-3">
      <div class="status-card pending">
        <h6>Pending</h6>
        <p class="count" id="pendingCount">0</p>
      </div>
    </div>
    <div class="col-md-3">
      <div class="status-card confirmed">
        <h6>Confirmed</h6>
        <p class="count" id="confirmedCount">0</p>
      </div>
    </div>
    <div class="col-md-3">
      <div class="status-card cancelled">
        <h6>Cancelled</h6>
        <p class="count" id="cancelledCount">0</p>
      </div>
    </div>
  </div>
</div>
```

---

## Implementation Priority & Sequence

### **Week 1: Core Backend**
1. Create `availabilityService.js`
2. Update Booking model with new indexes
3. Add new API endpoints
4. Enhanced validation in `createBooking()`

### **Week 2: Frontend Integration**
1. Create `availabilityChecker.js`
2. Update organizer dashboard with real-time checking
3. Add CSS styling
4. Test conflict detection

### **Week 3: Owner Dashboard**
1. Add booking statistics widgets
2. Create calendar view
3. Display pending approvals

---

## API Response Examples

### GET `/api/bookings/venue/:venueId/availability`
```json
{
  "message": "Availability checked successfully",
  "venue_id": "63f4e8a2b1c9d4e5f6g7h8i9",
  "date": "2025-01-15",
  "available": false,
  "status": "Confirmed",
  "conflicting_bookings": [
    {
      "_id": "63f4e8a2b1c9d4e5f6g7h8i0",
      "eventName": "Wedding Reception",
      "startTime": "14:00",
      "endTime": "22:00",
      "status": "confirmed"
    }
  ],
  "total_bookings_on_date": 1
}
```

### POST `/api/bookings` (with conflict detection)
```json
{
  "message": "Cannot create booking - time slot conflict detected",
  "error": "TIME_CONFLICT",
  "conflicts": [
    {
      "eventName": "Corporate Event",
      "startTime": "10:00",
      "endTime": "14:00",
      "status": "pending"
    }
  ],
  "availableSlots": ["08:00-09:00", "15:00-18:00"]
}
```

---

## Database Optimization

### Recommended Indexes
```javascript
// Booking.js model
bookingSchema.index({ venue: 1, eventDate: 1 });
bookingSchema.index({ venue: 1, eventDate: 1, status: 1 });
bookingSchema.index({ organizer: 1, status: 1 });
bookingSchema.index({ status: 1, eventDate: 1 });
bookingSchema.compound({ venue: 1, eventDate: 1, startTime: 1, endTime: 1 });
```

---

## Testing Checklist

- [ ] Cannot create booking when time slot occupied
- [ ] Can create booking when available
- [ ] Status displays correctly (Available/Pending/Confirmed)
- [ ] Time conflict detection works with overlapping times
- [ ] Multiple bookings on same date show conflicts
- [ ] Frontend shows real-time availability
- [ ] Owner can see booking status breakdown
- [ ] Organizer sees available time slots

---

## Security Considerations

1. **Authorization**: Only venue owner can confirm/cancel bookings
2. **Rate Limiting**: Prevent rapid booking attempts
3. **Data Validation**: Validate dates, times, and venue ID
4. **Audit Logging**: Log all booking status changes

---

## Future Enhancements

1. **SMS/Email Notifications** on status changes
2. **Auto-confirmation** after payment
3. **Booking Reminders** (48h, 24h before event)
4. **Cancellation Policies** with refund rules
5. **Booking Analytics** and reports
6. **Waitlist Management** for fully booked dates
