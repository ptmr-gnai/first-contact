/**
 * VoiceInput.jsx
 *
 * Microphone-based tonal input component for the SIGNAL game.
 * The alien understands pitch, rhythm, and volume -- not words.
 * Players hum, click, or make tonal sounds to communicate.
 *
 * Props:
 *   disabled   {boolean}              - When true, input is inert (preamble/resolution phases).
 *   onSubmit   {function(playerInput)} - Called with the voice player input object on stop.
 *
 * Output schema on submit:
 * {
 *   type:         "voice",
 *   pitchContour: number[],   // Hz per sample, 0 = silent
 *   rhythm:       number[],   // ms timestamps of onset events from capture start
 *   volume:       number[],   // RMS 0-1 per sample
 *   duration:     number,     // total capture time in ms
 *   timestamp:    number,     // Date.now() at submission
 * }
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  startCapture,
  stopCapture,
  isCapturing,
  getAnalyserNode,
} from '../audio/voiceAnalyzer';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum recording time in ms before auto-stop. */
const MAX_DURATION_MS = 5000;

/** requestAnimationFrame polling rate for waveform (runs every rAF tick ~60fps). */
const WAVEFORM_WIDTH = 200;
const WAVEFORM_HEIGHT = 48;

/** Purple accent for voice input. */
const VOICE_COLOR = '#a78bfa';

// ---------------------------------------------------------------------------
// Waveform helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Uint8Array of byte time-domain data (0-255, midpoint=128)
 * into an SVG polyline points string scaled to WAVEFORM_WIDTH x WAVEFORM_HEIGHT.
 *
 * @param {Uint8Array} data
 * @returns {string} SVG polyline points attribute value.
 */
