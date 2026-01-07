const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const verifyFirebaseIdToken = require('../middleware/firebaseAuth');

// @route   POST /api/payments/create-order
// @desc    Create a PayPal order for a booking
// @access  Private (Firebase Auth required)
router.post('/create-order', verifyFirebaseIdToken, PaymentController.createPayPalOrder);

// @route   POST /api/payments/capture-order
// @desc    Capture/Complete a PayPal payment
// @access  Private (Firebase Auth required)
router.post('/capture-order', verifyFirebaseIdToken, PaymentController.capturePayPalOrder);

// @route   POST /api/payments/webhook
// @desc    Handle PayPal webhook events
// @access  Public (but should verify PayPal signature)
router.post('/webhook', PaymentController.handlePayPalWebhook);

// @route   GET /api/payments/:orderId
// @desc    Get PayPal order details
// @access  Private (Firebase Auth required)
router.get('/:orderId', verifyFirebaseIdToken, PaymentController.getPaymentDetails);

// @route   GET /api/payments/:bookingId/status
// @desc    Get payment status for a booking (Legacy endpoint)
// @access  Public
router.get('/:bookingId/status', PaymentController.getPaymentStatus);

module.exports = router;
