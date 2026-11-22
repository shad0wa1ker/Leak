/**
 * ============================================================================
 * DIGITAL PRIVACY RISK ASSESSMENT
 * Illustrative exposure scoring, distinctive signal analysis & defense advice
 * ============================================================================
 */

import { state } from '../core/state.js';

/**
 * Perform digital privacy assessment based on observed browser configuration
 * @returns {Object}
 */
export function assessPrivacyExposure() {
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
