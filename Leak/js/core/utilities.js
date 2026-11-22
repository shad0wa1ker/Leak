/**
 * ============================================================================
 * UTILITIES & CRYPTO HELPERS
 * Pure native JavaScript helpers (zero dependencies)
 * ============================================================================
 */

/**
 * Computes a deterministic SHA-256 hash using the native Web Crypto API
 * @param {string} message
 * @returns {Promise<string>} 64-character hex string
 */
export async function sha256(message) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Graceful fallback if SubtleCrypto is unavailable in certain sandboxes
  return fallbackHash(message);
}

/**
 * Fallback deterministic FNV-1a / Murmur-like hash producing 64 hex characters
 * @param {string} str
 * @returns {string}
 */
export function fallbackHash(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2 + p1 + p2 + p1 + p2 + p1 + p2).slice(0, 64);
}

/**
 * Safely escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format bytes into human readable format (MB, GB)
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return 'Unavailable';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

/**
 * Returns the CSS class corresponding to a signal status
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  switch (status) {
    case 'AVAILABLE': return 'status-available';
    case 'UNAVAILABLE': return 'status-unavailable';
    case 'RESTRICTED': return 'status-restricted';
    case 'ESTIMATED': return 'status-estimated';
    case 'INCONCLUSIVE': return 'status-inconclusive';
    case 'REQUIRES CONSENT': return 'status-requires-consent';
    default: return 'status-available';
  }
}

/**
 * Returns the CSS class for an entropy rating
 * @param {'HIGH'|'MEDIUM'|'LOW'} weight
 * @returns {string}
 */
export function getEntropyBadgeClass(weight) {
  switch (weight) {
    case 'HIGH': return 'entropy-high';
    case 'MEDIUM': return 'entropy-medium';
    case 'LOW': return 'entropy-low';
    default: return 'entropy-low';
  }
}

/**
 * Debounce helper for resize / scroll handlers
 * @param {Function} func
 * @param {number} wait
 */
export function debounce(func, wait = 100) {
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
