import { CONCEPTS, COLORS, BEAT_ADVANCE, BEATS, TIMING_TOLERANCE } from '../constants.js'

// Invert COLORS map: hex -> name
const HEX_TO_COLOR_NAME = Object.fromEntries(
  Object.entries(COLORS).map(([name, hex]) => [hex.toLowerCase(), name])
)

/**
 * Returns the full concept object for a given concept ID.
 * @param {string} conceptId
 * @returns {object|null}
 */
export function lookupConcept(conceptId) {
  return CONCEPTS[conceptId] ?? null
}

/**
 * Resolves a list of hex color strings to color names using the COLORS map.
 * @param {string[]} hexColors
 * @returns {string[]}
 */
function resolveColorNames(hexColors = []) {
  return hexColors.map(h => HEX_TO_COLOR_NAME[h?.toLowerCase()] ?? h)
}

/**
 * Detects the concept the alien was most recently trying to communicate,
 * based on its light output colors.
 * @param {object} alienOutput
 * @returns {string|null} concept ID
 */
function detectAlienConcept(alienOutput) {
  if (!alienOutput?.light?.colors?.length) return null

  const alienColors = resolveColorNames(alienOutput.light.colors)
  const primaryColor = alienColors[0]
  const alienDirection = alienOutput.light.direction ?? null

  for (const [id, concept] of Object.entries(CONCEPTS)) {
    const conceptColors = resolveColorNames(concept.light.colors)
    const conceptDirection = concept.light.direction ?? null
    if (conceptColors[0] === primaryColor && conceptDirection === alienDirection) {
      return id
    }
  }

  return null
}

/**
 * Checks timing arrays for approximate match within TIMING_TOLERANCE.
 * Arrays of different lengths are allowed; checks overlapping indices.
 * @param {number[]} playerTiming
 * @param {number[]} conceptTiming
 * @returns {boolean}
 */
function timingMatches(playerTiming = [], conceptTiming = []) {
  if (!playerTiming.length || !conceptTiming.length) return true
  const len = Math.min(playerTiming.length, conceptTiming.length)
  let matches = 0
  for (let i = 0; i < len; i++) {
    const ref = conceptTiming[i]
    const delta = Math.abs(playerTiming[i] - ref)
    if (ref === 0 || delta / ref <= TIMING_TOLERANCE) matches++
  }
  return matches / len >= 0.5
}

/**
 * Evaluates whether the player's input matches what the alien was communicating.
 * Returns the engine concept ID (acknowledge/danger/etc.), not the pattern ID.
 *
 * @param {object} playerInput - { type, colors, timing, holdDuration, rhythm, pattern, ... }
 * @param {object} alienOutput - the alien's most recent response object
 * @param {string[]} confirmedConcepts - already-confirmed concept IDs
 * @returns {{ confirmed: boolean, conceptId: string|null, confidence: number }}
 */
export function shouldConfirmConcept(playerInput, alienOutput, confirmedConcepts) {
  if (!playerInput || !alienOutput) {
    return { confirmed: false, conceptId: null, confidence: 0 }
  }

  const targetConceptId = detectAlienConcept(alienOutput)
  const targetConcept = targetConceptId ? CONCEPTS[targetConceptId] : null

  const playerColors = resolveColorNames(playerInput.colors ?? [])
  const holdDurations = playerInput.holdDuration ?? []
  const maxHold = holdDurations.length ? Math.max(...holdDurations) : 0
  const inputCount = playerInput.colors?.length ?? playerInput.pattern?.length ?? 0

  // ── Acknowledge: 3 quick inputs of any kind, or green color ──
  if (targetConceptId === 'acknowledge' || (!targetConceptId && playerColors.includes('green'))) {
    const hasGreen = playerColors.includes('green')
    const isQuick = inputCount >= 3
    const timingOk = timingMatches(playerInput.timing, CONCEPTS.acknowledge.light.timing)

    if (hasGreen && isQuick && timingOk) {
      return { confirmed: true, conceptId: 'acknowledge', confidence: 1.0 }
    }
    if (hasGreen || (isQuick && timingOk)) {
      return { confirmed: true, conceptId: 'acknowledge', confidence: 0.7 }
    }
    if (isQuick) {
      return { confirmed: true, conceptId: 'acknowledge', confidence: 0.5 }
    }
  }

  // ── Danger: sustained/held input, or red color ──
  if (targetConceptId === 'danger' || (!targetConceptId && playerColors.includes('red'))) {
    const hasRed = playerColors.includes('red')
    const isSustained = maxHold > 800

    if (hasRed && isSustained) {
      return { confirmed: true, conceptId: 'danger', confidence: 1.0 }
    }
    if (hasRed || isSustained) {
      return { confirmed: true, conceptId: 'danger', confidence: 0.7 }
    }
  }

  // ── Generic color-match path for all other concepts ──
  if (targetConcept) {
    const criteria = targetConcept.matchCriteria
    const criteriaColors = criteria.colors ?? []
    const colorMatch = criteriaColors.some(c => playerColors.includes(c))

    if (colorMatch) {
      let confidence = 0.6

      const timingOk = timingMatches(playerInput.timing, targetConcept.light.timing)
      if (timingOk) confidence += 0.2

      if (criteria.timing === 'rapid' && playerInput.timing?.some(t => t < 150)) confidence += 0.1
      if (criteria.timing === 'slow' && playerInput.timing?.every(t => t > 800)) confidence += 0.1
      if (criteria.timing === 'quick' && inputCount >= 3) confidence += 0.1

      if (criteria.sustained && maxHold > 800) confidence += 0.15
      if (criteria.direction && playerInput.direction === criteria.direction) confidence += 0.15

      confidence = Math.min(confidence, 1.0)
      return { confirmed: confidence >= 0.6, conceptId: targetConceptId, confidence }
    }

    // Color near-miss: right concept family, wrong confidence
    return { confirmed: false, conceptId: targetConceptId, confidence: 0.2 }
  }

  // Fallback: player used a color we can map to some concept
  for (const [id, concept] of Object.entries(CONCEPTS)) {
    if (confirmedConcepts.includes(id)) continue
    const conceptColors = resolveColorNames(concept.light.colors)
    if (playerColors.some(c => conceptColors.includes(c))) {
      return { confirmed: true, conceptId: id, confidence: 0.5 }
    }
  }

  return { confirmed: false, conceptId: null, confidence: 0 }
}

