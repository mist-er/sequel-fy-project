# Booking Status & Conflict Detection - Implementation Checklist

## 📋 Quick Start

### Step 1: Add Backend Files (30 mins)
- ✅ **Created:** `/backend/src/services/availabilityService.js`
  - Handles all availability checking logic
  - Conflict detection
  - Time slot generation
  - Monthly calendar data

### Step 2: Add Frontend Files (20 mins)
- ✅ **Created:** `/frontend/scripts/availabilityChecker.js`
  - Frontend utility class for availability checking
  - Caching system for performance
  - Status badge generation
  - Conflict formatting

- ✅ **Created:** `/frontend/scripts/bookingForm.js`
  - Real-time form integration
  - Event listeners for venue/date/time
  - UI updates
  - Form submission handling

- ✅ **Created:** `/frontend/styles/booking-status.css`
  - All styling for status badges
  - Availability cards
  - Conflict alerts
  - Dark theme support

### Step 3: Add Documentation
- ✅ **Created:** `/BOOKING_STATUS_IMPLEMENTATION_GUIDE.md`
  - Complete implementation strategy
  - API examples
  - Database optimization
  - Testing checklist

---

## 🔧 Implementation Tasks

### Backend Implementation (REQUIRED)

#### Task 1: Update Booking Model
**File:** `backend/src/models/Booking.js`

```javascript
// Add to existing indexes:
bookingSchema.index({ venue: 1, eventDate: 1, status: 1 });

// Add compound index for conflict detection:
bookingSchema.index({ venue: 1, eventDate: 1, startTime: 1, endTime: 1 });
```

**Status:** ⏳ TODO

---

#### Task 2: Update Booking Controller
**File:** `backend/src/controllers/bookingController.js`

**In `createBooking()` method, add this BEFORE creating the booking:**

```javascript
// Check for time conflicts
const existingBookings = await Booking.find({
  venue: venue_id,
  eventDate: new Date(event_date),
  status: { $in: ['pending', 'confirmed'] }
});

const conflicts = existingBookings.filter(booking => 
  this.isTimeConflict(start_time, end_time, booking.startTime, booking.endTime)
);

if (conflicts.length > 0) {
  return res.status(409).json({
    message: 'Time slot conflict detected',
    error: 'BOOKING_CONFLICT',
    conflicts: conflicts.map(c => ({
      eventName: c.eventName,
      startTime: c.startTime,
      endTime: c.endTime,
      status: c.status
    }))
  });
}
```

**Status:** ⏳ TODO

---

#### Task 3: Update Booking Routes
**File:** `backend/src/routes/bookings.js`

**Add import for AvailabilityService:**

```javascript
const AvailabilityService = require('../services/availabilityService');
```

**Add new endpoints:**

```javascript
// Check availability for a date
router.get('/venue/:venueId/availability', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { date, start_time, end_time } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (start_time && end_time) {
      const result = await AvailabilityService.checkTimeSlotAvailability(
        venueId, date, start_time, end_time
      );
      return res.json({
        message: 'Time slot availability checked',
        ...result
      });
    } else {
      const result = await AvailabilityService.checkDateAvailability(venueId, date);
      return res.json({
        message: 'Date availability checked',
        ...result
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly calendar
router.get('/venue/:venueId/calendar', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { month, year } = req.query;

    const calendar = await AvailabilityService.getMonthlyAvailability(
      venueId, 
      parseInt(month) || new Date().getMonth() + 1,
      parseInt(year) || new Date().getFullYear()
    );

    res.json({
      message: 'Calendar retrieved',
      calendar
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
```

**Status:** ⏳ TODO

---

### Frontend Implementation (REQUIRED)

#### Task 4: Add CSS to HTML
**File:** `frontend/pages/organizer-dashboard.html`

In the `<head>` section, add:

```html
<link rel="stylesheet" href="../styles/booking-status.css">
```

**Status:** ⏳ TODO

---

#### Task 5: Add Scripts to HTML
**File:** `frontend/pages/organizer-dashboard.html`

Before closing `</body>` tag, add:

```html
<script src="../scripts/availabilityChecker.js"></script>
<script src="../scripts/bookingForm.js"></script>
```

**Status:** ⏳ TODO

---

#### Task 6: Update Booking Form HTML
**File:** `frontend/pages/organizer-dashboard.html`

Find the booking form section and update it:

