const Booking = require('../models/Booking');
const Venue = require('../models/Venue');

class AvailabilityService {
  /**
   * Check if a venue is available for a specific date
   * @param {String} venueId - The venue ID
   * @param {Date} date - The event date
   * @returns {Promise<Object>} - { available, status, bookingCount }
   */
  static async checkDateAvailability(venueId, date) {
    try {
      const venue = await Venue.findById(venueId);
      if (!venue) {
        throw new Error('Venue not found');
      }

      const bookings = await Booking.find({
        venue: venueId,
        eventDate: {
          $gte: new Date(date).setHours(0, 0, 0, 0),
          $lt: new Date(date).setHours(23, 59, 59, 999)
        },
        status: { $in: ['pending', 'confirmed'] }
      });

      return {
        available: bookings.length === 0,
        status: bookings.length === 0 ? 'Available' : this.determineStatus(bookings),
        bookingCount: bookings.length,
        bookings: bookings
      };
    } catch (error) {
      throw new Error(`Error checking date availability: ${error.message}`);
    }
  }

  /**
   * Check if a time slot is available for a venue on a specific date
   * @param {String} venueId - The venue ID
   * @param {Date} date - The event date
   * @param {String} startTime - Start time in HH:MM format
   * @param {String} endTime - End time in HH:MM format
   * @returns {Promise<Object>} - { available, conflicts, status }
   */
  static async checkTimeSlotAvailability(venueId, date, startTime, endTime) {
    try {
      const venue = await Venue.findById(venueId);
      if (!venue) {
        throw new Error('Venue not found');
      }

      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const bookings = await Booking.find({
        venue: venueId,
        eventDate: {
          $gte: dateStart,
          $lt: dateEnd
        },
        status: { $in: ['pending', 'confirmed'] }
      });

      // Check for time conflicts
      const conflicts = bookings.filter(booking => 
        this.isTimeConflict(startTime, endTime, booking.startTime, booking.endTime)
      );

      return {
        available: conflicts.length === 0,
        conflicts: conflicts,
        conflictCount: conflicts.length,
        status: conflicts.length === 0 ? 'Available' : this.determineStatus(conflicts),
        totalBookingsOnDate: bookings.length
      };
    } catch (error) {
      throw new Error(`Error checking time slot availability: ${error.message}`);
    }
  }

  /**
   * Get all bookings for a venue on a specific date
   * @param {String} venueId - The venue ID
   * @param {Date} date - The event date
   * @returns {Promise<Array>} - Array of bookings
   */
  static async getBookingsForDate(venueId, date) {
    try {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const bookings = await Booking.find({
        venue: venueId,
        eventDate: {
          $gte: dateStart,
          $lt: dateEnd
        },
        status: { $in: ['pending', 'confirmed'] }
      }).select('eventName startTime endTime status').sort({ startTime: 1 });

      return bookings;
    } catch (error) {
      throw new Error(`Error getting bookings for date: ${error.message}`);
    }
  }

  /**
   * Get all available time slots for a venue on a specific date
   * @param {String} venueId - The venue ID
   * @param {Date} date - The event date
   * @param {Number} slotDuration - Duration of each slot in minutes (default 60)
   * @returns {Promise<Array>} - Array of available time slots
   */
  static async getAvailableTimeSlots(venueId, date, slotDuration = 60) {
    try {
      const bookings = await this.getBookingsForDate(venueId, date);
      
      // Define business hours (9 AM to 11 PM)
      const businessHours = {
        start: '09:00',
        end: '23:00'
      };

      const slots = this.generateTimeSlots(businessHours.start, businessHours.end, slotDuration);
      const availableSlots = slots.filter(slot => {
        const [slotStart, slotEnd] = slot.split('-');
        return !bookings.some(booking => 
          this.isTimeConflict(slotStart, slotEnd, booking.startTime, booking.endTime)
        );
      });

      return availableSlots;
    } catch (error) {
      throw new Error(`Error getting available time slots: ${error.message}`);
    }
  }

  /**
   * Get booking status for a venue on a specific date
   * @param {String} venueId - The venue ID
   * @param {Date} date - The event date
   * @returns {Promise<String>} - Status: "Available", "Pending", or "Confirmed"
   */
  static async getBookingStatusForDate(venueId, date) {
    try {
      const bookings = await this.getBookingsForDate(venueId, date);
      
      if (bookings.length === 0) {
        return 'Available';
      }

      // If any confirmed booking, return Confirmed
      if (bookings.some(b => b.status === 'confirmed')) {
        return 'Confirmed';
      }

      // If only pending bookings, return Pending
      return 'Pending';
    } catch (error) {
      throw new Error(`Error getting booking status: ${error.message}`);
    }
  }

