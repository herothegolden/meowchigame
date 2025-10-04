/**
 * Timezone Utility for Asia/Tashkent (UTC+5)
 * Centralizes all timezone logic for daily streak system
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
