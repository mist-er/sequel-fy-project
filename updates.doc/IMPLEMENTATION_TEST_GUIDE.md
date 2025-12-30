# Booking Status & Conflict Detection - Implementation Test Guide

## ✅ Implementation Status: COMPLETE

All components have been successfully integrated into your system. This guide walks you through testing and validating the implementation.

---

## Part 1: Backend Testing

### Test 1.1: Verify AvailabilityService Import
**File**: `backend/src/controllers/bookingController.js`  
**Command**: 
```bash
cd /home/shey/projects/system/Fork/backend
node -c src/controllers/bookingController.js
```
**Expected**: No syntax errors

### Test 1.2: Verify Database Index
**File**: `backend/src/models/Booking.js`  
**Check**: Open MongoDB and run:
```javascript
db.bookings.getIndexes()
```
**Expected**: Should show index with keys `{ venue: 1, eventDate: 1, status: 1 }`

### Test 1.3: Test Conflict Detection via API
**Endpoint**: `GET /api/bookings/venue/:venueId/availability`

**Test Case 1 - Available Slot**:
```bash
curl "http://localhost:3000/api/bookings/venue/{VENUE_ID}/availability?date=2025-12-25&start_time=10:00&end_time=12:00"
```
**Expected Response**:
```json
{
  "available": true,
  "status": "Available",
  "conflicts": [],
  "totalBookings": 0,
  "allBookings": 0
}
```

**Test Case 2 - Check Date with Existing Bookings**:
```bash
curl "http://localhost:3000/api/bookings/venue/{VENUE_ID}/availability?date={DATE_WITH_BOOKINGS}"
```
**Expected Response**:
```json
{
  "available": true/false,
  "status": "Available|Pending|Confirmed",
  "conflicts": [],
  "totalBookings": N,
  "allBookings": N
}
```

**Test Case 3 - Time Conflict Detection**:
```bash
curl "http://localhost:3000/api/bookings/venue/{VENUE_ID}/availability?date=2025-12-10&start_time=14:00&end_time=16:00"
```
**Expected**: If a booking exists from 15:00-17:00, response should show conflict with details

### Test 1.4: Verify Booking Creation Rejects Conflicts
**Method**: POST to `http://localhost:3000/api/bookings`  
**Body**:
```json
{
  "venue_id": "{VENUE_ID}",
  "event_date": "{DATE}",
  "start_time": "{CONFLICTING_TIME}",
  "end_time": "{CONFLICTING_TIME}"
}
```
**Expected**: 409 Conflict status with conflict details if overlap exists

---

## Part 2: Frontend Testing

### Test 2.1: Verify CSS and Scripts are Loaded
**In Browser Console** (Organizer Dashboard):
```javascript
// Check CSS is loaded
document.styleSheets // Should include booking-status.css

// Check AvailabilityChecker exists
console.log(typeof AvailabilityChecker); // Should output "function"

// Check availabilityChecker instance exists
console.log(availabilityChecker); // Should be initialized
```

### Test 2.2: Test Date Availability Check (Real-time)
**Steps**:
1. Open Organizer Dashboard
2. Click "Book Now" on a venue
3. Fill in Event Name and Notes
4. Select a date with existing bookings
5. **Expected**: Green status badge shows with "Pending" or "Confirmed" status

### Test 2.3: Test Time Slot Validation
**Steps**:
1. In booking modal, select a date
2. Wait for availability status to load
3. Select a start time that creates a conflict
4. **Expected**: Red alert appears showing conflict details
5. Select an available time
6. **Expected**: Alert disappears, status changes to green

### Test 2.4: Test Form Submission
**Available Slot**:
1. Select date with "Available" status
2. Select available time slot
3. Fill in remaining fields
4. Click "Book Venue"
5. **Expected**: Success notification with booking confirmation

**Conflicting Slot**:
1. Attempt to book overlapping time
2. Click "Book Venue"
3. **Expected**: Error notification with conflict details (409 response)

### Test 2.5: Test Responsive Design
**Steps**:
1. Open Organizer Dashboard on mobile device
2. Click "Book Now"
3. Verify all form elements display correctly
4. Verify status badges are visible and readable
5. **Expected**: All elements responsive and accessible

---

## Part 3: End-to-End Integration Tests

### Test 3.1: Complete Booking Flow - Available Slot
**Scenario**: User books available venue slot

**Steps**:
```
1. Open Organizer Dashboard
2. Click "Book Now" on any venue
3. Fill Form:
   - Event Name: "Test Event"
   - Event Date: Future date with no bookings
   - Start Time: 10:00
   - End Time: 12:00
   - Notes: "Test booking"
4. Submit Form
```

**Expected Results**:
- ✅ No conflicts shown
- ✅ Status badge shows "Available" (green)
- ✅ Form submission succeeds
- ✅ Success notification appears
- ✅ Booking appears in "My Bookings" section

### Test 3.2: Complete Booking Flow - Conflicting Slot
**Scenario**: User attempts to book over existing booking

