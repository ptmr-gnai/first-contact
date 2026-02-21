import { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

// ---------------------------------------------------------------------------
// Emotion configuration: each key maps to visual properties that Framer Motion
// will interpolate smoothly between.
// ---------------------------------------------------------------------------
const EMOTION_CONFIG = {
  curious: {
    glowColor: '#7eb8da',
    glowIntensity: 0.55,
    scale: [0.98, 1.02, 0.98],
    floatY: [-3, 3, -3],
    rotateZ: [-0.5, 0.5, -0.5],
    transitionDuration: 4,
    filterBlur: 12,
    coreOpacity: 0.7,
    brightOpacity: 0.3,
  },
  excited: {
    glowColor: '#c8e8f8',
    glowIntensity: 0.9,
    scale: [1.0, 1.15, 1.0],
    floatY: [-6, 6, -6],
    rotateZ: [-2, 2, -2],
    transitionDuration: 1.6,
    filterBlur: 20,
    coreOpacity: 0.95,
    brightOpacity: 0.7,
  },
  frustrated: {
    glowColor: '#5a7a8a',
    glowIntensity: 0.25,
    scale: [0.9, 0.92, 0.9],
    floatY: [-1, 1, -1],
    rotateZ: [0, 0, 0],
    transitionDuration: 6,
    filterBlur: 6,
    coreOpacity: 0.4,
    brightOpacity: 0.1,
  },
  hopeful: {
    glowColor: '#f5c842',
    glowIntensity: 0.7,
    scale: [1.0, 1.06, 1.0],
    floatY: [-2, 4, -2],
    rotateZ: [-0.3, 0.3, -0.3],
    transitionDuration: 3,
    filterBlur: 16,
    coreOpacity: 0.8,
    brightOpacity: 0.5,
  },
  grateful: {
    glowColor: '#f8e8c8',
    glowIntensity: 0.95,
    scale: [1.08, 1.12, 1.08],
    floatY: [-2, 2, -2],
    rotateZ: [-0.2, 0.2, -0.2],
    transitionDuration: 5,
    filterBlur: 24,
    coreOpacity: 0.9,
    brightOpacity: 0.8,
  },
}

// ---------------------------------------------------------------------------
// Detect which of the 7 predefined light patterns is being played based on the
// light object's shape (colors, timing, direction).
// ---------------------------------------------------------------------------
function identifyPattern(light) {
  if (!light || !light.colors || light.colors.length === 0) return null

  const firstColor = light.colors[0]
  const direction = light.direction

  // Yes: 3 green pulses
  if (firstColor === '#4ade80' && light.colors.length === 3) return 'yes'
  // No: sustained red
  if (firstColor === '#ef4444') return 'no'
  // Self vs Other: blue with direction
  if (firstColor === '#60a5fa' && direction === 'inward') return 'self'
  if (firstColor === '#60a5fa' && direction === 'outward') return 'other'
  if (firstColor === '#60a5fa') return 'self' // fallback blue
  // Energy: rapid yellow
  if (firstColor === '#facc15') return 'energy'
  // Direction: white sweep
  if (firstColor === '#e2e8f0') return 'direction'
  // Home: amber
  if (firstColor === '#f59e0b') return 'home'

  return null
}

// ---------------------------------------------------------------------------
// Total duration of a pattern (sum of timing array)
// ---------------------------------------------------------------------------
function patternDuration(light) {
  if (!light || !light.timing) return 1500
  return light.timing.reduce((a, b) => a + b, 0)
}

// ---------------------------------------------------------------------------
// Light pattern animation components.
// Each renders SVG elements layered around the alien at center (200, 200).
// ---------------------------------------------------------------------------

function YesPulses() {
  // Three sequential expanding green rings
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="200"
          cy="200"
          r="40"
          fill="none"
          stroke="#4ade80"
          strokeWidth="3"
          initial={{ r: 40, opacity: 0, strokeWidth: 3 }}
          animate={{
            r: [40, 120],
            opacity: [0.9, 0],
            strokeWidth: [3, 0.5],
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.22,
            ease: 'easeOut',
          }}
        />
      ))}
      <motion.circle
        cx="200"
        cy="200"
        r="60"
        fill="#4ade80"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0, 0.15, 0, 0.15, 0] }}
        transition={{ duration: 0.66, ease: 'linear' }}
      />
    </>
  )
}

function NoDanger() {
  return (
    <>
      <motion.circle
        cx="200"
        cy="200"
        r="90"
        fill="url(#redGlow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.6, 0.7, 0.5] }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="200"
        cy="200"
        r="130"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0.25, 0.3, 0] }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />
    </>
  )
}

