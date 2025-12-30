/**
 * AvailabilityChecker - Frontend utility for real-time venue availability checking
 * Handles all availability checks and UI updates for the booking form
 */

class AvailabilityChecker {
  constructor(apiBase = 'http://localhost:3000/api') {
    this.apiBase = apiBase;
    this.currentVenueId = null;
    this.currentDate = null;
    this.currentStartTime = null;
    this.currentEndTime = null;
    this.cache = new Map(); // Cache availability results
  }

  /**
   * Check availability for a specific date
   */
  async checkDateAvailability(venueId, date) {
    try {
      const cacheKey = `date-${venueId}-${date}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await fetch(
        `${this.apiBase}/bookings/venue/${venueId}/availability?date=${date}`
      );

      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error checking date availability:', error);
      return {
        available: null,
        error: error.message
      };
    }
  }

  /**
   * Check time slot availability
   */
  async checkTimeSlotAvailability(venueId, date, startTime, endTime) {
    try {
      const cacheKey = `time-${venueId}-${date}-${startTime}-${endTime}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const params = new URLSearchParams({
        date: date,
        start_time: startTime,
        end_time: endTime
      });

      const response = await fetch(
        `${this.apiBase}/bookings/venue/${venueId}/availability?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to check time slot');
      }

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return {
        available: null,
        error: error.message
      };
    }
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableTimeSlots(venueId, date) {
    try {
      // First get all bookings for the date
      const availability = await this.checkDateAvailability(venueId, date);
      
      if (availability.error) {
        throw new Error(availability.error);
      }

      // Generate time slots (9 AM to 11 PM in 30-min intervals)
      const slots = this.generateTimeSlots('09:00', '23:00', 30);
      
      // Filter out booked slots
      const availableSlots = [];
      if (availability.available) {
        return slots;
      }

      // Check each slot against bookings
      const bookings = availability.conflicting_bookings || [];
      
      for (const slot of slots) {
        const [slotStart, slotEnd] = slot.split('-');
        const hasConflict = bookings.some(booking => 
          this.isTimeConflict(slotStart, slotEnd, booking.startTime, booking.endTime)
        );
        
        if (!hasConflict) {
          availableSlots.push(slot);
        }
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available time slots:', error);
      return [];
    }
  }

  /**
   * Get monthly calendar with availability status
   */
  async getMonthlyAvailability(venueId, month, year) {
    try {
      // Get all bookings for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // This could be optimized with a dedicated endpoint
      const calendar = {};
      
      for (let day = 1; day <= endDate.getDate(); day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const availability = await this.checkDateAvailability(venueId, date);
        
        calendar[date] = {
          available: availability.available,
          status: this.getStatusLabel(availability),
          bookingCount: availability.total_bookings_on_date || 0
        };
      }

      return calendar;
    } catch (error) {
      console.error('Error getting monthly availability:', error);
      return {};
    }
  }

  /**
   * Get status label from availability data
   */
  getStatusLabel(availability) {
    if (availability.error) {
      return 'Unknown';
    }

    if (availability.available) {
      return 'Available';
    }

    // Check if there are confirmed bookings
    const hasConfirmed = (availability.conflicting_bookings || []).some(b => b.status === 'confirmed');
    return hasConfirmed ? 'Confirmed' : 'Pending';
  }

  /**
   * Get CSS class for status badge
   */
  getStatusBadgeClass(status) {
    const statusMap = {
      'Available': 'badge-success',
      'Pending': 'badge-warning',
      'Confirmed': 'badge-info',
      'Unknown': 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  }

  /**
   * Get HTML for status badge
   */
  getStatusBadgeHTML(status) {
    const badgeClass = this.getStatusBadgeClass(status);
    const icons = {
      'Available': '<i class="fas fa-check-circle"></i>',
      'Pending': '<i class="fas fa-clock"></i>',
      'Confirmed': '<i class="fas fa-calendar-check"></i>',
      'Unknown': '<i class="fas fa-question-circle"></i>'
    };

    return `
      <span class="badge ${badgeClass}">
        ${icons[status] || ''} ${status}
      </span>
    `;
  }

  /**
   * Format conflict display
   */
  formatConflicts(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      return '';
    }

    const conflictItems = conflicts.map(conflict => `
      <li>
        <strong>${conflict.eventName}</strong>
        <br>
        <small>${conflict.startTime} - ${conflict.endTime}</small>
      </li>
    `).join('');

    return `
      <div class="alert alert-warning" role="alert">
        <h6><i class="fas fa-exclamation-triangle"></i> Time Conflict Detected</h6>
        <ul class="mb-0">
          ${conflictItems}
        </ul>
      </div>
    `;
  }

  /**
   * Check if two time slots conflict
   */
  isTimeConflict(start1, end1, start2, end2) {
    const convertTime = (time) => {
      const [hours, mins] = time.split(':').map(Number);
      return hours * 60 + mins;
    };

    const s1 = convertTime(start1);
    const e1 = convertTime(end1);
    const s2 = convertTime(start2);
    const e2 = convertTime(end2);

    return s1 < e2 && e1 > s2;
  }

  /**
   * Generate time slots
   */
  generateTimeSlots(startTime, endTime, durationMinutes = 30) {
    const slots = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
      const nextMinutes = currentMinutes + durationMinutes;

      if (nextMinutes > endMinutes) break;

      const currentHour = Math.floor(currentMinutes / 60);
      const currentMin = currentMinutes % 60;
      const nextHour = Math.floor(nextMinutes / 60);
      const nextMin = nextMinutes % 60;

      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      const slotEnd = `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;

      slots.push(`${slotStart}-${slotEnd}`);
      currentMinutes = nextMinutes;
    }

    return slots;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheEntry(key) {
    // Clear cache entries matching the key pattern
    const keysToDelete = Array.from(this.cache.keys()).filter(k => k.includes(key));
    keysToDelete.forEach(k => this.cache.delete(k));
  }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvailabilityChecker;
}
