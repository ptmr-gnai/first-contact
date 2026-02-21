import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LINES = [
  'The light changes. Softer now. Familiar.',
  'You understand each other.',
  'It shares its coordinates. A heading. A path home.',
  'As the distance grows, one final pulse.',
  'Three short green flashes.',
  'Yes.',
]

const LINE_FADE_DURATION  = 1400  // ms
const LINE_PAUSE          = 2200  // ms between line appearances
const HOLD_AFTER_LAST     = 2500  // ms hold before green glow
const GREEN_HOLD          = 3000  // ms for green glow
const FINAL_FADE_DURATION = 2000  // ms fade to black

// Amber-gold color scale per line index for a gradual warmth
const LINE_COLORS = [
  'rgba(200, 155, 80, 0.65)',
  'rgba(210, 165, 90, 0.75)',
  'rgba(215, 170, 95, 0.80)',
  'rgba(220, 175, 100, 0.80)',
  'rgba(200, 220, 160, 0.85)',   // slight green tint approaching the finale
  'rgba(130, 230, 150, 0.95)',   // final "Yes." in soft green
]

const LINE_LETTER_SPACING = [
  '0.10em',
  '0.12em',
  '0.10em',
  '0.12em',
  '0.14em',
  '0.30em',
]

const LINE_FONT_SIZE = [
  '0.82rem',
  '0.88rem',
  '0.82rem',
  '0.85rem',
  '0.90rem',
  '1.30rem',
]

export default function Resolution({ onComplete }) {
  const [visibleCount, setVisibleCount]   = useState(0)
  const [showGreenGlow, setShowGreenGlow] = useState(false)
  const [fadingOut, setFadingOut]         = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runSequence() {
      for (let i = 0; i < LINES.length; i++) {
        await delay(i === 0 ? 1000 : LINE_PAUSE + LINE_FADE_DURATION * 0.5)
        if (cancelled) return
        setVisibleCount(i + 1)
      }

      await delay(HOLD_AFTER_LAST)
      if (cancelled) return
      setShowGreenGlow(true)

      await delay(GREEN_HOLD)
      if (cancelled) return
      setFadingOut(true)

      await delay(FINAL_FADE_DURATION)
      if (cancelled) return
      onComplete?.()
    }

    runSequence()
    return () => { cancelled = true }
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#050505' }}
      animate={{ opacity: fadingOut ? 0 : 1 }}
      transition={{ duration: FINAL_FADE_DURATION / 1000, ease: 'easeInOut' }}
    >
      {/* Warm ambient background haze */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: visibleCount >= LINES.length
            ? 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(180, 110, 20, 0.08), transparent 70%)'
            : 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(120, 70, 10, 0.04), transparent 70%)',
        }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />

      {/* Final green glow overlay */}
      <AnimatePresence>
        {showGreenGlow && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.35, 0.20, 0.35, 0.20, 0.35, 0] }}
            transition={{
              duration: GREEN_HOLD / 1000,
              times: [0, 0.15, 0.28, 0.42, 0.56, 0.70, 1],
              ease: 'easeInOut',
            }}
            style={{
              background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(74, 222, 128, 0.3), transparent 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Top vignette */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)' }}
      />

      {/* Text content */}
      <div className="flex flex-col items-center gap-7 px-8 max-w-lg w-full relative z-10">
        {LINES.map((line, i) => (
          <AnimatePresence key={i}>
            {visibleCount > i && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: LINE_FADE_DURATION / 1000,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="text-center leading-loose"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: LINE_FONT_SIZE[i],
                  color: LINE_COLORS[i],
                  letterSpacing: LINE_LETTER_SPACING[i],
                  fontWeight: i === LINES.length - 1 ? '400' : '300',
                  textTransform: i === LINES.length - 1 ? 'uppercase' : 'none',
                }}
              >
                {line}
              </motion.p>
            )}
          </AnimatePresence>
        ))}

        {/* Three green pulse indicators after last line */}
        {visibleCount >= LINES.length && !showGreenGlow && (
          <motion.div
            className="flex gap-3 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            {[0, 1, 2].map((dot) => (
              <motion.div
                key={dot}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: '#4ade80',
                  boxShadow: '0 0 8px 2px rgba(74, 222, 128, 0.6)',
                }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{
                  duration: 0.5,
                  delay: dot * 0.4,
                  repeat: 3,
                  repeatDelay: 1.5,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Bottom vignette */}
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}
      />
    </motion.div>
  )
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
