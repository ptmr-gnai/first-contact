import { useGame } from '../context/GameContext'
import { CONCEPTS, CONCEPT_DOT_COLORS, CONCEPT_SHORT_LABELS } from '../constants'

/**
 * ConceptPicker -- Row of concept option buttons for guessing what the alien meant.
 *
 * Shows 2-4 options (correct + distractors). Player taps to guess.
 * Correct guess unlocks the concept. Wrong guess dims the option.
 * Buttons are static (no motion animations) so they're easy to click.
 */
export default function ConceptPicker() {
  const {
    guessOptions,
    guessResult,
    eliminatedGuesses,
    submitGuess,
    isTeaching,
  } = useGame()

  if (!isTeaching || !guessOptions?.length) return null

  return (
    <div className="h-full flex items-center justify-center px-4">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono tracking-[0.15em] uppercase text-chrome-dim/40 mr-2 select-none">
          What did it mean?
        </span>

        {guessOptions.map((conceptId) => {
          const isEliminated = eliminatedGuesses.includes(conceptId)
          const isCorrect = guessResult === 'correct' && !isEliminated
          const dotColor = CONCEPT_DOT_COLORS[conceptId] || '#888'
          const label = CONCEPT_SHORT_LABELS[conceptId] || CONCEPTS[conceptId]?.label || conceptId

          return (
            <button
              key={conceptId}
              onClick={() => {
                if (!isEliminated && guessResult !== 'correct') {
                  submitGuess(conceptId)
                }
              }}
              disabled={isEliminated || guessResult === 'correct'}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono transition-colors duration-200',
                isEliminated
                  ? 'border-chrome-subtle/30 text-chrome-dim/20 cursor-not-allowed opacity-30'
                  : isCorrect
                    ? 'border-signal-green/60 text-signal-green bg-signal-green/10 ring-1 ring-signal-green/30'
                    : 'border-chrome-subtle text-chrome-dim hover:border-chrome-dim hover:text-chrome-subtle hover:bg-white/5 cursor-pointer',
              ].join(' ')}
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: isEliminated ? '#555' : dotColor,
                  boxShadow: isEliminated ? 'none' : `0 0 4px ${dotColor}`,
                }}
              />
              <span className={isEliminated ? 'line-through' : ''}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
