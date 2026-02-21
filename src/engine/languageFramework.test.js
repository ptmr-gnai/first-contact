import { describe, it, expect } from 'vitest'
import {
  lookupConcept,
  shouldConfirmConcept,
  shouldAdvanceBeat,
  shouldTriggerResolution,
  formatPlayerResponse,
} from './languageFramework.js'
import { CONCEPTS, COLORS } from '../constants.js'

describe('lookupConcept', () => {
  it('returns the concept object for a valid ID', () => {
    const result = lookupConcept('acknowledge')
    expect(result).toBe(CONCEPTS.acknowledge)
    expect(result.label).toBe('Yes / Acknowledge')
  })

  it('returns null for an unknown ID', () => {
    expect(lookupConcept('nonexistent')).toBeNull()
  })
})

describe('shouldConfirmConcept', () => {
  const acknowledgeAlienOutput = {
    light: {
      colors: [COLORS.green, COLORS.green, COLORS.green],
      timing: [200, 200, 200],
      intensity: [1, 1, 1],
    },
  }

  it('confirms acknowledge with 3 green inputs', () => {
    const input = {
      type: 'color',
      colors: ['green', 'green', 'green'],
      timing: [210, 195, 205],
      holdDuration: [0, 0, 0],
    }
    const result = shouldConfirmConcept(input, acknowledgeAlienOutput, [])
    expect(result.confirmed).toBe(true)
    expect(result.conceptId).toBe('acknowledge')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('confirms danger with sustained red input', () => {
    const dangerOutput = {
      light: { colors: [COLORS.red], timing: [1500], intensity: [0.9] },
    }
    const input = {
      type: 'color',
      colors: ['red'],
      timing: [0],
      holdDuration: [1200],
    }
    const result = shouldConfirmConcept(input, dangerOutput, [])
    expect(result.confirmed).toBe(true)
    expect(result.conceptId).toBe('danger')
  })

  it('returns not confirmed for null input', () => {
    const result = shouldConfirmConcept(null, acknowledgeAlienOutput, [])
    expect(result.confirmed).toBe(false)
    expect(result.confidence).toBe(0)
  })

  it('matches energy with yellow color input', () => {
    const energyOutput = {
      light: {
        colors: [COLORS.yellow, COLORS.yellow, COLORS.yellow, COLORS.yellow, COLORS.yellow],
        timing: [80, 80, 80, 80, 80],
        intensity: [1, 0.4, 1, 0.4, 1],
      },
    }
    const input = {
      type: 'color',
      colors: ['yellow'],
      timing: [80],
      holdDuration: [0],
    }
    const result = shouldConfirmConcept(input, energyOutput, [])
    expect(result.confirmed).toBe(true)
    expect(result.conceptId).toBe('energy')
  })

  it('does not confirm when player sends wrong color for the alien concept', () => {
    const input = {
      type: 'color',
      colors: ['amber'],
      timing: [200],
      holdDuration: [0],
    }
    const result = shouldConfirmConcept(input, acknowledgeAlienOutput, [])
    // amber doesn't match green -- near-miss returns conceptId but confirmed=false
    expect(result.confirmed).toBe(false)
    expect(result.conceptId).toBe('acknowledge')
    expect(result.confidence).toBeLessThanOrEqual(0.3)
  })
})

describe('shouldAdvanceBeat', () => {
  it('advances from beat 1 to 2 with 1+ concepts and 60s', () => {
    const result = shouldAdvanceBeat(1, ['acknowledge'], 60_000)
    expect(result.shouldAdvance).toBe(true)
    expect(result.nextBeat).toBe(2)
  })

  it('does not advance from beat 1 without enough time', () => {
    const result = shouldAdvanceBeat(1, ['acknowledge'], 30_000)
    expect(result.shouldAdvance).toBe(false)
  })

  it('does not advance from beat 1 without concepts', () => {
    const result = shouldAdvanceBeat(1, [], 90_000)
    expect(result.shouldAdvance).toBe(false)
  })

  it('never advances from beat 3', () => {
    const result = shouldAdvanceBeat(3, ['a', 'b', 'c', 'd', 'e'], 120_000)
    expect(result.shouldAdvance).toBe(false)
    expect(result.nextBeat).toBeNull()
  })

  it('advances from beat 2 to 3 with 3+ concepts and 60s', () => {
    const result = shouldAdvanceBeat(2, ['acknowledge', 'danger', 'self'], 60_000)
    expect(result.shouldAdvance).toBe(true)
    expect(result.nextBeat).toBe(3)
  })
})

describe('shouldTriggerResolution', () => {
  it('returns false if not on beat 3', () => {
    expect(shouldTriggerResolution(2, ['acknowledge', 'danger'], { colors: ['green', 'red'] })).toBe(false)
  })

  it('returns false with no player input', () => {
    expect(shouldTriggerResolution(3, ['acknowledge', 'danger'], null)).toBe(false)
  })

  it('returns true when player combines 2+ confirmed concepts', () => {
    const input = { colors: ['green', 'red'], timing: [200, 200] }
    const result = shouldTriggerResolution(3, ['acknowledge', 'danger'], input)
    expect(result).toBe(true)
  })

  it('returns false with only 1 confirmed concept in input', () => {
    const input = { colors: ['green'], timing: [200] }
    const result = shouldTriggerResolution(3, ['acknowledge', 'danger'], input)
    expect(result).toBe(false)
  })
})

describe('formatPlayerResponse', () => {
  it('returns description for known concepts', () => {
    expect(formatPlayerResponse('acknowledge')).toBe('Mimicked 3 green pulses')
    expect(formatPlayerResponse('danger')).toBe('Held a sustained red signal')
  })

  it('returns fallback for unknown concepts', () => {
    expect(formatPlayerResponse('xyz')).toContain('xyz')
  })
})
