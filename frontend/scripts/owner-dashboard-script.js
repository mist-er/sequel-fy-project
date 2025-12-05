// Owner Dashboard JavaScript
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let allBookings = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadUserData();
    loadVenues();
    loadOwnerBookings();
    setupBookingFilters();
});

// Load user data from localStorage
function loadUserData() {
    const userData = localStorage.getItem('user');
    if (userData) {
        currentUser = JSON.parse(userData);
        const name = currentUser.name || 'Owner';
        document.getElementById('userNameSidebar').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
    } else {
        window.location.href = './login.html';
    }
}

// Load all bookings for owner's venues
async function loadOwnerBookings() {
    if (!currentUser || !currentUser._id) return;

    try {
        // First, get all owner's venues
        const venuesResponse = await fetch(`${API_BASE}/venues?owner_id=${currentUser._id}`);
        const venuesData = await venuesResponse.json();

        if (!venuesResponse.ok || !venuesData.venues) {
            console.error('Error loading venues');
            return;
        }

        const venueIds = venuesData.venues.map(v => v._id);

        // Get bookings for all these venues
        const bookingsPromises = venueIds.map(venueId =>
            fetch(`${API_BASE}/bookings/venue/${venueId}`).then(r => r.json())
        );

        const bookingsResults = await Promise.all(bookingsPromises);

        // Combine all bookings
        allBookings = [];
        bookingsResults.forEach(result => {
            if (result.bookings) {
                allBookings = allBookings.concat(result.bookings);
            }
        });

        // Sort by creation date (newest first)
        allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        displayBookings(allBookings);
        updateDashboardStats();

    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Display bookings in the list
function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    const noBookings = document.getElementById('noBookings');

    if (!bookings || bookings.length === 0) {
        if (bookingsList) bookingsList.innerHTML = '';
        if (noBookings) noBookings.style.display = 'block';
        return;
    }

    if (noBookings) noBookings.style.display = 'none';

    bookingsList.innerHTML = bookings.map(booking => createBookingCard(booking)).join('');
}

// Create a booking card HTML
function createBookingCard(booking) {
    const statusBadgeClass = {
        'pending': 'badge-pending',
        'approved': 'badge-approved',
        'confirmed': 'badge-confirmed',
        'cancelled': 'badge-cancelled',
        'rejected': 'badge-rejected'
    }[booking.status] || 'bg-secondary';

    const paymentBadgeClass = {
        'unpaid': 'badge-unpaid',
        'paid': 'badge-paid',
        'refunded': 'badge-refunded'
    }[booking.paymentStatus] || 'bg-secondary';

    const eventDate = new Date(booking.eventDate).toLocaleDateString('en-GB');
    const venueName = booking.venue?.name || 'Unknown Venue';
    const organizerName = booking.organizer?.name || 'Unknown Organizer';

    // Show approve/reject buttons only for pending bookings
    const actionButtons = booking.status === 'pending' ? `
        <button class="btn btn-success btn-sm" onclick="approveBooking('${booking._id}')">
            <i class="fas fa-check me-1"></i>Approve
        </button>
        <button class="btn btn-danger btn-sm" onclick="rejectBooking('${booking._id}')">
            <i class="fas fa-times me-1"></i>Reject
        </button>
    ` : '';

    return `
        <div class="booking-card">
            <div class="booking-header">
                <div>
                    <h5 class="booking-title">${booking.eventName}</h5>
                    <small class="text-muted">Venue: ${venueName}</small>
                </div>
                <div class="d-flex gap-2 align-items-center">
                    <span class="badge ${statusBadgeClass}">${booking.status.toUpperCase()}</span>
                    <span class="badge ${paymentBadgeClass}">${booking.paymentStatus.toUpperCase()}</span>
                </div>
            </div>
            <div class="booking-details">
                <div class="booking-detail-item">
                    <i class="fas fa-user"></i>
                    <span>${organizerName}</span>
                </div>
                <div class="booking-detail-item">
                    <i class="fas fa-calendar"></i>
                    <span>${eventDate}</span>
                </div>
                <div class="booking-detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${booking.startTime} - ${booking.endTime}</span>
                </div>
                <div class="booking-detail-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span>GHS ${booking.totalCost}</span>
                </div>
            </div>
            ${booking.notes ? `
                <div class="mt-2">
                    <small class="text-muted"><strong>Notes:</strong> ${booking.notes}</small>
                </div>
            ` : ''}
            ${actionButtons ? `<div class="booking-actions mt-3">${actionButtons}</div>` : ''}
        </div>
    `;
}

// Approve a booking
async function approveBooking(bookingId) {
    if (!currentUser || !currentUser._id) return;

    const result = await Swal.fire({
        title: 'Approve Booking?',
        text: 'This will notify the organizer that their booking is approved.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, approve it!'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}/approve`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner_id: currentUser._id
            })
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Approved!',
                text: 'The booking has been approved successfully.',
                timer: 2000
            });

            // Reload bookings
            loadOwnerBookings();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Could not approve booking'
            });
        }
    } catch (error) {
        console.error('Error approving booking:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while approving the booking'
        });
    }
}

// Reject a booking
async function rejectBooking(bookingId) {
    const { value: reason } = await Swal.fire({
        title: 'Reject Booking',
        input: 'textarea',
        inputLabel: 'Rejection Reason (optional)',
        inputPlaceholder: 'Enter reason for rejection...',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Reject Booking'
    });

    if (reason === undefined) return; // User cancelled

    try {
        const response = await fetch(`${API_BASE}/bookings/${bookingId}/reject`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner_id: currentUser._id,
                rejection_reason: reason
            })
        });

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Rejected',
                text: 'The booking has been rejected.',
                timer: 2000
            });

            // Reload bookings
            loadOwnerBookings();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: data.message || 'Could not reject booking'
            });
        }
    } catch (error) {
        console.error('Error rejecting booking:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while rejecting the booking'
        });
    }
}

// Setup booking status filter
function setupBookingFilters() {
    const statusFilter = document.getElementById('bookingStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterBookings);
    }
}

// Filter bookings by status
function filterBookings() {
    const statusFilter = document.getElementById('bookingStatusFilter').value.toLowerCase();

    let filtered = allBookings;
    if (statusFilter) {
        filtered = allBookings.filter(b => b.status.toLowerCase() === statusFilter);
    }

    displayBookings(filtered);
}

// Update dashboard statistics
function updateDashboardStats() {
    // Count pending approvals
    const pendingCount = allBookings.filter(b => b.status === 'pending').length;

    // Count awaiting payment (approved but not paid)
    const awaitingPayment = allBookings.filter(b =>
        b.status === 'approved' && b.paymentStatus === 'unpaid'
    ).length;

    // Calculate total revenue (only confirmed/paid bookings)
    const totalRevenue = allBookings
        .filter(b => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.totalCost || 0), 0);

    // Total bookings
    const totalBookings = allBookings.length;

    // Update the UI
    const totalBookingsEl = document.getElementById('totalBookings');
    const totalRevenueEl = document.getElementById('totalRevenue');

    if (totalBookingsEl) totalBookingsEl.textContent = totalBookings;
    if (totalRevenueEl) totalRevenueEl.textContent = `GHS ${totalRevenue.toLocaleString()}`;

    // You can add more stat cards if needed
}

// Make functions globally available
window.approveBooking = approveBooking;
window.rejectBooking = rejectBooking;
window.loadOwnerBookings = loadOwnerBookings;
