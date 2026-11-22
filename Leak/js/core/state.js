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
export const state = new ApplicationState();
