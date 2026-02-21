import { describe, it, expect } from 'vitest'
import {
  shouldAdvanceAct,
  shouldTriggerVictory,
  getActConfig,
  isRepeatRun,
} from './actProgression.js'

describe('shouldAdvanceAct', () => {
  it('advances from act 1 to 2 when correct', () => {
    const result = shouldAdvanceAct(1, true)
    expect(result.shouldAdvance).toBe(true)
    expect(result.nextAct).toBe(2)
  })

  it('advances from act 2 to 3 when correct', () => {
    const result = shouldAdvanceAct(2, true)
    expect(result.shouldAdvance).toBe(true)
    expect(result.nextAct).toBe(3)
  })

  it('does not advance from act 3 (even when correct)', () => {
    const result = shouldAdvanceAct(3, true)
    expect(result.shouldAdvance).toBe(false)
    expect(result.nextAct).toBeNull()
  })

  it('does not advance on wrong answer', () => {
    const result = shouldAdvanceAct(1, false)
    expect(result.shouldAdvance).toBe(false)
    expect(result.nextAct).toBeNull()
  })
})

describe('shouldTriggerVictory', () => {
  it('returns true for act 3 correct', () => {
    expect(shouldTriggerVictory(3, true)).toBe(true)
  })

  it('returns false for act 3 incorrect', () => {
    expect(shouldTriggerVictory(3, false)).toBe(false)
  })

  it('returns false for act 1 correct', () => {
    expect(shouldTriggerVictory(1, true)).toBe(false)
  })

  it('returns false for act 2 correct', () => {
    expect(shouldTriggerVictory(2, true)).toBe(false)
  })
})

describe('getActConfig', () => {
  it('returns config for act 1', () => {
    const config = getActConfig(1)
    expect(config.name).toBe('First Words')
    expect(config.slotCount).toBe(1)
    expect(config.solution).toEqual(['acknowledge'])
  })

  it('returns config for act 3', () => {
    const config = getActConfig(3)
    expect(config.name).toBe('The Plan')
    expect(config.slotCount).toBe(5)
    expect(config.solution).toHaveLength(5)
  })
})

describe('isRepeatRun', () => {
  it('returns false for first run', () => {
    expect(isRepeatRun({ 1: false, 2: false, 3: false }, 1)).toBe(false)
  })

  it('returns true for previously solved act', () => {
    expect(isRepeatRun({ 1: true, 2: false, 3: false }, 1)).toBe(true)
  })

  it('handles null/undefined gracefully', () => {
    expect(isRepeatRun(null, 1)).toBe(false)
    expect(isRepeatRun(undefined, 1)).toBe(false)
  })
})