function buildPolylinePoints(data) {
  const step = WAVEFORM_WIDTH / (data.length - 1);
  const midY = WAVEFORM_HEIGHT / 2;
  const amplitude = WAVEFORM_HEIGHT / 2 - 2; // 2px margin top/bottom

  let points = '';
  for (let i = 0; i < data.length; i++) {
    // data[i] is 0-255; 128 = silence midpoint.
    const normalized = (data[i] - 128) / 128; // -1 to +1
    const x = i * step;
    const y = midY - normalized * amplitude;
    points += `${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return points.trim();
}

/**
 * Returns SVG polyline points for a flat center line (silence state).
 *
 * @returns {string}
 */
function flatLinePoints() {
  const midY = WAVEFORM_HEIGHT / 2;
  return `0,${midY} ${WAVEFORM_WIDTH},${midY}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VoiceInput
 *
 * Tap the mic button to start recording; tap STOP (or wait 5s) to submit.
 * Shows a live SVG waveform while recording.
 * Handles microphone permission denial gracefully.
 *
 * @param {{ disabled: boolean, onSubmit: function }} props
 */
export default function VoiceInput({ disabled, onSubmit }) {
  const [recording, setRecording] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [waveformPoints, setWaveformPoints] = useState(flatLinePoints());

  // Store onSubmit in a ref so the rAF/timeout closures always call
  // the current version without needing to be in their dependency arrays.
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  /** requestAnimationFrame handle -- stored in ref so cleanup can cancel it. */
  const rafIdRef = useRef(null);

  /** setTimeout handle for the 5-second max-duration auto-stop. */
  const maxDurationTimerRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Waveform animation loop
  // ---------------------------------------------------------------------------

  /**
   * Starts a requestAnimationFrame loop that reads from the AnalyserNode
   * and updates the SVG waveform polyline points state.
   * The loop self-cancels when `capturing` becomes false.
   */
  const startWaveformLoop = useCallback(() => {
    const tick = () => {
      const analyser = getAnalyserNode();

      if (!analyser || !isCapturing()) {
        // Capture ended; reset to flat line and stop the loop.
        setWaveformPoints(flatLinePoints());
        rafIdRef.current = null;
        return;
      }

      const bufferLength = analyser.frequencyBinCount; // half of fftSize
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      setWaveformPoints(buildPolylinePoints(dataArray));

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, []);

  // ---------------------------------------------------------------------------
  // Stop recording -- shared logic for button tap and auto-stop
  // ---------------------------------------------------------------------------

  /**
   * Stops capture, builds the player input object, and calls onSubmit.
   * Safe to call from both the button handler and the auto-stop timer.
   */
  const handleStop = useCallback(() => {
    // Cancel the max-duration timer if stop was triggered manually.
    if (maxDurationTimerRef.current !== null) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }

    // Cancel waveform rAF loop; the module-level isCapturing() check in tick()
    // would also stop it, but cancelling immediately is cleaner.
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const result = stopCapture();
    setRecording(false);
    setWaveformPoints(flatLinePoints());

    // Only submit if we actually captured something.
    if (result.duration > 0) {
      onSubmitRef.current({
        type: 'voice',
        pitchContour: result.pitchContour,
        rhythm: result.rhythm,
        volume: result.volume,
        duration: result.duration,
        timestamp: Date.now(),
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Start recording
  // ---------------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    setPermissionDenied(false);

    const success = await startCapture();

    if (!success) {
      setPermissionDenied(true);
      return;
    }

    setRecording(true);
    startWaveformLoop();

    // Auto-stop after MAX_DURATION_MS.
    maxDurationTimerRef.current = setTimeout(() => {
      maxDurationTimerRef.current = null;
      handleStop();
    }, MAX_DURATION_MS);
  }, [startWaveformLoop, handleStop]);

  // ---------------------------------------------------------------------------
  // Toggle button handler
  // ---------------------------------------------------------------------------

  const handleToggle = useCallback(() => {
    if (disabled) return;

    if (recording) {
      handleStop();
    } else {
      handleStart();
    }
  }, [disabled, recording, handleStop, handleStart]);

  // ---------------------------------------------------------------------------
  // Cleanup on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      // Cancel animation frame loop.
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Cancel auto-stop timer.
      if (maxDurationTimerRef.current !== null) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }

      // Stop microphone capture if still active.
      if (isCapturing()) {
        stopCapture();
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const isDisabled = disabled || permissionDenied;

  const buttonLabel = recording ? 'STOP' : 'MIC';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Waveform visualization */}
      <svg
        width={WAVEFORM_WIDTH}
        height={WAVEFORM_HEIGHT}
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <polyline
          points={waveformPoints}
          fill="none"
          stroke={recording ? VOICE_COLOR : 'rgba(167,139,250,0.3)'}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Record / Stop button */}
      <motion.button
        onClick={handleToggle}
        disabled={isDisabled}
        aria-label={recording ? 'Stop recording' : 'Start recording'}
        aria-pressed={recording}
        // Scale pulse while recording
        animate={
          recording
            ? { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 1.2 } }
            : { scale: 1 }
        }
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          border: `2px solid ${recording ? '#ef4444' : 'rgba(167,139,250,0.4)'}`,
          background: recording
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(167,139,250,0.08)',
          boxShadow: recording
            ? '0 0 18px 6px rgba(239,68,68,0.35), 0 0 6px 2px rgba(239,68,68,0.6)'
            : 'none',
          opacity: disabled ? 0.35 : 1,
          transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s, opacity 0.2s',
          // Reset default button styles
          padding: 0,
          outline: 'none',
          fontFamily: 'monospace',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
            color: recording ? '#ef4444' : VOICE_COLOR,
            fontWeight: 600,
            userSelect: 'none',
          }}
        >
          {buttonLabel}
        </span>
      </motion.button>

      {/* Status labels */}
      <div style={{ height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {permissionDenied && (
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              color: '#f87171',
              letterSpacing: '0.05em',
            }}
          >
            mic blocked
          </span>
        )}
        {recording && !permissionDenied && (
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              color: 'rgba(167,139,250,0.7)',
              letterSpacing: '0.05em',
            }}
          >
            recording...
          </span>
        )}
      </div>
    </div>
  );
}
