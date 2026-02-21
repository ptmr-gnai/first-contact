/**
 * voiceAnalyzer.js
 *
 * Microphone capture and pitch detection module for the SIGNAL game.
 * Analyzes the player's tonal input (hums, clicks, vocalizations) and
 * extracts pitch contour, rhythm onsets, and volume levels.
 *
 * Shares the singleton AudioContext from toneGenerator.js so both modules
 * stay on the same audio graph and avoid double-context creation.
 *
 * Safari compatibility: AudioContext shared via toneGenerator's
 * ensureAudioContext(), which includes the webkitAudioContext fallback.
 */

import { ensureAudioContext, getAudioContext } from './toneGenerator.js';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** @type {MediaStream|null} Active microphone stream. */
let mediaStream = null;

/** @type {MediaStreamAudioSourceNode|null} */
let sourceNode = null;

/** @type {AnalyserNode|null} */
let analyserNode = null;

/** @type {number|null} setInterval handle for the sampling loop. */
let samplingIntervalId = null;

/** @type {boolean} Whether capture is currently active. */
let capturing = false;

/** @type {number} Timestamp (ms) when capture began. */
let captureStartTime = 0;

// Accumulated analysis data (reset on each startCapture call).
/** @type {number[]} Detected fundamental frequencies per sample (Hz, 0 = silent). */
let pitchContour = [];

/** @type {number[]} Timestamps of detected onset events relative to capture start (ms). */
let rhythm = [];

/** @type {number[]} RMS volume levels per sample (0-1). */
let volumeSamples = [];

// ---------------------------------------------------------------------------
// Onset detection state
// ---------------------------------------------------------------------------

/**
 * Volume threshold above which a sample is considered "loud".
 * Onsets are detected when volume crosses this boundary from below.
 */
const ONSET_THRESHOLD = 0.15;

/** Whether the previous sample was above the onset threshold. */
let prevAboveThreshold = false;

// ---------------------------------------------------------------------------
// Pitch detection constants
// ---------------------------------------------------------------------------

/**
 * Minimum detectable frequency (Hz).
 * Below this the signal is treated as non-pitched noise.
 */
const MIN_PITCH_HZ = 50;

/**
 * Maximum detectable frequency (Hz).
 * Human vocal range and common instrument overtones top out here for our use case.
 */
const MAX_PITCH_HZ = 2000;

/**
 * Normalized autocorrelation threshold for identifying the first
 * downward zero-crossing (dip) before the lag peak.
 */
const AUTOCORR_DIP_THRESHOLD = 0.2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the RMS (root mean square) of a Float32Array of time-domain samples.
 * Returns a value in [0, 1] assuming the samples are already normalized to [-1, 1].
 *
 * @param {Float32Array} buffer
 * @returns {number} RMS volume level.
 */
