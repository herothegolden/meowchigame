// src/utils/formatTime.js

/**
 * formatTime
 * Converts a duration (in seconds) into mm:ss format.
 * Example: 73 → "1:13"
 *
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted string in mm:ss
 */
export default function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
