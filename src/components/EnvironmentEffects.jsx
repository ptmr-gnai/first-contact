import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

// Deterministic pseudo-random number generator so star positions are stable
// across renders without needing a dependency array with random values.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Beat-level background gradient colors (center -> edge)
const BEAT_GRADIENTS = {
  1: {
    center: 'rgba(10, 10, 30, 0.0)',
    mid: 'rgba(5, 5, 20, 0.6)',
    edge: '#0a0a1a',
    bg: '#0a0a1a',
  },
  2: {
    center: 'rgba(30, 15, 50, 0.0)',
    mid: 'rgba(20, 10, 40, 0.6)',
    edge: '#100d1e',
    bg: '#100d1e',
  },
  3: {
    center: 'rgba(40, 25, 10, 0.0)',
    mid: 'rgba(30, 18, 5, 0.6)',
    edge: '#0f0c06',
    bg: '#0f0c06',
  },
}

// Emotion modifiers: radial overlay color and opacity
const EMOTION_OVERLAYS = {
  curious:   { color: 'rgba(80, 100, 160, 0)',   opacity: 0 },
  excited:   { color: 'rgba(100, 80, 200, 0.08)', opacity: 0.08 },
  frustrated:{ color: 'rgba(20, 10, 10, 0.25)',   opacity: 0.25 },
  hopeful:   { color: 'rgba(200, 140, 40, 0.1)',  opacity: 0.1 },
  grateful:  { color: 'rgba(220, 160, 60, 0.15)', opacity: 0.15 },
}

// Per-emotion brightness modifier for stars
const EMOTION_STAR_OPACITY = {
  curious:    0.55,
  excited:    0.80,
  frustrated: 0.25,
  hopeful:    0.65,
  grateful:   0.75,
}

// Per-beat star base opacity
const BEAT_STAR_OPACITY = {
  1: 0.55,
  2: 0.60,
  3: 0.65,
}

function generateStars(count = 100) {
  const rand = mulberry32(0xdeadbeef)
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,          // percent
    y: rand() * 100,
    r: rand() * 1.2 + 0.4,   // px radius 0.4 -- 1.6
    twinkleDuration: rand() * 4 + 3,  // 3--7s
    twinkleDelay: rand() * 6,
    baseOpacity: rand() * 0.5 + 0.3,  // 0.3 -- 0.8
  }))
}

export default function EnvironmentEffects() {
  const { currentAct, alienEmotion } = useGame()

  const stars = useMemo(() => generateStars(110), [])

  const beatGrad = BEAT_GRADIENTS[currentAct] ?? BEAT_GRADIENTS[1]
  const emotionOverlay = EMOTION_OVERLAYS[alienEmotion] ?? EMOTION_OVERLAYS.curious
  const starOpacity = (BEAT_STAR_OPACITY[currentAct] ?? 0.55)
    * ((EMOTION_STAR_OPACITY[alienEmotion] ?? 0.55) / 0.55)

  // Radial gradient string for the center haze that breathes with mood
  const radialGradient = `radial-gradient(ellipse 60% 55% at 50% 48%, ${beatGrad.center}, ${beatGrad.mid} 55%, ${beatGrad.edge} 100%)`

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base background color -- transitions slowly */}
      <motion.div
        className="absolute inset-0"
        animate={{ backgroundColor: beatGrad.bg }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
      />

      {/* Star field */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {stars.map((star) => (
          <circle
            key={star.id}
            cx={`${star.x}%`}
            cy={`${star.y}%`}
            r={star.r}
            fill="white"
            style={{
              '--star-opacity': star.baseOpacity * starOpacity,
              animation: `starTwinkle ${star.twinkleDuration}s ${star.twinkleDelay}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </svg>

      {/* Radial depth gradient from center */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: radialGradient }}
        transition={{ duration: 2.8, ease: 'easeInOut' }}
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Emotion color overlay -- soft radial haze */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: `radial-gradient(ellipse 70% 60% at 50% 48%, ${emotionOverlay.color}, transparent 70%)`,
          opacity: 1,
        }}
        transition={{ duration: 2.5, ease: 'easeInOut' }}
      />

      {/* Emotion-specific overlays wrapped in AnimatePresence for smooth exit */}
      <AnimatePresence>
        {alienEmotion === 'excited' && (
          <motion.div
            key="excited-overlay"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.06, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(ellipse 50% 45% at 50% 48%, rgba(160, 120, 255, 0.15), transparent 70%)' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alienEmotion === 'frustrated' && (
          <motion.div
            key="frustrated-overlay"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5 }}
            style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alienEmotion === 'grateful' && (
          <motion.div
            key="grateful-overlay"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.65, 0.4] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ background: 'radial-gradient(ellipse 55% 50% at 50% 48%, rgba(240, 180, 60, 0.08), transparent 65%)' }}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes starTwinkle {
          0%   { opacity: var(--star-opacity, 0.4); transform: scale(1); }
          100% { opacity: calc(var(--star-opacity, 0.4) * 0.3); transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}
