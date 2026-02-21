import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { ensureAudioContext, playSequence } from '../audio/toneGenerator';
import ColorWheel from './ColorWheel';
import MorseCodePad from './MorseCodePad';
import VoiceInput from './VoiceInput';
import ConceptPicker from './ConceptPicker';

const TABS = [
  { id: 'color', label: 'Color' },
  { id: 'morse', label: 'Morse' },
  { id: 'voice', label: 'Voice' },
];

/**
 * PlayerControls -- P3 container that docks into GameScreen's bottom slot.
 *
 * Responsibilities:
 * - Shows ConceptPicker during teaching moments (when isTeaching is true)
 * - Shows ColorWheel/Morse/Voice inputs otherwise
 * - Routes player input from active input mode to submitPlayerInput
 * - Plays alien sound patterns when alienOutput.sound changes
 * - Shows mode tabs in act 2+ (color only in act 1)
 */
export default function PlayerControls() {
  const {
    submitPlayerInput,
    alienOutput,
    currentAct,
    isProcessing,
    turnCount,
    answerPanelOpen,
    isTeaching,
  } = useGame();

  const [activeTab, setActiveTab] = useState('color');
  const prevSoundKeyRef = useRef(null);

  // Reset to color tab if beat drops below 2 (DemoControls can change beat)
  useEffect(() => {
    if (currentAct < 2) setActiveTab('color');
  }, [currentAct]);

  // Play alien sound patterns when they change
  useEffect(() => {
    const sound = alienOutput?.sound;
    if (!sound?.pitches?.length) return;

    // Key off turnCount so repeated patterns still play
    const soundKey = `${turnCount}:${JSON.stringify(sound.pitches)}`;
    if (prevSoundKeyRef.current === soundKey) return;
    prevSoundKeyRef.current = soundKey;

    try {
      ensureAudioContext();
      playSequence(sound.pitches, sound.rhythm || [], sound.duration || []);
    } catch {
      // AudioContext not yet available (no user gesture) -- skip opening sound
    }
  }, [alienOutput?.sound, turnCount]);

  const handleSubmit = useCallback(
    (input) => {
      if (isProcessing) return;
      ensureAudioContext();
      submitPlayerInput(input);
    },
    [submitPlayerInput, isProcessing]
  );

  const showTabs = currentAct >= 2 && !isTeaching;
  const disabled = isProcessing;

  // During teaching moments, show the ConceptPicker instead of regular inputs
  if (isTeaching) {
    return (
      <div
        className="relative h-full w-full overflow-visible transition-opacity duration-300"
        style={answerPanelOpen ? { opacity: 0.4, pointerEvents: 'none' } : {}}
      >
        <ConceptPicker />
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-visible transition-opacity duration-300"
      style={answerPanelOpen ? { opacity: 0.4, pointerEvents: 'none' } : {}}
    >
      {/* Mode tabs -- act 2+ only */}
      {showTabs && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-2.5 py-0.5 text-[10px] font-mono tracking-widest uppercase rounded-t border border-b-0 transition-colors',
                activeTab === tab.id
                  ? 'border-chrome-subtle bg-space-deep/80 text-chrome-dim'
                  : 'border-transparent text-chrome-dim/40 hover:text-chrome-dim/70',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <AnimatePresence mode="wait">
        {activeTab === 'color' && (
          <motion.div
            key="color"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <ColorWheel disabled={disabled} onSubmit={handleSubmit} />
          </motion.div>
        )}
        {activeTab === 'morse' && (
          <motion.div
            key="morse"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full flex items-center justify-center"
          >
            <MorseCodePad disabled={disabled} onSubmit={handleSubmit} />
          </motion.div>
        )}
        {activeTab === 'voice' && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="h-full flex items-center justify-center"
          >
            <VoiceInput disabled={disabled} onSubmit={handleSubmit} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