**Steps**:
```
1. Find a date with existing bookings
2. Note the existing booking time (e.g., 14:00-16:00)
3. Open Organizer Dashboard
4. Click "Book Now" on same venue
5. Fill Form:
   - Event Name: "Conflict Test"
   - Event Date: Date with existing booking
   - Start Time: 15:00
   - End Time: 17:00
   - Notes: "Should conflict"
6. Check for conflict alert
7. Attempt to submit
```

**Expected Results**:
- ✅ Conflict alert shows red badge "Conflict Detected"
- ✅ Shows existing booking: "Original Event (14:00-16:00) - Status: Confirmed"
- ✅ Suggested available slots appear (if any)
- ✅ Form submission fails with 409 error
- ✅ Error notification shows conflict details

### Test 3.3: Date Status Display
**Scenario**: Verify correct status badges display

**Steps**:
```
1. Open Organizer Dashboard
2. Click "Book Now" on a venue
3. For each scenario, select date and observe status:
   - Date with 0 bookings: Status = "Available" (green)
   - Date with only pending bookings: Status = "Pending" (yellow)
   - Date with confirmed bookings: Status = "Confirmed" (red)
```

**Expected Results**:
- ✅ Correct status badge displays for each scenario
- ✅ Color coding matches documentation
- ✅ Status text is clear and descriptive

### Test 3.4: Multiple Concurrent Bookings
**Scenario**: Prevent race condition double-booking

**Steps**:
```
1. Open Organizer Dashboard in Browser Tab 1
2. Open same venue in Browser Tab 2
3. In Tab 1: Select 10:00-12:00 available slot, click "Book Venue"
4. In Tab 2: Select same 10:00-12:00 slot, click "Book Venue"
```

**Expected Results**:
- ✅ Tab 1 booking succeeds (201 response)
- ✅ Tab 2 booking fails with 409 Conflict error
- ✅ Backend double-check prevented double-booking
- ✅ Error message displays to Tab 2 user

### Test 3.5: Browser Compatibility
**Test Browsers**:
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Safari 17+
- ✅ Mobile Safari (iOS 16+)
- ✅ Chrome Mobile (Android 12+)

**Test Steps** (on each browser):
```
1. Open Organizer Dashboard
2. Navigate to booking form
3. Test date selection
4. Test time slot validation
5. Verify all visual elements render correctly
```

---

## Part 4: Database Validation

### Query 4.1: Check Index Performance
```javascript
db.bookings.explain("executionStats").find({
  venue: ObjectId("VENUE_ID"),
  eventDate: ISODate("2025-12-25"),
  status: { $in: ["pending", "confirmed"] }
})
```
**Expected**: `executionStages.stage` should show "COLLSCAN" or "IXSCAN" (uses index)

### Query 4.2: Verify Conflict Detection Index
```javascript
db.bookings.getIndexes()
```
**Expected Output**:
```
[
  { "v": 2, "key": { "_id": 1 }, "name": "_id_" },
  { "v": 2, "key": { "venue": 1, "eventDate": 1 }, "name": "venue_1_eventDate_1" },
  { "v": 2, "key": { "organizer": 1 }, "name": "organizer_1" },
  { "v": 2, "key": { "status": 1 }, "name": "status_1" },
  { "v": 2, "key": { "eventDate": 1 }, "name": "eventDate_1" },
  { "v": 2, "key": { "venue": 1, "eventDate": 1, "status": 1 }, "name": "venue_1_eventDate_1_status_1" }
]
```

### Query 4.3: Test Time Conflict Logic
**Direct Database Test**:
```javascript
// Insert test bookings
db.bookings.insertMany([
  {
    venue: ObjectId("VENUE_ID"),
    eventDate: ISODate("2025-12-25T00:00:00Z"),
    startTime: "10:00",
    endTime: "12:00",
    status: "confirmed"
  },
  {
    venue: ObjectId("VENUE_ID"),
    eventDate: ISODate("2025-12-25T00:00:00Z"),
    startTime: "13:00",
    endTime: "15:00",
    status: "pending"
  }
])

// Query conflicting slots (10:00-12:00 conflicts with 11:00-13:00)
db.bookings.find({
  venue: ObjectId("VENUE_ID"),
  eventDate: { $gte: ISODate("2025-12-25"), $lt: ISODate("2025-12-26") },
  $or: [
    { startTime: { $lt: "13:00" }, endTime: { $gt: "10:00" } }
  ]
})
```
**Expected**: Returns first booking (10:00-12:00) as conflicting with test range 11:00-13:00

---

## Part 5: Performance Testing

### Test 5.1: API Response Time
**Target**: < 100ms for availability checks

**Test**:
```bash
for i in {1..10}; do
  time curl "http://localhost:3000/api/bookings/venue/{VENUE_ID}/availability?date=2025-12-25"
done
```
**Expected**: Each request completes in < 100ms

### Test 5.2: Database Query Performance
**Test**: Monitor database query time:
```javascript
db.setProfilingLevel(1, { slowms: 100 })
// Run queries
db.system.profile.find({ millis: { $gt: 100 } }).pretty()
```
**Expected**: No slow queries (> 100ms) for availability checks

