/**
 * ============================================================================
 * SCANNER COORDINATOR
 * Progressive Investigation Queue & Event Coordination
 * ============================================================================
 */

import { state } from './state.js';

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

export const scanner = new InvestigationScanner();
