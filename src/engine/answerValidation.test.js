import { describe, it, expect } from 'vitest'
import {
  validateAnswer,
  getAvailableCards,
  getHintEliminations,
} from './answerValidation.js'
import { ACT_SOLUTIONS, ALL_CARDS } from '../constants.js'

describe('validateAnswer', () => {
  it('returns correct for act 1 with acknowledge', () => {
    const result = validateAnswer(['acknowledge'], 1)
    expect(result.correct).toBe(true)
    expect(result.expected).toEqual(['acknowledge'])
  })

  it('returns incorrect for act 1 with wrong card', () => {
    const result = validateAnswer(['star'], 1)
    expect(result.correct).toBe(false)
  })

  it('returns correct for act 2 with exact solution', () => {
    const result = validateAnswer(['self', 'home', 'danger'], 2)
    expect(result.correct).toBe(true)
  })

  it('returns incorrect for act 2 with partial solution', () => {
    const result = validateAnswer(['self', 'home'], 2)
    expect(result.correct).toBe(false)
  })

  it('returns correct for act 3 with exact solution (order-independent)', () => {
    const result = validateAnswer(['home', 'direction', 'energy', 'self', 'other'], 3)
    expect(result.correct).toBe(true)
  })

  it('returns incorrect for act 3 with extra card', () => {
    const result = validateAnswer(['other', 'self', 'energy', 'direction', 'home', 'star'], 3)
    expect(result.correct).toBe(false)
  })
})

describe('getAvailableCards', () => {
  it('returns all 15 cards when none eliminated', () => {
    const cards = getAvailableCards([])
    expect(cards).toHaveLength(15)
  })

  it('excludes eliminated cards', () => {
    const cards = getAvailableCards(['star', 'ship', 'help'])
    expect(cards).toHaveLength(12)
    expect(cards.find(c => c.id === 'star')).toBeUndefined()
  })
})

describe('getHintEliminations', () => {
  it('returns up to 5 cards', () => {
    const eliminated = getHintEliminations(1, [])
    expect(eliminated.length).toBeLessThanOrEqual(5)
    expect(eliminated.length).toBeGreaterThan(0)
  })

  it('never eliminates correct answers for act 1', () => {
    const eliminated = getHintEliminations(1, [])
    expect(eliminated).not.toContain('acknowledge')
  })

  it('never eliminates correct answers for act 2', () => {
    const eliminated = getHintEliminations(2, [])
    for (const id of ACT_SOLUTIONS[2]) {
      expect(eliminated).not.toContain(id)
    }
  })

  it('never eliminates correct answers for act 3', () => {
    const eliminated = getHintEliminations(3, [])
    for (const id of ACT_SOLUTIONS[3]) {
      expect(eliminated).not.toContain(id)
    }
  })

  it('does not return already-eliminated cards', () => {
    const alreadyEliminated = ['star', 'ship', 'help', 'peace', 'fear']
    const eliminated = getHintEliminations(1, alreadyEliminated)
    for (const id of alreadyEliminated) {
      expect(eliminated).not.toContain(id)
    }
  })
})