function computeRMS(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Autocorrelation-based fundamental frequency detector.
 *
 * Algorithm:
 * 1. Compute normalized autocorrelation R[lag] for all valid lags.
 * 2. Find the first lag where R drops below AUTOCORR_DIP_THRESHOLD (the dip).
 * 3. From that dip, find the next local maximum above AUTOCORR_DIP_THRESHOLD.
 * 4. That lag corresponds to one period of the fundamental.
 * 5. Frequency = sampleRate / lag.
 *
 * Returns 0 if no reliable pitch is found (signal too quiet or aperiodic).
 *
 * @param {Float32Array} buffer    Time-domain PCM data from AnalyserNode.
 * @param {number}       sampleRate AudioContext sample rate (typically 44100 or 48000).
 * @returns {number} Detected frequency in Hz, or 0 if undetectable.
 */
function detectPitch(buffer, sampleRate) {
  const n = buffer.length;

  // Step 1: compute normalized autocorrelation.
  // We only need lags that correspond to frequencies within [MIN_PITCH_HZ, MAX_PITCH_HZ].
  const minLag = Math.floor(sampleRate / MAX_PITCH_HZ);
  const maxLag = Math.ceil(sampleRate / MIN_PITCH_HZ);

  // r[0] is the energy of the signal; use it for normalization.
  let r0 = 0;
  for (let i = 0; i < n; i++) {
    r0 += buffer[i] * buffer[i];
  }

  // If the buffer is essentially silent, bail out early.
  if (r0 < 1e-6) {
    return 0;
  }

  // Build autocorrelation array for the lags we care about.
  // autocorr[k] = R[minLag + k] / r0 (normalized to [-1, 1]).
  const lagCount = maxLag - minLag + 1;
  const autocorr = new Float32Array(lagCount);

  for (let k = 0; k < lagCount; k++) {
    const lag = minLag + k;
    let sum = 0;
    for (let i = 0; i + lag < n; i++) {
      sum += buffer[i] * buffer[i + lag];
    }
    autocorr[k] = sum / r0;
  }

  // Step 2: find the first dip below AUTOCORR_DIP_THRESHOLD.
  let dipIndex = -1;
  for (let k = 0; k < lagCount; k++) {
    if (autocorr[k] < AUTOCORR_DIP_THRESHOLD) {
      dipIndex = k;
      break;
    }
  }

  // If no dip found, signal is not periodic enough.
  if (dipIndex === -1) {
    return 0;
  }

  // Step 3: from the dip, find the next local maximum above AUTOCORR_DIP_THRESHOLD.
  let peakIndex = -1;
  let peakValue = AUTOCORR_DIP_THRESHOLD;

  for (let k = dipIndex; k < lagCount; k++) {
    if (autocorr[k] > peakValue) {
      peakValue = autocorr[k];
      peakIndex = k;
    } else if (peakIndex !== -1 && autocorr[k] < peakValue - 0.1) {
      // We've gone past the peak (descending by more than 0.1 from peak).
      break;
    }
  }

  if (peakIndex === -1) {
    return 0;
  }

  // Step 4: convert lag to frequency.
  const lag = minLag + peakIndex;
  const freq = sampleRate / lag;

  // Clamp to safe range (should already be in range by construction, but be defensive).
  if (freq < MIN_PITCH_HZ || freq > MAX_PITCH_HZ) {
    return 0;
  }

  return freq;
}

// ---------------------------------------------------------------------------
// Core sampling loop
// ---------------------------------------------------------------------------

/**
 * Single sample tick: reads time-domain data from the AnalyserNode,
 * computes pitch and volume, and detects rhythm onsets.
 * Appends results to module-level accumulation arrays.
 */
function takeSample() {
  if (!analyserNode || !capturing) return;

  const bufferLength = analyserNode.fftSize;
  const buffer = new Float32Array(bufferLength);
  analyserNode.getFloatTimeDomainData(buffer);

  const ctx = getAudioContext();
  const sampleRate = ctx ? ctx.sampleRate : 44100;

  // Volume (RMS).
  const volume = computeRMS(buffer);
  volumeSamples.push(volume);

  // Pitch detection.
  const pitch = volume > 0.01 ? detectPitch(buffer, sampleRate) : 0;
  pitchContour.push(pitch);

  // Onset detection: volume crossing upward through the threshold.
  const nowAboveThreshold = volume >= ONSET_THRESHOLD;
  if (nowAboveThreshold && !prevAboveThreshold) {
    const elapsed = Date.now() - captureStartTime;
    rhythm.push(elapsed);
  }
  prevAboveThreshold = nowAboveThreshold;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts microphone capture and the 20Hz sampling loop.
 *
 * Shares the AudioContext singleton from toneGenerator.js.
 * If the AudioContext has not been created yet, calls ensureAudioContext()
 * which requires this to be invoked from within a user gesture handler.
 *
 * @returns {Promise<boolean>} Resolves to true on success, false on permission
 *   denied or any other error.
 */
export async function startCapture() {
  if (capturing) {
    return true;
  }

  try {
    // Ensure AudioContext exists (shared with toneGenerator).
    const ctx = getAudioContext() ?? ensureAudioContext();

    // Request microphone access.
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: ctx.sampleRate,
      },
      video: false,
    });

    // Wire up the audio graph: mic -> analyser (no destination, analysis only).
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.1; // Low smoothing for responsive pitch tracking.

    sourceNode = ctx.createMediaStreamSource(mediaStream);
    sourceNode.connect(analyserNode);
    // Intentionally NOT connected to ctx.destination to avoid mic feedback.

    // Reset accumulation state.
    pitchContour = [];
    rhythm = [];
    volumeSamples = [];
    prevAboveThreshold = false;
    captureStartTime = Date.now();
    capturing = true;

    // Start the 20Hz sampling loop (~50ms interval).
    samplingIntervalId = setInterval(takeSample, 50);

    return true;
  } catch (err) {
    // Common causes: NotAllowedError (permission denied), NotFoundError (no mic).
    console.warn('[voiceAnalyzer] startCapture failed:', err.name, err.message);
    _cleanup();
    return false;
  }
}

