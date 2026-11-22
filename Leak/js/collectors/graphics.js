/**
 * ============================================================================
 * GRAPHICS INTELLIGENCE COLLECTOR
 * WebGL contexts, unmasked GPU silicon, extensions, and Canvas 2D render hash
 * ============================================================================
 */

import { fallbackHash } from '../core/utilities.js';

/**
 * Collect graphics hardware, WebGL attributes, and Canvas render characteristics
 * @returns {Promise<Array<Object>>}
 */
export async function collectGraphicsSignals() {
  const signals = [];

  // 1. WebGL 1 & WebGL 2 Context Probing
  let gl1Supported = false;
  let gl2Supported = false;
  let unmaskedVendor = 'Unavailable';
  let unmaskedRenderer = 'Unavailable';
  let maxTextureSize = 'Unavailable';
  let extensionsCount = 0;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;

    // Probe WebGL 2
    const gl2 = canvas.getContext('webgl2');
    if (gl2) {
      gl2Supported = true;
    }

    // Probe WebGL 1 or fall back to experimental
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      gl1Supported = true;

      // Extract unmasked renderer info if exposed by browser
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Restricted';
        unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Restricted';
      }

      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 'Unavailable';
      const supportedExtensions = gl.getSupportedExtensions() || [];
      extensionsCount = supportedExtensions.length;
    }
  } catch (err) {
    console.warn('WebGL interrogation restricted or encountered error:', err);
  }

  // WebGL Support State
  const webglState = gl2Supported ? 'WebGL 2.0 & 1.0 Active' : (gl1Supported ? 'WebGL 1.0 Only' : 'Disabled / Unsupported');
  signals.push({
    id: 'graphics.webgl_support',
    label: 'WebGL Graphics Pipeline',
    value: webglState,
    rawValue: { gl1: gl1Supported, gl2: gl2Supported },
    status: gl1Supported ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'graphics',
    source: 'HTMLCanvasElement.getContext("webgl")',
    explanation: 'Hardware-accelerated 3D rendering pipeline availability.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // Unmasked GPU Renderer (Crucial Fingerprinting Vector!)
  signals.push({
    id: 'graphics.unmasked_renderer',
    label: 'Unmasked GPU Silicon / Renderer',
    value: unmaskedRenderer,
    rawValue: unmaskedRenderer,
    status: unmaskedRenderer !== 'Unavailable' && unmaskedRenderer !== 'Restricted' ? 'AVAILABLE' : 'RESTRICTED',
    category: 'graphics',
    source: 'WEBGL_debug_renderer_info.UNMASKED_RENDERER_WEBGL',
    explanation: 'The physical graphics processor brand and driver architecture executing 3D shaders.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // Unmasked GPU Vendor
  signals.push({
    id: 'graphics.unmasked_vendor',
    label: 'GPU Silicon Vendor',
    value: unmaskedVendor,
    rawValue: unmaskedVendor,
    status: unmaskedVendor !== 'Unavailable' && unmaskedVendor !== 'Restricted' ? 'AVAILABLE' : 'RESTRICTED',
    category: 'graphics',
    source: 'WEBGL_debug_renderer_info.UNMASKED_VENDOR_WEBGL',
    explanation: 'Hardware vendor responsible for the active graphics chipset.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  // Max Texture Size & Extensions
  signals.push({
    id: 'graphics.webgl_capabilities',
    label: 'WebGL Hardware Parameters',
    value: `Max Texture: ${maxTextureSize}px // ${extensionsCount} Extensions Supported`,
    rawValue: { maxTextureSize, extensionsCount },
    status: gl1Supported ? 'AVAILABLE' : 'UNAVAILABLE',
    category: 'graphics',
    source: 'WebGLRenderingContext.getParameter()',
    explanation: 'Hardware texture limits and enabled graphics extension profiles.',
    entropyWeight: 'MEDIUM',
    confidence: 'CONFIRMED'
  });

  // 2. Off-Screen Canvas 2D Render Signature
  let canvasHash = 'Unavailable';
  try {
    const c2d = document.createElement('canvas');
    c2d.width = 240;
    c2d.height = 60;
    const ctx = c2d.getContext('2d');

    if (ctx) {
      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 240, 60);
      grad.addColorStop(0, '#00ff88');
      grad.addColorStop(0.5, '#00d2ff');
      grad.addColorStop(1, '#ff3344');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 240, 60);

      // Multi-layer text with antialiasing variations
      ctx.font = '16px "Arial", sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillText('BrowserFingerprint-2026', 12, 28);

      ctx.font = '14px "Times New Roman", serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText('Forensic Investigation 🕵️‍♂️ <XML>', 15, 48);

      // Arc & composite blending
      ctx.globalCompositeOperation = 'difference';
      ctx.beginPath();
      ctx.arc(120, 30, 20, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
      ctx.fill();

      const dataUrl = c2d.toDataURL();
      canvasHash = fallbackHash(dataUrl);
    }
  } catch (err) {
    console.warn('Canvas rendering hash calculation restricted:', err);
  }

  signals.push({
    id: 'graphics.canvas_hash',
    label: '2D Canvas Geometry & Blending Signature',
    value: canvasHash !== 'Unavailable' ? `${canvasHash.substring(0, 16)}...` : 'Unavailable',
    rawValue: canvasHash,
    status: canvasHash !== 'Unavailable' ? 'AVAILABLE' : 'RESTRICTED',
    category: 'graphics',
    source: 'HTMLCanvasElement.toDataURL() + Hash',
    explanation: 'Hardware and OS-dependent anti-aliasing and sub-pixel color blending signature.',
    entropyWeight: 'HIGH',
    confidence: 'CONFIRMED'
  });

  return signals;
}
