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
export function collectDisplaySignals() {
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