  /**
   * Get calendar availability for a month
   * @param {String} venueId - The venue ID
   * @param {Number} month - Month (1-12)
   * @param {Number} year - Year
   * @returns {Promise<Object>} - Calendar data with availability status
   */
  static async getMonthlyAvailability(venueId, month, year) {
    try {
      const venue = await Venue.findById(venueId);
      if (!venue) {
        throw new Error('Venue not found');
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const bookings = await Booking.find({
        venue: venueId,
        eventDate: {
          $gte: startDate,
          $lt: new Date(endDate).setHours(23, 59, 59, 999)
        },
        status: { $in: ['pending', 'confirmed'] }
      });

      // Create calendar object
      const calendar = {};
      for (let i = 1; i <= endDate.getDate(); i++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dateBookings = bookings.filter(b => 
          b.eventDate.toISOString().split('T')[0] === dateStr
        );

        calendar[dateStr] = {
          available: dateBookings.length === 0,
          status: dateBookings.length === 0 ? 'Available' : this.determineStatus(dateBookings),
          bookingCount: dateBookings.length
        };
      }

      return calendar;
    } catch (error) {
      throw new Error(`Error getting monthly availability: ${error.message}`);
    }
  }

  /**
   * Check if two time slots conflict
   * @param {String} start1 - Start time of slot 1 (HH:MM)
   * @param {String} end1 - End time of slot 1 (HH:MM)
   * @param {String} start2 - Start time of slot 2 (HH:MM)
   * @param {String} end2 - End time of slot 2 (HH:MM)
   * @returns {Boolean}
   */
  static isTimeConflict(start1, end1, start2, end2) {
    const s1 = new Date(`2000-01-01T${start1}:00`);
    const e1 = new Date(`2000-01-01T${end1}:00`);
    const s2 = new Date(`2000-01-01T${start2}:00`);
    const e2 = new Date(`2000-01-01T${end2}:00`);
    
    return s1 < e2 && e1 > s2;
  }

  /**
   * Determine status based on bookings
   * @param {Array} bookings - Array of booking objects
   * @returns {String}
   */
  static determineStatus(bookings) {
    if (!bookings || bookings.length === 0) return 'Available';
    
    // If any confirmed, return Confirmed
    if (bookings.some(b => b.status === 'confirmed')) {
      return 'Confirmed';
    }
    
    // Otherwise return Pending
    return 'Pending';
  }

  /**
   * Generate time slots for a day
   * @param {String} startTime - Start time (HH:MM)
   * @param {String} endTime - End time (HH:MM)
   * @param {Number} duration - Slot duration in minutes
   * @returns {Array} - Array of time slot strings
   */
  static generateTimeSlots(startTime, endTime, duration) {
    const slots = [];
    let [startHour, startMin] = startTime.split(':').map(Number);
    let [endHour, endMin] = endTime.split(':').map(Number);

    let currentHour = startHour;
    let currentMin = startMin;
    const endTotalMin = endHour * 60 + endMin;

    while (currentHour * 60 + currentMin < endTotalMin) {
      const nextHour = currentHour + Math.floor((currentMin + duration) / 60);
      const nextMin = (currentMin + duration) % 60;

      if (nextHour * 60 + nextMin <= endTotalMin) {
        const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        const slotEnd = `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
        slots.push(`${slotStart}-${slotEnd}`);
      }

      currentHour = nextHour;
      currentMin = nextMin;
    }

    return slots;
  }

  /**
   * Get detailed conflict information
   * @param {String} venueId - The venue ID
   * @param {Date} date - The event date
   * @param {String} startTime - Start time
   * @param {String} endTime - End time
   * @returns {Promise<Object>} - Conflict details
   */
  static async getConflictDetails(venueId, date, startTime, endTime) {
    try {
      const result = await this.checkTimeSlotAvailability(venueId, date, startTime, endTime);
      
      if (result.conflicts.length > 0) {
        const conflictDetails = result.conflicts.map(conflict => ({
          eventName: conflict.eventName,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          status: conflict.status,
          duration: this.calculateDuration(conflict.startTime, conflict.endTime)
        }));

        const availableSlots = await this.getAvailableTimeSlots(venueId, date);

        return {
          hasConflict: true,
          conflicts: conflictDetails,
          availableSlots: availableSlots,
          message: `Found ${result.conflicts.length} conflicting booking(s)`
        };
      }

      return {
        hasConflict: false,
        message: 'Time slot is available',
        availableSlots: await this.getAvailableTimeSlots(venueId, date)
      };
    } catch (error) {
      throw new Error(`Error getting conflict details: ${error.message}`);
    }
  }

  /**
   * Calculate duration between two times
   * @param {String} startTime - Start time (HH:MM)
   * @param {String} endTime - End time (HH:MM)
   * @returns {Object} - { hours, minutes, totalMinutes, display }
   */
  static calculateDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const diffMs = end - start;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      hours,
      minutes,
      totalMinutes,
      display: `${hours}h ${minutes}m`
    };
  }
}

module.exports = AvailabilityService;
