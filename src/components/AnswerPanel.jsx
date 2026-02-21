import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { getAvailableCards } from '../engine/answerValidation.js'
import { canUseHint } from '../engine/strikeSystem.js'
import { getActConfig } from '../engine/actProgression.js'
import ConceptCard from './ConceptCard'
import AnswerSlots from './AnswerSlots'
import StrikeIndicator from './StrikeIndicator'

export default function AnswerPanel() {
  const {
    currentAct,
    strikes,
    eliminatedCards,
    answerPanelOpen,
    toggleAnswerPanel,
    submitAnswer,
    useHint,
  } = useGame()

  const [selectedCards, setSelectedCards] = useState([])
  const [confirmHint, setConfirmHint] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null

  const actConfig = getActConfig(currentAct)
  const availableCards = getAvailableCards(eliminatedCards)
  const hintAllowed = canUseHint(strikes)

  const handleSelectCard = useCallback((card) => {
    setSelectedCards(prev => {
      if (prev.some(c => c.id === card.id)) return prev
      if (prev.length >= actConfig.slotCount) return prev
      return [...prev, card]
    })
    setFeedback(null)
  }, [actConfig.slotCount])

  const handleRemoveCard = useCallback((index) => {
    setSelectedCards(prev => prev.filter((_, i) => i !== index))
    setFeedback(null)
  }, [])

  const handleClear = useCallback(() => {
    setSelectedCards([])
    setFeedback(null)
  }, [])

  const handleSubmit = useCallback(() => {
    if (selectedCards.length !== actConfig.slotCount) return
    const ids = selectedCards.map(c => c.id)
    submitAnswer(ids)
    // Feedback will come from gamePhase changes; clear local state
    setSelectedCards([])
    setFeedback(null)
  }, [selectedCards, actConfig.slotCount, submitAnswer])

  const handleHintRequest = useCallback(() => {
    if (!hintAllowed) return
    if (!confirmHint) {
      setConfirmHint(true)
      return
    }
    useHint()
    setConfirmHint(false)
  }, [hintAllowed, confirmHint, useHint])

  const handleHintCancel = useCallback(() => {
    setConfirmHint(false)
  }, [])

  const selectedIds = new Set(selectedCards.map(c => c.id))

  return (
    <>
      {/* Toggle button -- always visible */}
      {!answerPanelOpen && (
        <motion.button
          onClick={toggleAnswerPanel}
          className="fixed bottom-36 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 font-mono text-xs tracking-widest uppercase rounded-t border border-b-0 border-chrome-subtle bg-space-deep/80 text-chrome-dim hover:text-chrome-subtle hover:border-chrome-dim transition-colors backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Ready to Answer
        </motion.button>
      )}

      {/* Panel overlay */}
      <AnimatePresence>
        {answerPanelOpen && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col bg-space-deep/95 backdrop-blur-md border-t border-chrome-subtle"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ maxHeight: '70vh' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-chrome-subtle/50">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tracking-widest uppercase text-chrome-dim/60">
                  Act {currentAct}: {actConfig.name}
                </span>
                <StrikeIndicator strikes={strikes} />
              </div>
              <button
                onClick={toggleAnswerPanel}
                className="font-mono text-xs text-chrome-dim/50 hover:text-chrome-dim transition-colors px-2 py-1"
              >
                Close
              </button>
            </div>

            {/* Answer slots */}
            <div className="px-4 py-3 border-b border-chrome-subtle/30">
              <AnswerSlots
                slotCount={actConfig.slotCount}
                filledCards={selectedCards}
                onRemoveCard={handleRemoveCard}
              />
            </div>

            {/* Card grid */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
                {availableCards.map(card => (
                  <ConceptCard
                    key={card.id}
                    concept={card}
                    selected={selectedIds.has(card.id)}
                    eliminated={eliminatedCards.includes(card.id)}
                    disabled={selectedCards.length >= actConfig.slotCount && !selectedIds.has(card.id)}
                    onClick={handleSelectCard}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-chrome-subtle/30">
              <button
                onClick={handleClear}
                className="px-3 py-1.5 font-mono text-xs tracking-widest uppercase rounded border border-chrome-subtle text-chrome-dim/50 hover:text-chrome-dim hover:border-chrome-dim transition-colors"
              >
                Clear
              </button>

              {confirmHint ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-signal-red/70">Costs 1 strike</span>
                  <button
                    onClick={handleHintRequest}
                    className="px-3 py-1.5 font-mono text-xs tracking-widest uppercase rounded border border-signal-red/50 text-signal-red/70 hover:border-signal-red hover:text-signal-red transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={handleHintCancel}
                    className="px-3 py-1.5 font-mono text-xs tracking-widest uppercase rounded border border-chrome-subtle text-chrome-dim/50 hover:text-chrome-dim transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleHintRequest}
                  disabled={!hintAllowed}
                  className={[
                    'px-3 py-1.5 font-mono text-xs tracking-widest uppercase rounded border transition-colors',
                    hintAllowed
                      ? 'border-signal-blue/40 text-signal-blue/60 hover:border-signal-blue hover:text-signal-blue'
                      : 'border-chrome-subtle/30 text-chrome-dim/20 cursor-not-allowed',
                  ].join(' ')}
                >
                  Hint
                </button>
              )}

              <button
                onClick={handleSubmit}
                disabled={selectedCards.length !== actConfig.slotCount}
                className={[
                  'px-5 py-1.5 font-mono text-xs tracking-widest uppercase rounded border transition-colors',
                  selectedCards.length === actConfig.slotCount
                    ? 'border-signal-green/50 text-signal-green bg-signal-green/10 hover:border-signal-green hover:bg-signal-green/20'
                    : 'border-chrome-subtle/30 text-chrome-dim/20 cursor-not-allowed',
                ].join(' ')}
              >
                Submit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
