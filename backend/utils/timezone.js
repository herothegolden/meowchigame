// Path: backend/utils/timezone.js
// v2 — Add getTashkentEodIso() for Meow counter resetsAt field
// CHANGES (v2):
// - Lines 82-104: Added getTashkentEodIso() function
// - Computes tomorrow 00:00:00 in Asia/Tashkent as ISO string
// - Used by /api/meow-tap response to tell client when counter resets
// UNCHANGED: All existing functions (getTashkentDate, calculateDateDiff, getTashkentHour)

/**
 * Timezone Utility for Asia/Tashkent (UTC+5)
 * Centralizes all timezone logic for daily streak system and Meow counter
 */

/**
 * Get current date in Asia/Tashkent timezone
 * @returns {string} Date in YYYY-MM-DD format (e.g., "2025-10-05")
 */
export const getTashkentDate = () => {
  const now = new Date();
  
  // Get date components in Tashkent timezone
  const tashkentDateString = now.toLocaleString('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Extract YYYY-MM-DD format
  const [datePart] = tashkentDateString.split(',');
  return datePart.trim();
};

/**
 * Calculate difference in days between two dates
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number|null} Number of days difference (absolute value), or null if either date is invalid
 */
export const calculateDateDiff = (date1, date2) => {
  // Handle null or undefined dates
  if (!date1 || !date2) {
    return null;
  }
  
  try {
    // Parse dates and set to midnight UTC for accurate day counting
    const d1 = new Date(date1 + 'T00:00:00Z');
    const d2 = new Date(date2 + 'T00:00:00Z');
    
    // Check if dates are valid
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return null;
    }
    
    // Calculate difference in milliseconds
    const diffMs = Math.abs(d2 - d1);
    
    // Convert to days and round down
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating date difference:', error);
    return null;
  }
};

/**
 * Get current hour in Asia/Tashkent timezone (0-23)
 * Useful for debugging and logging
 * @returns {number} Hour in 24-hour format (0-23)
 */
export const getTashkentHour = () => {
  const now = new Date();
  
  const tashkentTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Tashkent',
    hour: 'numeric',
    hour12: false
  });
  
  return parseInt(tashkentTimeString, 10);
};

/**
 * Get end-of-day reset timestamp for current Tashkent day
 * Returns tomorrow 00:00:00 in Asia/Tashkent as ISO string (UTC)
 * Used by Meow counter to tell client when daily reset occurs
 * 
 * @returns {string} ISO 8601 timestamp (e.g., "2025-10-11T19:00:00.000Z" for Oct 10 in Tashkent)
 * 
 * @example
 * // If current Tashkent date is 2025-10-10
 * getTashkentEodIso()
 * // Returns: "2025-10-10T19:00:00.000Z"
 * // (which is 2025-10-11T00:00:00+05:00 in Tashkent)
 */
export const getTashkentEodIso = () => {
  const todayStr = getTashkentDate(); // Current day in Tashkent (YYYY-MM-DD)
  const [year, month, day] = todayStr.split('-').map(Number);
  
  // Calculate tomorrow's date
  const today = new Date(year, month - 1, day);
  today.setDate(today.getDate() + 1);
  
  const tomorrowYear = today.getFullYear();
  const tomorrowMonth = String(today.getMonth() + 1).padStart(2, '0');
  const tomorrowDay = String(today.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;
  
  // Create ISO string for tomorrow 00:00:00+05:00 (Tashkent timezone)
  // This will be automatically converted to UTC by Date constructor
  const resetTimeStr = `${tomorrowStr}T00:00:00.000+05:00`;
  const resetTime = new Date(resetTimeStr);
  
  return resetTime.toISOString();
};
