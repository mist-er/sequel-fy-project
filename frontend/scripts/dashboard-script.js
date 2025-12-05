// Dashboard JavaScript for Organizer
const API_BASE = 'http://localhost:3000/api';
let currentUser = null;
let allVenues = [];
let userFavorites = [];

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    loadUserData();
    loadVenues();
    loadBookings();
    loadFavorites();
    setupFilters();
    setupTabNavigation();
});

// Setup filter event listeners
function setupFilters() {
    const locationFilter = document.getElementById('locationFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const availabilityFilter = document.getElementById('availabilityFilter');

    if (locationFilter) {
        locationFilter.addEventListener('change', applyFilters);
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyFilters);
    }
    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', applyFilters);
    }
}

// Apply filters to venues
function applyFilters() {
    const location = document.getElementById('locationFilter').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value.toLowerCase();
    const availability = document.getElementById('availabilityFilter').value.toLowerCase();

    let filtered = allVenues.filter(venue => {
        let matchesLocation = !location || venue.location.toLowerCase().includes(location);
        let matchesCategory = !category || (venue.category && venue.category.toLowerCase() === category);
        let matchesAvailability = !availability ||
            (availability === 'available' && venue.isActive) ||
            (availability === 'unavailable' && !venue.isActive);

        return matchesLocation && matchesCategory && matchesAvailability;
    });

    displayVenues(filtered);
}

// Load user's favorite venues
async function loadFavorites() {
    if (!currentUser || !currentUser._id) return;

    try {
        const response = await fetch(`${API_BASE}/favorites/${currentUser._id}`);
        const data = await response.json();

        if (response.ok) {
            userFavorites = data.favorites || [];
            displayFavorites(userFavorites);
            updateFavoriteButtons();
        }
    } catch (error) {
        console.error('Error loading favorites:', error);
    }
}

// Display favorites in favorites tab
function displayFavorites(favorites) {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const noFavorites = document.getElementById('noFavorites');

    if (!favorites || favorites.length === 0) {
        if (favoritesGrid) favoritesGrid.style.display = 'none';
        if (noFavorites) noFavorites.style.display = 'block';
        return;
    }

    if (favoritesGrid) favoritesGrid.style.display = 'flex';
    if (noFavorites) noFavorites.style.display = 'none';

    // Reuse the displayVenues logic but for favorites grid
    favoritesGrid.innerHTML = favorites.map(venue => createVenueCard(venue)).join('');
}

// Toggle favorite status
async function toggleFavorite(venueId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    if (!currentUser || !currentUser._id) {
        Swal.fire({
            icon: 'error',
            title: 'Authentication Required',
            text: 'Please log in to add favorites.',
            confirmButtonColor: '#ff6b35'
        });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/favorites/${currentUser._id}/toggle/${venueId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Update local favorites list
            if (data.isFavorite) {
                const venue = allVenues.find(v => v._id === venueId);
                if (venue && !userFavorites.some(f => f._id === venueId)) {
                    userFavorites.push(venue);
                }
            } else {
                userFavorites = userFavorites.filter(f => f._id !== venueId);
            }

            // Update UI
            updateFavoriteButton(venueId, data.isFavorite);
            displayFavorites(userFavorites);

            // Show feedback
            const icon = data.isFavorite ? 'fa-heart' : 'fa-heart-o';
            Swal.fire({
                icon: 'success',
                title: data.isFavorite ? 'Added to Favorites!' : 'Removed from Favorites',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Could not update favorite status.',
            confirmButtonColor: '#ff6b35'
        });
    }
}

// Update favorite button appearance
function updateFavoriteButton(venueId, isFavorite) {
    const buttons = document.querySelectorAll(`[data-venue-id="${venueId}"]`);
    buttons.forEach(button => {
        const icon = button.querySelector('i');
        if (icon) {
            icon.style.color = isFavorite ? '#ff6b35' : '#ccc';
            icon.classList.toggle('fas', isFavorite);
            icon.classList.toggle('far', !isFavorite);
        }
    });
}

// Update all favorite buttons based on current favorites
function updateFavoriteButtons() {
    userFavorites.forEach(fav => {
        updateFavoriteButton(fav._id, true);
    });
}

// Create venue card HTML with favorite button
function createVenueCard(venue) {
    const isFavorite = userFavorites.some(f => f._id === venue._id);
    const heartColor = isFavorite ? '#ff6b35' : '#ccc';
    const heartClass = isFavorite ? 'fas' : 'far';

    // Image handling
    let imageUrl = 'https://images.unsplash.com/photo-1519167758481-83f1426e4b1e?auto=format&fit=crop&w=400&q=80';
    if (venue.photoUrls && venue.photoUrls.length > 0) {
        const firstPhoto = venue.photoUrls[0];
        imageUrl = firstPhoto.startsWith('http') ? firstPhoto : `http://localhost:3000/${firstPhoto}`;
    } else if (venue.photoUrl) {
        imageUrl = venue.photoUrl.startsWith('http') ? venue.photoUrl : `http://localhost:3000/${venue.photoUrl}`;
    }

    return `
        <div class="col-lg-6">
            <div class="venue-card">
                <div class="position-relative" style="height: 200px;">
                    <div class="venue-image" style="background-image: url('${imageUrl}'); height: 200px; background-size: cover; background-position: center; border-radius: 12px 12px 0 0;"></div>
                    <div class="position-absolute top-0 start-0 m-2" style="z-index: 5;">
                        <button class="btn btn-sm btn-light rounded-circle favorite-btn" onclick="toggleFavorite('${venue._id}', event)" style="width: 40px; height: 40px; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15);" data-venue-id="${venue._id}">
                            <i class="${heartClass} fa-heart" style="color: ${heartColor};"></i>
                        </button>
                    </div>
                    <div class="position-absolute top-0 end-0 m-2" style="z-index: 5;">
                        <span class="badge ${venue.isActive ? 'bg-success' : 'bg-secondary'}">${venue.isActive ? 'Available' : 'Unavailable'}</span>
                    </div>
                    <div class="position-absolute bottom-0 end-0 m-2" style="z-index: 5;">
                        <span class="badge bg-primary">GHS ${venue.price}</span>
                    </div>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${venue.name}</h5>
                    <p class="card-text text-muted">${venue.description || 'Perfect venue for your special events.'}</p>
                    <div class="row g-2 mb-3">
                        <div class="col-12">
                            <small class="text-muted">
                                <i class="fas fa-map-pin me-1"></i>${venue.location}
                            </small>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">
                                <i class="fas fa-users me-1"></i>Capacity: ${venue.capacity}
                            </small>
                        </div>
                        ${venue.category ? `<div class="col-6">
                            <small class="text-muted">
                                <i class="fas fa-tag me-1"></i>${venue.category.charAt(0).toUpperCase() + venue.category.slice(1)}
                            </small>
                        </div>` : ''}
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-primary btn-sm flex-fill" onclick="showVenueDetails('${venue._id}')">
                            <i class="fas fa-info-circle me-1"></i>Details
                        </button>
                        <button class="btn btn-primary btn-sm flex-fill" onclick="openBookingModal('${venue._id}')">
                            <i class="fas fa-calendar-check me-1"></i>Book Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Make functions globally available
window.toggleFavorite = toggleFavorite;
window.applyFilters = applyFilters;
