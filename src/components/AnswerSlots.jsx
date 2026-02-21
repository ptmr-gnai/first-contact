import { motion, AnimatePresence } from 'framer-motion'
import { CONCEPTS } from '../constants.js'

function getCardColor(conceptId) {
  const concept = CONCEPTS[conceptId]
  if (concept?.light?.colors?.[0]) return concept.light.colors[0]
  return '#6b7280'
}

export default function AnswerSlots({ slotCount, filledCards = [], onRemoveCard }) {
  const slots = Array.from({ length: slotCount }, (_, i) => filledCards[i] || null)

  return (
    <div className="flex gap-2 justify-center">
      {slots.map((card, i) => (
        <div key={i} className="relative">
          <AnimatePresence mode="wait">
            {card ? (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => onRemoveCard?.(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-signal-blue/50 bg-signal-blue/10 text-chrome-dim font-mono text-xs hover:border-signal-red/50 hover:bg-signal-red/10 transition-colors"
                title="Click to remove"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: getCardColor(card.id) }}
                />
                <span className="truncate max-w-[80px]">{card.label}</span>
              </motion.button>
            ) : (
              <motion.div
                key={`empty-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center w-24 h-8 rounded border border-dashed border-chrome-subtle/40 text-chrome-dim/30 text-xs font-mono"
              >
                <motion.span
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ?
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
