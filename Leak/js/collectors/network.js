/**
 * ============================================================================
 * NETWORK & LOCATION INTELLIGENCE COLLECTOR
 * Local network information, timezone telemetry, and consented IP lookup
 * ============================================================================
 */

/**
 * Collect local network and timezone signals (Zero external requests)
 * @returns {Array<Object>}
 */
export function collectLocalNetworkSignals() {
  const signals = [];
  const nav = typeof navigator !== 'undefined' ? navigator : {};

  // 1. Online / Connectivity State
  const isOnline = typeof nav.onLine === 'boolean' ? (nav.onLine ? 'ONLINE' : 'OFFLINE') : 'UNKNOWN';
  signals.push({
    id: 'network.online_status',
    label: 'Connection State',
    value: isOnline,
    rawValue: nav.onLine,
    status: 'AVAILABLE',
    category: 'network',
    source: 'navigator.onLine',
    explanation: 'Basic browser socket connectivity state.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 2. Network Information API (Connection characteristics)
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    const effectiveType = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'UNKNOWN';
    const downlink = typeof conn.downlink === 'number' ? `${conn.downlink} Mbps` : 'Unavailable';
    const rtt = typeof conn.rtt === 'number' ? `${conn.rtt} ms` : 'Unavailable';
    const saveData = conn.saveData ? 'ENABLED' : 'DISABLED';

    signals.push({
      id: 'network.effective_type',
      label: 'Estimated Cellular/Bandwidth Tier',
      value: `${effectiveType} (Downlink: ${downlink}, Latency: ${rtt})`,
      rawValue: { effectiveType, downlink: conn.downlink, rtt: conn.rtt, saveData: conn.saveData },
      status: 'AVAILABLE',
      category: 'network',
      source: 'navigator.connection',
      explanation: 'Network Information API telemetry estimating link bandwidth and round-trip time.',
      entropyWeight: 'MEDIUM',
      confidence: 'ESTIMATED'
    });

    signals.push({
      id: 'network.save_data',
      label: 'Data Saver Mode',
      value: saveData,
      rawValue: conn.saveData,
      status: 'AVAILABLE',
      category: 'network',
      source: 'navigator.connection.saveData',
      explanation: 'User preference requesting reduced data usage from origins.',
      entropyWeight: 'LOW',
      confidence: 'CONFIRMED'
    });
  } else {
    signals.push({
      id: 'network.effective_type',
      label: 'Estimated Bandwidth Tier',
      value: 'API Unsupported / Restricted',
      rawValue: null,
      status: 'UNAVAILABLE',
      category: 'network',
      source: 'navigator.connection',
      explanation: 'Network Information API is restricted or not implemented in this browser engine.',
      entropyWeight: 'LOW',
      confidence: 'CONFIRMED'
    });
  }

  // 3. Time Zone Identifier
  let timeZone = 'Unavailable';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unavailable';
  } catch {
    timeZone = 'Unavailable';
  }
  signals.push({
    id: 'network.timezone',
    label: 'Host Time Zone',
    value: timeZone,
    rawValue: timeZone,
    status: timeZone !== 'Unavailable' ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'network',
    source: 'Intl.DateTimeFormat().resolvedOptions().timeZone',
    explanation: 'Configured geographic IANA timezone database entry.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // 4. Local Timezone Offset & Clock
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;
  const formattedOffset = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}:00`;
  const localClock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  signals.push({
    id: 'network.utc_offset',
    label: 'UTC Offset & Local Clock',
    value: `${formattedOffset} (Clock: ${localClock})`,
    rawValue: { offsetMinutes, offsetHours, localClock },
    status: 'AVAILABLE',
    category: 'network',
    source: 'Date.prototype.getTimezoneOffset()',
    explanation: 'Difference in minutes between local system clock and UTC.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 5. Default External IP Placeholder (Pending Consent)
  signals.push({
    id: 'network.public_ip',
    label: 'Public IP & Geo-Location',
    value: 'Awaiting User Authorization',
    rawValue: null,
    status: 'REQUIRES CONSENT',
    category: 'network',
    source: 'External Geo-IP Service',
    explanation: 'Disclosing public IP requires dispatching a network query to an external service.',
    entropyWeight: 'HIGH',
    confidence: 'ESTIMATED'
  });

  return signals;
}

/**
 * Perform consented external IP and Geo-location lookup
 * @returns {Promise<Array<Object>>}
 */
export async function fetchConsentedIpData() {
  const updatedSignals = [];

  try {
    // Attempt lookup with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Lookup failed with status ${response.status}`);
    }

    const data = await response.json();

    updatedSignals.push({
      id: 'network.public_ip',
      label: 'Public IP Address',
      value: data.ip || 'Unavailable',
      rawValue: data.ip,
      status: 'AVAILABLE',
      category: 'network',
      source: 'Consented External Query (ipapi.co)',
      explanation: 'The public routing IP visible to internet web servers.',
      entropyWeight: 'HIGH',
      confidence: 'CONFIRMED'
    });

    updatedSignals.push({
      id: 'network.ip_location',
      label: 'Approximate Physical Location',
      value: `${data.city || 'Unknown'}, ${data.region || ''} (${data.country_name || 'Unknown'})`,
      rawValue: { city: data.city, region: data.region, country: data.country_name, countryCode: data.country_code },
      status: 'AVAILABLE',
      category: 'network',
      source: 'Consented External Query (ipapi.co)',
      explanation: 'Physical geographic estimate resolved from public IP allocation tables.',
      entropyWeight: 'HIGH',
      confidence: 'ESTIMATED'
    });

    updatedSignals.push({
      id: 'network.ip_isp',
      label: 'Autonomous System & ISP',
      value: `${data.org || data.asn || 'Unavailable'}`,
      rawValue: { org: data.org, asn: data.asn },
      status: 'AVAILABLE',
      category: 'network',
      source: 'Consented External Query (ipapi.co)',
      explanation: 'Internet Service Provider or network operator hosting this address.',
      entropyWeight: 'HIGH',
      confidence: 'CONFIRMED'
    });

  } catch (err) {
    console.warn('External IP lookup encountered an issue or was blocked:', err);
    updatedSignals.push({
      id: 'network.public_ip',
      label: 'Public IP & Geo-Location',
      value: 'Lookup Request Blocked or Offline',
      rawValue: null,
      status: 'UNAVAILABLE',
      category: 'network',
      source: 'Consented External Query',
      explanation: 'The request could not reach the external IP lookup endpoint or was blocked by a network shield.',
      entropyWeight: 'LOW',
      confidence: 'CONFIRMED'
    });
  }

  return updatedSignals;
}
