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

// @route   POST /api/payments/paystack/initialize
// @desc    Initialize a Paystack transaction
// @access  Private (Firebase Auth required)
router.post('/paystack/initialize', verifyFirebaseIdToken, PaymentController.initializePaystack);

// @route   GET /api/payments/paystack/verify/:reference
// @desc    Verify a Paystack transaction
// @access  Private (Firebase Auth required)
router.get('/paystack/verify/:reference', verifyFirebaseIdToken, PaymentController.verifyPaystack);

// @route   POST /api/payments/paystack/webhook
// @desc    Handle Paystack webhook events
// @access  Public
router.post('/paystack/webhook', PaymentController.paystackWebhook);

// @route   GET /api/payments/:orderId
// @desc    Get PayPal order details
// @access  Private (Firebase Auth required)
router.get('/:orderId', verifyFirebaseIdToken, PaymentController.getPaymentDetails);

// @route   GET /api/payments/paystack/public-key
// @desc    Get Paystack Public Key
// @access  Public
router.get('/paystack/public-key', PaymentController.getPaystackPublicKey);

module.exports = router;
