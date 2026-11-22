/**
 * ============================================================================
 * FINGERPRINT ANALYSIS ENGINE
 * Canonical signal synthesis, entropy weighting, and deterministic SHA-256 hashing
 * ============================================================================
 */

import { state } from '../core/state.js';
import { sha256 } from '../core/utilities.js';

/**
 * Synthesize all active signals into a deterministic local fingerprint
 * @returns {Promise<Object>}
 */
export async function generateFingerprint() {
  const allSignals = state.getSignals();

  // Filter stable fingerprinting signals (exclude volatile elements like current second)
  const excludedIds = new Set(['network.public_ip', 'network.ip_location', 'network.ip_isp']);
  const stableSignals = allSignals
    .filter(s => !excludedIds.has(s.id) && s.status !== 'UNAVAILABLE' && s.status !== 'REQUIRES CONSENT')
    .sort((a, b) => a.id.localeCompare(b.id));

  // Build canonical string representation: "id:value|id:value|..."
  const canonicalParts = stableSignals.map(s => {
    const serializedVal = typeof s.rawValue === 'object' && s.rawValue !== null 
      ? JSON.stringify(s.rawValue) 
      : String(s.rawValue);
    return `${s.id}=${serializedVal}`;
  });
  const canonicalString = canonicalParts.join('|');

  // Compute deterministic SHA-256 hash
  const hash = await sha256(canonicalString || 'empty-signal-space');

  // Compute entropy distribution
  const entropyBreakdown = { high: 0, medium: 0, low: 0 };
  for (const s of stableSignals) {
    if (s.entropyWeight === 'HIGH') entropyBreakdown.high++;
    else if (s.entropyWeight === 'MEDIUM') entropyBreakdown.medium++;
    else entropyBreakdown.low++;
  }

  // Generate 64-cell visual matrix representation based on the 64-hex SHA-256 hash
  const visualMatrix = [];
  const hexChars = hash.split('');
  for (let i = 0; i < hexChars.length; i++) {
    const char = hexChars[i];
    const num = parseInt(char, 16); // 0 to 15
    // Map to distinct hue and intensity in cybersecurity palette
    let color;
    if (num < 4) {
      color = `rgba(0, 255, 136, ${0.3 + (num / 4) * 0.7})`; // Green
    } else if (num < 8) {
      color = `rgba(0, 210, 255, ${0.3 + ((num - 4) / 4) * 0.7})`; // Cyan
    } else if (num < 12) {
      color = `rgba(255, 170, 0, ${0.3 + ((num - 8) / 4) * 0.7})`; // Amber
    } else {
      color = `rgba(255, 51, 68, ${0.3 + ((num - 12) / 4) * 0.7})`; // Red
    }

    visualMatrix.push({
      index: i,
      char,
      num,
      color
    });
  }

  const fingerprintResult = {
    hash,
    signalCount: stableSignals.length,
    entropyBreakdown,
    visualMatrix,
    timestamp: new Date().toISOString()
  };

  state.fingerprint = fingerprintResult;
  state.emit('fingerprint:generated', fingerprintResult);

  return fingerprintResult;
}
