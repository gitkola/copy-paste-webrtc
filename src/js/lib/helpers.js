/**
 * Utility helper functions
 * Pure functions for common operations across the application
 */

/**
 * Encode data to base64
 * @param {Object} data - JavaScript object to encode
 * @returns {string} Base64 encoded string
 */
export function encodeToBase64(data) {
  try {
    return btoa(JSON.stringify(data));
  } catch (error) {
    console.error('Failed to encode data:', error);
    throw new Error('Encoding failed');
  }
}

/**
 * Decode base64 to object
 * @param {string} encoded - Base64 encoded string
 * @returns {Object} Decoded JavaScript object
 */
export function decodeFromBase64(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch (error) {
    console.error('Failed to decode data:', error);
    throw new Error('Decoding failed');
  }
}

/**
 * Generate random ID
 * @param {number} length - ID length (default: 9)
 * @returns {string} Random alphanumeric ID
 */
export function generateId(length = 9) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Create a promise that resolves after delay
 * @param {number} ms - Delay in milliseconds
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if data is a valid offer/answer
 * @param {Object} data - Data to validate
 * @param {string} expectedType - 'offer' or 'answer'
 * @returns {boolean} True if valid
 */
export function isValidSignalData(data, expectedType) {
  return (
    data &&
    typeof data === 'object' &&
    data.type === expectedType &&
    typeof data.sdp === 'string' &&
    data.sdp.length > 0
  );
}

/**
 * Check if string is a valid URL
 * @param {string} str - String to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract offer data from URL hash
 * @param {string} url - Full URL with hash
 * @returns {string|null} Hash data without # or null
 */
export function extractHashFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hash.slice(1) || null;
  } catch {
    return null;
  }
}

/**
 * Convert blob to data URL
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Data URL
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Determine optimal QR error correction level based on data size
 * @param {string} data - Data to encode in QR
 * @returns {string} Error correction level ('L', 'M', 'Q', 'H')
 */
export function getOptimalQRErrorCorrection(data) {
  const length = data.length;

  // For very small data, use high error correction for reliability
  if (length < 500) return 'H';

  // For medium data, use medium-high error correction
  if (length < 1000) return 'Q';

  // For large data, use medium error correction
  if (length < 1500) return 'M';

  // For very large data, use low error correction to maximize capacity
  return 'L';
}