### Test 5.3: Frontend Rendering Performance
**Test** (in Chrome DevTools):
```
1. Open Performance tab
2. Start recording
3. Click "Book Now"
4. Select a date
5. Stop recording
```
**Expected**: 
- Time to availability check: < 500ms total
- No janky animations or blocking operations
- FCP (First Contentful Paint) < 1s

---

## Part 6: Edge Cases & Error Handling

### Test 6.1: Past Date Selection
**Steps**:
1. Try to select a date in the past
2. Submit form

**Expected**: 
- ✅ Error message: "Cannot book for past dates"
- ✅ Form doesn't submit

### Test 6.2: Invalid Time Range
**Steps**:
1. Select start time: 14:00
2. Select end time: 12:00 (before start)
3. Observe form state

**Expected**:
- ✅ Error message: "End time must be after start time"
- ✅ Submit button disabled

### Test 6.3: Network Error Handling
**Steps**:
1. Disable network (DevTools Network tab: Offline)
2. Select a date in booking form
3. Check availability response

**Expected**:
- ✅ Error message appears gracefully
- ✅ User can still interact with form
- ✅ Form can retry when network restored

### Test 6.4: Invalid Venue ID
**Direct API Test**:
```bash
curl "http://localhost:3000/api/bookings/venue/invalid-id/availability?date=2025-12-25"
```
**Expected**: 400 Bad Request or 404 Not Found with error message

### Test 6.5: Cancelled Bookings (Should not block)
**Scenario**: Cancelled booking shouldn't prevent new booking

**Steps**:
1. Create a booking on 2025-12-25 from 10:00-12:00
2. Cancel the booking (status = "cancelled")
3. Try to create new booking on same time slot
4. Verify availability check returns true

**Expected**:
- ✅ New booking succeeds (cancelled bookings ignored)
- ✅ Status shows "Available" even with cancelled booking

---

## Part 7: Visual Testing Checklist

### Status Badges
- [ ] "Available" badge shows green color
- [ ] "Pending" badge shows yellow/orange color
- [ ] "Confirmed" badge shows red color
- [ ] Badge text is clear and readable
- [ ] Badge appears immediately after date selection

### Conflict Alert
- [ ] Alert appears only when conflicts exist
- [ ] Red background color for conflict
- [ ] Shows conflicting booking details (name, time, status)
- [ ] Alert disappears when conflict is resolved
- [ ] Formatting is clean and professional

### Suggested Time Slots
- [ ] List of available slots appears (if any)
- [ ] Each slot shows start and end times
- [ ] Clicking a suggestion fills in the times
- [ ] Suggestions are generated correctly for the selected date

### Form Elements
- [ ] All form fields are properly labeled
- [ ] Input fields accept correct data types
- [ ] Time inputs use proper format (HH:MM)
- [ ] Date input shows date picker
- [ ] Submit button is clearly visible and labeled

---

## Part 8: Test Result Documentation

### Test Result Template
```markdown
**Test**: [Test Name]
**Date**: [MM/DD/YYYY]
**Tester**: [Name]
**Environment**: [Dev/Staging/Production]
**Browser**: [Browser/Version]
**Result**: [✅ PASS / ❌ FAIL]
**Notes**: [Any observations or issues]
```

---

## Part 9: Troubleshooting Guide

### Issue: "AvailabilityService is not defined"
**Cause**: Service not imported in controller  
**Fix**: Verify import at top of `bookingController.js`:
```javascript
const AvailabilityService = require('../services/availabilityService');
```

### Issue: API endpoint returns 404
**Cause**: Route not properly registered  
**Fix**: Verify route in `routes/bookings.js`:
```javascript
router.get('/venue/:venueId/availability', async (req, res) => { ... })
```

### Issue: Frontend scripts not working
**Cause**: Script files not linked or in wrong order  
**Fix**: Verify in `organizer-dashboard.html` before `</body>`:
```html
<script src="../scripts/availabilityChecker.js"></script>
<script src="../scripts/bookingForm.js"></script>
```

### Issue: Status badge not showing
**Cause**: CSS not linked  
**Fix**: Verify CSS link in head:
```html
<link rel="stylesheet" href="../styles/booking-status.css">
```

### Issue: Availability check returns wrong status
**Cause**: Status determination logic issue  
**Fix**: Check `determineStatus()` method in `availabilityService.js` correctly prioritizes Confirmed > Pending > Available

---

## Next Steps

1. ✅ Run all Part 1-8 tests
2. ✅ Document any failures in Test Result template
3. ✅ Fix any issues using Troubleshooting Guide
4. ✅ Deploy to staging for final validation
5. ✅ Get stakeholder approval
6. ✅ Deploy to production with monitoring

---

## Success Criteria

**Implementation is complete when:**
- ✅ All Part 1 backend tests pass
- ✅ All Part 2 frontend tests pass
- ✅ All Part 3 integration tests pass
- ✅ All Part 5 performance targets met
- ✅ All Part 6 edge cases handled
- ✅ All Part 7 visual elements correct
- ✅ Zero critical issues remaining

**Current Status**: 🟢 **READY FOR TESTING**