/**
 * Returns a human-readable description of what the player communicated.
 * @param {string} conceptId
 * @returns {string}
 */
export function formatPlayerResponse(conceptId) {
  const descriptions = {
    acknowledge: 'Mimicked 3 green pulses',
    danger: 'Held a sustained red signal',
    self: 'Sent an inward blue pulse',
    other: 'Sent an outward blue pulse',
    energy: 'Rapid yellow flickers',
    direction: 'Sweeping white arc',
    home: 'Slow amber pulse',
  }
  return descriptions[conceptId] ?? `Used concept: ${conceptId}`
}

/**
 * Checks whether the game should advance from the current beat to the next.
 * @param {number} currentBeat
 * @param {string[]} confirmedConcepts
 * @param {number} elapsedTime - ms elapsed in the current beat
 * @returns {{ shouldAdvance: boolean, nextBeat: number|null }}
 */
export function shouldAdvanceBeat(currentBeat, confirmedConcepts, elapsedTime) {
  if (currentBeat === 3) {
    return { shouldAdvance: false, nextBeat: null }
  }

  const criteria = BEAT_ADVANCE[currentBeat]
  if (!criteria) return { shouldAdvance: false, nextBeat: null }

  const enoughConcepts = confirmedConcepts.length >= criteria.minConcepts
  const enoughTime = elapsedTime >= criteria.minElapsedMs

  if (!enoughConcepts || !enoughTime) {
    return { shouldAdvance: false, nextBeat: null }
  }

  if (criteria.requiresCompound) {
    const beat2 = BEATS[2]
    const usedCompound = beat2.compoundConcepts.some(({ combo }) =>
      combo.every(c => confirmedConcepts.includes(c))
    )
    if (!usedCompound) return { shouldAdvance: false, nextBeat: null }
  }

  return { shouldAdvance: true, nextBeat: currentBeat + 1 }
}

/**
 * Determines whether the game should trigger the resolution ending.
 * Only possible in beat 3; requires the player to combine 2+ confirmed concepts
 * in a novel compound.
 *
 * @param {number} currentBeat
 * @param {string[]} confirmedConcepts
 * @param {object|null} lastPlayerInput
 * @returns {boolean}
 */
export function shouldTriggerResolution(currentBeat, confirmedConcepts, lastPlayerInput) {
  if (currentBeat !== 3) return false
  if (!lastPlayerInput) return false

  const playerColors = resolveColorNames(lastPlayerInput.colors ?? [])

  // Map player colors to concept IDs, using unique colors only
  // (prevents self+other both matching on blue)
  const usedColors = new Set()
  const playerConcepts = []
  for (const [id, concept] of Object.entries(CONCEPTS)) {
    const conceptColors = resolveColorNames(concept.light.colors)
    const matchColor = playerColors.find(c => conceptColors.includes(c) && !usedColors.has(c))
    if (matchColor && confirmedConcepts.includes(id)) {
      playerConcepts.push(id)
      usedColors.add(matchColor)
    }
  }

  // Also count distinct timing groups as separate concept signals
  // (morse/pattern inputs may encode multiple confirmed concepts via rhythm)
  if (lastPlayerInput.pattern?.length >= 2) {
    const patternConcepts = lastPlayerInput.pattern.filter(p => confirmedConcepts.includes(p))
    for (const c of patternConcepts) {
      if (!playerConcepts.includes(c)) playerConcepts.push(c)
    }
  }

  return playerConcepts.length >= 2
}
