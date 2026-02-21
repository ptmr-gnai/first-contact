import { ALL_CARDS, ACT_SOLUTIONS, HINT_ELIMINATES } from '../constants.js'

/**
 * Validates whether the submitted card IDs match the solution for the current act.
 * @param {string[]} submittedCardIds - Array of card IDs the player selected
 * @param {number} currentAct - Current act number (1, 2, or 3)
 * @returns {{ correct: boolean, expected: string[], submitted: string[] }}
 */
export function validateAnswer(submittedCardIds, currentAct) {
  const expected = ACT_SOLUTIONS[currentAct] || []
  const submitted = [...submittedCardIds].sort()
  const sortedExpected = [...expected].sort()

  const correct =
    submitted.length === sortedExpected.length &&
    submitted.every((id, i) => id === sortedExpected[i])

  return { correct, expected, submitted: submittedCardIds }
}

/**
 * Returns available cards (ALL_CARDS minus eliminated), in shuffled order.
 * @param {string[]} eliminatedCards - IDs of eliminated cards
 * @returns {Array<{ id: string, label: string, isDecoy: boolean }>}
 */
export function getAvailableCards(eliminatedCards = []) {
  const eliminated = new Set(eliminatedCards)
  const available = ALL_CARDS.filter(c => !eliminated.has(c.id))
  // Fisher-Yates shuffle
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[available[i], available[j]] = [available[j], available[i]]
  }
  return available
}

/**
 * Returns card IDs to eliminate as a hint. Never eliminates correct answers.
 * @param {number} currentAct - Current act number
 * @param {string[]} eliminatedCards - Already eliminated card IDs
 * @returns {string[]} Card IDs to eliminate (up to HINT_ELIMINATES)
 */
export function getHintEliminations(currentAct, eliminatedCards = []) {
  const solution = new Set(ACT_SOLUTIONS[currentAct] || [])
  const eliminated = new Set(eliminatedCards)

  const candidates = ALL_CARDS
    .filter(c => !solution.has(c.id) && !eliminated.has(c.id))

  // Shuffle candidates before slicing
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  return candidates.slice(0, HINT_ELIMINATES).map(c => c.id)
}
