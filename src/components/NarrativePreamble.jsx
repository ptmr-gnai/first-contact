import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LINES = [
  'Long-range sensors detected the anomaly three hours ago.',
  'Your ship\'s drive failed shortly after.',
  'Now something is out there. Watching. Waiting.',
  'It does not speak your language.',
  'But it is trying to communicate.',
  'Listen to the light.',
]

// Each line: fade in over 1s, pause 1.5s, then next line begins.
// After all lines are visible, hold 2s, then fade everything out.
const LINE_FADE_DURATION = 1000   // ms
const LINE_PAUSE        = 1500   // ms between line appearances
const HOLD_AFTER_LAST   = 2000   // ms hold before fadeout
const FADEOUT_DURATION  = 1200   // ms

export default function NarrativePreamble({ onComplete }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [fadingOut, setFadingOut]       = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runSequence() {
      for (let i = 0; i < LINES.length; i++) {
        await delay(i === 0 ? 800 : LINE_PAUSE + LINE_FADE_DURATION * 0.6)
        if (cancelled) return
        setVisibleCount(i + 1)
      }
      await delay(HOLD_AFTER_LAST)
      if (cancelled) return
      setFadingOut(true)
      await delay(FADEOUT_DURATION)
      if (cancelled) return
      onComplete?.()
    }

    runSequence()
    return () => { cancelled = true }
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000000' }}
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: FADEOUT_DURATION / 1000, ease: 'easeInOut' }}
    >
      {/* Subtle top vignette */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}
      />

      <div className="flex flex-col items-center gap-6 px-8 max-w-xl w-full">
        {LINES.map((line, i) => (
          <AnimatePresence key={i}>
            {visibleCount > i && (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: LINE_FADE_DURATION / 1000, ease: 'easeOut' }}
                className="text-center leading-relaxed tracking-widest"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: i === LINES.length - 1 ? '1.05rem' : '0.85rem',
                  color: i === LINES.length - 1
                    ? 'rgba(190, 220, 255, 0.95)'
                    : 'rgba(160, 185, 220, 0.75)',
                  letterSpacing: i === LINES.length - 1 ? '0.2em' : '0.12em',
                  textTransform: i === LINES.length - 1 ? 'uppercase' : 'none',
                  fontWeight: i === LINES.length - 1 ? '500' : '300',
                }}
              >
                {line}
              </motion.p>
            )}
          </AnimatePresence>
        ))}

        {/* Blinking cursor after last line */}
        {visibleCount >= LINES.length && !fadingOut && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'steps(2)' }}
            style={{
              display: 'inline-block',
              width: '0.55em',
              height: '1.1em',
              backgroundColor: 'rgba(160, 212, 239, 0.7)',
              marginTop: '0.25rem',
            }}
          />
        )}
      </div>

      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
      />
    </motion.div>
  )
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
