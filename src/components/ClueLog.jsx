import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

// Map a pattern's primary color to a small dot indicator
function PatternDot({ colors }) {
  const color = colors && colors[0] ? colors[0] : '#ffffff'
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-0.5"
      style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}` }}
    />
  )
}

function ConceptEntry({ concept }) {
  return (
    <div className="flex gap-2 py-2 border-b border-chrome-subtle last:border-0">
      <PatternDot colors={concept.alienLight?.colors} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-chrome-dim text-xs font-mono leading-tight truncate">
          {concept.label}
        </span>
        <span className="text-chrome-subtle text-xs font-mono opacity-70 leading-tight truncate">
          {concept.playerResponse}
        </span>
      </div>
    </div>
  )
}

function FailedEntry({ attempt }) {
  return (
    <div className="flex gap-2 py-2 border-b border-chrome-subtle last:border-0 opacity-40">
      <span className="inline-block w-2 h-2 rounded-full shrink-0 mt-0.5 bg-signal-red/50" />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-chrome-dim text-xs font-mono leading-tight truncate line-through">
          {attempt.label}
        </span>
        <span className="text-chrome-subtle text-xs font-mono opacity-70 leading-tight truncate">
          {attempt.playerResponse}
        </span>
      </div>
    </div>
  )
}

export default function ClueLog() {
  const [isOpen, setIsOpen] = useState(true)
  const { confirmedConcepts, failedAttempts } = useGame()

  return (
    <motion.div
      className="relative flex flex-col border-l border-chrome-subtle bg-space-deep/40 overflow-hidden shrink-0"
      animate={{ width: isOpen ? 288 : 36 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ minWidth: 36 }}
    >
      {/* Toggle button -- always visible on the left edge */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="absolute top-3 left-0 z-10 w-9 flex items-center justify-center py-1.5 text-chrome-dim hover:text-chrome-subtle transition-colors shrink-0"
        aria-label={isOpen ? 'Collapse clue log' : 'Expand clue log'}
      >
        <span className="text-xs font-mono select-none">
          {isOpen ? '>' : '<'}
        </span>
      </button>

      {/* Sidebar content -- only render when open to avoid layout bleed */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="flex flex-col h-full pl-9 pr-3 pt-3 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="pb-3 border-b border-chrome-subtle shrink-0">
              <span className="text-chrome-dim text-xs font-mono tracking-widest uppercase opacity-60">
                Clue Log
              </span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-3 scrollbar-none">
              {/* Confirmed section */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-signal-green/60 text-xs font-mono tracking-widest uppercase">
                    Confirmed
                  </span>
                  <div className="flex-1 h-px bg-signal-green/20" />
                </div>

                {confirmedConcepts.length === 0 ? (
                  <p className="text-chrome-dim text-xs opacity-30 font-mono italic">
                    None yet
                  </p>
                ) : (
                  <div>
                    {confirmedConcepts.map((concept) => (
                      <ConceptEntry key={concept.id} concept={concept} />
                    ))}
                  </div>
                )}
              </div>

              {/* Failed section */}
              {failedAttempts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-signal-red/40 text-xs font-mono tracking-widest uppercase">
                      Failed
                    </span>
                    <div className="flex-1 h-px bg-signal-red/15" />
                  </div>

                  <div>
                    {failedAttempts.map((attempt) => (
                      <FailedEntry key={attempt.id} attempt={attempt} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
