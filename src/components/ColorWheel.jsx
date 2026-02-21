import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS } from '../constants.js';
import { ensureAudioContext, playTone } from '../audio/toneGenerator';

/** Frequency (Hz) for each color's audio feedback */
const COLOR_FREQUENCIES = {
  green: 440,
  red: 220,
  blue: 330,
  yellow: 660,
  white: 550,
  amber: 380,
};

/** Ordered list of color keys for rendering */
const COLOR_KEYS = ['green', 'red', 'blue', 'yellow', 'white', 'amber'];

/** How long (ms) a press must be held to count as sustained */
const HOLD_THRESHOLD_MS = 500;

/** How long (ms) of inactivity before auto-submitting the sequence */
const AUTO_SUBMIT_DELAY_MS = 1500;

/**
 * ColorWheel -- primary player input component.
 *
 * Allows the player to tap or hold color swatches to build a pattern sequence
 * that is submitted to the alien engine after 1.5s of inactivity.
 *
 * @param {object} props
 * @param {boolean} props.disabled - When true, disables all interaction.
 * @param {function} props.onSubmit - Called with a PlayerInput object on auto-submit.
 */
export default function ColorWheel({ disabled = false, onSubmit }) {
  /** Accumulated sequence entries: { id, color, hexColor, timing, holdDuration } */
  const [sequence, setSequence] = useState([]);

  /** Key of the color currently being held (or null) */
  const [activeColor, setActiveColor] = useState(null);

  /** Ref to the auto-submit timer so it can be cleared/reset */
  const autoSubmitTimerRef = useRef(null);

  /** Timestamp (ms) of when the current press began */
  const pressStartRef = useRef(null);

  /** Timestamp (ms) of when the previous input ended (for timing delta) */
  const lastInputEndRef = useRef(null);

  /** Monotonic counter for unique entry keys */
  const entryCounterRef = useRef(0);

  /** Stable ref for onSubmit to avoid cascading useCallback instability */
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

  /** Latest sequence ref so submit callback captures current value */
  const sequenceRef = useRef(sequence);
  useEffect(() => { sequenceRef.current = sequence; }, [sequence]);

  /** Clear auto-submit timer on unmount */
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  /** Submit the accumulated sequence and reset state */
  const submitSequence = useCallback(() => {
    const current = sequenceRef.current;
    if (current.length === 0) return;

    const playerInput = {
      type: 'color',
      colors: current.map((e) => e.color),
      timing: current.map((e) => e.timing),
      holdDuration: current.map((e) => e.holdDuration),
      timestamp: Date.now(),
    };

    onSubmitRef.current?.(playerInput);
    setSequence([]);
    lastInputEndRef.current = null;
  }, []);

  /** Reset the auto-submit countdown */
  const resetAutoSubmitTimer = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
    }
    autoSubmitTimerRef.current = setTimeout(() => {
      submitSequence();
    }, AUTO_SUBMIT_DELAY_MS);
  }, [submitSequence]);

  /** Handle pointer down: record press start time */
  const handlePointerDown = useCallback(
    (colorKey) => {
      if (disabled) return;

      ensureAudioContext();
      pressStartRef.current = Date.now();
      setActiveColor(colorKey);

      // Clear any pending auto-submit while the player is still pressing
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
        autoSubmitTimerRef.current = null;
      }
    },
    [disabled]
  );

  /** Handle pointer up: compute hold duration, play tone, append to sequence */
  const handlePointerUp = useCallback(
    (colorKey) => {
      if (disabled || pressStartRef.current === null) return;

      const now = Date.now();
      const holdDuration = now - pressStartRef.current;
      const isHold = holdDuration >= HOLD_THRESHOLD_MS;

      // Timing delta: ms since the end of the previous input (0 for first entry)
      const timing =
        lastInputEndRef.current !== null ? now - lastInputEndRef.current : 0;

      lastInputEndRef.current = now;
      pressStartRef.current = null;
      setActiveColor(null);

      // Play tone on release: short blip for tap, longer tone for hold
      playTone(COLOR_FREQUENCIES[colorKey], isHold ? 300 : 80, { gain: isHold ? 0.5 : 0.4 });

      setSequence((prev) => [
        ...prev,
        {
          id: entryCounterRef.current++,
          color: colorKey,
          hexColor: COLORS[colorKey],
          timing,
          holdDuration: isHold ? holdDuration : 0,
        },
      ]);

      resetAutoSubmitTimer();
    },
    [disabled, resetAutoSubmitTimer]
  );

  /** Cancel an in-progress press (pointer left button area) */
  const handlePointerCancel = useCallback(() => {
    if (pressStartRef.current !== null) {
      pressStartRef.current = null;
      setActiveColor(null);
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 px-4 select-none">
      {/* Pattern preview strip */}
      <div className="flex items-center gap-1.5 h-5 min-h-[20px]">
        <AnimatePresence initial={false}>
          {sequence.map((entry) => (
            <motion.span
              key={entry.id}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="rounded-full"
              title={entry.color}
              aria-hidden="true"
              style={{
                backgroundColor: entry.hexColor,
                width: entry.holdDuration > 0 ? 16 : 10,
                height: entry.holdDuration > 0 ? 16 : 10,
                boxShadow: `0 0 6px 2px ${entry.hexColor}88`,
                flexShrink: 0,
              }}
            />
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {sequence.length === 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xs text-slate-600 tracking-widest"
            >
              tap to begin
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Color swatch row */}
      <div
        className="flex items-center justify-center gap-4"
        role="group"
        aria-label="Color input palette"
      >
        {COLOR_KEYS.map((colorKey) => {
          const hex = COLORS[colorKey];
          const isActive = activeColor === colorKey;

          return (
            <motion.button
              key={colorKey}
              aria-label={`${colorKey} color`}
              aria-pressed={isActive}
              disabled={disabled}
              onPointerDown={() => handlePointerDown(colorKey)}
              onPointerUp={() => handlePointerUp(colorKey)}
              onPointerLeave={handlePointerCancel}
              onPointerCancel={handlePointerCancel}
              onDragStart={(e) => e.preventDefault()}
              whileTap={disabled ? undefined : { scale: 0.88 }}
              animate={
                isActive
                  ? {
                      boxShadow: [
                        `0 0 8px 2px ${hex}66`,
                        `0 0 22px 8px ${hex}cc`,
                        `0 0 18px 6px ${hex}aa`,
                      ],
                    }
                  : {
                      boxShadow: disabled
                        ? '0 0 0px 0px transparent'
                        : `0 0 6px 1px ${hex}44, inset 0 1px 2px rgba(255,255,255,0.15)`,
                    }
              }
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              style={{
                width: 44,
                height: 44,
                backgroundColor: hex,
                opacity: disabled ? 0.25 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: `1.5px solid ${hex}88`,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
