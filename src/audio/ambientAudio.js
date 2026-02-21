/**
 * ambientAudio.js
 *
 * Synthesized atmospheric ambient background for the SIGNAL game.
 * All audio is generated in real time via Web Audio API -- no external files.
 *
 * Layers:
 *  1. Deep drone    -- low rumbling bass, slow LFO modulation
 *  2. Pad wash      -- warm mid-range chord with gentle detuning
 *  3. Shimmer       -- high ethereal tones that fade in/out randomly
 *  4. Dust          -- occasional filtered noise bursts (space debris)
 *
 * Respects browser autoplay policy: call start() from a user gesture.
 */

/** @type {AudioContext|null} */
let ctx = null;

/** @type {GainNode|null} Master volume */
let masterGain = null;

/** All nodes to disconnect on stop */
const nodes = new Set();

let running = false;
const timers = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function track(node) {
  nodes.add(node);
  return node;
}

/**
 * Creates an LFO that modulates an AudioParam directly.
 * @param {number} freq - LFO frequency in Hz
 * @param {number} amount - Modulation depth
 * @param {AudioParam} audioParam - The AudioParam to modulate
 */
function lfo(freq, amount, audioParam) {
  const osc = track(ctx.createOscillator());
  const gain = track(ctx.createGain());
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.value = amount;
  osc.connect(gain);
  gain.connect(audioParam);
  osc.start();
  return osc;
}

function scheduleTimer(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
  return id;
}

// ---------------------------------------------------------------------------
// Layer 1: Deep drone
// ---------------------------------------------------------------------------

function createDrone() {
  const frequencies = [38, 38.5];
  const droneGain = track(ctx.createGain());
  droneGain.gain.value = 0.25;

  const filter = track(ctx.createBiquadFilter());
  filter.type = 'lowpass';
  filter.frequency.value = 150;
  filter.Q.value = 1;

  for (const freq of frequencies) {
    const osc = track(ctx.createOscillator());
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
  }

  filter.connect(droneGain);

  // Slow volume LFO for breathing effect
  lfo(0.08, 0.08, droneGain.gain);

  return droneGain;
}

// ---------------------------------------------------------------------------
// Layer 2: Pad wash -- ambient chord
// ---------------------------------------------------------------------------

function createPad() {
  const padFreqs = [130.81, 155.56, 196.0, 246.94]; // Cm7 voicing
  const padGain = track(ctx.createGain());
  padGain.gain.value = 0.12;

  const filter = track(ctx.createBiquadFilter());
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.Q.value = 0.7;

  for (const freq of padFreqs) {
    const osc = track(ctx.createOscillator());
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();

    // Slight detuning via LFO for organic movement
    lfo(0.1 + Math.random() * 0.1, 1.5, osc.frequency);
  }

  filter.connect(padGain);

  // Slow swell
  lfo(0.05, 0.03, padGain.gain);

  return padGain;
}

// ---------------------------------------------------------------------------
// Layer 3: Shimmer -- high ethereal tones
// ---------------------------------------------------------------------------

function createShimmer() {
  const shimmerGain = track(ctx.createGain());
  shimmerGain.gain.value = 0.0;

  const shimmerFreqs = [1046.5, 1318.5, 1568.0]; // C6, E6, G6
  const filter = track(ctx.createBiquadFilter());
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 2;

  for (const freq of shimmerFreqs) {
    const osc = track(ctx.createOscillator());
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(filter);
    osc.start();
    lfo(0.07 + Math.random() * 0.05, 2, osc.frequency);
  }

  filter.connect(shimmerGain);

  function shimmerCycle() {
    if (!running || !ctx) return;
    const fadeIn = 3 + Math.random() * 4;
    const hold = 2 + Math.random() * 3;
    const fadeOut = 3 + Math.random() * 4;
    const pause = 4 + Math.random() * 8;
    const now = ctx.currentTime;

    shimmerGain.gain.cancelScheduledValues(now);
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + fadeIn);
    shimmerGain.gain.setValueAtTime(0.06, now + fadeIn + hold);
    shimmerGain.gain.linearRampToValueAtTime(0, now + fadeIn + hold + fadeOut);

    scheduleTimer(shimmerCycle, (fadeIn + hold + fadeOut + pause) * 1000);
  }

  shimmerCycle();
  return shimmerGain;
}

// ---------------------------------------------------------------------------
// Layer 4: Dust -- filtered noise bursts
// ---------------------------------------------------------------------------

function createDust() {
  const dustGain = track(ctx.createGain());
  dustGain.gain.value = 0;

  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = track(ctx.createBufferSource());
  noise.buffer = noiseBuffer;
  noise.loop = true;
  noise.start();

  const filter = track(ctx.createBiquadFilter());
  filter.type = 'bandpass';
  filter.frequency.value = 2000;
  filter.Q.value = 8;

  noise.connect(filter);
  filter.connect(dustGain);

  function dustParticle() {
    if (!running || !ctx) return;
    const now = ctx.currentTime;
    const duration = 0.1 + Math.random() * 0.3;

    filter.frequency.setValueAtTime(800 + Math.random() * 4000, now);

    dustGain.gain.cancelScheduledValues(now);
    dustGain.gain.setValueAtTime(0, now);
    dustGain.gain.linearRampToValueAtTime(0.02 + Math.random() * 0.03, now + 0.02);
    dustGain.gain.linearRampToValueAtTime(0, now + duration);

    scheduleTimer(dustParticle, 1000 + Math.random() * 5000);
  }

  dustParticle();
  return dustGain;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts the ambient soundscape. Must be called from a user gesture.
 * Safe to call multiple times -- subsequent calls are no-ops.
 */
export function startAmbient() {
  if (running) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  ctx = new AudioContextClass();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(ctx.destination);

  running = true;

  const drone = createDrone();
  const pad = createPad();
  const shimmer = createShimmer();
  const dust = createDust();

  drone.connect(masterGain);
  pad.connect(masterGain);
  shimmer.connect(masterGain);
  dust.connect(masterGain);

  // Fade in over 3 seconds
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
}

/**
 * Stops all ambient audio and cleans up nodes.
 */
export function stopAmbient() {
  running = false;

  for (const id of timers) clearTimeout(id);
  timers.length = 0;

  if (!ctx) return;

  const now = ctx.currentTime;
  if (masterGain) {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1);
  }

  setTimeout(() => {
    for (const node of nodes) {
      try { node.disconnect(); } catch {}
      try { if (node.stop) node.stop(); } catch {}
    }
    nodes.clear();
    try { ctx.close(); } catch {}
    ctx = null;
    masterGain = null;
  }, 1200);
}

/**
 * Returns whether ambient audio is currently running.
 * @returns {boolean}
 */
export function isAmbientRunning() {
  return running;
}
