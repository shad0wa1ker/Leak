/**
 * ============================================================================
 * AUDIO INTELLIGENCE COLLECTOR
 * Web Audio API processing, compressor dynamics, and silent rendering signature
 * ============================================================================
 */

import { fallbackHash } from '../core/utilities.js';

/**
 * Collect Web Audio architecture and calculate an offline dynamics signature
 * Fully silent, in-memory only, no microphone permissions requested.
 * @returns {Promise<Array<Object>>}
 */
export async function collectAudioSignals() {
  const signals = [];

  const hasAudioContext = typeof window !== 'undefined' && 
    (typeof window.AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined');
  const hasOfflineAudio = typeof window !== 'undefined' && 
    (typeof window.OfflineAudioContext !== 'undefined' || typeof window.webkitOfflineAudioContext !== 'undefined');

  // 1. Audio API Availability
  signals.push({
    id: 'audio.api_availability',
    label: 'Web Audio Subsystem',
    value: hasOfflineAudio ? 'OfflineAudioContext Active' : (hasAudioContext ? 'AudioContext Supported' : 'Unavailable'),
    rawValue: { hasAudioContext, hasOfflineAudio },
    status: hasOfflineAudio ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'audio',
    source: 'window.OfflineAudioContext',
    explanation: 'Hardware audio synthesis and digital signal processing framework.',
    entropyWeight: 'LOW',
    confidence: 'CONFIRMED'
  });

  // 2. Offline Dynamics Compressor Fingerprint
  let audioSignature = 'Unavailable';
  let audioStatus = 'UNAVAILABLE';

  if (hasOfflineAudio) {
    try {
      const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      // 1 channel, 4500 frames, 44.1kHz sample rate (~100ms offline buffer)
      const context = new OfflineCtx(1, 4500, 44100);

      // Oscillator
      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      // Dynamics Compressor (exposes hardware floating-point math differences)
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -50;
      compressor.knee.value = 40;
      compressor.ratio.value = 12;
      compressor.reduction.value = -20;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;

      oscillator.connect(compressor);
      compressor.connect(context.destination);
      oscillator.start(0);

      // Render audio offline with a strict 1-second timeout
      const renderPromise = context.startRendering();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 1000));
      const renderedBuffer = await Promise.race([renderPromise, timeoutPromise]);

      if (renderedBuffer) {
        const samples = renderedBuffer.getChannelData(0);
        // Calculate statistical sum and sample slice
        let sum = 0;
        const sampleFingerprint = [];
        for (let i = 0; i < samples.length; i += 50) {
          sum += Math.abs(samples[i]);
          sampleFingerprint.push(samples[i].toFixed(6));
        }

        const rawString = `${sum.toFixed(6)}-${sampleFingerprint.slice(0, 30).join(',')}`;
        audioSignature = fallbackHash(rawString);
        audioStatus = 'AVAILABLE';
      }
    } catch (err) {
      console.warn('Silent audio processing restricted or timed out:', err);
      audioStatus = 'RESTRICTED';
      audioSignature = 'Restricted by Browser';
    }
  }

  signals.push({
    id: 'audio.fingerprint_signature',
    label: 'Audio Buffer Dynamics Signature',
    value: audioStatus === 'AVAILABLE' ? `${audioSignature.substring(0, 16)}...` : audioSignature,
    rawValue: audioSignature,
    status: audioStatus,
    category: 'audio',
    source: 'OfflineAudioContext Dynamics Rendering',
    explanation: 'Subtle variations in floating-point DSP arithmetic and hardware audio processing.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  return signals;
}
