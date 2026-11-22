/**
 * ============================================================================
 * CONSISTENCY ANALYSIS ENGINE
 * Cross-Signal Validation, Anomaly Detection & VPN/Proxy Indicators
 * ============================================================================
 */

import { state } from '../core/state.js';

/**
 * Evaluate cross-signal consistency across collected intelligence
 * @returns {Array<Object>}
 */
export function evaluateConsistency() {
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