/**
 * Stops capture, releases the microphone, and returns the accumulated analysis.
 *
 * Safe to call even if capture was never started -- returns an empty result.
 *
 * @returns {{ pitchContour: number[], rhythm: number[], volume: number[], duration: number }}
 *   pitchContour  - Detected fundamental frequency (Hz) for each sample. 0 = silent/undetectable.
 *   rhythm        - Timestamps (ms from capture start) of detected volume-spike onsets.
 *   volume        - RMS level (0-1) for each sample.
 *   duration      - Total capture time in ms.
 */
export function stopCapture() {
  if (!capturing) {
    return { pitchContour: [], rhythm: [], volume: [], duration: 0 };
  }

  const duration = Date.now() - captureStartTime;

  // Snapshot the data before cleanup zeroes state.
  const result = {
    pitchContour: [...pitchContour],
    rhythm: [...rhythm],
    volume: [...volumeSamples],
    duration,
  };

  _cleanup();

  return result;
}

/**
 * Returns whether microphone capture is currently active.
 *
 * @returns {boolean}
 */
export function isCapturing() {
  return capturing;
}

/**
 * Returns the AnalyserNode for external visualization (e.g. waveform display
 * in VoiceInput.jsx). Returns null if capture has not been started.
 *
 * @returns {AnalyserNode|null}
 */
export function getAnalyserNode() {
  return analyserNode;
}

// ---------------------------------------------------------------------------
// Internal cleanup
// ---------------------------------------------------------------------------

/**
 * Releases all resources: interval, MediaStream tracks, and audio graph nodes.
 * Resets all module-level state to initial values.
 *
 * @private
 */
function _cleanup() {
  // Stop the sampling interval.
  if (samplingIntervalId !== null) {
    clearInterval(samplingIntervalId);
    samplingIntervalId = null;
  }

  // Stop all microphone tracks so the browser stops the recording indicator.
  if (mediaStream !== null) {
    for (const track of mediaStream.getTracks()) {
      track.stop();
    }
    mediaStream = null;
  }

  // Disconnect audio graph nodes to release memory.
  if (sourceNode !== null) {
    try {
      sourceNode.disconnect();
    } catch {
      // Already disconnected -- ignore.
    }
    sourceNode = null;
  }

  if (analyserNode !== null) {
    try {
      analyserNode.disconnect();
    } catch {
      // Already disconnected -- ignore.
    }
    analyserNode = null;
  }

  // Reset runtime state.
  capturing = false;
  captureStartTime = 0;
  prevAboveThreshold = false;

  // Accumulation arrays are intentionally left as-is so that a caller
  // who didn't store the stopCapture() result can still inspect them
  // during the same tick. They will be cleared on the next startCapture().
}
