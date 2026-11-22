/**
 * ============================================================================
 * PRIVACY & BROWSER ENVIRONMENT COLLECTOR
 * Passive permission queries, storage availability, and content-blocking heuristics
 * ============================================================================
 */

/**
 * Collect privacy signals and browser environment configuration
 * @returns {Promise<Array<Object>>}
 */
export async function collectPrivacySignals() {
  const signals = [];
  const nav = typeof navigator !== 'undefined' ? navigator : {};

  // 1. Passive Permission States (Notifications & Geolocation WITHOUT prompting)
  let notificationState = 'Unspecified';
  let geolocationState = 'Unspecified';

  if (nav.permissions && typeof nav.permissions.query === 'function') {
    try {
      const notifStatus = await nav.permissions.query({ name: 'notifications' });
      notificationState = notifStatus ? notifStatus.state.toUpperCase() : 'UNKNOWN';
    } catch {
      notificationState = 'RESTRICTED / QUERY UNSUPPORTED';
    }

    try {
      const geoStatus = await nav.permissions.query({ name: 'geolocation' });
      geolocationState = geoStatus ? geoStatus.state.toUpperCase() : 'UNKNOWN';
    } catch {
      geolocationState = 'RESTRICTED / QUERY UNSUPPORTED';
    }
  } else {
    notificationState = 'Permissions API Unsupported';
    geolocationState = 'Permissions API Unsupported';
  }

  signals.push({
    id: 'privacy.notifications_permission',
    label: 'Notification Permission State',
    value: notificationState,
    rawValue: notificationState,
    status: notificationState.includes('Unsupported') ? 'UNAVAILABLE' : 'AVAILABLE',
    category: 'privacy',
    source: 'navigator.permissions.query({ name: "notifications" })',
    explanation: 'Passive permission status query made without prompting the user for approval.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  signals.push({
    id: 'privacy.geolocation_permission',
    label: 'Geolocation Permission State',
    value: geolocationState,
    rawValue: geolocationState,
    status: geolocationState.includes('Unsupported') ? 'UNAVAILABLE' : 'AVAILABLE',
    category: 'privacy',
    source: 'navigator.permissions.query({ name: "geolocation" })',
    explanation: 'Passive GPS/location permission state without triggering an access prompt.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 2. Client Storage Engine Availability (Passive check, zero writes)
  const hasIndexedDB = typeof window !== 'undefined' && !!window.indexedDB;
  const hasCacheStorage = typeof window !== 'undefined' && !!window.caches;
  let localStorageAccessible = false;
  try {
    localStorageAccessible = typeof window !== 'undefined' && 'localStorage' in window && window.localStorage !== null;
  } catch {
    localStorageAccessible = false;
  }

  signals.push({
    id: 'privacy.storage_apis',
    label: 'Client Storage Capabilities',
    value: `IndexedDB: ${hasIndexedDB ? 'Yes' : 'No'} // Caches: ${hasCacheStorage ? 'Yes' : 'No'} // WebStorage: ${localStorageAccessible ? 'Active' : 'Blocked'}`,
    rawValue: { hasIndexedDB, hasCacheStorage, localStorageAccessible },
    status: 'AVAILABLE',
    category: 'privacy',
    source: 'window.indexedDB, window.caches',
    explanation: 'Detects storage subsystem availability and restrictions (often constrained in private browsing).',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 3. Privacy-Respecting Content Blocker / Ad-Blocker Heuristic
  // Strictly respects boundaries: does not enumerate extensions, does not access private extension data.
  let blockerResult = 'NOT DETECTED';
  let blockerConfidence = 'ESTIMATED';

  try {
    const testBait = document.createElement('div');
    testBait.className = 'adsbox pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads';
    testBait.setAttribute('style', 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;');
    document.body.appendChild(testBait);

    // Wait a frame for cosmetic filters to act
    await new Promise(r => setTimeout(r, 60));

    const computed = window.getComputedStyle(testBait);
    if (
      computed.display === 'none' ||
      computed.visibility === 'hidden' ||
      testBait.offsetHeight === 0 ||
      testBait.offsetParent === null
    ) {
      blockerResult = 'DETECTED';
    } else {
      blockerResult = 'NOT DETECTED';
    }

    document.body.removeChild(testBait);
  } catch (err) {
    blockerResult = 'INCONCLUSIVE';
    blockerConfidence = 'INCONCLUSIVE';
  }

  signals.push({
    id: 'privacy.adblock_heuristic',
    label: 'Content-Filter / Shield Heuristic',
    value: blockerResult,
    rawValue: blockerResult,
    status: blockerResult === 'DETECTED' ? 'ESTIMATED' : (blockerResult === 'NOT DETECTED' ? 'AVAILABLE' : 'INCONCLUSIVE'),
    category: 'privacy',
    source: 'Cosmetic Filter Bait Heuristic',
    explanation: 'Passive observation of CSS element suppression. Heuristic only, does not name specific extensions.',
    entropyWeight: 'MEDIUM',
    confidence: blockerConfidence
  });

  return signals;
}
