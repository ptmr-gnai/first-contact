import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'

/**
 * SignalStrip -- Horizontal strip showing the alien's current color "word"
 * as persistent orbs. Placed between alien display and player controls.
 *
 * Each orb = one color from alienOutput.light.colors, animated in sequentially.
 * Persists until player submits guess or alien sends new pattern.
 */
export default function SignalStrip() {
  const { alienOutput } = useGame()
  const [orbs, setOrbs] = useState([])
  const prevLightRef = useRef(null)

  useEffect(() => {
    const light = alienOutput?.light
    if (!light || !light.colors?.length) {
      // Don't clear immediately -- let orbs persist until new pattern arrives
      return
    }

    // Only update if light actually changed
    if (light === prevLightRef.current) return
    prevLightRef.current = light

    // Animate orbs in sequentially using timing data
    const timings = light.timing || light.colors.map(() => 200)
    const newOrbs = light.colors.map((color, i) => ({
      id: `${Date.now()}-${i}`,
      color,
      delay: timings.slice(0, i).reduce((a, b) => a + b, 0) / 1000,
    }))
    setOrbs(newOrbs)
  }, [alienOutput?.light])

  // Clear orbs when light is explicitly cleared
  useEffect(() => {
    if (!alienOutput?.light && prevLightRef.current) {
      prevLightRef.current = null
      // Keep orbs visible briefly after clearing
      const timer = setTimeout(() => setOrbs([]), 2000)
      return () => clearTimeout(timer)
    }
  }, [alienOutput?.light])

  return (
    <div className="flex items-center justify-center gap-3 h-10 shrink-0">
      {/* Label */}
      <AnimatePresence>
        {orbs.length > 0 && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="text-[9px] font-mono tracking-[0.2em] uppercase text-chrome-dim select-none"
          >
            Signal
          </motion.span>
        )}
      </AnimatePresence>

      {/* Orbs */}
      <div className="flex items-center gap-2">
        <AnimatePresence mode="popLayout">
          {orbs.map((orb) => (
            <motion.span
              key={orb.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                delay: orb.delay,
                type: 'spring',
                stiffness: 400,
                damping: 15,
              }}
              className="inline-block w-3.5 h-3.5 rounded-full"
              style={{
                backgroundColor: orb.color,
                boxShadow: `0 0 8px ${orb.color}, 0 0 16px ${orb.color}40`,
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
