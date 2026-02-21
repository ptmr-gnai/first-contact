import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { EMOTIONS, LIGHT_PATTERNS } from '../data/mockGameState'
import { CONCEPT_DOT_COLORS, CONCEPT_SHORT_LABELS } from '../constants'

const ACT_NUMBERS = [1, 2, 3]

// Concept IDs for the teaching buttons
const TEACHABLE_CONCEPTS = ['acknowledge', 'danger', 'self', 'other', 'energy', 'direction', 'home']

export default function DemoControls() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    currentAct,
    alienEmotion,
    strikes,
    runNumber,
    answerPanelOpen,
    isTeaching,
    setAct,
    setEmotion,
    triggerLightPattern,
    clearLightPattern,
    triggerTeaching,
    toggleAnswerPanel,
    setGamePhase,
    startNewRun,
  } = useGame()

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-1">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="px-2.5 py-1 text-xs font-mono rounded bg-space-deep/90 border border-chrome-subtle text-chrome-dim hover:text-chrome-subtle hover:border-chrome-dim transition-colors tracking-widest uppercase backdrop-blur-sm"
      >
        {isOpen ? 'Hide Demo' : 'Demo'}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="bg-space-deep/80 backdrop-blur-sm border border-chrome-subtle rounded p-3 flex flex-col gap-3 w-56">
          {/* Act Selector */}
          <section>
            <p className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-50 mb-1.5">
              Act
            </p>
            <div className="flex gap-1">
              {ACT_NUMBERS.map((act) => (
                <button
                  key={act}
                  onClick={() => setAct(act)}
                  className={[
                    'px-2.5 py-0.5 text-xs font-mono rounded border transition-colors',
                    currentAct === act
                      ? 'border-alien-glow text-alien-glow ring-1 ring-alien-glow/40 bg-alien-glow/10'
                      : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle',
                  ].join(' ')}
                >
                  {act}
                </button>
              ))}
            </div>
          </section>

          {/* Emotion Selector */}
          <section>
            <p className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-50 mb-1.5">
              Emotion
            </p>
            <div className="flex flex-wrap gap-1">
              {EMOTIONS.map((emotion) => (
                <button
                  key={emotion}
                  onClick={() => setEmotion(emotion)}
                  className={[
                    'px-2 py-0.5 text-xs font-mono rounded border transition-colors capitalize',
                    alienEmotion === emotion
                      ? 'border-signal-blue text-signal-blue ring-1 ring-signal-blue/40 bg-signal-blue/10'
                      : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle',
                  ].join(' ')}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </section>

          {/* Teaching (Gesture + Pattern + ConceptPicker) */}
          <section>
            <p className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-50 mb-1.5">
              Teach Concept
            </p>
            <div className="flex flex-wrap gap-1">
              {TEACHABLE_CONCEPTS.map((id) => (
                <button
                  key={id}
                  onClick={() => triggerTeaching(id)}
                  className={[
                    'px-2 py-0.5 text-xs font-mono rounded border transition-colors',
                    isTeaching
                      ? 'border-signal-green/40 text-chrome-dim'
                      : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle',
                  ].join(' ')}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                    style={{ backgroundColor: CONCEPT_DOT_COLORS[id] }}
                  />
                  {CONCEPT_SHORT_LABELS[id]}
                </button>
              ))}
            </div>
          </section>

          {/* Light Patterns (raw, no teaching) */}
          <section>
            <p className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-50 mb-1.5">
              Light Pattern
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.values(LIGHT_PATTERNS).map((pattern) => {
                const primaryColor = pattern.light.colors[0]
                return (
                  <button
                    key={pattern.id}
                    onClick={() => triggerLightPattern(pattern.light)}
                    className="px-2 py-0.5 text-xs font-mono rounded border border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle transition-colors"
                    title={pattern.label}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                      style={{ backgroundColor: primaryColor }}
                    />
                    {pattern.label}
                  </button>
                )
              })}

              {/* Clear button */}
              <button
                onClick={() => clearLightPattern()}
                className="px-2 py-0.5 text-xs font-mono rounded border border-chrome-subtle text-chrome-dim hover:border-signal-red/60 hover:text-signal-red/60 transition-colors"
              >
                Clear
              </button>
            </div>
          </section>

          {/* P4 Roguelike Controls */}
          <section>
            <p className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-50 mb-1.5">
              Roguelike
            </p>
            <div className="flex flex-wrap gap-1">
              <span className="text-chrome-dim/40 text-[10px] font-mono self-center mr-1">
                Run #{runNumber} | Strikes: {strikes}/3
              </span>
              <button
                onClick={toggleAnswerPanel}
                className={[
                  'px-2 py-0.5 text-xs font-mono rounded border transition-colors',
                  answerPanelOpen
                    ? 'border-signal-blue text-signal-blue'
                    : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle',
                ].join(' ')}
              >
                Answer Panel
              </button>
              <button
                onClick={() => setGamePhase('gameover')}
                className="px-2 py-0.5 text-xs font-mono rounded border border-chrome-subtle text-chrome-dim hover:border-signal-red/60 hover:text-signal-red/60 transition-colors"
              >
                Game Over
              </button>
              <button
                onClick={() => setGamePhase('victory')}
                className="px-2 py-0.5 text-xs font-mono rounded border border-chrome-subtle text-chrome-dim hover:border-signal-green/60 hover:text-signal-green/60 transition-colors"
              >
                Victory
              </button>
              <button
                onClick={startNewRun}
                className="px-2 py-0.5 text-xs font-mono rounded border border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle transition-colors"
              >
                New Run
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