function SelfInward() {
  // Blue rings contract inward toward center
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="200"
          cy="200"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          initial={{ r: 140 - i * 15, opacity: 0 }}
          animate={{
            r: [140 - i * 15, 35],
            opacity: [0.7, 0],
            strokeWidth: [2, 4],
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.15,
            ease: 'easeIn',
          }}
        />
      ))}
      <motion.circle
        cx="200"
        cy="200"
        r="50"
        fill="#60a5fa"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.25, 0] }}
        transition={{ duration: 0.8, ease: 'easeIn' }}
      />
    </>
  )
}

function OtherOutward() {
  // Blue rings expand outward from center
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx="200"
          cy="200"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          initial={{ r: 35, opacity: 0 }}
          animate={{
            r: [35, 150 + i * 10],
            opacity: [0.8, 0],
            strokeWidth: [3, 0.5],
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.18,
            ease: 'easeOut',
          }}
        />
      ))}
      <motion.circle
        cx="200"
        cy="200"
        r="50"
        fill="#60a5fa"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.2, 0] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </>
  )
}

function EnergyFlicker() {
  // Rapid stroboscopic yellow flashes
  return (
    <>
      <motion.circle
        cx="200"
        cy="200"
        r="70"
        fill="#facc15"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.8, 0.1, 0.9, 0.05, 0.85, 0.1, 0.9, 0.05, 0.7, 0],
        }}
        transition={{ duration: 0.5, ease: 'linear' }}
      />
      {[0, 1, 2, 3].map((i) => (
        <motion.line
          key={i}
          x1="200"
          y1="200"
          x2={200 + Math.cos((i * Math.PI) / 2) * 120}
          y2={200 + Math.sin((i * Math.PI) / 2) * 120}
          stroke="#facc15"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{
            opacity: [0, 0.7, 0, 0.8, 0, 0.6, 0],
            pathLength: [0, 1, 0.2, 1, 0, 0.8, 0],
          }}
          transition={{
            duration: 0.5,
            delay: i * 0.04,
            ease: 'linear',
          }}
        />
      ))}
    </>
  )
}

function DirectionSweep() {
  // Sweeping white arc
  return (
    <>
      <motion.path
        d="M 200 200 L 320 200 A 120 120 0 0 1 200 80"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1], opacity: [0.8, 0] }}
        transition={{ duration: 1.0, ease: 'easeInOut' }}
      />
      <motion.path
        d="M 200 200 L 80 200 A 120 120 0 0 1 200 320"
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1], opacity: [0.5, 0] }}
        transition={{ duration: 1.0, delay: 0.2, ease: 'easeInOut' }}
      />
      {/* Sweeping point of light */}
      <motion.circle
        r="5"
        fill="#e2e8f0"
        filter="url(#whiteBlur)"
        initial={{ cx: 320, cy: 200, opacity: 0 }}
        animate={{
          cx: [320, 270, 200],
          cy: [200, 100, 80],
          opacity: [0.9, 0.7, 0],
        }}
        transition={{ duration: 1.0, ease: 'easeInOut' }}
      />
    </>
  )
}

function HomePulse() {
  // Gentle slow-breathing amber glow
  return (
    <>
      <motion.circle
        cx="200"
        cy="200"
        r="80"
        fill="url(#amberGlow)"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.4, 0.25, 0.45, 0.2, 0.35, 0],
          r: [70, 90, 75, 95, 70, 85, 70],
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="200"
        cy="200"
        r="55"
        fill="#f59e0b"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.2, 0.12, 0.22, 0.1, 0.18, 0],
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
    </>
  )
}

// Map pattern IDs to components
const PATTERN_COMPONENTS = {
  yes: YesPulses,
  no: NoDanger,
  self: SelfInward,
  other: OtherOutward,
  energy: EnergyFlicker,
  direction: DirectionSweep,
  home: HomePulse,
}

// ---------------------------------------------------------------------------
// Alien geometry builder -- generates the SVG paths for the crystalline form.
// Centered at (200, 200) in a 400x400 viewBox.
// ---------------------------------------------------------------------------

