/**
 * ============================================================================
 * SECTIONS UI RENDERER
 * Compact intel rows in grouped panels, visual matrix, and consent gate
 * ============================================================================
 */

import { state } from '../core/state.js';
import { escapeHtml, getStatusBadgeClass } from '../core/utilities.js';
import { fetchConsentedIpData } from '../collectors/network.js';
import { evaluateConsistency } from '../analysis/consistency.js';
import { generateFingerprint } from '../analysis/fingerprint.js';
import { assessPrivacyExposure } from '../analysis/risk-assessment.js';
import { renderInvestigationReport } from './investigation-report.js';

/**
 * Get indicator color class from status
 */
function getIndicatorClass(status) {
  if (status === 'AVAILABLE') return 'ind-green';
  if (status === 'ESTIMATED') return 'ind-cyan';
  if (status === 'RESTRICTED' || status === 'REQUIRES CONSENT') return 'ind-amber';
  return 'ind-muted';
}

/**
 * Get value color class from status
 */
function getValueClass(status) {
  if (status === 'AVAILABLE') return 'val-green';
  if (status === 'ESTIMATED') return 'val-cyan';
  if (status === 'RESTRICTED' || status === 'REQUIRES CONSENT') return 'val-amber';
  if (status === 'UNAVAILABLE') return 'val-muted';
  return '';
}

/**
 * Creates a single compact intel row
 */
export function createIntelRowHTML(signal) {
  const statusClass = getStatusBadgeClass(signal.status);
  const indClass = getIndicatorClass(signal.status);
  const valClass = getValueClass(signal.status);

  return `
    <div class="intel-row">
      <div class="intel-row-indicator ${indClass}"></div>
      <span class="intel-row-label">${escapeHtml(signal.label)}</span>
      <span class="intel-row-value ${valClass}">${escapeHtml(signal.value)}</span>
      <span class="intel-row-badge">
        <span class="status-badge ${statusClass}">${escapeHtml(signal.status)}</span>
      </span>
    </div>
  `;
}

/**
 * Populate a container with signals as compact rows inside grouped panels
 */
export function populateGrid(containerId, categories) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Group signals by category
  const groups = new Map();
  categories.forEach(cat => {
    const signals = state.getSignalsByCategory(cat);
    if (signals.length > 0) {
      groups.set(cat, signals);
    }
  });

  if (groups.size === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-family: var(--font-mono); font-size: 0.65rem; padding: 12px;">Scanning...</div>`;
    return;
  }

  const categoryLabels = {
    network: 'NETWORK TELEMETRY',
    browser: 'BROWSER CONFIGURATION',
    display: 'DISPLAY & VIEWPORT',
    device: 'HARDWARE SUBSYSTEM',
    graphics: 'GRAPHICS & RENDERING',
    audio: 'AUDIO PROCESSING',
    privacy: 'PRIVACY & ENVIRONMENT'
  };

  // If only one category, render flat panel
  if (groups.size === 1) {
    const [cat, signals] = [...groups.entries()][0];
    container.innerHTML = `
      <div class="intel-panel">
        <div class="intel-panel-header">
          <span class="intel-panel-title">${categoryLabels[cat] || cat.toUpperCase()}</span>
          <span class="intel-panel-count">${signals.length} signals</span>
        </div>
        <div class="intel-panel-body">
          ${signals.map(s => createIntelRowHTML(s)).join('')}
        </div>
      </div>
    `;
    return;
  }

  // Multiple categories: stacked panels
  let html = '';
  for (const [cat, signals] of groups) {
    html += `
      <div class="intel-panel" style="margin-bottom: 10px;">
        <div class="intel-panel-header">
          <span class="intel-panel-title">${categoryLabels[cat] || cat.toUpperCase()}</span>
          <span class="intel-panel-count">${signals.length} signals</span>
        </div>
        <div class="intel-panel-body">
          ${signals.map(s => createIntelRowHTML(s)).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

/**
 * Render consistency findings — compact
 */
export function renderConsistencyFindings() {
  const container = document.getElementById('network-consistency-container');
  if (!container) return;

  const findings = evaluateConsistency();
  if (findings.length === 0) return;

  container.innerHTML = `
    <div class="intel-panel" style="margin-top: 10px;">
      <div class="intel-panel-header">
        <span class="intel-panel-title">CROSS-SIGNAL CONSISTENCY</span>
        <span class="intel-panel-count">${findings.length} checks</span>
      </div>
      <div class="intel-panel-body">
        ${findings.map(f => `
          <div class="intel-row">
            <div class="intel-row-indicator ${f.status === 'MATCH' ? 'ind-green' : 'ind-amber'}"></div>
            <span class="intel-row-label">${escapeHtml(f.label)}</span>
            <span class="intel-row-value" style="font-size: 0.65rem; color: var(--text-secondary);">${escapeHtml(f.explanation).substring(0, 80)}...</span>
            <span class="intel-row-badge">
              <span class="status-badge ${f.status === 'MATCH' ? 'status-available' : 'status-restricted'}">${escapeHtml(f.status)}</span>
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render Fingerprint Synthesis Section (Section 07)
 */
export async function renderFingerprintSection() {
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
           title="Hex: ${cell.char} (#${cell.index + 1})">
      </div>
    `).join('');
  }

  if (statsContainer) {
    const stats = state.getStats();
    statsContainer.innerHTML = `
      <div class="stat-card">
        <span class="stat-card-label">Active Signals</span>
        <span class="stat-card-value val-green">${stats.available}</span>
        <span class="stat-card-sub">Contributing to fingerprint</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">High-Entropy Vectors</span>
        <span class="stat-card-value val-amber">${result.entropyBreakdown.high}</span>
        <span class="stat-card-sub">GPU, Canvas, Audio DSP</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Restricted APIs</span>
        <span class="stat-card-value val-cyan">${stats.restricted + stats.unavailable}</span>
        <span class="stat-card-sub">Blocked by browser</span>
      </div>
    `;
  }
}

