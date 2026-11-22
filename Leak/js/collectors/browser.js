/**
 * ============================================================================
 * BROWSER INTELLIGENCE COLLECTOR
 * Collects software architecture, engine, versioning, and client hints
 * ============================================================================
 */

import { escapeHtml } from '../core/utilities.js';

/**
 * Collect all browser-related telemetry signals
 * @returns {Promise<Array<Object>>}
 */
export async function collectBrowserSignals() {
  const signals = [];
  const nav = typeof navigator !== 'undefined' ? navigator : {};

  // 1. User Agent String
  const userAgent = nav.userAgent || 'Unavailable';
  signals.push({
    id: 'browser.user_agent',
    label: 'User-Agent String',
    value: userAgent,
    rawValue: userAgent,
    status: userAgent !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'browser',
    source: 'navigator.userAgent',
    explanation: 'The primary legacy string identifying browser brand, engine version, and host OS.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // 2. High-Entropy Client Hints (Chromium UA-Data)
  let brandName = 'Unknown';
  let browserVersion = 'Unknown';
  let platformVersion = 'Unknown';
  let uaDataAvailable = false;

  if (nav.userAgentData) {
    uaDataAvailable = true;
    const brands = nav.userAgentData.brands || [];
    if (brands.length > 0) {
      // Pick the most specific brand (filter out "Not:A-Brand" or generic markers)
      const specificBrand = brands.find(b => !b.brand.includes('Not') && !b.brand.includes('Brand')) || brands[0];
      brandName = specificBrand ? `${specificBrand.brand} v${specificBrand.version}` : 'Chromium-based';
    }

    try {
      // Request high-entropy values (if browser grants synchronously)
      if (typeof nav.userAgentData.getHighEntropyValues === 'function') {
        const highEntropy = await nav.userAgentData.getHighEntropyValues([
          'platform', 'platformVersion', 'architecture', 'model', 'bitness'
        ]);
        if (highEntropy) {
          platformVersion = highEntropy.platformVersion || 'Unavailable';
        }
      }
    } catch {
      // Graceful fallback if high entropy hints are restricted
    }
  } else {
    // Parse fallback from User-Agent
    const ua = userAgent;
    if (ua.includes('Firefox/')) {
      const match = ua.match(/Firefox\/([\d.]+)/);
      brandName = 'Mozilla Firefox';
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Edg/')) {
      const match = ua.match(/Edg\/([\d.]+)/);
      brandName = 'Microsoft Edge';
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Chrome/')) {
      const match = ua.match(/Chrome\/([\d.]+)/);
      brandName = 'Google Chrome';
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
      const match = ua.match(/Version\/([\d.]+)/);
      brandName = 'Apple Safari';
      browserVersion = match ? match[1] : 'Unknown';
    }
  }

  // 3. Identified Browser Brand & Version
  signals.push({
    id: 'browser.brand',
    label: 'Browser Brand & Version',
    value: browserVersion !== 'Unknown' ? `${brandName} ${browserVersion}` : brandName,
    rawValue: { brand: brandName, version: browserVersion },
    status: brandName !== 'Unknown' ? 'AVAILABLE' : 'ESTIMATED',
    category: 'browser',
    source: uaDataAvailable ? 'navigator.userAgentData' : 'User-Agent Parsing',
    explanation: 'Parsed identity of the browser client software.',
    entropyWeight: 'MEDIUM',
    confidence: uaDataAvailable ? 'CONFIRMED' : 'ESTIMATED'
  });

  // 4. Platform Architecture
  const platform = nav.platform || 'Unavailable';
  signals.push({
    id: 'browser.platform',
    label: 'Operating Platform',
    value: platform,
    rawValue: platform,
    status: platform !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'browser',
    source: 'navigator.platform',
    explanation: 'Platform architecture identifier exposed to scripts.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 5. Preferred System Languages
  const languages = Array.isArray(nav.languages) && nav.languages.length > 0 
    ? nav.languages.join(', ') 
    : (nav.language || 'Unavailable');
  signals.push({
    id: 'browser.languages',
    label: 'Accepted Language List',
    value: languages,
    rawValue: nav.languages || [nav.language],
    status: languages !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'browser',
    source: 'navigator.languages',
    explanation: 'The prioritized language locales configured in user preferences.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // 6. Do Not Track (DNT) Header
  const dnt = nav.doNotTrack || (typeof window !== 'undefined' && window.doNotTrack) || 'unspecified';
  const dntNormalized = dnt === '1' || dnt === 'yes' ? 'ENABLED (1)' : (dnt === '0' || dnt === 'no' ? 'DISABLED (0)' : 'UNSPECIFIED');
  signals.push({
    id: 'browser.dnt',
    label: 'Do Not Track (DNT)',
    value: dntNormalized,
    rawValue: dnt,
    status: dnt !== 'unspecified' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'browser',
    source: 'navigator.doNotTrack',
    explanation: 'Legacy client privacy header requesting servers not to track the session.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 7. Global Privacy Control (GPC)
  const gpc = typeof nav.globalPrivacyControl !== 'undefined' ? (nav.globalPrivacyControl ? 'ENABLED' : 'DISABLED') : 'UNSUPPORTED';
  signals.push({
    id: 'browser.gpc',
    label: 'Global Privacy Control (GPC)',
    value: gpc,
    rawValue: nav.globalPrivacyControl,
    status: gpc !== 'UNSUPPORTED' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'browser',
    source: 'navigator.globalPrivacyControl',
    explanation: 'Modern privacy signal under state laws (e.g. CCPA/CPRA) signaling opt-out of data sale.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 8. Cookies Enabled
  const cookieEnabled = nav.cookieEnabled ? 'ENABLED' : 'DISABLED';
  signals.push({
    id: 'browser.cookies_enabled',
    label: 'Cookie Acceptance Engine',
    value: cookieEnabled,
    rawValue: nav.cookieEnabled,
    status: 'AVAILABLE',
    category: 'browser',
    source: 'navigator.cookieEnabled',
    explanation: 'Indicates whether the browser accepts first-party session/persistent cookies.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 9. Built-in PDF Viewer Support
  const pdfViewer = typeof nav.pdfViewerEnabled !== 'undefined' 
    ? (nav.pdfViewerEnabled ? 'ENABLED' : 'DISABLED') 
    : 'UNAVAILABLE';
  signals.push({
    id: 'browser.pdf_viewer',
    label: 'Internal PDF Viewer API',
    value: pdfViewer,
    rawValue: nav.pdfViewerEnabled,
    status: pdfViewer !== 'UNAVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'browser',
    source: 'navigator.pdfViewerEnabled',
    explanation: 'Indicates if browser has an embedded PDF plugin engine.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 10. Web Worker / Service Worker Availability
  const workerSupport = typeof Worker !== 'undefined' ? 'SUPPORTED' : 'UNSUPPORTED';
  signals.push({
    id: 'browser.web_workers',
    label: 'Background Web Workers',
    value: workerSupport,
    rawValue: typeof Worker !== 'undefined',
    status: 'AVAILABLE',
    category: 'browser',
    source: 'window.Worker',
    explanation: 'Capability to execute multi-threaded JavaScript in background threads.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  return signals;
}