function AlienGeometry({ emotionConfig, emotion }) {
  const cfg = emotionConfig

  // Build layered geometric crystalline alien form
  // Central diamond/octahedron with radiating facets
  return (
    <g>
      {/* Outer faceted ring -- 8 triangular facets */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8
        const nextAngle = ((i + 1) * Math.PI * 2) / 8
        const outerR = 56
        const innerR = 38
        const x1 = 200 + Math.cos(angle) * outerR
        const y1 = 200 + Math.sin(angle) * outerR
        const x2 = 200 + Math.cos(nextAngle) * outerR
        const y2 = 200 + Math.sin(nextAngle) * outerR
        const mx = 200 + Math.cos((angle + nextAngle) / 2) * innerR
        const my = 200 + Math.sin((angle + nextAngle) / 2) * innerR

        return (
          <motion.path
            key={`facet-${i}`}
            d={`M ${x1} ${y1} L ${x2} ${y2} L ${mx} ${my} Z`}
            fill={cfg.glowColor}
            stroke={cfg.glowColor}
            strokeWidth="0.5"
            initial={false}
            animate={{
              opacity: cfg.coreOpacity * 0.35,
              fillOpacity: 0.15 + (i % 2) * 0.08,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )
      })}

      {/* Inner crystalline core -- nested hexagon */}
      <motion.polygon
        points={(() => {
          const pts = []
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6 - Math.PI / 2
            pts.push(
              `${200 + Math.cos(angle) * 30},${200 + Math.sin(angle) * 30}`
            )
          }
          return pts.join(' ')
        })()}
        fill={cfg.glowColor}
        stroke={cfg.glowColor}
        strokeWidth="1"
        initial={false}
        animate={{
          opacity: cfg.coreOpacity * 0.6,
          fillOpacity: 0.25,
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Innermost diamond */}
      <motion.polygon
        points="200,182 218,200 200,218 182,200"
        fill={cfg.glowColor}
        stroke={cfg.glowColor}
        strokeWidth="1.5"
        initial={false}
        animate={{
          opacity: cfg.coreOpacity * 0.85,
          fillOpacity: 0.4,
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Central bright point */}
      <motion.circle
        cx="200"
        cy="200"
        r="6"
        fill={cfg.glowColor}
        initial={false}
        animate={{
          opacity: cfg.brightOpacity,
        }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      />

      {/* Radiating spines -- thin lines extending outward */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12
        const innerLen = 60
        const outerLen = 72 + (i % 3) * 8
        return (
          <motion.line
            key={`spine-${i}`}
            x1={200 + Math.cos(angle) * innerLen}
            y1={200 + Math.sin(angle) * innerLen}
            x2={200 + Math.cos(angle) * outerLen}
            y2={200 + Math.sin(angle) * outerLen}
            stroke={cfg.glowColor}
            strokeWidth="1"
            strokeLinecap="round"
            initial={false}
            animate={{
              opacity: cfg.coreOpacity * 0.3,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )
      })}

      {/* Small satellite nodes at spine tips -- every other spine */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 6
        const dist = 76 + (i % 2) * 6
        return (
          <motion.circle
            key={`node-${i}`}
            cx={200 + Math.cos(angle) * dist}
            cy={200 + Math.sin(angle) * dist}
            r="2.5"
            fill={cfg.glowColor}
            initial={false}
            animate={{
              opacity: cfg.coreOpacity * 0.5,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )
      })}

      {/* Connecting lattice lines between inner hex and outer facets */}
      {Array.from({ length: 6 }).map((_, i) => {
        const innerAngle = (i * Math.PI * 2) / 6 - Math.PI / 2
        const outerAngle = (i * Math.PI * 2) / 6 - Math.PI / 2 + Math.PI / 12
        return (
          <motion.line
            key={`lattice-${i}`}
            x1={200 + Math.cos(innerAngle) * 30}
            y1={200 + Math.sin(innerAngle) * 30}
            x2={200 + Math.cos(outerAngle) * 56}
            y2={200 + Math.sin(outerAngle) * 56}
            stroke={cfg.glowColor}
            strokeWidth="0.5"
            initial={false}
            animate={{
              opacity: cfg.coreOpacity * 0.2,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
        )
      })}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AlienDisplay() {
  const { alienEmotion, alienOutput, clearLightPattern } = useGame()

  const [activePattern, setActivePattern] = useState(null)
  const patternTimeoutRef = useRef(null)
  const prevLightRef = useRef(null)

  const emotion = alienEmotion || 'curious'
  const emotionCfg = EMOTION_CONFIG[emotion] || EMOTION_CONFIG.curious

  // Memoize the glow style so we don't recalc every render
  const glowFilter = useMemo(
    () =>
      `drop-shadow(0 0 ${emotionCfg.filterBlur}px ${emotionCfg.glowColor})`,
    [emotionCfg.filterBlur, emotionCfg.glowColor]
  )

  // ------- Light pattern lifecycle -------
  useEffect(() => {
    const light = alienOutput?.light

    // Only trigger on actual new light data
    if (light && light !== prevLightRef.current) {
      prevLightRef.current = light

      const patternId = identifyPattern(light)
      if (patternId) {
        // Clear any existing timeout
        if (patternTimeoutRef.current) {
          clearTimeout(patternTimeoutRef.current)
        }

        setActivePattern(patternId)

        // Auto-clear after pattern duration + a little buffer
        const duration = patternDuration(light) + 600
        patternTimeoutRef.current = setTimeout(() => {
          setActivePattern(null)
          clearLightPattern()
          patternTimeoutRef.current = null
        }, duration)
      }
    }

    // If light was cleared externally
    if (!light && prevLightRef.current) {
      prevLightRef.current = null
      if (patternTimeoutRef.current) {
        clearTimeout(patternTimeoutRef.current)
        patternTimeoutRef.current = null
      }
      setActivePattern(null)
    }
  }, [alienOutput?.light, clearLightPattern])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (patternTimeoutRef.current) {
        clearTimeout(patternTimeoutRef.current)
      }
    }
  }, [])

  const PatternComponent = activePattern
    ? PATTERN_COMPONENTS[activePattern]
    : null

  return (
    <div className="flex items-center justify-center flex-1 relative">
      <motion.div
        className="relative"
        style={{ width: 300, height: 300 }}
        animate={{ filter: glowFilter }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        <svg
          viewBox="0 0 400 400"
          width="300"
          height="300"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          {/* ---------- SVG Defs: gradients & filters ---------- */}
          <defs>
            {/* Alien core glow gradient */}
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor={emotionCfg.glowColor}
                stopOpacity="0.4"
              />
              <stop
                offset="70%"
                stopColor={emotionCfg.glowColor}
                stopOpacity="0.08"
              />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Red glow for No/Danger */}
            <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* Amber glow for Home */}
            <radialGradient id="amberGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>

            {/* White blur filter for Direction sweep point */}
            <filter id="whiteBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>

            {/* General soft glow filter */}
            <filter
              id="softGlow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>
          </defs>

          {/* ---------- Ambient glow field behind alien ---------- */}
          <motion.circle
            cx="200"
            cy="200"
            r="100"
            fill="url(#coreGlow)"
            initial={false}
            animate={{
              opacity: emotionCfg.glowIntensity,
              r: [95, 105, 95],
            }}
            transition={{
              opacity: { duration: 0.8, ease: 'easeInOut' },
              r: {
                duration: emotionCfg.transitionDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          />

          {/* ---------- Light pattern layer (behind alien) ---------- */}
          <AnimatePresence mode="wait">
            {PatternComponent && (
              <motion.g
                key={activePattern}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <PatternComponent />
              </motion.g>
            )}
          </AnimatePresence>

          {/* ---------- Alien body group ---------- */}
          <motion.g
            initial={false}
            animate={{
              scale: emotionCfg.scale,
              y: emotionCfg.floatY,
              rotate: emotionCfg.rotateZ,
            }}
            transition={{
              scale: {
                duration: emotionCfg.transitionDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              y: {
                duration: emotionCfg.transitionDuration,
                repeat: Infinity,
                ease: 'easeInOut',
              },
              rotate: {
                duration: emotionCfg.transitionDuration * 1.3,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            style={{ originX: '200px', originY: '200px' }}
          >
            {/* Soft blurred glow layer underneath geometry */}
            <motion.circle
              cx="200"
              cy="200"
              r="45"
              fill={emotionCfg.glowColor}
              filter="url(#softGlow)"
              initial={false}
              animate={{
                opacity: emotionCfg.glowIntensity * 0.35,
              }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />

            {/* Main alien geometry */}
            <AlienGeometry emotionConfig={emotionCfg} emotion={emotion} />

            {/* Rotating inner ring -- slow ambient spin */}
            <motion.g
              animate={{ rotate: 360 }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ originX: '200px', originY: '200px' }}
            >
              <motion.ellipse
                cx="200"
                cy="200"
                rx="42"
                ry="42"
                fill="none"
                stroke={emotionCfg.glowColor}
                strokeWidth="0.5"
                strokeDasharray="4 8"
                initial={false}
                animate={{ opacity: emotionCfg.coreOpacity * 0.3 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </motion.g>

            {/* Counter-rotating outer ring */}
            <motion.g
              animate={{ rotate: -360 }}
              transition={{
                duration: 50,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ originX: '200px', originY: '200px' }}
            >
              <motion.ellipse
                cx="200"
                cy="200"
                rx="65"
                ry="65"
                fill="none"
                stroke={emotionCfg.glowColor}
                strokeWidth="0.3"
                strokeDasharray="2 14"
                initial={false}
                animate={{ opacity: emotionCfg.coreOpacity * 0.2 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </motion.g>

            {/* Pulsing halo ring */}
            <motion.circle
              cx="200"
              cy="200"
              r="85"
              fill="none"
              stroke={emotionCfg.glowColor}
              strokeWidth="0.5"
              initial={false}
              animate={{
                opacity: [
                  emotionCfg.coreOpacity * 0.1,
                  emotionCfg.coreOpacity * 0.25,
                  emotionCfg.coreOpacity * 0.1,
                ],
                r: [82, 88, 82],
              }}
              transition={{
                duration: emotionCfg.transitionDuration * 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  )
}
