const paypal = require('@paypal/checkout-server-sdk');
const { client } = require('../config/paypal');
const Booking = require('../models/Booking');
const User = require('../models/User');
const axios = require('axios');

class PaymentController {
    // =============== PAYSTACK METHODS ===============

    // Initialize Paystack transaction
    static async initializePaystack(req, res) {
        try {
            const { bookingId } = req.body;

            if (!process.env.PAYSTACK_SECRET_KEY) {
                console.error('CRITICAL: PAYSTACK_SECRET_KEY is not defined in .env');
                return res.status(500).json({ message: 'Payment gateway configuration error' });
            }

            const booking = await Booking.findById(bookingId)
                .populate('venue', 'name price')
                .populate('organizer', 'name email');

            console.log('Booking found:', !!booking);
            if (booking) {
                console.log('Organizer details:', {
                    id: booking.organizer?._id,
                    name: booking.organizer?.name,
                    email: booking.organizer?.email
                });
            }

            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            if (booking.isPaid) {
                return res.status(400).json({ message: 'Booking already paid' });
            }

            const amount = Math.round(booking.totalCost * 100);
            console.log('Booking Total Cost:', booking.totalCost);
            console.log('Calculated Amount (pesewas):', amount);

            if (!amount || amount <= 0) {
                return res.status(400).json({ message: `Invalid transaction amount: ${booking.totalCost}` });
            }

            const userEmail = (booking.bookingEmail || (booking.organizer ? booking.organizer.email : "") || "").trim();

            if (!userEmail) {
                return res.status(400).json({ message: 'A valid email address is required for payment. Please update your booking or profile.' });
            }

            const currency = (process.env.PAYSTACK_CURRENCY || "GHS").trim().toUpperCase();
            console.log(`Initializing Paystack for Booking ${booking._id}: ${currency} ${booking.totalCost} (${amount} subunits)`);

            const payload = {
                "email": userEmail,
                "amount": amount, // Paystack expects amount in subdivisions as integer
                "currency": currency,
                "metadata": {
                    "bookingId": booking._id,
                    "organizerName": booking.organizer.name,
                    "venueName": booking.venue.name
                }
            };

            console.log('Paystack Payload:', JSON.stringify(payload, null, 2));

            const response = await axios.post('https://api.paystack.co/transaction/initialize', payload, {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status) {
                // Save reference to booking
                booking.paystackReference = response.data.data.reference;
                await booking.save();

                // Add amount and email to the response data for the frontend
                response.data.data.amount = amount;
                response.data.data.email = userEmail;

                console.log('Paystack Initialization Success:', response.data.data.reference);
                res.json(response.data);
            } else {
                console.error('Paystack Initialization Failed:', response.data);
                res.status(400).json({ message: 'Failed to initialize Paystack transaction' });
            }
        } catch (error) {
            const errorData = error.response ? error.response.data : null;
            console.error('Error initializing Paystack:', errorData || error.message);

            let message = 'Error initializing payment';
            if (errorData && errorData.message === 'Currency not supported by merchant') {
                message = `Currency '${process.env.PAYSTACK_CURRENCY || "GHS"}' is not supported by your Paystack account. Please ensure your Paystack account is set up for this currency or change PAYSTACK_CURRENCY in your .env file.`;
            } else if (errorData && errorData.message) {
                message = errorData.message;
            }

            res.status(500).json({
                message: message,
                error: error.message,
                details: errorData
            });
        }
    }

    // Verify Paystack payment
    static async verifyPaystack(req, res) {
        try {
            const { reference } = req.params;

            const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            });

            if (response.data.status && response.data.data.status === 'success') {
                const { bookingId } = response.data.data.metadata;

                const booking = await Booking.findById(bookingId);
                if (booking) {
                    booking.isPaid = true;
                    booking.paymentStatus = 'paid';
                    booking.paymentMethod = 'paystack';
                    booking.paymentReference = reference;
                    booking.paystackReference = reference;
                    booking.paymentDate = new Date();
                    booking.status = 'confirmed';
                    await booking.save();

                    return res.json({
                        message: 'Payment verified successfully',
                        booking: booking
                    });
                } else {
                    return res.status(404).json({ message: 'Booking not found' });
                }
            } else {
                res.status(400).json({
                    message: 'Payment verification failed',
                    details: response.data.message
                });
            }
        } catch (error) {
            console.error('Error verifying Paystack:', error.response ? error.response.data : error.message);
            res.status(500).json({
                message: 'Error verifying payment',
                error: error.message
            });
        }
    }

    // Paystack Webhook
    static async paystackWebhook(req, res) {
        try {
            // Validate Paystack signature
            const crypto = require('crypto');
            const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
                .update(JSON.stringify(req.body))
                .digest('hex');

            if (hash !== req.headers['x-paystack-signature']) {
                return res.status(401).send('Invalid signature');
            }

            const event = req.body;
            if (event.event === 'charge.success') {
                const { bookingId } = event.data.metadata;
                const reference = event.data.reference;

                const booking = await Booking.findById(bookingId);
                if (booking && !booking.isPaid) {
                    booking.isPaid = true;
                    booking.paymentStatus = 'paid';
                    booking.paymentMethod = 'paystack';
                    booking.paymentReference = reference;
                    booking.paystackReference = reference;
                    booking.paymentDate = new Date();
                    booking.status = 'confirmed';
                    await booking.save();
                }
            }

            res.sendStatus(200);
        } catch (error) {
            console.error('Paystack Webhook Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // =============== PAYPAL METHODS ===============

    // Create PayPal order
    static async createPayPalOrder(req, res) {
        try {
            const { bookingId } = req.body;

            // Get booking details
            const booking = await Booking.findById(bookingId)
                .populate('venue', 'name price')
                .populate('organizer', 'name email');

            if (!booking) {
                return res.status(404).json({ message: 'Booking not found' });
            }

            if (booking.paymentStatus === 'paid') {
                return res.status(400).json({ message: 'Booking already paid' });
            }

            // Create PayPal order
            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        reference_id: booking._id.toString(),
                        amount: {
                            currency_code: "USD",
                            value: booking.totalCost.toString(),
                            breakdown: {
                                item_total: {
                                    currency_code: "USD",
                                    value: booking.totalCost.toString()
                                }
                            }
                        },
                        items: [
                            {
                                name: booking.eventName,
                                description: `Booking for ${booking.venue.name}`,
                                sku: booking._id.toString(),
                                unit_amount: {
                                    currency_code: "USD",
                                    value: booking.totalCost.toString()
                                },
                                quantity: "1"
                            }
                        ],
                        shipping: {
                            name: {
                                full_name: booking.organizer.name
                            }
                        }
                    }
                ],
                application_context: {
                    return_url: process.env.PAYPAL_RETURN_URL || "http://localhost:8000/organizer-dashboard.html",
                    cancel_url: process.env.PAYPAL_CANCEL_URL || "http://localhost:8000/organizer-dashboard.html",
                    user_action: "PAY_NOW"
                }
            });

            const response = await client().execute(request);

            // Store order ID in booking for verification later
            booking.paypalOrderId = response.result.id;
            booking.paymentStatus = 'pending';
            await booking.save();

            res.json({
                id: response.result.id,
                status: response.result.status
            });
        } catch (error) {
            console.error('Error creating PayPal order:', error);
            res.status(500).json({
                message: 'Error creating payment order',
                error: error.message
            });
        }
    }

    // Capture PayPal payment
    static async capturePayPalOrder(req, res) {
        try {
            const { orderId, bookingId } = req.body;

            const request = new paypal.orders.OrdersCaptureRequest(orderId);
            request.requestBody({});

            const response = await client().execute(request);

            if (response.result.status === 'COMPLETED') {
                // Update booking
                const booking = await Booking.findById(bookingId);
                booking.paymentStatus = 'paid';
                booking.paymentMethod = 'paypal';
                booking.transactionId = response.result.id;
                booking.paypalTransactionId = response.result.purchase_units[0].payments.captures[0].id;
                booking.paidAt = new Date();
                booking.status = 'confirmed';
                await booking.save();

                // TODO: Send email receipt to organizer and venue owner

                res.json({
                    message: 'Payment captured successfully',
                    booking: booking,
                    transaction: response.result
                });
            } else {
                res.status(400).json({
                    message: 'Payment not completed',
                    status: response.result.status
                });
            }
        } catch (error) {
            console.error('Error capturing PayPal order:', error);
            res.status(500).json({
                message: 'Error capturing payment',
                error: error.message
            });
        }
    }

    // Webhook handler for PayPal events
    static async handlePayPalWebhook(req, res) {
        try {
            const event = req.body;

            // Verify webhook signature (implement webhook signature verification)
            // For now, just log and process
            console.log('PayPal webhook received:', event.event_type);

            if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
                const capture = event.resource;

                // Find booking by PayPal order ID
                const booking = await Booking.findOne({
                    paypalOrderId: capture.supplementary_data.related_ids.order_id
                });

                if (booking) {
                    booking.paymentStatus = 'paid';
                    booking.paymentMethod = 'paypal';
                    booking.transactionId = capture.id;
                    booking.paidAt = new Date();
                    booking.status = 'confirmed';
                    await booking.save();
                }
            }

            if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
                const refund = event.resource;

                const booking = await Booking.findOne({
                    paypalTransactionId: refund.links[0].href.split('/').pop()
                });

                if (booking) {
                    booking.paymentStatus = 'refunded';
                    booking.status = 'cancelled';
                    await booking.save();
                }
            }

            res.json({ received: true });
        } catch (error) {
            console.error('Error processing PayPal webhook:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Get payment details
    static async getPaymentDetails(req, res) {
        try {
            const { orderId } = req.params;

            const request = new paypal.orders.OrdersGetRequest(orderId);
            const response = await client().execute(request);

            res.json({
                order: response.result,
                status: response.result.status
            });
        } catch (error) {
            console.error('Error getting order details:', error);
            res.status(500).json({
                message: 'Error retrieving payment details',
                error: error.message
            });
        }
    }

    // =============== LEGACY METHODS ===============

    // Mark booking as paid
    static async markAsPaid(req, res) {
        try {
            const { bookingId } = req.params;
            const { payment_method, transaction_id } = req.body;

            // Check if booking exists
            const booking = await Booking.findById(bookingId)
                .populate('venue', 'name price owner')
                .populate('organizer', 'name email');

            if (!booking) {
                return res.status(404).json({
                    message: 'Booking not found'
                });
            }

            // Check if booking is approved
            if (booking.status !== 'approved') {
                return res.status(400).json({
                    message: 'Booking must be approved before payment can be made'
                });
            }

            // Check if already paid
            if (booking.paymentStatus === 'paid') {
                return res.status(400).json({
                    message: 'Booking is already paid'
                });
            }

            // Update payment status
            booking.paymentStatus = 'paid';
            booking.paymentMethod = payment_method;
            booking.transactionId = transaction_id;
            booking.paidAt = new Date();
            booking.status = 'confirmed';

            await booking.save();

            res.json({
                message: 'Payment recorded successfully',
                booking: booking
            });
        } catch (error) {
            console.error('Error marking booking as paid:', error);
            res.status(500).json({
                message: 'Error processing payment',
                error: error.message
            });
        }
    }

    // Get payment status for a booking
    static async getPaymentStatus(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findById(bookingId)
                .select('paymentStatus paymentMethod transactionId paidAt totalCost status')
                .populate('venue', 'name price');

            if (!booking) {
                return res.status(404).json({
                    message: 'Booking not found'
                });
            }

            res.json({
                message: 'Payment status retrieved successfully',
                payment: {
                    status: booking.paymentStatus,
                    method: booking.paymentMethod,
                    transactionId: booking.transactionId,
                    paidAt: booking.paidAt,
                    amount: booking.totalCost,
                    bookingStatus: booking.status
                }
            });
        } catch (error) {
            console.error('Error getting payment status:', error);
            res.status(500).json({
                message: 'Error retrieving payment status',
                error: error.message
            });
        }
    }

    // Process refund (basic implementation)
    static async processRefund(req, res) {
        try {
            const { bookingId } = req.params;

            const booking = await Booking.findById(bookingId)
                .populate('venue', 'name owner')
                .populate('organizer', 'name email');

            if (!booking) {
                return res.status(404).json({
                    message: 'Booking not found'
                });
            }

            // Check if booking is paid
            if (booking.paymentStatus !== 'paid') {
                return res.status(400).json({
                    message: 'Cannot refund an unpaid booking'
                });
            }

            // Update payment status
            booking.paymentStatus = 'refunded';
            booking.status = 'cancelled';

            await booking.save();

            res.json({
                message: 'Refund processed successfully',
                booking: booking
            });
        } catch (error) {
            console.error('Error processing refund:', error);
            res.status(500).json({
                message: 'Error processing refund',
                error: error.message
            });
        }
    }

    // New method to provide public key to frontend
    static async getPaystackPublicKey(req, res) {
        try {
            const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
            if (!publicKey) {
                return res.status(500).json({ message: 'Paystack Public Key not configured on server' });
            }
            res.json({ publicKey });
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving public key' });
        }
    }
}

module.exports = PaymentController;
