const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');

// Payment routes
router.post('/mark-paid/:bookingId', PaymentController.markAsPaid);
router.get('/booking/:bookingId', PaymentController.getPaymentStatus);
router.post('/refund/:bookingId', PaymentController.processRefund);

module.exports = router;
