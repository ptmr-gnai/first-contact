import { ACTS, ACT_SOLUTIONS } from '../constants.js'

/**
 * Determines if the game should advance to the next act.
 * @param {number} currentAct
 * @param {boolean} answerCorrect
 * @returns {{ shouldAdvance: boolean, nextAct: number|null }}
 */
export function shouldAdvanceAct(currentAct, answerCorrect) {
  if (!answerCorrect) return { shouldAdvance: false, nextAct: null }
  if (currentAct >= 3) return { shouldAdvance: false, nextAct: null }
  return { shouldAdvance: true, nextAct: currentAct + 1 }
}

/**
 * Returns true if act 3 was just answered correctly (victory).
 * @param {number} currentAct
 * @param {boolean} answerCorrect
 * @returns {boolean}
 */
export function shouldTriggerVictory(currentAct, answerCorrect) {
  return currentAct === 3 && answerCorrect
}

/**
 * Returns config for a given act number.
 * @param {number} actNumber
 * @returns {{ slotCount: number, name: string, solution: string[] }}
 */
export function getActConfig(actNumber) {
  const act = ACTS[actNumber] || ACTS[1]
  const solution = ACT_SOLUTIONS[actNumber] || []
  return { ...act, solution }
}

/**
 * Returns whether the player has solved this act in a previous run.
 * @param {object} actSolvedBefore - { 1: bool, 2: bool, 3: bool }
 * @param {number} currentAct
 * @returns {boolean}
 */
export function isRepeatRun(actSolvedBefore, currentAct) {
  return !!actSolvedBefore?.[currentAct]
}
