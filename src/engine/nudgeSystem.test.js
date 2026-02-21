import { describe, it, expect } from 'vitest'
import { calculateNudgeLevel, shouldSendNudge, buildNudgePayload } from './nudgeSystem.js'

describe('calculateNudgeLevel', () => {
  it('returns 0 under 15s', () => {
    expect(calculateNudgeLevel(0)).toBe(0)
    expect(calculateNudgeLevel(14_999)).toBe(0)
  })

  it('returns 1 at 15-30s', () => {
    expect(calculateNudgeLevel(15_000)).toBe(1)
    expect(calculateNudgeLevel(29_999)).toBe(1)
  })

  it('returns 2 at 30-45s', () => {
    expect(calculateNudgeLevel(30_000)).toBe(2)
    expect(calculateNudgeLevel(44_999)).toBe(2)
  })

  it('returns 3 at 45s+', () => {
    expect(calculateNudgeLevel(45_000)).toBe(3)
    expect(calculateNudgeLevel(999_999)).toBe(3)
  })
})

describe('shouldSendNudge', () => {
  it('returns false for level 0', () => {
    expect(shouldSendNudge(0, 0)).toBe(false)
  })

  it('returns true when level increases', () => {
    expect(shouldSendNudge(1, 0)).toBe(true)
    expect(shouldSendNudge(2, 1)).toBe(true)
    expect(shouldSendNudge(3, 2)).toBe(true)
  })

  it('returns false when level stays the same', () => {
    expect(shouldSendNudge(1, 1)).toBe(false)
    expect(shouldSendNudge(2, 2)).toBe(false)
  })

  it('returns false when level decreases', () => {
    expect(shouldSendNudge(1, 3)).toBe(false)
  })
})

describe('buildNudgePayload', () => {
  it('returns simplify suggestion for level 1', () => {
    const result = buildNudgePayload(1, 1, [], ['acknowledge', 'danger', 'self'])
    expect(result.nudge).toBe(true)
    expect(result.nudgeLevel).toBe(1)
    expect(result.suggestion).toBe('simplify')
    expect(result.availableConcepts).toEqual(['acknowledge', 'danger', 'self'])
  })

  it('returns redirect with unconfirmed concepts for level 2', () => {
    const result = buildNudgePayload(2, 1, ['acknowledge'], ['acknowledge', 'danger', 'self'])
    expect(result.suggestion).toBe('redirect')
    expect(result.availableConcepts).toEqual(['danger', 'self'])
  })

  it('returns dramatic with all concepts for level 3', () => {
    const result = buildNudgePayload(3, 2, ['acknowledge'], ['acknowledge', 'danger', 'self'])
    expect(result.suggestion).toBe('dramatic')
    expect(result.availableConcepts).toEqual(['acknowledge', 'danger', 'self'])
  })

  it('falls back to all concepts if all are confirmed for redirect', () => {
    const all = ['acknowledge', 'danger', 'self']
    const result = buildNudgePayload(2, 1, all, all)
    expect(result.suggestion).toBe('redirect')
    expect(result.availableConcepts).toEqual(all)
  })
})
