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
export async function collectDeviceSignals() {
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
