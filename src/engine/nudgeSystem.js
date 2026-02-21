import { NUDGE_THRESHOLDS, BEATS } from '../constants.js'

/**
 * Returns the nudge level (0-3) based on how long the player has been inactive.
 * 0: no nudge (under 15s)
 * 1: gentle (15-30s)
 * 2: redirect (30-45s)
 * 3: dramatic (45s+)
 *
 * @param {number} timeSinceLastInput - ms since last player input
 * @returns {0|1|2|3}
 */
export function calculateNudgeLevel(timeSinceLastInput) {
  if (timeSinceLastInput >= NUDGE_THRESHOLDS.dramatic) return 3
  if (timeSinceLastInput >= NUDGE_THRESHOLDS.redirect) return 2
  if (timeSinceLastInput >= NUDGE_THRESHOLDS.gentle) return 1
  return 0
}

/**
 * Returns true when the nudge level has increased since the last nudge was sent,
 * preventing the same nudge from firing repeatedly.
 *
 * @param {0|1|2|3} nudgeLevel - current level
 * @param {0|1|2|3} lastNudgeLevel - level at the time of the last sent nudge
 * @returns {boolean}
 */
export function shouldSendNudge(nudgeLevel, lastNudgeLevel) {
  return nudgeLevel > 0 && nudgeLevel > lastNudgeLevel
}

/**
 * Builds a nudge payload to be merged into the next alien API request.
 *
 * @param {1|2|3} nudgeLevel
 * @param {number} currentAct
 * @param {string[]} confirmedConcepts - already-confirmed concept IDs
 * @param {string[]} availableConcepts - concepts the alien is allowed to use this act
 * @returns {{ nudge: boolean, nudgeLevel: number, suggestion: string, availableConcepts: string[] }}
 */
export function buildNudgePayload(nudgeLevel, currentAct, confirmedConcepts, availableConcepts) {
  const beatConfig = BEATS[currentAct] ?? {}
  const beatConcepts = availableConcepts ?? beatConfig.availableConcepts ?? []

  const unconfirmed = beatConcepts.filter(c => !confirmedConcepts.includes(c))

  let suggestion
  let nudgeConcepts

  if (nudgeLevel === 1) {
    suggestion = 'simplify'
    // Keep current concept -- give all available so alien can simplify its presentation
    nudgeConcepts = beatConcepts
  } else if (nudgeLevel === 2) {
    suggestion = 'redirect'
    // Steer toward an unconfirmed concept so the alien tries something fresh
    nudgeConcepts = unconfirmed.length > 0 ? unconfirmed : beatConcepts
  } else {
    suggestion = 'dramatic'
    // For dramatic re-engagement, surface everything available
    nudgeConcepts = beatConcepts
  }

  return {
    nudge: true,
    nudgeLevel,
    suggestion,
    availableConcepts: nudgeConcepts,
  }
}