/**
 * Render Digital Privacy Assessment Section (Section 08) — Compact
 */
export function renderPrivacyAssessmentSection() {
  const assessment = assessPrivacyExposure();
  const container = document.getElementById('risk-assessment-container');
  if (!container) return;

  container.innerHTML = `
    <div class="intel-panel">
      <div class="intel-panel-header">
        <span class="intel-panel-title">EXPOSURE CLASSIFICATION</span>
        <span class="status-badge" style="background: ${assessment.tierColor}22; color: ${assessment.tierColor}; border: 1px solid ${assessment.tierColor}44;">
          ${escapeHtml(assessment.tier)}
        </span>
      </div>
      <div style="padding: 14px;">
        
        <!-- Score bar -->
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
          <div style="font-family: var(--font-mono); font-size: 2rem; font-weight: 900; color: ${assessment.tierColor}; line-height: 1;">
            ${assessment.score}<span style="font-size: 0.7rem; color: var(--text-muted);">/100</span>
          </div>
          <div style="flex: 1;">
            <div style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; border: 1px solid var(--border-subtle); overflow: hidden;">
              <div style="width: ${assessment.score}%; height: 100%; background: ${assessment.tierColor}; border-radius: 2px;"></div>
            </div>
            <p style="font-size: 0.55rem; color: var(--text-muted); margin-top: 4px; font-family: var(--font-mono);">
              Illustrative metric based on observed signal entropy
            </p>
          </div>
        </div>

        <!-- Distinctive signals as compact rows -->
        ${assessment.distinctiveSignals.length > 0 ? `
          <div style="margin-bottom: 14px;">
            <div style="font-family: var(--font-mono); font-size: 0.6rem; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
              Primary Distinctiveness Contributors
            </div>
            ${assessment.distinctiveSignals.map(sig => `
              <div class="intel-row">
                <div class="intel-row-indicator ind-amber"></div>
                <span class="intel-row-label">${escapeHtml(sig.label)}</span>
                <span class="intel-row-value val-green" style="font-size: 0.65rem;">${escapeHtml(sig.value)}</span>
                <span class="entropy-pill entropy-high">${escapeHtml(sig.impact)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Recommendations — compact list -->
        <div style="font-family: var(--font-mono); font-size: 0.6rem; color: var(--accent-green); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
          Hardening Recommendations
        </div>
        ${assessment.recommendations.map(rec => `
          <div style="display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--accent-green); font-size: 0.7rem; flex-shrink: 0;">▹</span>
            <div>
              <strong style="display: block; font-size: 0.7rem; color: var(--text-highlight); margin-bottom: 2px;">
                ${escapeHtml(rec.title)}
              </strong>
              <span style="font-size: 0.65rem; color: var(--text-secondary); line-height: 1.4;">
                ${escapeHtml(rec.body)}
              </span>
            </div>
          </div>
        `).join('')}

      </div>
    </div>
  `;
}

/**
 * Initialize IP Consent Gate buttons
 */
export function setupConsentGate() {
  const btnConsent = document.getElementById('btn-consent-ip');
  const btnDecline = document.getElementById('btn-decline-ip');
  const card = document.getElementById('ip-consent-card');

  if (btnConsent) {
    btnConsent.addEventListener('click', async () => {
      btnConsent.disabled = true;
      btnConsent.textContent = 'QUERYING...';

      state.setIpConsent('granted');
      const externalSignals = await fetchConsentedIpData();
      state.registerSignals(externalSignals);

      populateGrid('network-grid', ['network']);
      renderConsistencyFindings();

      if (card) {
        card.style.borderColor = 'var(--border-accent)';
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
            <span class="hud-indicator-dot"></span>
            <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-green);">EXTERNAL LOOKUP COMPLETE // IN-MEMORY ONLY</span>
          </div>
        `;
      }

      renderInvestigationReport();
    });
  }

  if (btnDecline) {
    btnDecline.addEventListener('click', () => {
      state.setIpConsent('denied');
      state.registerSignal({
        id: 'network.public_ip',
        label: 'Public IP & Geo-Location',
        value: 'Declined (Local Only)',
        rawValue: null,
        status: 'RESTRICTED',
        category: 'network',
        source: 'User Choice',
        explanation: 'The visitor declined the external geo-IP lookup.',
        entropyWeight: 'LOW',
        confidence: 'CONFIRMED'
      });

      populateGrid('network-grid', ['network']);
      renderConsistencyFindings();

      if (card) {
        card.style.borderColor = 'var(--border-subtle)';
        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; padding: 4px 0;">
            <span style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-amber);">LOCAL-ONLY MODE // NO EXTERNAL TRAFFIC</span>
          </div>
        `;
      }
    });
  }
}
