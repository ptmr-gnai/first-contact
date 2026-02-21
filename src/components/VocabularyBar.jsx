import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { CONCEPTS, CONCEPT_DOT_COLORS, CONCEPT_SHORT_LABELS } from '../constants'

/**
 * VocabularyBar -- Persistent top bar showing confirmed/unlocked concepts.
 * Each concept shows a colored dot, label, and mini orb sequence representing
 * the alien's "word" for that concept.
 */
export default function VocabularyBar() {
  const { confirmedConcepts } = useGame()

  if (!confirmedConcepts.length) return null

  return (
    <div className="flex items-center gap-1 px-4 h-8 shrink-0 overflow-x-auto scrollbar-none">
      <AnimatePresence>
        {confirmedConcepts.map((concept) => {
          const conceptDef = CONCEPTS[concept.id]
          const dotColor = CONCEPT_DOT_COLORS[concept.id] || '#888'
          const label = CONCEPT_SHORT_LABELS[concept.id] || concept.label
          const wordColors = conceptDef?.light?.colors || []

          return (
            <motion.div
              key={concept.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-chrome-subtle/40 bg-space-deep/60 shrink-0"
            >
              {/* Main dot */}
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: dotColor,
                  boxShadow: `0 0 4px ${dotColor}`,
                }}
              />

              {/* Label */}
              <span className="text-[10px] font-mono text-chrome-dim tracking-wide">
                {label}
              </span>

              {/* Mini word orbs */}
              <span className="flex gap-0.5 ml-0.5">
                {wordColors.slice(0, 5).map((c, i) => (
                  <span
                    key={i}
                    className="inline-block w-1 h-1 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
