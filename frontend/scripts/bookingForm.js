/**
 * Booking Form Integration with Availability Checker
 * Include this script in organizer-dashboard.html after availabilityChecker.js
 */

let availabilityChecker;

/**
 * Initialize the availability checker and form listeners
 */
function initializeBookingForm() {
  // Initialize availability checker
  availabilityChecker = new AvailabilityChecker('http://localhost:3000/api');

  // Add event listeners for real-time checking
  const eventDate = document.getElementById('eventDate');
  const startTime = document.getElementById('startTime');
  const endTime = document.getElementById('endTime');

  if (eventDate) {
    eventDate.addEventListener('change', handleDateChange);
  }

  if (startTime) {
    startTime.addEventListener('change', handleTimeChange);
  }

  if (endTime) {
    endTime.addEventListener('change', handleTimeChange);
  }
}



/**
 * Handle date change
 */
async function handleDateChange() {
  const venueId = window.selectedVenueId;
  const eventDate = document.getElementById('eventDate').value;

  if (!venueId || !eventDate) {
    clearAvailabilityDisplay();
    return;
  }

  // Check if date is in the past
  const selectedDate = new Date(eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    showDateError('Cannot book for past dates');
    return;
  }

  await checkDateAvailability(venueId, eventDate);

  // Reset time inputs
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  clearTimeConflictAlert();
}

/**
 * Handle time change
 */
