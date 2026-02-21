import { describe, it, expect } from 'vitest'
import { addStrike, canUseHint } from './strikeSystem.js'

describe('addStrike', () => {
  it('increments from 0 to 1, not game over', () => {
    const result = addStrike(0)
    expect(result.strikes).toBe(1)
    expect(result.isGameOver).toBe(false)
  })

  it('increments from 1 to 2, not game over', () => {
    const result = addStrike(1)
    expect(result.strikes).toBe(2)
    expect(result.isGameOver).toBe(false)
  })

  it('increments from 2 to 3, IS game over', () => {
    const result = addStrike(2)
    expect(result.strikes).toBe(3)
    expect(result.isGameOver).toBe(true)
  })
})

describe('canUseHint', () => {
  it('returns true at 0 strikes', () => {
    expect(canUseHint(0)).toBe(true)
  })

  it('returns true at 1 strike', () => {
    expect(canUseHint(1)).toBe(true)
  })

  it('returns true at 2 strikes', () => {
    expect(canUseHint(2)).toBe(true)
  })

  it('returns false at STRIKE_LIMIT (3)', () => {
    expect(canUseHint(3)).toBe(false)
  })
})
