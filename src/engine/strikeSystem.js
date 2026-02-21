import { STRIKE_LIMIT } from '../constants.js'

/**
 * Adds a strike and returns the new state.
 * @param {number} currentStrikes
 * @returns {{ strikes: number, isGameOver: boolean }}
 */
export function addStrike(currentStrikes) {
  const strikes = currentStrikes + 1
  return { strikes, isGameOver: strikes >= STRIKE_LIMIT }
}

/**
 * Returns whether the player can still use a hint (costs a strike).
 * @param {number} currentStrikes
 * @returns {boolean}
 */
export function canUseHint(currentStrikes) {
  return currentStrikes < STRIKE_LIMIT
}
