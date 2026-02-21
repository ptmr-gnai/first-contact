import { motion } from 'framer-motion'
import { COLORS, CONCEPTS } from '../constants.js'

// Map concept IDs to their primary display color
function getCardColor(conceptId) {
  const concept = CONCEPTS[conceptId]
  if (concept?.light?.colors?.[0]) return concept.light.colors[0]
  return '#6b7280' // gray fallback for decoys
}

export default function ConceptCard({ concept, selected, eliminated, disabled, onClick }) {
  const color = getCardColor(concept.id)
  const isInteractive = !eliminated && !disabled

  return (
    <motion.button
      onClick={isInteractive ? () => onClick?.(concept) : undefined}
      className={[
        'relative flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors font-mono text-xs',
        eliminated
          ? 'opacity-25 pointer-events-none border-chrome-subtle/30'
          : selected
            ? 'border-signal-blue ring-1 ring-signal-blue/40 bg-signal-blue/10 text-chrome-dim'
            : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle',
        disabled && !eliminated ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
      whileHover={isInteractive ? { scale: 1.03 } : {}}
      whileTap={isInteractive ? { scale: 0.97 } : {}}
      layout
    >
      <span
        className="inline-block w-3 h-3 rounded-full shrink-0"
        style={{
          backgroundColor: color,
          boxShadow: selected ? `0 0 8px ${color}` : 'none',
        }}
      />
      <span className={eliminated ? 'line-through' : ''}>
        {concept.label}
      </span>
    </motion.button>
  )
}
