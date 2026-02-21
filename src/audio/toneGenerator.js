/**
 * toneGenerator.js
 *
 * Web Audio API module for the SIGNAL game.
 * Plays the alien's synthesized sound patterns in real time.
 *
 * All audio is synthesized -- no external files.
 * AudioContext is lazily initialized after the first user gesture
 * to comply with browser autoplay policy.
 *
 * Safari compatibility: uses window.webkitAudioContext fallback.
 */

/** @type {AudioContext|null} */
let audioCtx = null;

/** @type {Set<OscillatorNode>} All currently active oscillator nodes. */
const activeOscillators = new Set();

// ---------------------------------------------------------------------------
// Core context management
// ---------------------------------------------------------------------------

/**
 * Initializes the AudioContext if it has not been created yet.
 * MUST be called from within a user gesture handler (click, tap, keydown)
 * to satisfy browser autoplay policy.
 *
 * Safari requires `webkitAudioContext` as a fallback.
 *
 * @returns {AudioContext} The singleton AudioContext instance.
 */
export function ensureAudioContext() {
  if (audioCtx) {
    // Safari suspends the context if the page loses focus; resume it.
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  audioCtx = new AudioContextClass();
  return audioCtx;
}

/**
 * Returns the current AudioContext instance, or null if not yet initialized.
 * Used by voiceAnalyzer.js to share the same context.
 *
 * @returns {AudioContext|null}
 */
export function getAudioContext() {
  return audioCtx;
}

// ---------------------------------------------------------------------------
// Single-tone playback
// ---------------------------------------------------------------------------

/**
 * Plays a single synthesized tone with a smooth amplitude envelope
 * (20ms attack, 50ms release) to prevent audible clicks.
 *
 * Optionally layers a second detuned oscillator (+3 Hz, gain 0.15)
 * for a richer, alien-like timbre.
 *
 * @param {number} freq        Frequency in Hz (e.g. 440).
 * @param {number} durationMs  Tone duration in milliseconds.
 * @param {object} [options]
 * @param {number} [options.gain=0.3]       Peak gain (0.0 -- 1.0).
 * @param {string} [options.type='sine']    OscillatorNode type.
 * @param {boolean} [options.detune=true]   Layer detuned oscillator for richness.
 * @param {number} [options.startTime]      AudioContext time to begin playback.
 *                                          Defaults to audioCtx.currentTime.
 * @returns {OscillatorNode} The primary oscillator node.
 */
export function playTone(freq, durationMs, options = {}) {
  const ctx = ensureAudioContext();

  const {
    gain = 0.3,
    type = 'sine',
    detune = true,
    startTime = ctx.currentTime,
  } = options;

  const durationSec = durationMs / 1000;
  const attackSec   = 0.02;  // 20ms
  const releaseSec  = 0.05;  // 50ms

  // Clamp release so it never overshoots the duration.
  const safeRelease = Math.min(releaseSec, durationSec * 0.5);
  const decayStart  = startTime + durationSec - safeRelease;
  const endTime     = startTime + durationSec;

  /**
   * Builds one oscillator + gain envelope pair and registers cleanup.
   *
   * @param {number} frequency
   * @param {number} peakGain
   * @returns {OscillatorNode}
   */
  function makeOscillator(frequency, peakGain) {
    const osc     = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type      = type;
    osc.frequency.setValueAtTime(frequency, startTime);

    // Amplitude envelope: silence -> attack peak -> sustain -> release -> silence.
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attackSec);
    gainNode.gain.setValueAtTime(peakGain, decayStart);
    gainNode.gain.linearRampToValueAtTime(0, endTime);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(endTime);

    activeOscillators.add(osc);
    osc.onended = () => {
      activeOscillators.delete(osc);
      gainNode.disconnect();
      osc.disconnect();
    };

    return osc;
  }

  const primaryOsc = makeOscillator(freq, gain);

  // Layer detuned oscillator for richness (+3 Hz, lower gain).
  if (detune) {
    makeOscillator(freq + 3, 0.15);
  }

  return primaryOsc;
}

// ---------------------------------------------------------------------------
// Sequence playback
// ---------------------------------------------------------------------------

/**
 * Schedules a sequence of tones matching the alien sound schema.
 * `rhythm` values are inter-onset intervals: the first tone plays
 * immediately, each subsequent tone starts `rhythm[i-1]` ms after
 * the previous one.
 *
 * @param {number[]} pitches   Array of frequencies in Hz.
 * @param {number[]} rhythm    Array of inter-onset intervals in ms.
 * @param {number[]} duration  Array of durations in ms for each tone.
 * @param {object}  [options]  Forwarded to each `playTone` call.
 * @returns {Promise<void>}    Resolves when the last tone has finished playing.
 *
 * @example
 * // Play 3 beeps at 440Hz, each 150ms long, spaced 200ms apart.
 * await playSequence([440, 440, 440], [200, 200, 200], [150, 150, 150]);
 */
export function playSequence(pitches, rhythm, duration, options = {}) {
  if (!pitches.length) {
    return Promise.resolve();
  }

  const ctx = ensureAudioContext();
  const baseTime = ctx.currentTime;

  let lastEndTimeSec = baseTime;
  let cumulativeMs = 0;

  for (let i = 0; i < pitches.length; i++) {
    const freq       = pitches[i]  ?? 440;
    const durationMs = duration[i] ?? 150;

    const startTime = baseTime + cumulativeMs / 1000;
    const endTime   = startTime + durationMs / 1000;

    if (endTime > lastEndTimeSec) {
      lastEndTimeSec = endTime;
    }

    playTone(freq, durationMs, { ...options, startTime });

    // Advance cumulative offset by this tone's inter-onset interval
    cumulativeMs += rhythm[i] ?? 200;
  }

  // Resolve after all tones have finished, with a small buffer for release fade.
  const RELEASE_BUFFER_MS = 60;
  const totalWaitMs =
    (lastEndTimeSec - ctx.currentTime) * 1000 + RELEASE_BUFFER_MS;

  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, totalWaitMs));
  });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Immediately stops all active oscillators.
 * Call this on beat transitions, game reset, or component unmount.
 */
export function stopAll() {
  for (const osc of activeOscillators) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Oscillator may have already ended; ignore the error.
    }
  }
  activeOscillators.clear();
}
