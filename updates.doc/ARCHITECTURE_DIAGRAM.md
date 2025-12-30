# System Architecture - Booking Status & Conflict Detection

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Browser)                            │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           Organizer Dashboard (organizer-dashboard.html)     │   │
│  │                                                               │   │
│  │  Booking Form:                                               │   │
│  │  ├─ Venue Select (dropdown)                                 │   │
│  │  ├─ Event Date (date input)                                 │   │
│  │  ├─ Start Time (time input)                                 │   │
│  │  └─ End Time (time input)                                   │   │
│  │                                                               │   │
│  │  Status Display:                                             │   │
│  │  ├─ #dateAvailabilityStatus                                 │   │
│  │  ├─ #timeSlotSuggestions                                    │   │
│  │  └─ #timeConflictAlert                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            availabilityChecker.js (Class)                   │   │
│  │                                                               │   │
│  │  Methods:                                                    │   │
│  │  • checkDateAvailability(venueId, date)                    │   │
│  │  • checkTimeSlotAvailability(venueId, date, start, end)    │   │
│  │  • getAvailableTimeSlots(venueId, date)                    │   │
│  │  • getMonthlyAvailability(venueId, month, year)            │   │
│  │  • getStatusLabel(availability)                             │   │
│  │  • isTimeConflict(start1, end1, start2, end2)              │   │
│  │                                                               │   │
│  │  Features:                                                   │   │
│  │  • Caching system (Map)                                      │   │
│  │  • Time conflict detection                                   │   │
│  │  • UI update helpers                                         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │            bookingForm.js (Event Handlers)                  │   │
│  │                                                               │   │
│  │  Event Listeners:                                            │   │
│  │  • handleVenueChange()                                       │   │
│  │  • handleDateChange()                                        │   │
│  │  • handleTimeChange()                                        │   │
│  │  • handleBookingSubmit()                                     │   │
│  │                                                               │   │
│  │  UI Updates:                                                 │   │
│  │  • updateDateAvailabilityDisplay()                          │   │
│  │  • showTimeConflicts()                                       │   │
│  │  • updateTimeSlotSuggestions()                              │   │
│  │  • enableSubmitButton() / disableSubmitButton()             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │        CSS Styling (booking-status.css)                    │   │
│  │                                                               │   │
│  │  Status Badges:                                              │   │
│  │  • .status-badge.*available (green)                         │   │
│  │  • .status-badge.*pending (yellow)                          │   │
│  │  • .status-badge.*confirmed (blue)                          │   │
│  │                                                               │   │
│  │  Components:                                                 │   │
│  │  • .availability-status-card                                │   │
│  │  • .conflicts-list                                           │   │
│  │  • .slot-suggestions                                         │   │
│  │  • .time-conflict-alert                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴────────────┐
                    │  HTTP/REST API         │
                    │  (JSON)                │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
   GET /availability    GET /calendar        POST /bookings


┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js/Express)                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           Booking Routes (routes/bookings.js)                │   │
│  │                                                                │   │
│  │  ├─ POST   /api/bookings                                     │   │
│  │  │         └─> createBooking (with conflict detection)       │   │
│  │  │                                                            │   │
│  │  ├─ GET    /api/bookings/venue/:venueId/availability        │   │
│  │  │         └─> Check date/time availability                 │   │
│  │  │                                                            │   │
│  │  ├─ GET    /api/bookings/venue/:venueId/calendar            │   │
│  │  │         └─> Get monthly availability                      │   │
│  │  │                                                            │   │
│  │  └─ PATCH  /api/bookings/:id/status                         │   │
│  │            └─> Update booking status                         │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │      Booking Controller (controllers/bookingController.js)   │   │
│  │                                                                │   │
│  │  createBooking():                                             │   │
│  │  1. Validate venue exists                                    │   │
│  │  2. Validate organizer exists                                │   │
│  │  3. Check date availability using AvailabilityService       │   │
│  │  4. Check for time conflicts                                 │   │
│  │  5. If conflict → return 409 with conflict details           │   │
│  │  6. Create booking in database                               │   │
│  │  7. Send notification                                         │   │
│  │  8. Return 201 with booking data                             │   │
│  │                                                                │   │
│  │  Other Methods:                                               │   │
│  │  • checkVenueAvailability()                                  │   │
│  │  • isTimeConflict()                                          │   │
│  │  • updateBookingStatus()                                     │   │
│  │  • getBookingsByVenue()                                      │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │     AvailabilityService (services/availabilityService.js)   │   │
│  │                                                                │   │
│  │  Core Methods:                                                │   │
│  │  • checkDateAvailability(venueId, date)                     │   │
│  │    → Returns { available, status, bookingCount }            │   │
│  │                                                                │   │
│  │  • checkTimeSlotAvailability(venueId, date, start, end)     │   │
│  │    → Returns { available, conflicts, status }               │   │
│  │                                                                │   │
│  │  • getBookingsForDate(venueId, date)                        │   │
│  │    → Returns array of Booking objects                       │   │
│  │                                                                │   │
│  │  • getAvailableTimeSlots(venueId, date, duration)           │   │
│  │    → Returns ["09:00-10:00", "10:00-11:00", ...]           │   │
│  │                                                                │   │
│  │  • getMonthlyAvailability(venueId, month, year)             │   │
│  │    → Returns calendar with status for each day              │   │
│  │                                                                │   │
│  │  • getBookingStatusForDate(venueId, date)                   │   │
│  │    → Returns "Available", "Pending", or "Confirmed"         │   │
│  │                                                                │   │
│  │  Helper Methods:                                              │   │
│  │  • isTimeConflict(start1, end1, start2, end2)               │   │
│  │  • determineStatus(bookings)                                 │   │
│  │  • generateTimeSlots(start, end, duration)                  │   │
│  │  • calculateDuration(startTime, endTime)                    │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │         Database Models & Queries (MongoDB)                 │   │
│  │                                                                │   │
│  │  Booking Model:                                               │   │
│  │  {                                                            │   │
│  │    _id: ObjectId,                                            │   │
│  │    venue: ObjectId (ref: Venue),                             │   │
│  │    organizer: ObjectId (ref: User),                          │   │
│  │    eventName: String,                                        │   │
│  │    eventDate: Date,                                          │   │
│  │    startTime: String (HH:MM),                                │   │
│  │    endTime: String (HH:MM),                                  │   │
│  │    status: "pending" | "confirmed" | "cancelled",          │   │
│  │    totalCost: Number,                                        │   │
│  │    isPaid: Boolean,                                          │   │
│  │    createdAt: Date,                                          │   │
│  │    updatedAt: Date                                           │   │
│  │  }                                                            │   │
│  │                                                                │   │
│  │  Key Indexes:                                                │   │
│  │  • { venue: 1, eventDate: 1 }                               │   │
│  │  • { venue: 1, eventDate: 1, status: 1 }                    │   │
│  │  • { venue: 1, eventDate: 1, startTime: 1, endTime: 1 }     │   │
│  │  • { organizer: 1, status: 1 }                              │   │
│  │                                                                │   │
│  │  Query Examples:                                              │   │
│  │  • db.bookings.find({ venue, eventDate, status: "pending" }) │   │
│  │  • db.bookings.find({ venue, eventDate })                    │   │
│  │  • db.bookings.countDocuments({ venue, status })             │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### Flow 1: User Selects a Date

```
User selects date in organizer dashboard
       ↓
handleDateChange() triggered
       ↓
availabilityChecker.checkDateAvailability(venueId, date)
       ↓
GET /api/bookings/venue/{venueId}/availability?date={date}
       ↓
AvailabilityService.checkDateAvailability()
       ↓
MongoDB Query:
  db.bookings.find({
    venue: venueId,
    eventDate: date,
    status: { $in: ["pending", "confirmed"] }
  })
       ↓
Response: { available: bool, status: string, bookingCount: number }
       ↓
Frontend updateDateAvailabilityDisplay()
       ↓
Display status badge (Available/Pending/Confirmed)
Display suggested time slots
```

---

### Flow 2: User Selects Time Slot

```
User selects start and end time
       ↓
handleTimeChange() triggered
       ↓
availabilityChecker.checkTimeSlotAvailability(venueId, date, start, end)
       ↓
GET /api/bookings/venue/{venueId}/availability?date={date}&start_time={start}&end_time={end}
       ↓
AvailabilityService.checkTimeSlotAvailability()
       ↓
Fetch bookings for the date
Filter by time conflict using isTimeConflict()
       ↓
If conflicts found:
  Response: { available: false, conflicts: [...] }
  ↓
  showTimeConflicts() in frontend
  ↓
  Display conflict details
  Disable submit button
  
If no conflicts:
  Response: { available: true, conflicts: [] }
  ↓
  clearTimeConflictAlert()
  enableSubmitButton()
```

---

### Flow 3: User Submits Booking

```
User clicks "Create Booking" button
       ↓
handleBookingSubmit() triggered
       ↓
Final availability check (double-check)
       ↓
availabilityChecker.checkTimeSlotAvailability()
       ↓
If still available:
  POST /api/bookings {
    venue_id, organizer_id, event_name,
    event_date, start_time, end_time
  }
       ↓
  BookingController.createBooking()
       ↓
  Validate venue and organizer
  AvailabilityService.checkTimeSlotAvailability()
       ↓
  If conflict detected:
    Return 409 Conflict with conflict details
    showErrorMessage()
       ↓
  If available:
    Create Booking in database
    Send notification
    Return 201 Created
    showSuccessMessage()
    Redirect to dashboard

If conflict detected in final check:
  showTimeConflicts()
  Don't submit
```

---

## 🔄 Status Determination Logic

