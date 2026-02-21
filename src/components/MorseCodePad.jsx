import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ensureAudioContext, playTone } from '../audio/toneGenerator';

/**
 * MorseCodePad -- Rhythmic tap input for Beat 2+ of the SIGNAL experience.
 *
 * Short tap (<300ms) = dot; long hold (>=300ms) = dash.
 * Auto-submits 1.5s after the last release via debounce.
 *
 * @param {Object}   props
 * @param {boolean}  props.disabled  -- Disables all interaction during preamble/resolution.
 * @param {Function} props.onSubmit  -- Called with a PlayerInput object when pattern is committed.
 */
export default function MorseCodePad({ disabled, onSubmit }) {
  // Accumulated pattern for the current sequence
  const [entries, setEntries] = useState([]); // [{ id, symbol }]
  const [isHeld, setIsHeld]   = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1, drives glow ramp

  // Refs -- survive renders without causing them
  const onSubmitRef    = useRef(onSubmit);
  const pressStartRef  = useRef(null);  // Date.now() when pointer went down
  const lastReleaseRef = useRef(null);  // Date.now() of most recent release
  const entriesRef     = useRef([]);    // mirror of entries state for closures
  const timingRef      = useRef([]);    // raw timing data matching entries
  const holdDataRef    = useRef([]);    // holdDuration data matching entries
  const entryCounter   = useRef(0);     // monotonic key generator
  const debounceTimer  = useRef(null);
  const holdRampTimer  = useRef(null);  // rAF id for glow animation
  const holdRampStart  = useRef(null);  // timestamp when ramp began

  // Keep callback ref fresh
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (holdRampTimer.current) cancelAnimationFrame(holdRampTimer.current);
    };
  }, []);

  // --- Submit helper ---
  const commitPattern = useCallback(() => {
    if (entriesRef.current.length === 0) return;

    const payload = {
      type:        'morse',
      pattern:     entriesRef.current.map(e => e.symbol),
      timing:      timingRef.current.slice(),
      holdDuration: holdDataRef.current.slice(),
      timestamp:   Date.now(),
    };

    // Reset all accumulated state
    entriesRef.current  = [];
    timingRef.current   = [];
    holdDataRef.current = [];
    lastReleaseRef.current = null;
    setEntries([]);

    onSubmitRef.current?.(payload);
  }, []);

  // --- Debounce reset ---
  const armDebounce = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      commitPattern();
    }, 1500);
  }, [commitPattern]);

  // --- Glow ramp animation (rAF loop while held) ---
  const startHoldRamp = useCallback(() => {
    holdRampStart.current = performance.now();

    const tick = (now) => {
      const elapsed = now - holdRampStart.current;
      // Ramps 0 -> 1 over the 300ms dot/dash threshold, then stays at 1
      const progress = Math.min(elapsed / 300, 1);
      setHoldProgress(progress);
      holdRampTimer.current = requestAnimationFrame(tick);
    };

    holdRampTimer.current = requestAnimationFrame(tick);
  }, []);

  const stopHoldRamp = useCallback(() => {
    if (holdRampTimer.current) {
      cancelAnimationFrame(holdRampTimer.current);
      holdRampTimer.current = null;
    }
    setHoldProgress(0);
  }, []);

  // --- Pointer handlers ---
  const handlePointerDown = useCallback((e) => {
    if (disabled) return;
    // Cancel any in-flight debounce -- we're still in a sequence
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    ensureAudioContext();

    e.currentTarget.setPointerCapture(e.pointerId);
    pressStartRef.current = Date.now();
    setIsHeld(true);
    startHoldRamp();
  }, [disabled, startHoldRamp]);

  const handlePointerUp = useCallback((e) => {
    if (pressStartRef.current === null) return; // wasn't held via this component

    const releaseTime = Date.now();
    const holdMs      = releaseTime - pressStartRef.current;
    const symbol      = holdMs < 300 ? '.' : '-';

    // Timing = gap since last release end; 0 for the very first entry
    const gap = lastReleaseRef.current !== null
      ? pressStartRef.current - lastReleaseRef.current
      : 0;

    lastReleaseRef.current = releaseTime;
    pressStartRef.current  = null;

    stopHoldRamp();
    setIsHeld(false);

    // Audio feedback on release
    if (symbol === '.') {
      playTone(660, 80, { gain: 0.4 });
    } else {
      playTone(440, 300, { gain: 0.5 });
    }

    // Append entry
    const id = ++entryCounter.current;
    const newEntry = { id, symbol };

    entriesRef.current  = [...entriesRef.current,  newEntry];
    timingRef.current   = [...timingRef.current,   gap];
    holdDataRef.current = [...holdDataRef.current, holdMs];

    setEntries([...entriesRef.current]);
    armDebounce();
  }, [stopHoldRamp, armDebounce]);

  const handlePointerLeave = useCallback((e) => {
    // Cancel the press -- do not record the entry
    if (pressStartRef.current === null) return;

    pressStartRef.current = null;
    stopHoldRamp();
    setIsHeld(false);
    // If there are already entries, keep the debounce running
  }, [stopHoldRamp]);

  // --- Computed glow values ---
  const glowOpacity  = isHeld ? 0.25 + holdProgress * 0.55 : 0.15;
  const borderOpacity = isHeld ? 0.6 + holdProgress * 0.4 : 0.35;
  const shadowBlur   = isHeld ? 8 + holdProgress * 24 : 8;

  return (
    <div className="flex flex-col items-center gap-4 select-none">

      {/* Pattern display strip */}
      <div
        className="flex items-center gap-2 min-h-[20px]"
        aria-label="Current morse pattern"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {entries.map(({ id, symbol }) => (
            symbol === '.' ? (
              /* Dot -- small circle */
              <motion.span
                key={id}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.15 }}
                style={{
                  display:         'inline-block',
                  width:           '8px',
                  height:          '8px',
                  borderRadius:    '50%',
                  backgroundColor: '#5eead4',
                  boxShadow:       '0 0 6px #5eead4',
                  flexShrink:      0,
                }}
              />
            ) : (
              /* Dash -- rectangle */
              <motion.span
                key={id}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  display:         'inline-block',
                  width:           '20px',
                  height:          '8px',
                  borderRadius:    '3px',
                  backgroundColor: '#5eead4',
                  boxShadow:       '0 0 6px #5eead4',
                  flexShrink:      0,
                  transformOrigin: 'left center',
                }}
              />
            )
          ))}
        </AnimatePresence>
      </div>

      {/* Tap button */}
      <motion.button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        disabled={disabled}
        aria-label="Morse code tap pad. Short tap for dot, hold for dash."
        style={{
          width:           '80px',
          height:          '80px',
          borderRadius:    '50%',
          backgroundColor: `rgba(94, 234, 212, ${glowOpacity})`,
          border:          `2px solid rgba(94, 234, 212, ${borderOpacity})`,
          boxShadow:       isHeld
            ? `0 0 ${shadowBlur}px rgba(94, 234, 212, 0.8), inset 0 0 12px rgba(94, 234, 212, 0.3)`
            : `0 0 ${shadowBlur}px rgba(94, 234, 212, 0.3)`,
          cursor:     disabled ? 'not-allowed' : 'pointer',
          outline:    'none',
          touchAction: 'none',
          transition: 'box-shadow 0.05s ease, background-color 0.05s ease, border-color 0.05s ease',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={isHeld ? { scale: 1.06 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        whileTap={{ scale: disabled ? 1 : 1.06 }}
      >
        <span
          style={{
            fontFamily:    'monospace',
            fontSize:      '11px',
            fontWeight:    '700',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color:         `rgba(94, 234, 212, ${disabled ? 0.3 : 0.85})`,
            userSelect:    'none',
            pointerEvents: 'none',
          }}
        >
          TAP
        </span>
      </motion.button>

      {/* Hint text */}
      <p
        style={{
          fontFamily: 'monospace',
          fontSize:   '10px',
          color:      'rgba(94, 234, 212, 0.4)',
          letterSpacing: '0.08em',
          userSelect: 'none',
        }}
      >
        tap &middot; hold for&nbsp;--
      </p>
    </div>
  );
}