async function handleTimeChange() {
  const venueId = window.selectedVenueId;
  const eventDate = document.getElementById('eventDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;

  if (!venueId || !eventDate || !startTime || !endTime) {
    return;
  }

  // Validate time range
  if (startTime >= endTime) {
    showTimeError('End time must be after start time');
    return;
  }

  await checkTimeAvailability(venueId, eventDate, startTime, endTime);
}

/**
 * Check availability for a specific date
 */
async function checkDateAvailability(venueId, date) {
  try {
    // Show loading state
    showLoadingState();

    const availability = await availabilityChecker.checkDateAvailability(venueId, date);

    // Clear loading state
    clearLoadingState();

    if (availability.error) {
      showAvailabilityError(availability.error);
      return;
    }

    // Update UI with availability status
    updateDateAvailabilityDisplay(availability);

    // Load available time slots
    const slots = await availabilityChecker.getAvailableTimeSlots(venueId, date);
    updateTimeSlotSuggestions(slots);
  } catch (error) {
    console.error('Error checking date availability:', error);
    showAvailabilityError('Unable to check availability');
    clearLoadingState();
  }
}

/**
 * Check time slot availability
 */
async function checkTimeAvailability(venueId, date, startTime, endTime) {
  try {
    const availability = await availabilityChecker.checkTimeSlotAvailability(
      venueId,
      date,
      startTime,
      endTime
    );

    if (availability.error) {
      showTimeError(availability.error);
      return;
    }

    if (!availability.available) {
      // Show conflicts
      showTimeConflicts(availability.conflicting_bookings);
      disableSubmitButton();
    } else {
      // Clear conflicts and enable submit
      clearTimeConflictAlert();
      enableSubmitButton();
    }
  } catch (error) {
    console.error('Error checking time availability:', error);
  }
}

/**
 * Update date availability display
 */
function updateDateAvailabilityDisplay(availability) {
  const displayElement = document.getElementById('dateAvailabilityStatus');

  if (!displayElement) {
    return;
  }

  const status = availabilityChecker.getStatusLabel(availability);
  const badgeHTML = availabilityChecker.getStatusBadgeHTML(status);

  const message = availability.total_bookings_on_date > 0
    ? `This date has ${availability.total_bookings_on_date} booking(s)`
    : 'This date is completely available';

  displayElement.innerHTML = `
    <div class="availability-status-card ${status.toLowerCase()}">
      <div class="status-header">
        ${badgeHTML}
      </div>
      <p class="status-message">${message}</p>
    </div>
  `;
}

/**
 * Show time slot suggestions
 */
function updateTimeSlotSuggestions(slots) {
  const suggestionsElement = document.getElementById('timeSlotSuggestions');

  if (!suggestionsElement || slots.length === 0) {
    return;
  }

  const slotHTML = slots.slice(0, 5).map(slot => {
    const [start, end] = slot.split('-');
    return `
      <button type="button" class="btn btn-sm btn-outline-primary" 
              onclick="setSuggestedTimeSlot('${start}', '${end}')">
        ${start} - ${end}
      </button>
    `;
  }).join('');

  suggestionsElement.innerHTML = `
    <div class="slot-suggestions">
      <label class="mb-2">Suggested Time Slots:</label>
      <div class="btn-group" role="group">
        ${slotHTML}
      </div>
    </div>
  `;
}

/**
 * Set suggested time slot
 */
function setSuggestedTimeSlot(startTime, endTime) {
  document.getElementById('startTime').value = startTime;
  document.getElementById('endTime').value = endTime;
  handleTimeChange();
}

/**
 * Show time conflicts
 */
function showTimeConflicts(conflicts) {
  const alertElement = document.getElementById('timeConflictAlert');

  if (!alertElement || !conflicts || conflicts.length === 0) {
    return;
  }

  const conflictHTML = conflicts.map(conflict => `
    <div class="conflict-item">
      <strong>${conflict.eventName}</strong>
      <small class="d-block">${conflict.startTime} - ${conflict.endTime}</small>
      <span class="badge bg-${conflict.status === 'confirmed' ? 'danger' : 'warning'}">
        ${conflict.status}
      </span>
    </div>
  `).join('');

  alertElement.innerHTML = `
    <div class="alert alert-danger" role="alert">
      <h6><i class="fas fa-exclamation-circle"></i> Time Slot Not Available</h6>
      <p>This time slot conflicts with:</p>
      <div class="conflicts-list">
        ${conflictHTML}
      </div>
    </div>
  `;

  alertElement.style.display = 'block';
}

/**
 * Clear time conflict alert
 */
function clearTimeConflictAlert() {
  const alertElement = document.getElementById('timeConflictAlert');
  if (alertElement) {
    alertElement.innerHTML = '';
    alertElement.style.display = 'none';
  }
}

/**
 * Show loading state
 */
function showLoadingState() {
  const statusElement = document.getElementById('dateAvailabilityStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="spinner-border spinner-border-sm" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <span class="ms-2">Checking availability...</span>
    `;
  }
}

/**
 * Clear loading state
 */
function clearLoadingState() {
  // This will be replaced by actual availability display
}

/**
 * Show error message
 */
function showAvailabilityError(error) {
  const statusElement = document.getElementById('dateAvailabilityStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="fas fa-exclamation-triangle"></i> ${error}
      </div>
    `;
  }
}

/**
 * Show time error
 */
function showTimeError(error) {
  const alertElement = document.getElementById('timeConflictAlert');
  if (alertElement) {
    alertElement.innerHTML = `
      <div class="alert alert-warning" role="alert">
        ${error}
      </div>
    `;
    alertElement.style.display = 'block';
  }
}

/**
 * Show date error
 */
function showDateError(error) {
  const statusElement = document.getElementById('dateAvailabilityStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="alert alert-warning" role="alert">
        ${error}
      </div>
    `;
  }
}

/**
 * Clear availability display
 */
function clearAvailabilityDisplay() {
  const statusElement = document.getElementById('dateAvailabilityStatus');
  if (statusElement) {
    statusElement.innerHTML = '';
  }

  const suggestionsElement = document.getElementById('timeSlotSuggestions');
  if (suggestionsElement) {
    suggestionsElement.innerHTML = '';
  }

  clearTimeConflictAlert();
}

/**
 * Disable submit button
 */
function disableSubmitButton() {
  const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.title = 'Please select an available time slot';
  }
}

/**
 * Enable submit button
 */
function enableSubmitButton() {
  const submitBtn = document.querySelector('#bookingForm button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.title = '';
  }
}

/**
 * Handle booking form submission
 */
async function handleBookingSubmit(event) {
  event.preventDefault();

  const venueId = document.getElementById('venueSelect').value;
  const organizerId = document.getElementById('organizerId').value;
  const eventName = document.getElementById('eventName').value;
  const eventDate = document.getElementById('eventDate').value;
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const notes = document.getElementById('notes').value;

  // Final availability check
  const availability = await availabilityChecker.checkTimeSlotAvailability(
    venueId,
    eventDate,
    startTime,
    endTime
  );

  if (!availability.available) {
    showTimeConflicts(availability.conflicting_bookings);
    return;
  }

  // Proceed with booking
  try {
    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        venue_id: venueId,
        organizer_id: organizerId,
        event_name: eventName,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccessMessage('Booking created successfully!');
      // Reset form
      document.getElementById('bookingForm').reset();
      availabilityChecker.clearCache();
      // Redirect or show success message
      setTimeout(() => {
        window.location.href = './organizer-dashboard.html';
      }, 2000);
    } else {
      showErrorMessage(data.message || 'Failed to create booking');
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    showErrorMessage('An error occurred while creating the booking');
  }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
  // Use SweetAlert2 if available
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Success!',
      text: message,
      icon: 'success',
      confirmButtonText: 'OK'
    });
  } else {
    alert(message);
  }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
  // Use SweetAlert2 if available
  if (typeof Swal !== 'undefined') {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  } else {
    alert('Error: ' + message);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeBookingForm);
