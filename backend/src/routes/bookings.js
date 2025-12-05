const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const { validateBooking, validateBookingUpdate, validateBookingStatus } = require('../middleware/validation');
const verifyFirebaseIdToken = require('../middleware/firebaseAuth');

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Public (for now, will add auth later)
router.post('/', verifyFirebaseIdToken, validateBooking, BookingController.createBooking);

// @route   GET /api/bookings
// @desc    Get all bookings with optional filters
// @access  Public
router.get('/', BookingController.getAllBookings);

// @route   GET /api/bookings/:id
// @desc    Get booking by ID
// @access  Public
router.get('/:id', BookingController.getBookingById);

// @route   PUT /api/bookings/:id
// @desc    Update booking details
// @access  Public (for now, will add auth later)
router.put('/:id', verifyFirebaseIdToken, validateBookingUpdate, BookingController.updateBooking);

// @route   PATCH /api/bookings/:id/status
// @desc    Update booking status
// @access  Public (for now, will add auth later)
router.patch('/:id/status', verifyFirebaseIdToken, validateBookingStatus, BookingController.updateBookingStatus);

// @route   DELETE /api/bookings/:id
// @desc    Delete booking
// @access  Public (for now, will add auth later)
router.delete('/:id', verifyFirebaseIdToken, BookingController.deleteBooking);

// @route   GET /api/bookings/organizer/:organizerId
// @desc    Get all bookings by organizer
// @access  Public
router.get('/organizer/:organizerId', BookingController.getBookingsByOrganizer);

// @route   GET /api/bookings/venue/:venueId
// @desc    Get all bookings by venue
// @access  Public
router.get('/venue/:venueId', BookingController.getBookingsByVenue);

// @route   GET /api/bookings/:id/stats
// @desc    Get booking statistics
// @access  Public
router.get('/:id/stats', BookingController.getBookingStats);

// @route   GET /api/bookings/venue/:venueId/availability
// @desc    Check venue availability for a date/time range
// @access  Public
router.get('/venue/:venueId/availability', BookingController.checkVenueAvailability);

// @route   PATCH /api/bookings/:id/approve
// @desc    Approve a booking (owner only)
// @access  Public (for now, will add auth later)
router.patch('/:id/approve', BookingController.approveBooking);

// @route   PATCH /api/bookings/:id/reject
// @desc    Reject a booking (owner only)
// @access  Public (for now, will add auth later)
router.patch('/:id/reject', BookingController.rejectBooking);

module.exports = router;
