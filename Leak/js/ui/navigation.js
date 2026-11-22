/**
 * ============================================================================
 * UI NAVIGATION & HUD CONTROLLER
 * Smooth scrolling, sticky HUD bar synchronization & scroll progress
 * ============================================================================
 */

import { state } from '../core/state.js';

export function initializeNavigation() {
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
