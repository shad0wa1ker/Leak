/**
 * BROWSER FINGERPRINT — ALL-IN-ONE BUNDLE
 * Automatically loaded when index.html is opened directly via file:// protocol
 * (to bypass browser CORS restrictions on ES module imports when double-clicking)
 */
(function() {
  'use strict';

// --- MODULE: js/core/utilities.js ---
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
async function sha256(message) {
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
function fallbackHash(str) {
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
function escapeHtml(str) {
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
function formatBytes(bytes) {
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
function getStatusBadgeClass(status) {
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
function getEntropyBadgeClass(weight) {
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
function debounce(func, wait = 100) {
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


// --- MODULE: js/core/state.js ---
/**
 * ============================================================================
 * CORE APPLICATION STATE
 * In-Memory Reactive Store (Zero Persistent Storage)
 * ============================================================================
 * Strictly adheres to privacy requirements:
 * - NO localStorage
 * - NO sessionStorage
 * - NO cookies
 * - Releases all data when page is reloaded or navigated away.
 */

class ApplicationState {
  constructor() {
    this.reset();
  }

  /**
   * Initialize or wipe all state held in memory
   */
  reset() {
    this.caseId = this.generateCaseId();
    this.timestamp = new Date();
    this.ipConsent = 'pending'; // 'pending' | 'granted' | 'denied'
    
    // In-memory collections
    this.signals = new Map();
    this.sectionStatus = new Map();
    this.listeners = new Map();

    this.fingerprint = {
      hash: null,
      entropyBreakdown: { high: 0, medium: 0, low: 0 },
      visualMatrix: [],
      timestamp: null
    };

    this.consistency = [];
    this.riskAssessment = {
      score: 0,
      tier: 'ASSESSING',
      distinctiveSignals: [],
      recommendations: []
    };
  }

  /**
   * Generates a realistic forensic case identifier
   */
  generateCaseId() {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    return `CASE-${year}-BF-${rand}-${suffix}`;
  }

  /**
   * Subscribe to state events
   * @param {string} event
   * @param {Function} callback
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit an event to registered subscribers
   * @param {string} event
   * @param {any} payload
   */
  emit(event, payload) {
    if (this.listeners.has(event)) {
      for (const callback of this.listeners.get(event)) {
        try {
          callback(payload);
        } catch (err) {
          console.error(`Error in event listener for ${event}:`, err);
        }
      }
    }
  }

  /**
   * Register or update an investigated signal
   * @param {Object} signal
   */
  registerSignal(signal) {
    if (!signal || !signal.id) {
      console.warn('Attempted to register invalid signal:', signal);
      return;
    }

    const normalizedSignal = {
      id: signal.id,
      label: signal.label || signal.id,
      value: signal.value !== undefined ? signal.value : 'Unavailable',
      rawValue: signal.rawValue !== undefined ? signal.rawValue : signal.value,
      status: signal.status || 'AVAILABLE',
      category: signal.category || 'general',
      source: signal.source || 'Browser API',
      explanation: signal.explanation || '',
      entropyWeight: signal.entropyWeight || 'MEDIUM',
      confidence: signal.confidence || 'CONFIRMED',
      timestamp: Date.now()
    };

    this.signals.set(signal.id, normalizedSignal);
    this.emit('signal:registered', normalizedSignal);
    this.emit('stats:updated', this.getStats());
  }

  /**
   * Bulk register multiple signals
   * @param {Array<Object>} signalList
   */
  registerSignals(signalList) {
    if (Array.isArray(signalList)) {
      signalList.forEach(s => this.registerSignal(s));
    }
  }

  /**
   * Retrieve a single signal by ID
   * @param {string} id
   */
  getSignal(id) {
    return this.signals.get(id);
  }

  /**
   * Retrieve all signals as an array
   */
  getSignals() {
    return Array.from(this.signals.values());
  }

  /**
   * Retrieve signals filtered by category
   * @param {string} category
   */
  getSignalsByCategory(category) {
    return Array.from(this.signals.values()).filter(s => s.category === category);
  }

  /**
   * Get overall statistical count of signals by status
   */
  getStats() {
    const counts = {
      total: this.signals.size,
      available: 0,
      unavailable: 0,
      restricted: 0,
      estimated: 0,
      inconclusive: 0,
      requiresConsent: 0
    };

    for (const signal of this.signals.values()) {
      switch (signal.status) {
        case 'AVAILABLE': counts.available++; break;
        case 'UNAVAILABLE': counts.unavailable++; break;
        case 'RESTRICTED': counts.restricted++; break;
        case 'ESTIMATED': counts.estimated++; break;
        case 'INCONCLUSIVE': counts.inconclusive++; break;
        case 'REQUIRES CONSENT': counts.requiresConsent++; break;
        default: counts.available++; break;
      }
    }

    return counts;
  }

  /**
   * Update section scan state
   * @param {string} sectionId
   * @param {'unscanned'|'scanning'|'completed'} status
   */
  setSectionStatus(sectionId, status) {
    this.sectionStatus.set(sectionId, status);
    this.emit('section:status', { sectionId, status });
  }

  /**
   * Set IP consent decision
   * @param {'granted'|'denied'} decision
   */
  setIpConsent(decision) {
    this.ipConsent = decision;
    this.emit('consent:updated', decision);
  }
}

// Singleton state instance for the current session
const state = new ApplicationState();


// --- MODULE: js/core/scanner.js ---
/**
 * ============================================================================
 * SCANNER COORDINATOR
 * Progressive Investigation Queue & Event Coordination
 * ============================================================================
 */


class InvestigationScanner {
  constructor() {
    this.collectors = new Map();
    this.isScanning = false;
    this.completedCategories = new Set();
  }

  /**
   * Register a collector function for a specific category
   * @param {string} category
   * @param {Function} collectorFn - Returns array of signals or promise
   */
  registerCollector(category, collectorFn) {
    this.collectors.set(category, collectorFn);
  }

  /**
   * Run collection for a specific category
   * @param {string} category
   */
  async scanCategory(category) {
    if (this.completedCategories.has(category)) {
      return state.getSignalsByCategory(category);
    }

    const collectorFn = this.collectors.get(category);
    if (!collectorFn) {
      console.warn(`No collector registered for category: ${category}`);
      return [];
    }

    state.setSectionStatus(category, 'scanning');
    state.emit('scan:log', { message: `Investigating ${category} intelligence...`, category });

    try {
      const signals = await collectorFn();
      state.registerSignals(signals);
      this.completedCategories.add(category);
      state.setSectionStatus(category, 'completed');
      state.emit('scan:category-complete', { category, count: signals.length });
      return signals;
    } catch (err) {
      console.error(`Error during ${category} scan:`, err);
      state.setSectionStatus(category, 'completed');
      return [];
    }
  }

  /**
   * Run the initial rapid baseline scan (non-blocking)
   */
  async runBaselineScan() {
    state.emit('scan:started', { caseId: state.caseId, timestamp: state.timestamp });
    
    // Quick baseline categories
    const baseline = ['browser', 'display', 'device'];
    for (const cat of baseline) {
      if (this.collectors.has(cat)) {
        await this.scanCategory(cat);
      }
    }
  }

  /**
   * Check if a category has already been scanned
   * @param {string} category
   */
  hasScanned(category) {
    return this.completedCategories.has(category);
  }
}

const scanner = new InvestigationScanner();


// --- MODULE: js/collectors/browser.js ---
/**
 * ============================================================================
 * BROWSER INTELLIGENCE COLLECTOR
 * Collects software architecture, engine, versioning, and client hints
 * ============================================================================
 */


/**
 * Collect all browser-related telemetry signals
 * @returns {Promise<Array<Object>>}
 */
async function collectBrowserSignals() {
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


// --- MODULE: js/collectors/device.js ---
/**
 * ============================================================================
 * DEVICE & HARDWARE INTELLIGENCE COLLECTOR
 * Hardware concurrency, memory footprint, touch capabilities, and device type
 * ============================================================================
 */

/**
 * Collect device architecture and hardware telemetry
 * @returns {Promise<Array<Object>>}
 */
async function collectDeviceSignals() {
  const signals = [];
  const nav = typeof navigator !== 'undefined' ? navigator : {};

  // 1. Hardware Concurrency (Logical CPU Cores)
  const concurrency = nav.hardwareConcurrency || 'Unavailable';
  signals.push({
    id: 'device.cpu_cores',
    label: 'CPU Hardware Concurrency',
    value: concurrency !== 'Unavailable' ? `${concurrency} Cores` : 'Unavailable',
    rawValue: concurrency,
    status: concurrency !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'device',
    source: 'navigator.hardwareConcurrency',
    explanation: 'Total number of logical processing threads available on the host processor.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 2. Device Memory (Approximate RAM in GB)
  const memory = nav.deviceMemory || 'Unavailable';
  signals.push({
    id: 'device.memory_gb',
    label: 'Device RAM Footprint',
    value: memory !== 'Unavailable' ? `~${memory} GB` : 'Unavailable',
    rawValue: memory,
    status: memory !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'device',
    source: 'navigator.deviceMemory',
    explanation: 'Approximate device RAM capacity reported in powers of 2 for fingerprint protection.',
    entropyWeight: 'MEDIUM',
    confidence: memory !== 'Unavailable' ? 'ESTIMATED' : 'UNAVAILABLE'
  });

  // 3. Touch Capabilities & Points
  const maxTouchPoints = typeof nav.maxTouchPoints === 'number' ? nav.maxTouchPoints : 0;
  const hasTouchEvents = typeof window !== 'undefined' && ('ontouchstart' in window);
  signals.push({
    id: 'device.touch_points',
    label: 'Max Touch Contact Points',
    value: `${maxTouchPoints} points (TouchEvents: ${hasTouchEvents ? 'Active' : 'Inactive'})`,
    rawValue: { maxTouchPoints, hasTouchEvents },
    status: 'AVAILABLE',
    category: 'device',
    source: 'navigator.maxTouchPoints',
    explanation: 'Hardware touch digitizer support, distinguishing touchscreen laptops, tablets, and phones.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 4. Device Form Factor Estimation
  let deviceCategory = 'Desktop';
  if (maxTouchPoints > 0 && typeof window !== 'undefined') {
    if (window.innerWidth < 600 || (nav.userAgent && /Mobile|Android|iPhone/i.test(nav.userAgent))) {
      deviceCategory = 'Mobile Handset';
    } else if (window.innerWidth < 1024 || (nav.userAgent && /Tablet|iPad/i.test(nav.userAgent))) {
      deviceCategory = 'Tablet Device';
    } else {
      deviceCategory = 'Touch-Enabled Laptop / Hybrid';
    }
  }
  signals.push({
    id: 'device.category_estimation',
    label: 'Estimated Device Form Factor',
    value: deviceCategory,
    rawValue: deviceCategory,
    status: 'ESTIMATED',
    category: 'device',
    source: 'Heuristic Synthesis',
    explanation: 'Classification based on screen boundaries, touch digitizer points, and user agent signals.',
    entropyWeight: 'LOW',
    confidence: 'ESTIMATED'
  });

  // 5. Battery Status API (Passive Query)
  let batterySignal = {
    id: 'device.battery_status',
    label: 'Battery Telemetry API',
    value: 'Restricted / Unsupported',
    rawValue: null,
    status: 'RESTRICTED',
    category: 'device',
    source: 'navigator.getBattery()',
    explanation: 'Modern browsers restrict battery telemetry due to previous fingerprinting exploits.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  };

  if (typeof nav.getBattery === 'function') {
    try {
      const batteryPromise = nav.getBattery();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 500));
      const battery = await Promise.race([batteryPromise, timeoutPromise]);
      if (battery) {
        const charging = battery.charging ? 'Charging' : 'Discharging';
        const level = Math.round(battery.level * 100);
        batterySignal.value = `${level}% (${charging})`;
        batterySignal.rawValue = { level, charging: battery.charging };
        batterySignal.status = 'AVAILABLE';
      }
    } catch {
      // Browsers often reject or timeout battery queries for privacy
      batterySignal.status = 'RESTRICTED';
    }
  }
  signals.push(batterySignal);

  return signals;
}


// --- MODULE: js/collectors/network.js ---
/**
 * ============================================================================
 * NETWORK & LOCATION INTELLIGENCE COLLECTOR
 * Local network information, timezone telemetry, and consented IP lookup
 * ============================================================================
 */

/**
 * Collect local network and timezone signals (Zero external requests)
 * @returns {Array<Object>}
 */
function collectLocalNetworkSignals() {
  const signals = [];
  const nav = typeof navigator !== 'undefined' ? navigator : {};

  // 1. Online / Connectivity State
  const isOnline = typeof nav.onLine === 'boolean' ? (nav.onLine ? 'ONLINE' : 'OFFLINE') : 'UNKNOWN';
  signals.push({
    id: 'network.online_status',
    label: 'Connection State',
    value: isOnline,
    rawValue: nav.onLine,
    status: 'AVAILABLE',
    category: 'network',
    source: 'navigator.onLine',
    explanation: 'Basic browser socket connectivity state.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 2. Network Information API (Connection characteristics)
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    const effectiveType = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'UNKNOWN';
    const downlink = typeof conn.downlink === 'number' ? `${conn.downlink} Mbps` : 'Unavailable';
    const rtt = typeof conn.rtt === 'number' ? `${conn.rtt} ms` : 'Unavailable';
    const saveData = conn.saveData ? 'ENABLED' : 'DISABLED';

    signals.push({
      id: 'network.effective_type',
      label: 'Estimated Cellular/Bandwidth Tier',
      value: `${effectiveType} (Downlink: ${downlink}, Latency: ${rtt})`,
      rawValue: { effectiveType, downlink: conn.downlink, rtt: conn.rtt, saveData: conn.saveData },
      status: 'AVAILABLE',
      category: 'network',
      source: 'navigator.connection',
      explanation: 'Network Information API telemetry estimating link bandwidth and round-trip time.',
      entropyWeight: 'MEDIUM',
      confidence: 'ESTIMATED'
    });

    signals.push({
      id: 'network.save_data',
      label: 'Data Saver Mode',
      value: saveData,
      rawValue: conn.saveData,
      status: 'AVAILABLE',
      category: 'network',
      source: 'navigator.connection.saveData',
      explanation: 'User preference requesting reduced data usage from origins.',
      entropyWeight: 'LOW',
      confidence: 'CONFIRMED'
    });
  } else {
    signals.push({
      id: 'network.effective_type',
      label: 'Estimated Bandwidth Tier',
      value: 'API Unsupported / Restricted',
      rawValue: null,
      status: 'UNAVAILABLE',
      category: 'network',
      source: 'navigator.connection',
      explanation: 'Network Information API is restricted or not implemented in this browser engine.',
      entropyWeight: 'LOW',
      confidence: 'CONFIRMED'
    });
  }

  // 3. Time Zone Identifier
  let timeZone = 'Unavailable';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unavailable';
  } catch {
    timeZone = 'Unavailable';
  }
  signals.push({
    id: 'network.timezone',
    label: 'Host Time Zone',
    value: timeZone,
    rawValue: timeZone,
    status: timeZone !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'network',
    source: 'Intl.DateTimeFormat().resolvedOptions().timeZone',
    explanation: 'Configured geographic IANA timezone database entry.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // 4. Local Timezone Offset & Clock
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;
  const formattedOffset = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}:00`;
  const localClock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  signals.push({
    id: 'network.utc_offset',
    label: 'UTC Offset & Local Clock',
    value: `${formattedOffset} (Clock: ${localClock})`,
    rawValue: { offsetMinutes, offsetHours, localClock },
    status: 'AVAILABLE',
    category: 'network',
    source: 'Date.prototype.getTimezoneOffset()',
    explanation: 'Difference in minutes between local system clock and UTC.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 5. Default External IP Placeholder (Pending Consent)
  signals.push({
    id: 'network.public_ip',
    label: 'Public IP & Geo-Location',
    value: 'Awaiting User Authorization',
    rawValue: null,
    status: 'REQUIRES CONSENT',
    category: 'network',
    source: 'External Geo-IP Service',
    explanation: 'Disclosing public IP requires dispatching a network query to an external service.',
    entropyWeight: 'HIGH',
    confidence: 'ESTIMATED'
  });

  return signals;
}

/**
 * Perform consented external IP and Geo-location lookup
 * @returns {Promise<Array<Object>>}
 */
async function fetchConsentedIpData() {
  const updatedSignals = [];

  try {
    // Attempt lookup with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }

    const data = await response.json();

    updatedSignals.push({
      id: 'network.public_ip',
      label: 'Public IP Address',
      value: data.ip || 'Unavailable',
      rawValue: data.ip,
      status: 'AVAILABLE',
      category: 'network',
      source: 'Consented External Query (ipapi.co)',
      explanation: 'The public routing IP visible to internet web servers.',
      entropyWeight: 'HIGH',
      confidence: 'CONFIRMED'
    });

    updatedSignals.push({
      id: 'network.ip_location',
      label: 'Approximate Physical Location',
      value: `${data.city || 'Unknown'}, ${data.region || ''} (${data.country_name || 'Unknown'})`,
      rawValue: { city: data.city, region: data.region, country: data.country_name, countryCode: data.country_code },
      status: 'AVAILABLE',
      category: 'network',
      source: 'Consented External Query (ipapi.co)',
      explanation: 'Physical geographic estimate resolved from public IP allocation tables.',
      entropyWeight: 'HIGH',
      confidence: 'ESTIMATED'
    });

    updatedSignals.push({
      id: 'network.ip_isp',
      label: 'Autonomous System & ISP',
      value: `${data.org || data.asn || 'Unavailable'}`,
      rawValue: { org: data.org, asn: data.asn },
      status: 'AVAILABLE',
      category: 'network',
      source: 'Consented External Query (ipapi.co)',
      explanation: 'Internet Service Provider or network operator hosting this address.',
      entropyWeight: 'HIGH',
      confidence: 'CONFIRMED'
    });

  } catch (err) {
    console.warn('External IP lookup encountered an issue or was blocked:', err);
    updatedSignals.push({
      id: 'network.public_ip',
      label: 'Public IP & Geo-Location',
      value: 'Lookup Request Blocked or Offline',
      rawValue: null,
      status: 'UNAVAILABLE',
      category: 'network',
      source: 'Consented External Query',
      explanation: 'The request could not reach the external IP lookup endpoint or was blocked by a network shield.',
      entropyWeight: 'LOW',
      confidence: 'CONFIRMED'
    });
  }

  return updatedSignals;
}


// --- MODULE: js/collectors/display.js ---
/**
 * ============================================================================
 * DISPLAY INTELLIGENCE COLLECTOR
 * Screen geometry, viewport boundaries, color depth, and media capabilities
 * ============================================================================
 */

/**
 * Collect physical and viewport display signals
 * @returns {Array<Object>}
 */
function collectDisplaySignals() {
  const signals = [];
  const scr = typeof screen !== 'undefined' ? screen : {};
  const win = typeof window !== 'undefined' ? window : {};

  // 1. Physical Screen Resolution
  const width = scr.width || 0;
  const height = scr.height || 0;
  const resStr = width && height ? `${width} × ${height} px` : 'Unavailable';
  signals.push({
    id: 'display.resolution',
    label: 'Native Screen Resolution',
    value: resStr,
    rawValue: { width, height },
    status: width && height ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'display',
    source: 'screen.width, screen.height',
    explanation: 'Hardware pixel resolution of the primary connected display.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // 2. Available Screen Space (Subtracts OS Taskbars/Docks)
  const availW = scr.availWidth || 0;
  const availH = scr.availHeight || 0;
  const availStr = availW && availH ? `${availW} × ${availH} px` : 'Unavailable';
  signals.push({
    id: 'display.available_resolution',
    label: 'Available Workspace Resolution',
    value: availStr,
    rawValue: { availWidth: availW, availHeight: availH },
    status: availW && availH ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'display',
    source: 'screen.availWidth, screen.availHeight',
    explanation: 'Screen dimensions excluding permanent OS desktop UI elements (taskbars, docks).',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // 3. Browser Viewport Dimensions
  const viewW = win.innerWidth || 0;
  const viewH = win.innerHeight || 0;
  signals.push({
    id: 'display.viewport',
    label: 'Active Viewport Boundaries',
    value: `${viewW} × ${viewH} px`,
    rawValue: { innerWidth: viewW, innerHeight: viewH },
    status: 'AVAILABLE',
    category: 'display',
    source: 'window.innerWidth, window.innerHeight',
    explanation: 'Inner rendered window frame size, influenced by browser window sizing.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 4. Color & Pixel Depth
  const colorDepth = scr.colorDepth || 0;
  signals.push({
    id: 'display.color_depth',
    label: 'Color Depth & Bit Precision',
    value: colorDepth ? `${colorDepth}-bit` : 'Unavailable',
    rawValue: colorDepth,
    status: colorDepth ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'display',
    source: 'screen.colorDepth',
    explanation: 'Bits per pixel used for color representation (standard is 24-bit or 30-bit).',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 5. Device Pixel Ratio (HiDPI / Retina scale factor)
  const dpr = win.devicePixelRatio || 1;
  signals.push({
    id: 'display.pixel_ratio',
    label: 'Device Pixel Ratio (DPR)',
    value: `${dpr}x`,
    rawValue: dpr,
    status: 'AVAILABLE',
    category: 'display',
    source: 'window.devicePixelRatio',
    explanation: 'Ratio of physical display pixels to CSS logical pixels (Retina displays are 2x or 3x).',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 6. Display Orientation
  let orientation = 'Unknown';
  if (scr.orientation && scr.orientation.type) {
    orientation = scr.orientation.type;
  } else if (win.matchMedia) {
    orientation = win.matchMedia('(orientation: portrait)').matches ? 'portrait-primary' : 'landscape-primary';
  }
  signals.push({
    id: 'display.orientation',
    label: 'Screen Orientation',
    value: orientation.toUpperCase(),
    rawValue: orientation,
    status: 'AVAILABLE',
    category: 'display',
    source: 'screen.orientation',
    explanation: 'Current geometric display orientation (landscape or portrait).',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 7. Wide Color Gamut & HDR Media Queries
  let colorGamut = 'sRGB';
  if (win.matchMedia) {
    if (win.matchMedia('(color-gamut: rec2020)').matches) colorGamut = 'Rec. 2020 (Ultra Wide)';
    else if (win.matchMedia('(color-gamut: p3)').matches) colorGamut = 'Display P3 (Wide Gamut)';
  }
  const isHdr = win.matchMedia && win.matchMedia('(dynamic-range: high)').matches ? 'HDR Supported' : 'SDR Standard';

  signals.push({
    id: 'display.color_gamut',
    label: 'Color Gamut & Dynamic Range',
    value: `${colorGamut} // ${isHdr}`,
    rawValue: { colorGamut, isHdr },
    status: 'AVAILABLE',
    category: 'display',
    source: 'CSS Media Queries (color-gamut, dynamic-range)',
    explanation: 'Hardware color fidelity and high dynamic range display capabilities.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  return signals;
}


// --- MODULE: js/collectors/graphics.js ---
/**
 * ============================================================================
 * GRAPHICS INTELLIGENCE COLLECTOR
 * WebGL contexts, unmasked GPU silicon, extensions, and Canvas 2D render hash
 * ============================================================================
 */


/**
 * Collect graphics hardware, WebGL attributes, and Canvas render characteristics
 * @returns {Promise<Array<Object>>}
 */
async function collectGraphicsSignals() {
  const signals = [];

  // 1. WebGL 1 & WebGL 2 Context Probing
  let gl1Supported = false;
  let gl2Supported = false;
  let unmaskedVendor = 'Unavailable';
  let unmaskedRenderer = 'Unavailable';
  let maxTextureSize = 'Unavailable';
  let extensionsCount = 0;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;

    // Probe WebGL 2
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      gl2Supported = true;
    }

    // Probe WebGL 1 or fall back to experimental
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      gl1Supported = true;

      // Extract unmasked renderer info if exposed by browser
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Restricted';
        unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Restricted';
      }

      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 'Unavailable';
      const supportedExtensions = gl.getSupportedExtensions() || [];
      extensionsCount = supportedExtensions.length;
    }
  } catch (err) {
    console.warn('WebGL interrogation restricted or encountered error:', err);
  }

  // WebGL Support State
  const webglState = gl2Supported ? 'WebGL 2.0 & 1.0 Active' : (gl1Supported ? 'WebGL 1.0 Only' : 'Disabled / Unsupported');
  signals.push({
    id: 'graphics.webgl_support',
    label: 'WebGL Graphics Pipeline',
    value: webglState,
    rawValue: { gl1: gl1Supported, gl2: gl2Supported },
    status: gl1Supported ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'graphics',
    source: 'HTMLCanvasElement.getContext("webgl")',
    explanation: 'Hardware-accelerated 3D rendering pipeline availability.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // Unmasked GPU Renderer (Crucial Fingerprinting Vector!)
  signals.push({
    id: 'graphics.unmasked_renderer',
    label: 'Unmasked GPU Silicon / Renderer',
    value: unmaskedRenderer,
    rawValue: unmaskedRenderer,
    status: unmaskedRenderer !== 'Unavailable' && unmaskedRenderer !== 'Restricted' ? 'AVAILABLE' : 'RESTRICTED',
    category: 'graphics',
    source: 'WEBGL_debug_renderer_info.UNMASKED_RENDERER_WEBGL',
    explanation: 'The physical graphics processor brand and driver architecture executing 3D shaders.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // Unmasked GPU Vendor
  signals.push({
    id: 'graphics.unmasked_vendor',
    label: 'GPU Silicon Vendor',
    value: unmaskedVendor,
    rawValue: unmaskedVendor,
    status: unmaskedVendor !== 'Unavailable' && unmaskedVendor !== 'Restricted' ? 'AVAILABLE' : 'RESTRICTED',
    category: 'graphics',
    source: 'WEBGL_debug_renderer_info.UNMASKED_VENDOR_WEBGL',
    explanation: 'Hardware vendor responsible for the active graphics chipset.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // Max Texture Size & Extensions
  signals.push({
    id: 'graphics.webgl_capabilities',
    label: 'WebGL Hardware Parameters',
    value: `Max Texture: ${maxTextureSize}px // ${extensionsCount} Extensions Supported`,
    rawValue: { maxTextureSize, extensionsCount },
    status: gl1Supported ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'graphics',
    source: 'WebGLRenderingContext.getParameter()',
    explanation: 'Hardware texture limits and enabled graphics extension profiles.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 2. Off-Screen Canvas 2D Render Signature
  let canvasHash = 'Unavailable';
  try {
    const c2d = document.createElement('canvas');
    c2d.width = 240;
    c2d.height = 60;
    const ctx = c2d.getContext('2d');

    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 240, 60);
      grad.addColorStop(0, '#00ff88');
      grad.addColorStop(0.5, '#00d2ff');
      grad.addColorStop(1, '#ff3344');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 240, 60);

      // Multi-layer text with antialiasing variations
      ctx.font = '16px "Arial", sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillText('BrowserFingerprint-2026', 12, 28);

      ctx.font = '14px "Times New Roman", serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('Forensic Investigation 🕵️‍♂️ <XML>', 15, 48);

      // Arc & composite blending
      ctx.globalCompositeOperation = 'difference';
      ctx.beginPath();
      ctx.arc(120, 30, 20, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
      ctx.fill();

      const dataUrl = c2d.toDataURL();
      canvasHash = fallbackHash(dataUrl);
    }
  } catch (err) {
    console.warn('Canvas rendering hash calculation restricted:', err);
  }

  signals.push({
    id: 'graphics.canvas_hash',
    label: '2D Canvas Geometry & Blending Signature',
    value: canvasHash !== 'Unavailable' ? `${canvasHash.substring(0, 16)}...` : 'Unavailable',
    rawValue: canvasHash,
    status: canvasHash !== 'Unavailable' ? 'AVAILABLE' : 'RESTRICTED',
    category: 'graphics',
    source: 'HTMLCanvasElement.toDataURL() + Hash',
    explanation: 'Hardware and OS-dependent anti-aliasing and sub-pixel color blending signature.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  return signals;
}


// --- MODULE: js/collectors/audio.js ---
/**
 * ============================================================================
 * AUDIO INTELLIGENCE COLLECTOR
 * Web Audio API processing, compressor dynamics, and silent rendering signature
 * ============================================================================
 */


/**
 * Collect Web Audio architecture and calculate an offline dynamics signature
 * Fully silent, in-memory only, no microphone permissions requested.
 * @returns {Promise<Array<Object>>}
 */
async function collectAudioSignals() {
  const signals = [];

  const hasAudioContext = typeof window !== 'undefined' && 
    (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined');
  const hasOfflineAudio = typeof window !== 'undefined' && 
    (typeof window.OfflineAudioContext !== 'undefined' || typeof window.webkitOfflineAudioContext !== 'undefined');

  // 1. Audio API Availability
  signals.push({
    id: 'audio.api_availability',
    label: 'Web Audio Subsystem',
    value: hasOfflineAudio ? 'OfflineAudioContext Active' : (hasAudioContext ? 'AudioContext Supported' : 'Unavailable'),
    rawValue: { hasAudioContext, hasOfflineAudio },
    status: hasOfflineAudio ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'audio',
    source: 'window.OfflineAudioContext',
    explanation: 'Hardware audio synthesis and digital signal processing framework.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 2. Offline Dynamics Compressor Fingerprint
  let audioSignature = 'Unavailable';
  let audioStatus = 'UNAVAILABLE';

  if (hasOfflineAudio) {
    try {
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      // 1 channel, 4500 frames, 44.1kHz sample rate (~100ms offline buffer)
      const context = new OfflineCtx(1, 4500, 44100);

      // Oscillator
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      // Dynamics Compressor (exposes hardware floating-point math differences)
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.reduction.value = -20;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(context.destination);
      oscillator.start(0);

      // Render audio offline with a strict 1-second timeout
      const renderPromise = context.startRendering();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1000));
      const renderedBuffer = await Promise.race([renderPromise, timeoutPromise]);

      if (renderedBuffer) {
        const samples = renderedBuffer.getChannelData(0);
        // Calculate statistical sum and sample slice
        let sum = 0;
        const sampleFingerprint = [];
        for (let i = 0; i < samples.length; i += 50) {
          sum += Math.abs(samples[i]);
          sampleFingerprint.push(samples[i].toFixed(6));
        }

        const rawString = `${sum.toFixed(6)}-${sampleFingerprint.slice(0, 30).join(',')}`;
        audioSignature = fallbackHash(rawString);
        audioStatus = 'AVAILABLE';
      }
    } catch (err) {
      console.warn('Silent audio processing restricted or timed out:', err);
      audioStatus = 'RESTRICTED';
      audioSignature = 'Restricted by Browser';
    }
  }

  signals.push({
    id: 'audio.fingerprint_signature',
    label: 'Audio Buffer Dynamics Signature',
    value: audioStatus === 'AVAILABLE' ? `${audioSignature.substring(0, 16)}...` : audioSignature,
    rawValue: audioSignature,
    status: audioStatus,
    category: 'audio',
    source: 'OfflineAudioContext Dynamics Rendering',
    explanation: 'Subtle variations in floating-point DSP arithmetic and hardware audio processing.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  return signals;
}


// --- MODULE: js/collectors/privacy.js ---
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
async function collectPrivacySignals() {
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


// --- MODULE: js/analysis/fingerprint.js ---
/**
 * ============================================================================
 * FINGERPRINT ANALYSIS ENGINE
 * Canonical signal synthesis, entropy weighting, and deterministic SHA-256 hashing
 * ============================================================================
 */



/**
 * Synthesize all active signals into a deterministic local fingerprint
 * @returns {Promise<Object>}
 */
async function generateFingerprint() {
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


// --- MODULE: js/analysis/consistency.js ---
/**
 * ============================================================================
 * CONSISTENCY ANALYSIS ENGINE
 * Cross-Signal Validation, Anomaly Detection & VPN/Proxy Indicators
 * ============================================================================
 */


/**
 * Evaluate cross-signal consistency across collected intelligence
 * @returns {Array<Object>}
 */
function evaluateConsistency() {
  const findings = [];

  const platformSig = state.getSignal('browser.platform');
  const uaSig = state.getSignal('browser.user_agent');
  const tzSig = state.getSignal('network.timezone');
  const langSig = state.getSignal('browser.languages');
  const ipLocSig = state.getSignal('network.ip_location');
  const screenSig = state.getSignal('display.resolution');
  const availSig = state.getSignal('display.available_resolution');

  // 1. Platform vs User-Agent Consistency Check (Spoofing Heuristic)
  if (platformSig && uaSig && platformSig.status === 'AVAILABLE' && uaSig.status === 'AVAILABLE') {
    const platform = String(platformSig.rawValue).toLowerCase();
    const ua = String(uaSig.rawValue).toLowerCase();

    let isMatch = true;
    if (platform.includes('win') && !ua.includes('windows')) isMatch = false;
    else if (platform.includes('mac') && !ua.includes('macintosh') && !ua.includes('mac os')) isMatch = false;
    else if (platform.includes('linux') && !ua.includes('linux') && !ua.includes('android')) isMatch = false;

    findings.push({
      id: 'consistency.os_platform',
      label: 'OS PLATFORM CONSISTENCY',
      status: isMatch ? 'MATCH' : 'INCONSISTENT',
      severity: isMatch ? 'normal' : 'warning',
      explanation: isMatch 
        ? 'Reported navigator.platform correlates with the operating system declared in the User-Agent header.' 
        : 'Discrepancy detected between navigator.platform and User-Agent OS string (potential client spoofing or emulation).'
    });
  }

  // 2. Screen Geometry Logical Consistency
  if (screenSig && availSig && screenSig.status === 'AVAILABLE' && availSig.status === 'AVAILABLE') {
    const scr = screenSig.rawValue;
    const avail = availSig.rawValue;
    const logical = avail.availWidth <= scr.width && avail.availHeight <= scr.height;

    findings.push({
      id: 'consistency.screen_bounds',
      label: 'DISPLAY GEOMETRY INTEGRITY',
      status: logical ? 'MATCH' : 'INCONSISTENT',
      severity: logical ? 'normal' : 'warning',
      explanation: logical
        ? 'Available desktop workspace fits within physical screen boundary dimensions.'
        : 'Available screen dimensions exceed reported physical screen resolution (virtualized or tampered environment).'
    });
  }

  // 3. Time Zone & Location Consistency (if consented IP is available)
  if (ipLocSig && ipLocSig.status === 'AVAILABLE' && ipLocSig.rawValue) {
    const ipCountry = ipLocSig.rawValue.countryCode || '';
    const tz = tzSig ? String(tzSig.rawValue) : '';

    let tzMatch = 'INCONCLUSIVE';
    if (tz && ipCountry) {
      // Basic region validation
      if (tz.includes('/') && ipCountry.length === 2) {
        tzMatch = 'MATCH';
      }
    }

    findings.push({
      id: 'consistency.tz_location',
      label: 'TIMEZONE & IP LOCATION CONSISTENCY',
      status: tzMatch,
      severity: 'normal',
      explanation: 'Browser-reported timezone is congruent with geographic routing tables from IP lookup.'
    });

    findings.push({
      id: 'consistency.vpn_proxy',
      label: 'VPN / PROXY INDICATOR',
      status: 'UNKNOWN / INCONCLUSIVE',
      severity: 'neutral',
      explanation: 'Browser-only APIs cannot reliably identify every VPN or encrypted tunnel. No definitive tunnel markers observed.'
    });
  } else {
    findings.push({
      id: 'consistency.vpn_proxy',
      label: 'VPN / PROXY INDICATOR',
      status: 'AWAITING IP DATA',
      severity: 'neutral',
      explanation: 'External IP lookup has not been authorized. VPN correlation requires inspecting external routing data.'
    });
  }

  state.consistency = findings;
  state.emit('consistency:evaluated', findings);

  return findings;
}


// --- MODULE: js/analysis/risk-assessment.js ---
/**
 * ============================================================================
 * DIGITAL PRIVACY RISK ASSESSMENT
 * Illustrative exposure scoring, distinctive signal analysis & defense advice
 * ============================================================================
 */


/**
 * Perform digital privacy assessment based on observed browser configuration
 * @returns {Object}
 */
function assessPrivacyExposure() {
  const allSignals = state.getSignals();

  let rawScore = 30; // Baseline web client exposure
  const distinctiveSignals = [];
  const mitigations = [];

  // Evaluate high-entropy contributors
  const rendererSig = state.getSignal('graphics.unmasked_renderer');
  if (rendererSig && rendererSig.status === 'AVAILABLE' && !rendererSig.value.includes('Restricted')) {
    rawScore += 18;
    distinctiveSignals.push({
      label: 'Unmasked GPU Silicon',
      value: rendererSig.value,
      impact: 'HIGH',
      reason: 'Directly exposes physical graphics processor architecture and driver stack.'
    });
  }

  const canvasSig = state.getSignal('graphics.canvas_hash');
  if (canvasSig && canvasSig.status === 'AVAILABLE') {
    rawScore += 14;
    distinctiveSignals.push({
      label: '2D Canvas Antialiasing Hash',
      value: canvasSig.value,
      impact: 'HIGH',
      reason: 'Sub-pixel font antialiasing and GPU blending variances produce a distinctive signature.'
    });
  }

  const audioSig = state.getSignal('audio.fingerprint_signature');
  if (audioSig && audioSig.status === 'AVAILABLE') {
    rawScore += 12;
    distinctiveSignals.push({
      label: 'Audio DSP Dynamics Signature',
      value: audioSig.value,
      impact: 'HIGH',
      reason: 'Floating-point audio compressor calculations reveal hardware DSP differences.'
    });
  }

  const screenSig = state.getSignal('display.resolution');
  if (screenSig && screenSig.status === 'AVAILABLE') {
    rawScore += 10;
    distinctiveSignals.push({
      label: 'Screen & Available Geometry',
      value: screenSig.value,
      impact: 'MEDIUM',
      reason: 'Specific display resolutions, especially multi-monitor setups, quickly narrow identification.'
    });
  }

  const langSig = state.getSignal('browser.languages');
  if (langSig && langSig.status === 'AVAILABLE' && langSig.value.includes(',')) {
    rawScore += 8;
    distinctiveSignals.push({
      label: 'Custom Language Preference Hierarchy',
      value: langSig.value,
      impact: 'MEDIUM',
      reason: 'Unusual multilingual configurations are statistically rare.'
    });
  }

  // Evaluate mitigations & privacy protections
  const gpcSig = state.getSignal('browser.gpc');
  if (gpcSig && gpcSig.value === 'ENABLED') {
    rawScore -= 8;
    mitigations.push('Global Privacy Control (GPC) opt-out signal active');
  }

  const adblockSig = state.getSignal('privacy.adblock_heuristic');
  if (adblockSig && adblockSig.value.includes('DETECTED')) {
    rawScore -= 10;
    mitigations.push('Content-blocking cosmetic shield observable');
  }

  // Normalize score between 10 and 95
  const score = Math.max(15, Math.min(95, rawScore));

  let tier = 'MODERATE EXPOSURE';
  let tierColor = 'var(--accent-amber)';
  if (score >= 70) {
    tier = 'HIGH EXPOSURE';
    tierColor = 'var(--accent-red)';
  } else if (score < 40) {
    tier = 'HARDENED CONFIGURATION';
    tierColor = 'var(--accent-green)';
  }

  // Actionable defense recommendations
  const recommendations = [
    {
      title: 'Anti-Fingerprinting Browser Profiles',
      body: 'Consider browsers with built-in canvas randomization and metric letterboxing (e.g., Mullvad Browser, Brave, or Firefox with privacy.resistFingerprinting).'
    },
    {
      title: 'Normalize Display Dimensions',
      body: 'Avoid browsing in maximized or non-standard custom tiled window sizes on desktop to prevent window-size fingerprinting.'
    },
    {
      title: 'Disable Unmasked WebGL Reporting',
      body: 'Configuring your browser to return generic WebGL renderer strings prevents websites from fingerprinting your exact GPU silicon model.'
    }
  ];

  const assessment = {
    score,
    tier,
    tierColor,
    distinctiveSignals,
    mitigations,
    recommendations,
    disclaimer: 'This score is an illustrative assessment based on observed signal entropy, not a scientifically validated probability of re-identification.'
  };

  state.riskAssessment = assessment;
  state.emit('risk:assessed', assessment);

  return assessment;
}


// --- MODULE: js/ui/investigation-report.js ---
/**
 * ============================================================================
 * FBI-STYLE CLASSIFIED INVESTIGATION DOSSIER
 * Section 09 Climax: On-Screen Digital Intelligence & Browser Forensics Report
 * Strictly on-screen rendering (Zero download or export mechanisms)
 * ============================================================================
 */



/**
 * Render the complete classified forensics investigation report into #investigation-report-container
 */
function renderInvestigationReport() {
  const container = document.getElementById('investigation-report-container');
  if (!container) return;

  const stats = state.getStats();
  const fp = state.fingerprint || { hash: 'SYNTHESIS IN PROGRESS', signalCount: 0 };
  const risk = state.riskAssessment || { score: 0, tier: 'ASSESSING' };
  const timestampStr = state.timestamp ? new Date(state.timestamp).toUTCString() : new Date().toUTCString();

  // Retrieve key signals
  const uaSig = state.getSignal('browser.user_agent');
  const brandSig = state.getSignal('browser.brand');
  const platformSig = state.getSignal('browser.platform');
  const langSig = state.getSignal('browser.languages');
  const dntSig = state.getSignal('browser.dnt');
  const gpcSig = state.getSignal('browser.gpc');

  const ipSig = state.getSignal('network.public_ip');
  const locSig = state.getSignal('network.ip_location');
  const ispSig = state.getSignal('network.ip_isp');
  const tzSig = state.getSignal('network.timezone');
  const offsetSig = state.getSignal('network.utc_offset');

  const resSig = state.getSignal('display.resolution');
  const availSig = state.getSignal('display.available_resolution');
  const dprSig = state.getSignal('display.pixel_ratio');
  const coresSig = state.getSignal('device.cpu_cores');
  const memSig = state.getSignal('device.memory_gb');
  const touchSig = state.getSignal('device.touch_points');
  const devTypeSig = state.getSignal('device.category_estimation');

  const glSupportSig = state.getSignal('graphics.webgl_support');
  const rendererSig = state.getSignal('graphics.unmasked_renderer');
  const canvasSig = state.getSignal('graphics.canvas_hash');
  const audioSig = state.getSignal('audio.fingerprint_signature');

  const storageSig = state.getSignal('privacy.storage_apis');
  const notifSig = state.getSignal('privacy.notifications_permission');
  const geoSig = state.getSignal('privacy.geolocation_permission');
  const adblockSig = state.getSignal('privacy.adblock_heuristic');

  // Breakdown categorization for Section G
  const confirmedObs = [];
  const estimates = [];
  const heuristics = [];
  const unavailableList = [];

  for (const s of state.getSignals()) {
    if (s.status === 'AVAILABLE') confirmedObs.push(s.label);
    else if (s.status === 'ESTIMATED') estimates.push(s.label);
    else if (s.status === 'INCONCLUSIVE' || s.source.includes('Heuristic')) heuristics.push(s.label);
    else if (s.status === 'UNAVAILABLE' || s.status === 'RESTRICTED') unavailableList.push(s.label);
  }

  container.innerHTML = `
    <div class="dossier-wrapper">
      <div class="dossier-watermark" aria-hidden="true">CLASSIFIED</div>

      <!-- Dossier Header & Stamped Metadata -->
      <div class="dossier-header-bar">
        <div style="display: flex; align-items: center; gap: var(--space-4);">
          <span class="dossier-stamp">TOP SECRET // FORENSIC NOFORN</span>
          <div>
            <div class="dossier-case-id">CASE REFERENCE: <strong>${escapeHtml(state.caseId)}</strong></div>
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-secondary);">
              LOGGED: ${escapeHtml(timestampStr)}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: var(--space-3);">
          <div class="font-mono text-xs" style="text-align: right; color: var(--text-secondary);">
            <div>SUBJECT: <span style="color: var(--accent-green);">CLIENT_VISITOR</span></div>
            <div>ORIGIN: <span style="color: var(--accent-cyan);">DIRECT BROWSER PROBE</span></div>
          </div>
        </div>
      </div>

      <!-- Dossier Document Body -->
      <div class="dossier-body">
        
        <!-- Document Title Banner -->
        <div style="text-align: center; margin-bottom: var(--space-8); padding-bottom: var(--space-6); border-bottom: 2px solid var(--border-subtle);">
          <h3 style="font-size: clamp(1.4rem, 3vw, 2.2rem); font-family: var(--font-mono); font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-highlight); margin-bottom: var(--space-1);">
            SUBJECT DIGITAL FOOTPRINT
          </h3>
          <p style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent-red); letter-spacing: 0.15em; text-transform: uppercase;">
            DIGITAL INTELLIGENCE &amp; BROWSER FORENSICS REPORT
          </p>
        </div>

        <!-- A. CASE OVERVIEW -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[A]</span> CASE OVERVIEW &amp; SYSTEM IDENTITY
          </h4>
          <table class="dossier-table">
            <tbody>
              <tr>
                <td class="property-name">Investigation Identifier</td>
                <td class="property-value font-mono highlight-green">${escapeHtml(state.caseId)}</td>
                <td class="property-name">Analysis Timestamp</td>
                <td class="property-value font-mono">${escapeHtml(timestampStr)}</td>
              </tr>
              <tr>
                <td class="property-name">Identified Client Software</td>
                <td class="property-value highlight-cyan">${escapeHtml(brandSig?.value || 'Unknown')}</td>
                <td class="property-name">Form Factor Estimation</td>
                <td class="property-value">${escapeHtml(devTypeSig?.value || 'Desktop')}</td>
              </tr>
              <tr>
                <td class="property-name">Total Signals Queried</td>
                <td class="property-value font-mono">${stats.total}</td>
                <td class="property-name">Active Contributing Signals</td>
                <td class="property-value font-mono highlight-green">${stats.available + stats.estimated}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- B. NETWORK INTELLIGENCE -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[B]</span> NETWORK &amp; LOCATION INTELLIGENCE
          </h4>
          <table class="dossier-table">
            <tbody>
              <tr>
                <td class="property-name">Public Routing IP</td>
                <td class="property-value font-mono ${ipSig?.status === 'AVAILABLE' ? 'highlight-green' : ''}">
                  ${escapeHtml(ipSig?.value || 'Not Disclosed')}
                </td>
                <td class="property-name">Approximate Geo-Location</td>
                <td class="property-value">${escapeHtml(locSig?.value || 'Requires External Consent')}</td>
              </tr>
              <tr>
                <td class="property-name">Autonomous System / ISP</td>
                <td class="property-value">${escapeHtml(ispSig?.value || 'External Query Required')}</td>
                <td class="property-name">Configured Time Zone</td>
                <td class="property-value font-mono highlight-cyan">${escapeHtml(tzSig?.value || 'Unavailable')}</td>
              </tr>
              <tr>
                <td class="property-name">UTC Offset &amp; Clock</td>
                <td class="property-value font-mono">${escapeHtml(offsetSig?.value || 'Unavailable')}</td>
                <td class="property-name">Language Hierarchy</td>
                <td class="property-value">${escapeHtml(langSig?.value || 'Unavailable')}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- C. BROWSER INTELLIGENCE -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[C]</span> BROWSER ARCHITECTURE &amp; CAPABILITIES
          </h4>
          <table class="dossier-table">
            <tbody>
              <tr>
                <td class="property-name">Operating Platform</td>
                <td class="property-value">${escapeHtml(platformSig?.value || 'Unavailable')}</td>
                <td class="property-name">User-Agent Header</td>
                <td class="property-value font-mono" style="font-size: 0.7rem; word-break: break-all;">
                  ${escapeHtml(uaSig?.value || 'Unavailable')}
                </td>
              </tr>
              <tr>
                <td class="property-name">Do Not Track (DNT)</td>
                <td class="property-value">${escapeHtml(dntSig?.value || 'UNSPECIFIED')}</td>
                <td class="property-name">Global Privacy Control (GPC)</td>
                <td class="property-value">${escapeHtml(gpcSig?.value || 'UNSUPPORTED')}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- D. DEVICE INTELLIGENCE -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[D]</span> HARDWARE, DISPLAY &amp; RENDERING TELEMETRY
          </h4>
          <table class="dossier-table">
            <tbody>
              <tr>
                <td class="property-name">Hardware Concurrency</td>
                <td class="property-value font-mono">${escapeHtml(coresSig?.value || 'Unavailable')}</td>
                <td class="property-name">Device Memory Footprint</td>
                <td class="property-value font-mono">${escapeHtml(memSig?.value || 'Unavailable')}</td>
              </tr>
              <tr>
                <td class="property-name">Screen &amp; Workspace Bounds</td>
                <td class="property-value font-mono">${escapeHtml(resSig?.value || '')} (Avail: ${escapeHtml(availSig?.value || '')})</td>
                <td class="property-name">Touch Digitizer Contact</td>
                <td class="property-value">${escapeHtml(touchSig?.value || '0 points')}</td>
              </tr>
              <tr>
                <td class="property-name">Unmasked GPU Hardware</td>
                <td class="property-value highlight-amber" colspan="3" style="word-break: break-all;">
                  ${escapeHtml(rendererSig?.value || 'Restricted')}
                </td>
              </tr>
              <tr>
                <td class="property-name">Canvas 2D Blend Hash</td>
                <td class="property-value font-mono highlight-green">${escapeHtml(canvasSig?.value || 'Unavailable')}</td>
                <td class="property-name">Audio DSP Dynamics Hash</td>
                <td class="property-value font-mono highlight-green">${escapeHtml(audioSig?.value || 'Unavailable')}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- E. ENVIRONMENT INTELLIGENCE -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[E]</span> ENVIRONMENT, STORAGE &amp; PRIVACY POLICIES
          </h4>
          <table class="dossier-table">
            <tbody>
              <tr>
                <td class="property-name">Client Storage Engines</td>
                <td class="property-value">${escapeHtml(storageSig?.value || 'Unavailable')}</td>
                <td class="property-name">Content Filter / Shield</td>
                <td class="property-value font-mono highlight-cyan">${escapeHtml(adblockSig?.value || 'NOT DETECTED')}</td>
              </tr>
              <tr>
                <td class="property-name">Notification Permission</td>
                <td class="property-value font-mono">${escapeHtml(notifSig?.value || 'PROMPT')}</td>
                <td class="property-name">Geolocation Permission</td>
                <td class="property-value font-mono">${escapeHtml(geoSig?.value || 'PROMPT')}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- F. FINGERPRINT ANALYSIS -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[F]</span> FINGERPRINT SYNTHESIS &amp; SIGNAL MATRIX
          </h4>
          <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: var(--space-4); margin-bottom: var(--space-4);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
              <span class="font-mono text-xs" style="color: var(--text-secondary);">LOCAL DETERMINISTIC SHA-256 HASH:</span>
              <span class="status-badge status-available">SYNTHESIZED IN-BROWSER</span>
            </div>
            <div class="font-mono text-sm highlight-green" style="word-break: break-all;">
              ${escapeHtml(fp.hash)}
            </div>
          </div>
          <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6;">
            <strong>Technical Note:</strong> This identifier represents the mathematical synthesis of your browser configuration. It is calculated entirely in local browser memory and demonstrates how trackers identify returning browsers without relying on cookies. This identifies a <em>system configuration</em>, not a human individual.
          </p>
        </section>

        <!-- G. FINAL FORENSIC ASSESSMENT -->
        <section class="dossier-section">
          <h4 class="dossier-section-title">
            <span>[G]</span> FINAL FORENSIC ASSESSMENT &amp; SIGNAL CATEGORIZATION
          </h4>
          
          <div class="grid-2" style="margin-bottom: var(--space-6);">
            <div style="background: rgba(0, 255, 136, 0.03); border: 1px solid var(--border-accent); border-radius: var(--radius-sm); padding: var(--space-4);">
              <strong style="color: var(--accent-green); font-family: var(--font-mono); font-size: var(--text-xs); display: block; margin-bottom: var(--space-2);">
                CONFIRMED OBSERVATIONS (${confirmedObs.length})
              </strong>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                Directly verifiable attributes accessed via standard web specifications (Screen, Cores, WebGL contexts, Languages, Timezone).
              </p>
            </div>

            <div style="background: rgba(0, 210, 255, 0.03); border: 1px solid var(--border-cyan); border-radius: var(--radius-sm); padding: var(--space-4);">
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: var(--text-xs); display: block; margin-bottom: var(--space-2);">
                ESTIMATED SIGNALS (${estimates.length})
              </strong>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                Characteristics derived through approximation or browser quantization (Device Memory bucket, form factor estimation).
              </p>
            </div>
          </div>

          <div class="grid-2">
            <div style="background: rgba(255, 170, 0, 0.03); border: 1px solid var(--border-amber); border-radius: var(--radius-sm); padding: var(--space-4);">
              <strong style="color: var(--accent-amber); font-family: var(--font-mono); font-size: var(--text-xs); display: block; margin-bottom: var(--space-2);">
                HEURISTIC FINDINGS (${heuristics.length})
              </strong>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                Indirect behavioral observations with probabilistic confidence (cosmetic ad-blocker detection, cross-signal consistency).
              </p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: var(--space-4);">
              <strong style="color: var(--text-muted); font-family: var(--font-mono); font-size: var(--text-xs); display: block; margin-bottom: var(--space-2);">
                RESTRICTED / SHIELDED (${unavailableList.length})
              </strong>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                APIs constrained by browser sandboxing, user settings, or modern privacy mitigations (Battery status, private storage).
              </p>
            </div>
          </div>

          <div class="dossier-summary-box">
            <strong style="color: var(--text-highlight); display: block; margin-bottom: var(--space-1); font-family: var(--font-mono);">
              INVESTIGATION DISPOSITION:
            </strong>
            Your browser exposes a distinct hardware and software profile typical of modern web clients. While standard browsing behavior yields dozens of identifiable attributes, adopting fingerprint-resistant browsers or shields significantly fragments this footprint without breaking web compatibility.
          </div>
        </section>

      </div>
    </div>
  `;
}


// --- MODULE: js/ui/sections.js ---
/**
 * ============================================================================
 * SECTIONS UI RENDERER
 * Dynamic card generation, visual matrix builder, and consent gate interaction
 * ============================================================================
 */








/**
 * Creates HTML string for a single intelligence card
 * @param {Object} signal
 * @returns {string}
 */
function createIntelCardHTML(signal) {
  const statusClass = getStatusBadgeClass(signal.status);
  const entropyClass = getEntropyBadgeClass(signal.entropyWeight);

  let valueColorClass = '';
  if (signal.status === 'AVAILABLE') valueColorClass = 'highlight-green';
  else if (signal.status === 'ESTIMATED') valueColorClass = 'highlight-cyan';
  else if (signal.status === 'RESTRICTED' || signal.status === 'REQUIRES CONSENT') valueColorClass = 'highlight-amber';

  return `
    <div class="intel-card" id="card-${escapeHtml(signal.id)}">
      <div class="intel-card-header">
        <span class="intel-card-title">${escapeHtml(signal.label)}</span>
        <div style="display: flex; gap: 4px; align-items: center;">
          <span class="status-badge ${statusClass}">${escapeHtml(signal.status)}</span>
          <span class="entropy-pill ${entropyClass}">${escapeHtml(signal.entropyWeight)}</span>
        </div>
      </div>
      <div class="intel-card-value ${valueColorClass}">
        ${escapeHtml(signal.value)}
      </div>
      <p class="intel-card-explanation">
        ${escapeHtml(signal.explanation)}
      </p>
      <div class="intel-card-footer">
        <span>Source: <code>${escapeHtml(signal.source)}</code></span>
        <span>${escapeHtml(signal.confidence || 'CONFIRMED')}</span>
      </div>
    </div>
  `;
}

/**
 * Populate a grid container with signals from specific categories
 * @param {string} containerId
 * @param {Array<string>} categories
 */
function populateGrid(containerId, categories) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const signals = [];
  categories.forEach(cat => {
    signals.push(...state.getSignalsByCategory(cat));
  });

  if (signals.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); font-family: var(--font-mono); padding: var(--space-4);">No signals recorded in this category.</div>`;
    return;
  }

  container.innerHTML = signals.map(s => createIntelCardHTML(s)).join('');
}

/**
 * Render consistency findings
 */
function renderConsistencyFindings() {
  const container = document.getElementById('network-consistency-container');
  if (!container) return;

  const findings = evaluateConsistency();
  if (findings.length === 0) return;

  container.innerHTML = `
    <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: var(--space-5);">
      <h3 style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-4);">
        CROSS-SIGNAL CONSISTENCY OBSERVATIONS
      </h3>
      <div class="grid-2">
        ${findings.map(f => `
          <div style="border-left: 2px solid ${f.status === 'MATCH' ? 'var(--accent-green)' : 'var(--accent-amber)'}; padding-left: var(--space-3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="font-family: var(--font-mono); font-size: var(--text-xs);">${escapeHtml(f.label)}</strong>
              <span class="status-badge ${f.status === 'MATCH' ? 'status-available' : 'status-restricted'}">${escapeHtml(f.status)}</span>
            </div>
            <p style="font-size: var(--text-xs); color: var(--text-secondary); margin: 0;">${escapeHtml(f.explanation)}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render Fingerprint Synthesis Section (Section 07)
 */
async function renderFingerprintSection() {
  const result = await generateFingerprint();

  const hashElem = document.getElementById('fingerprint-hash-value');
  const cellsContainer = document.getElementById('fingerprint-matrix-cells');
  const statsContainer = document.getElementById('synthesis-stats-grid');

  if (hashElem) {
    hashElem.textContent = result.hash;
  }

  if (cellsContainer && result.visualMatrix) {
    cellsContainer.innerHTML = result.visualMatrix.map(cell => `
      <div class="matrix-cell" 
           style="background-color: ${cell.color};" 
           title="Hex: ${cell.char} (Cell #${cell.index + 1})">
      </div>
    `).join('');
  }

  if (statsContainer) {
    const stats = state.getStats();
    statsContainer.innerHTML = `
      <div class="intel-card">
        <div class="intel-card-header">
          <span class="intel-card-title">SIGNAL SURFACE AREA</span>
          <span class="status-badge status-available">SYNTHESIZED</span>
        </div>
        <div class="intel-card-value highlight-green">${stats.available} Active Signals</div>
        <p class="intel-card-explanation">
          Calculated locally from browser properties, hardware drivers, and rendering contexts.
        </p>
      </div>

      <div class="intel-card">
        <div class="intel-card-header">
          <span class="intel-card-title">HIGH-ENTROPY VECTORS</span>
          <span class="entropy-pill entropy-high">DISTINCTIVE</span>
        </div>
        <div class="intel-card-value highlight-amber">${result.entropyBreakdown.high} Critical Signals</div>
        <p class="intel-card-explanation">
          Vectors with exceptional uniqueness: Unmasked GPU silicon, 2D Canvas rendering hash, and Audio DSP dynamics.
        </p>
      </div>

      <div class="intel-card">
        <div class="intel-card-header">
          <span class="intel-card-title">BROWSER CONSTRAINTS</span>
          <span class="status-badge status-restricted">DEFENSE SIGNALS</span>
        </div>
        <div class="intel-card-value highlight-cyan">${stats.restricted + stats.unavailable} Restricted APIs</div>
        <p class="intel-card-explanation">
          Signals shielded or unavailable due to browser sandboxing or platform restrictions.
        </p>
      </div>
    `;
  }
}

/**
 * Render Digital Privacy Assessment Section (Section 08)
 */
function renderPrivacyAssessmentSection() {
  const assessment = assessPrivacyExposure();
  const container = document.getElementById('risk-assessment-container');
  if (!container) return;

  container.innerHTML = `
    <div style="background: var(--bg-card); border: 1px solid var(--border-medium); border-radius: var(--radius-md); padding: var(--space-8);">
      
      <!-- Score & Tier Meter -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-6); margin-bottom: var(--space-8); padding-bottom: var(--space-6); border-bottom: 1px solid var(--border-subtle);">
        <div>
          <span class="section-category-tag" style="margin-bottom: var(--space-2);">EXPOSURE CLASSIFICATION</span>
          <h3 style="font-size: var(--text-3xl); color: ${assessment.tierColor}; font-weight: 800; letter-spacing: -0.01em;">
            ${escapeHtml(assessment.tier)}
          </h3>
          <p style="font-size: var(--text-xs); color: var(--text-secondary); max-width: 500px; margin-top: var(--space-2);">
            ${escapeHtml(assessment.disclaimer)}
          </p>
        </div>

        <div style="text-align: right;">
          <div style="font-family: var(--font-mono); font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 900; color: ${assessment.tierColor}; line-height: 1;">
            ${assessment.score}<span style="font-size: var(--text-lg); color: var(--text-muted);">/100</span>
          </div>
          <span class="font-mono" style="font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase;">
            Illustrative Metric
          </span>
        </div>
      </div>

      <!-- Distinctive Vectors -->
      <div style="margin-bottom: var(--space-8);">
        <h4 style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-4);">
          PRIMARY CONTRIBUTORS TO DISTINCTIVENESS
        </h4>
        <div class="grid-2">
          ${assessment.distinctiveSignals.map(sig => `
            <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: var(--space-4);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-highlight);">${escapeHtml(sig.label)}</strong>
                <span class="entropy-pill entropy-high">${escapeHtml(sig.impact)} IMPACT</span>
              </div>
              <div class="font-mono text-xs highlight-green" style="word-break: break-all; margin-bottom: 6px;">
                ${escapeHtml(sig.value)}
              </div>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); margin: 0;">
                ${escapeHtml(sig.reason)}
              </p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Actionable Hardening Recommendations -->
      <div>
        <h4 style="font-family: var(--font-mono); font-size: var(--text-xs); color: var(--accent-green); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: var(--space-4);">
          RECOMMENDED BROWSER HARDENING MEASURES
        </h4>
        <div class="grid-3">
          ${assessment.recommendations.map(rec => `
            <div style="border-left: 2px solid var(--accent-green); padding-left: var(--space-3);">
              <strong style="display: block; font-size: var(--text-sm); color: var(--text-highlight); margin-bottom: 4px;">
                ${escapeHtml(rec.title)}
              </strong>
              <p style="font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.6; margin: 0;">
                ${escapeHtml(rec.body)}
              </p>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

/**
 * Initialize IP Consent Gate buttons
 */
function setupConsentGate() {
  const btnConsent = document.getElementById('btn-consent-ip');
  const btnDecline = document.getElementById('btn-decline-ip');
  const card = document.getElementById('ip-consent-card');

  if (btnConsent) {
    btnConsent.addEventListener('click', async () => {
      btnConsent.disabled = true;
      btnConsent.textContent = 'QUERYING EXTERNAL ENDPOINT...';

      state.setIpConsent('granted');
      const externalSignals = await fetchConsentedIpData();
      state.registerSignals(externalSignals);

      populateGrid('network-grid', ['network']);
      renderConsistencyFindings();

      if (card) {
        card.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <span class="hud-indicator-dot" style="background-color: var(--accent-green); box-shadow: 0 0 8px var(--accent-green);"></span>
              <span class="font-mono text-xs highlight-green">EXTERNAL LOOKUP AUTHORIZED // DATA RETRIEVED IN-MEMORY ONLY</span>
            </div>
            <span class="font-mono text-xs" style="color: var(--text-muted);">NO LOGS STORED</span>
          </div>
        `;
      }

      // Re-trigger final report if already rendered
      renderInvestigationReport();
    });
  }

  if (btnDecline) {
    btnDecline.addEventListener('click', () => {
      state.setIpConsent('denied');
      state.registerSignal({
        id: 'network.public_ip',
        label: 'Public IP & Geo-Location',
        value: 'Lookup Declined by User (Local Only)',
        rawValue: null,
        status: 'RESTRICTED',
        category: 'network',
        source: 'User Privacy Choice',
        explanation: 'The visitor explicitly declined the external geo-IP lookup query.',
        entropyWeight: 'LOW',
        confidence: 'CONFIRMED'
      });

      populateGrid('network-grid', ['network']);
      renderConsistencyFindings();

      if (card) {
        card.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-3);">
            <span class="font-mono text-xs" style="color: var(--accent-amber);">
              LOCAL-ONLY MODE ENFORCED // EXTERNAL IP LOOKUP SUPPRESSED
            </span>
            <span class="font-mono text-xs" style="color: var(--text-muted);">ZERO EXTERNAL TRAFFIC</span>
          </div>
        `;
      }
    });
  }
}


// --- MODULE: js/ui/navigation.js ---
/**
 * ============================================================================
 * UI NAVIGATION & HUD CONTROLLER
 * Smooth scrolling, sticky HUD bar synchronization & scroll progress
 * ============================================================================
 */


function initializeNavigation() {
  const caseIdElem = document.getElementById('hud-case-id');
  const sectionBadge = document.getElementById('hud-current-section');
  const signalsCountElem = document.getElementById('hud-signals-count');
  const progressFill = document.getElementById('hud-progress-fill');
  const progressText = document.getElementById('hud-progress-text');
  const startBtn = document.getElementById('start-investigation-btn');

  // Set initial Case ID in HUD
  if (caseIdElem) {
    caseIdElem.textContent = state.caseId;
  }

  // Smooth scroll handler for CTA
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector('#section-02');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Listen to signal count updates
  state.subscribe('stats:updated', (stats) => {
    if (signalsCountElem) {
      signalsCountElem.textContent = stats.available + stats.estimated + stats.restricted;
    }
  });

  // Scroll Progress and Active Section Tracker
  const sections = Array.from(document.querySelectorAll('.investigation-section'));
  const sectionLabels = {
    'section-01': '01 // INTRODUCTION',
    'section-02': '02 // METHODOLOGY',
    'section-03': '03 // NETWORK & LOCATION',
    'section-04': '04 // BROWSER ARCHITECTURE',
    'section-05': '05 // HARDWARE FORENSICS',
    'section-06': '06 // PRIVACY & SHIELDS',
    'section-07': '07 // FINGERPRINT SYNTHESIS',
    'section-08': '08 // PRIVACY ASSESSMENT',
    'section-09': '09 // FBI CASE REPORT'
  };

  function updateScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progressPercent = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;

    if (progressFill) {
      progressFill.style.width = `${progressPercent}%`;
    }
    if (progressText) {
      progressText.textContent = `${progressPercent}%`;
    }

    // Determine current active section
    const scrollMiddle = scrollTop + window.innerHeight * 0.35;
    for (let i = sections.length - 1; i >= 0; i--) {
      const sec = sections[i];
      if (sec.offsetTop <= scrollMiddle) {
        const secId = sec.id;
        if (sectionBadge && sectionLabels[secId]) {
          sectionBadge.textContent = sectionLabels[secId];
        }
        break;
      }
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress();
}


// --- MODULE: js/ui/animations.js ---
/**
 * ============================================================================
 * UI ANIMATIONS & PROGRESSIVE OBSERVER
 * IntersectionObserver triggers, progressive counters, and motion safety
 * ============================================================================
 */

/**
 * Setup IntersectionObserver to trigger section callbacks on scroll
 * @param {Map<string, Function>} sectionCallbacks
 */
function setupScrollObserver(sectionCallbacks) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -15% 0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        entry.target.classList.add('is-revealed');

        if (sectionCallbacks.has(sectionId)) {
          const callback = sectionCallbacks.get(sectionId);
          callback();
          // Remove callback once triggered to avoid duplicate executions
          sectionCallbacks.delete(sectionId);
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll('.investigation-section').forEach(sec => {
    sec.classList.add('reveal-on-scroll');
    if (prefersReducedMotion) {
      sec.classList.add('is-revealed');
    }
    observer.observe(sec);
  });

  return observer;
}

/**
 * Animated number counter
 * @param {HTMLElement} element
 * @param {number} target
 * @param {number} duration
 */
function animateCounter(element, target, duration = 600) {
  if (!element) return;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    element.textContent = target;
    return;
  }

  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing out cubic
    const ease = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(start + (target - start) * ease);

    element.textContent = currentVal;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target;
    }
  }

  requestAnimationFrame(update);
}


// --- MODULE: js/app.js ---
/**
 * ============================================================================
 * APPLICATION ENTRY POINT
 * Bootstrap, module orchestration, and progressive investigation lifecycle
 * ============================================================================
 */






// Import All Collectors







/**
 * Main application bootstrap
 */
async function initApp() {
  // 1. Initialize Sticky HUD and Navigation
  initializeNavigation();

  // 2. Setup IP Consent Gate Listeners
  setupConsentGate();

  // 3. Register All Collectors with Central Scanner
  scanner.registerCollector('browser', collectBrowserSignals);
  scanner.registerCollector('device', collectDeviceSignals);
  scanner.registerCollector('network', () => Promise.resolve(collectLocalNetworkSignals()));
  scanner.registerCollector('display', () => Promise.resolve(collectDisplaySignals()));
  scanner.registerCollector('graphics', collectGraphicsSignals);
  scanner.registerCollector('audio', collectAudioSignals);
  scanner.registerCollector('privacy', collectPrivacySignals);

  // 4. Configure Progressive Scroll Triggers (IntersectionObserver)
  const sectionCallbacks = new Map();

  // Section 03: Network & Location
  sectionCallbacks.set('section-03', async () => {
    await scanner.scanCategory('network');
    populateGrid('network-grid', ['network']);
    renderConsistencyFindings();
  });

  // Section 04: Browser Intelligence
  sectionCallbacks.set('section-04', async () => {
    await scanner.scanCategory('browser');
    populateGrid('browser-grid', ['browser']);
  });

  // Section 05: Device & Hardware Intelligence (Display, Hardware, Graphics, Audio)
  sectionCallbacks.set('section-05', async () => {
    await Promise.all([
      scanner.scanCategory('display'),
      scanner.scanCategory('device'),
      scanner.scanCategory('graphics'),
      scanner.scanCategory('audio')
    ]);
    populateGrid('device-grid', ['display', 'device', 'graphics', 'audio']);
  });

  // Section 06: Privacy & Environment
  sectionCallbacks.set('section-06', async () => {
    await scanner.scanCategory('privacy');
    populateGrid('privacy-grid', ['privacy']);
  });

  // Section 07: Fingerprint Synthesis & Matrix
  sectionCallbacks.set('section-07', async () => {
    // Ensure all preceding categories are collected
    await Promise.all([
      scanner.scanCategory('browser'),
      scanner.scanCategory('network'),
      scanner.scanCategory('display'),
      scanner.scanCategory('device'),
      scanner.scanCategory('graphics'),
      scanner.scanCategory('audio'),
      scanner.scanCategory('privacy')
    ]);
    await renderFingerprintSection();
  });

  // Section 08: Digital Privacy Assessment
  sectionCallbacks.set('section-08', async () => {
    renderPrivacyAssessmentSection();
  });

  // Section 09: FBI-Style Investigation Report
  sectionCallbacks.set('section-09', async () => {
    // Ensure synthesis has run
    await renderFingerprintSection();
    renderInvestigationReport();
  });

  // 5. Activate Scroll Observer
  setupScrollObserver(sectionCallbacks);

  // 6. Perform silent baseline initialization
  // Run network and browser baseline immediately so data is ready as soon as user clicks start
  scanner.scanCategory('network').then(() => {
    populateGrid('network-grid', ['network']);
  });
  scanner.scanCategory('browser').then(() => {
    populateGrid('browser-grid', ['browser']);
  });
}

// Launch on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


})();
