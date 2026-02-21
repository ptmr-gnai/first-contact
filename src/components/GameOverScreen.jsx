import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const GAMEOVER_LINES = [
  'The signal fades.',
  'Static fills the void.',
  'But you remember the patterns...',
]

const VICTORY_LINES = [
  'The light changes. Softer now.',
  'Two strangers, impossibly far from home.',
  'Choosing to trust each other.',
  'SIGNAL RECEIVED',
]

const LINE_FADE = 1200
const LINE_PAUSE = 1800

export default function GameOverScreen({ type = 'gameover', stats, onRestart, onNewGame }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [showButtons, setShowButtons] = useState(false)

  const lines = type === 'victory' ? VICTORY_LINES : GAMEOVER_LINES
  const isVictory = type === 'victory'

  useEffect(() => {
    let cancelled = false

    async function runSequence() {
      for (let i = 0; i < lines.length; i++) {
        await delay(i === 0 ? 800 : LINE_PAUSE)
        if (cancelled) return
        setVisibleCount(i + 1)
      }
      await delay(2000)
      if (cancelled) return
      setShowButtons(true)
    }

    runSequence()
    return () => { cancelled = true }
  }, [lines.length])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#050505' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Background haze */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isVictory
            ? 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(180, 110, 20, 0.06), transparent 70%)'
            : 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200, 40, 40, 0.04), transparent 70%)',
        }}
      />

      {/* Text content */}
      <div className="flex flex-col items-center gap-6 px-8 max-w-lg w-full relative z-10">
        {lines.map((line, i) => (
          <AnimatePresence key={i}>
            {visibleCount > i && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: LINE_FADE / 1000, ease: 'easeOut' }}
                className="text-center leading-relaxed tracking-widest"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: i === lines.length - 1 ? '1.1rem' : '0.85rem',
                  color: isVictory
                    ? i === lines.length - 1
                      ? 'rgba(130, 230, 150, 0.95)'
                      : 'rgba(200, 155, 80, 0.75)'
                    : i === lines.length - 1
                      ? 'rgba(200, 155, 80, 0.85)'
                      : 'rgba(180, 100, 100, 0.65)',
                  letterSpacing: i === lines.length - 1 ? '0.25em' : '0.12em',
                  textTransform: i === lines.length - 1 ? 'uppercase' : 'none',
                  fontWeight: i === lines.length - 1 ? '400' : '300',
                }}
              >
                {line}
              </motion.p>
            )}
          </AnimatePresence>
        ))}

        {/* Stats (victory only) */}
        {isVictory && showButtons && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="mt-4 text-center font-mono text-xs text-chrome-dim/60 space-y-1"
          >
            {stats.totalSubmissions > 0 && <p>Submissions: {stats.totalSubmissions}</p>}
            {stats.strikes > 0 && <p>Strikes: {stats.strikes}</p>}
            {stats.runNumber > 1 && <p>Run #{stats.runNumber}</p>}
          </motion.div>
        )}

        {/* Action buttons */}
        <AnimatePresence>
          {showButtons && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex gap-4 mt-6"
            >
              <button
                onClick={onRestart}
                className="px-5 py-2 font-mono text-sm tracking-widest uppercase rounded border border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle transition-colors"
              >
                {isVictory ? 'Play Again' : 'Try Again'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vignettes */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}
      />
    </motion.div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