```
Get all bookings for a date (pending + confirmed)
       ↓
       ├─ No bookings → Status = "Available"
       │
       ├─ Has bookings:
       │  ├─ Any status === "confirmed" → Status = "Confirmed"
       │  └─ All status === "pending" → Status = "Pending"
```

---

## ⏱️ Time Conflict Algorithm

```
Two time slots conflict if:
  start1 < end2  AND  end1 > start2

Examples:
  Slot 1: 10:00 - 12:00
  Slot 2: 11:00 - 13:00
  → Conflict! (10:00 < 13:00 AND 12:00 > 11:00)

  Slot 1: 10:00 - 12:00
  Slot 2: 12:00 - 14:00
  → No conflict (12:00 is not < 12:00)

  Slot 1: 10:00 - 12:00
  Slot 2: 14:00 - 16:00
  → No conflict (10:00 is not < 16:00... wait, it is)
  → Actually no conflict (12:00 is not > 14:00)
```

---

## 🎯 API Response Examples

### Success: Date is Available

```json
{
  "message": "Availability checked successfully",
  "venue_id": "63f4e8a2b1c9d4e5f6g7h8i9",
  "date": "2025-02-15",
  "available": true,
  "status": "Available",
  "conflicting_bookings": [],
  "total_bookings_on_date": 0
}
```

### Date has Pending Bookings

```json
{
  "message": "Availability checked successfully",
  "venue_id": "63f4e8a2b1c9d4e5f6g7h8i9",
  "date": "2025-02-15",
  "available": false,
  "status": "Pending",
  "conflicting_bookings": [
    {
      "_id": "63f4e8a2b1c9d4e5f6g7h8i0",
      "eventName": "Corporate Event",
      "startTime": "10:00",
      "endTime": "14:00",
      "status": "pending"
    }
  ],
  "total_bookings_on_date": 1
}
```

### Time Slot Conflict

```json
{
  "message": "Availability checked successfully",
  "venue_id": "63f4e8a2b1c9d4e5f6g7h8i9",
  "date": "2025-02-15",
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

---

## 💾 Database Indexes

```javascript
// Fast availability lookup
db.bookings.createIndex({ venue: 1, eventDate: 1 })

// Fast conflict detection
db.bookings.createIndex({ venue: 1, eventDate: 1, status: 1 })

// Complete conflict detection index
db.bookings.createIndex({
  venue: 1,
  eventDate: 1,
  startTime: 1,
  endTime: 1
})

// Fast organizer lookup
db.bookings.createIndex({ organizer: 1, status: 1 })

// Fast status filtering
db.bookings.createIndex({ status: 1, eventDate: 1 })
```

---

## 🔒 Validation & Error Handling

```
Input Validation:
├─ Venue exists and is active
├─ Organizer exists and has "organizer" role
├─ Event date is in the future
├─ Start time < End time
├─ Time format is valid (HH:MM)
└─ Event name is not empty

Conflict Detection:
├─ Check for any existing bookings on the date
├─ Filter by status (pending, confirmed)
├─ Check for time overlap
└─ Return detailed conflict information

Error Responses:
├─ 400 Bad Request - Invalid input
├─ 404 Not Found - Venue or organizer not found
├─ 409 Conflict - Time slot already booked
└─ 500 Internal Server Error - Database error
```

---

## 🎨 UI State Management

```
Form States:
├─ Initial: All fields empty, submit button disabled
├─ Venue Selected: Date input enabled
├─ Date Selected:
│  ├─ Availability status shown
│  ├─ Time suggestions displayed
│  └─ Time inputs enabled
├─ Time Selected:
│  ├─ Conflict check performed
│  ├─ If conflict → Alert shown, submit button disabled
│  └─ If available → Alert hidden, submit button enabled
└─ Submitted: Form disabled, loading spinner shown

Cache Management:
├─ Cache availability results
├─ Clear cache on venue change
├─ Clear date cache when date changes
└─ Clear all on form reset
```

---

## 📈 Performance Considerations

```
Frontend:
├─ Cache availability results (5-minute TTL recommended)
├─ Debounce API calls on rapid inputs
├─ Load available venues on initialization
├─ Lazy load monthly calendar

Backend:
├─ Use database indexes for fast queries
├─ Cache frequently accessed data
├─ Optimize booking queries
└─ Consider pagination for large datasets

Database:
├─ Index by (venue, eventDate, status)
├─ Index by (venue, eventDate, startTime, endTime)
└─ Regular index maintenance
```

---

## 🧪 Testing Strategy

```
Unit Tests:
├─ AvailabilityService.isTimeConflict()
├─ AvailabilityService.determineStatus()
├─ Time slot generation
└─ Duration calculation

Integration Tests:
├─ POST /api/bookings with conflicts
├─ GET /availability endpoint
├─ Booking creation with validation
└─ Status updates

E2E Tests:
├─ Select date and view availability
├─ Select time and see conflicts
├─ Submit booking form
└─ View booking confirmation
```
