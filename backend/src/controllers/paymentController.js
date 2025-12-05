const Booking = require('../models/Booking');
const User = require('../models/User');

class PaymentController {
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
}

module.exports = PaymentController;
