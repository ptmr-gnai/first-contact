import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ACTS } from '../constants.js'

const ACT_FLAVOR = {
  2: 'The alien responds. A bridge between two minds.',
  3: 'Understanding deepens. Now -- the plan.',
}

export default function ActTransition({ fromAct, toAct, onComplete }) {
  const actConfig = ACTS[toAct] || ACTS[1]
  const flavor = ACT_FLAVOR[toAct] || ''

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      {/* Act number */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="text-center tracking-[0.3em] uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'rgba(160, 185, 220, 0.5)',
          fontWeight: '300',
        }}
      >
        Act {toAct}
      </motion.p>

      {/* Act name */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="text-center mt-3 tracking-widest"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.2rem',
          color: 'rgba(200, 155, 80, 0.85)',
          letterSpacing: '0.2em',
          fontWeight: '400',
          textTransform: 'uppercase',
        }}
      >
        {actConfig.name}
      </motion.h2>

      {/* Flavor text */}
      {flavor && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.2 }}
          className="text-center mt-6 max-w-md px-8"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.82rem',
            color: 'rgba(160, 185, 220, 0.6)',
            letterSpacing: '0.1em',
            fontWeight: '300',
            lineHeight: '1.7',
          }}
        >
          {flavor}
        </motion.p>
      )}

      {/* Vignettes */}
      <div
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
      />
    </motion.div>
  )
}