```html
<form id="bookingForm" onsubmit="handleBookingSubmit(event)">
  <!-- Venue Selection -->
  <div class="form-group">
    <label for="venueSelect">Select Venue *</label>
    <select id="venueSelect" required>
      <option value="">Choose a venue...</option>
    </select>
  </div>

  <!-- Event Details -->
  <div class="form-group">
    <label for="eventName">Event Name *</label>
    <input type="text" id="eventName" required>
  </div>

  <!-- Date Selection with Status -->
  <div class="form-group">
    <label for="eventDate">Event Date *</label>
    <input type="date" id="eventDate" required>
    <div id="dateAvailabilityStatus" class="mt-2"></div>
    <div id="timeSlotSuggestions"></div>
  </div>

  <!-- Time Selection with Conflict Detection -->
  <div class="row">
    <div class="col-md-6">
      <div class="form-group">
        <label for="startTime">Start Time *</label>
        <input type="time" id="startTime" required>
      </div>
    </div>
    <div class="col-md-6">
      <div class="form-group">
        <label for="endTime">End Time *</label>
        <input type="time" id="endTime" required>
      </div>
    </div>
  </div>

  <!-- Conflict Alert -->
  <div id="timeConflictAlert"></div>

  <!-- Notes -->
  <div class="form-group">
    <label for="notes">Additional Notes</label>
    <textarea id="notes" rows="3"></textarea>
  </div>

  <!-- Submit Button -->
  <button type="submit" class="btn btn-primary">
    <i class="fas fa-calendar-check me-2"></i>Create Booking
  </button>
</form>

<!-- Hidden field for organizer ID -->
<input type="hidden" id="organizerId" value="<%= organizerId %>">
```

**Status:** ⏳ TODO

---

### Testing (RECOMMENDED)

#### Task 7: Test Conflict Detection
```bash
# Test 1: Create booking on available date
POST /api/bookings
{
  "venue_id": "64f...",
  "organizer_id": "63f...",
  "event_name": "Test Event",
  "event_date": "2025-02-15",
  "start_time": "10:00",
  "end_time": "12:00"
}

# Should return 201 Created

# Test 2: Try to create overlapping booking
POST /api/bookings
{
  "venue_id": "64f...",
  "organizer_id": "63f...",
  "event_name": "Conflicting Event",
  "event_date": "2025-02-15",
  "start_time": "11:00",
  "end_time": "13:00"
}

# Should return 409 Conflict with conflict details
```

**Status:** ⏳ TODO

---

#### Task 8: Test Frontend Availability Checker
1. Open organizer dashboard
2. Select a venue
3. Select a date with existing bookings
4. Verify status badge shows "Pending" or "Confirmed"
5. Try to select time slot with conflicts
6. Verify conflict alert appears
7. Try to select available time slot
8. Verify conflict alert disappears

**Status:** ⏳ TODO

---

### Optional Enhancements (NICE TO HAVE)

#### Task 9: Add Owner Dashboard Widgets
**File:** `frontend/pages/owner-dashboard.html`

Add booking status cards:

```html
<div class="booking-overview">
  <h3>Booking Status Overview</h3>
  <div class="row">
    <div class="col-md-3">
      <div class="status-card available">
        <h6>Available Dates</h6>
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

**Status:** ⏳ TODO

---

## 🚀 Deployment Checklist

- [ ] All backend files created/updated
- [ ] All frontend files created
- [ ] Database indexes added
- [ ] API endpoints tested
- [ ] Frontend integration tested
- [ ] Styles applied correctly
- [ ] Dark theme compatible
- [ ] Mobile responsive
- [ ] Error handling tested
- [ ] Performance optimized

---

## 📊 Feature Checklist

- [x] AvailabilityService created
- [x] availabilityChecker.js created
- [x] bookingForm.js created
- [x] booking-status.css created
- [ ] Backend validation updated
- [ ] API endpoints added
- [ ] Frontend integrated
- [ ] Owner dashboard updated
- [ ] Testing completed
- [ ] Documentation complete

---

## 📁 Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `backend/src/services/availabilityService.js` | Core availability logic | ✅ Created |
| `frontend/scripts/availabilityChecker.js` | Frontend availability utility | ✅ Created |
| `frontend/scripts/bookingForm.js` | Form integration | ✅ Created |
| `frontend/styles/booking-status.css` | Styling | ✅ Created |
| `backend/src/models/Booking.js` | Model updates | ⏳ TODO |
| `backend/src/controllers/bookingController.js` | Controller updates | ⏳ TODO |
| `backend/src/routes/bookings.js` | Route updates | ⏳ TODO |
| `frontend/pages/organizer-dashboard.html` | HTML integration | ⏳ TODO |
| `BOOKING_STATUS_IMPLEMENTATION_GUIDE.md` | Documentation | ✅ Created |

---

## 🎯 Priority Order

1. **HIGH** - Update Booking model with indexes
2. **HIGH** - Add conflict detection to createBooking()
3. **HIGH** - Add API endpoints for availability
4. **MEDIUM** - Integrate scripts and CSS in organizer dashboard
5. **MEDIUM** - Update booking form HTML
6. **LOW** - Add owner dashboard widgets
7. **LOW** - Performance optimization

---

## 💡 Key Points

- **Conflict Detection:** Prevents double bookings automatically
- **Status Display:** Shows Available/Pending/Confirmed for each date
- **Time Slots:** Suggests available time slots to users
- **Real-time:** Frontend checks availability as user inputs data
- **Caching:** Frontend caches results to reduce API calls
- **Responsive:** Works on desktop and mobile
- **Dark Mode:** Full dark theme support included

---

## 📞 Support

For questions about implementation:
1. Check the `BOOKING_STATUS_IMPLEMENTATION_GUIDE.md` for detailed info
2. Review API response examples in the guide
3. Test using provided test cases

---

## ✅ Completion Status: 45%

**Completed:** 4/9 tasks  
**Remaining:** 5/9 tasks

Next step: Update Booking Model indexes
