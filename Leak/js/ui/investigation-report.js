/**
 * ============================================================================
 * FBI-STYLE CLASSIFIED INVESTIGATION DOSSIER
 * Section 09 Climax: On-Screen Digital Intelligence & Browser Forensics Report
 * Strictly on-screen rendering (Zero download or export mechanisms)
 * ============================================================================
 */

import { state } from '../core/state.js';
import { escapeHtml, getStatusBadgeClass } from '../core/utilities.js';

/**
 * Render the complete classified forensics investigation report into #investigation-report-container
 */
export function renderInvestigationReport() {
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
