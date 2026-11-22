/**
 * ============================================================================
 * APPLICATION ENTRY POINT
 * Bootstrap, module orchestration, and progressive investigation lifecycle
 * ============================================================================
 */

import { scanner } from './core/scanner.js';
import { initializeNavigation } from './ui/navigation.js';
import { setupScrollObserver } from './ui/animations.js';
import { 
  populateGrid, 
  renderConsistencyFindings, 
  renderFingerprintSection, 
  renderPrivacyAssessmentSection, 
  setupConsentGate 
} from './ui/sections.js';
import { renderInvestigationReport } from './ui/investigation-report.js';

// Import All Collectors
import { collectBrowserSignals } from './collectors/browser.js';
import { collectDeviceSignals } from './collectors/device.js';
import { collectLocalNetworkSignals } from './collectors/network.js';
import { collectDisplaySignals } from './collectors/display.js';
import { collectGraphicsSignals } from './collectors/graphics.js';
import { collectAudioSignals } from './collectors/audio.js';
import { collectPrivacySignals } from './collectors/privacy.js';

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
