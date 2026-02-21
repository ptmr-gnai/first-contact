import { useState } from 'react'
import { useGame } from '../context/GameContext'
import { EMOTIONS, LIGHT_PATTERNS } from '../data/mockGameState'

const BEATS = [1, 2, 3]

export default function DemoControls() {
  const [isOpen, setIsOpen] = useState(false)
  const {
    currentBeat,
    alienEmotion,
    setBeat,
    setEmotion,
    triggerLightPattern,
    clearLightPattern,
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
          {/* Beat Selector */}
          <section>
            <p className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-50 mb-1.5">
              Beat
            </p>
            <div className="flex gap-1">
              {BEATS.map((beat) => (
                <button
                  key={beat}
                  onClick={() => setBeat(beat)}
                  className={[
                    'px-2.5 py-0.5 text-xs font-mono rounded border transition-colors',
                    currentBeat === beat
                      ? 'border-alien-glow text-alien-glow ring-1 ring-alien-glow/40 bg-alien-glow/10'
                      : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle',
                  ].join(' ')}
                >
                  {beat}
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

          {/* Light Patterns */}
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
        </div>
      )}
    </div>
  )
}
