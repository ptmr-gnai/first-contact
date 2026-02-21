import { describe, it, expect } from 'vitest'
import {
  EMOTIONS,
  COLORS,
  CONCEPTS,
  CONCEPT_TO_PATTERN,
  PATTERN_TO_CONCEPT,
  BEATS,
  BEAT_ADVANCE,
  NUDGE_THRESHOLDS,
  TIMING_TOLERANCE,
  DEFAULT_ALIEN_OUTPUT,
  INPUT_TYPES,
  CONCEPT_CARDS,
  DECOY_CARDS,
  ALL_CARDS,
  ACT_SOLUTIONS,
  STRIKE_LIMIT,
  HINT_ELIMINATES,
  ACTS,
} from './constants.js'

describe('COLORS', () => {
  it('has all 6 signal colors as hex strings', () => {
    const expected = ['green', 'red', 'blue', 'yellow', 'white', 'amber']
    expect(Object.keys(COLORS)).toEqual(expect.arrayContaining(expected))
    for (const hex of Object.values(COLORS)) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('CONCEPTS', () => {
  it('has all 7 concepts', () => {
    const ids = ['acknowledge', 'danger', 'self', 'other', 'energy', 'direction', 'home']
    expect(Object.keys(CONCEPTS)).toEqual(expect.arrayContaining(ids))
    expect(Object.keys(CONCEPTS)).toHaveLength(7)
  })

  it('each concept has required shape', () => {
    for (const [id, concept] of Object.entries(CONCEPTS)) {
      expect(concept.id).toBe(id)
      expect(concept.label).toBeTruthy()
      expect(concept.light).toBeDefined()
      expect(concept.light.colors).toBeInstanceOf(Array)
      expect(concept.light.timing).toBeInstanceOf(Array)
      expect(concept.sound).toBeDefined()
      expect(concept.matchCriteria).toBeDefined()
      expect(concept.matchCriteria.colors).toBeInstanceOf(Array)
    }
  })
})

describe('CONCEPT_TO_PATTERN / PATTERN_TO_CONCEPT', () => {
  it('are inverses of each other', () => {
    for (const [concept, pattern] of Object.entries(CONCEPT_TO_PATTERN)) {
      expect(PATTERN_TO_CONCEPT[pattern]).toBe(concept)
    }
  })

  it('covers all 7 concepts', () => {
    expect(Object.keys(CONCEPT_TO_PATTERN)).toHaveLength(7)
  })
})

describe('BEATS', () => {
  it('has 3 beats with required fields', () => {
    expect(Object.keys(BEATS)).toHaveLength(3)
    for (const beat of Object.values(BEATS)) {
      expect(beat.name).toBeTruthy()
      expect(beat.availableConcepts).toBeInstanceOf(Array)
      expect(beat.targetConcepts).toBeGreaterThan(0)
    }
  })
})

describe('NUDGE_THRESHOLDS', () => {
  it('thresholds are in ascending order', () => {
    expect(NUDGE_THRESHOLDS.gentle).toBeLessThan(NUDGE_THRESHOLDS.redirect)
    expect(NUDGE_THRESHOLDS.redirect).toBeLessThan(NUDGE_THRESHOLDS.dramatic)
  })
})

describe('EMOTIONS', () => {
  it('has exactly 5 emotions', () => {
    expect(EMOTIONS).toHaveLength(5)
    expect(EMOTIONS).toContain('curious')
    expect(EMOTIONS).toContain('grateful')
  })
})

describe('CONCEPT_CARDS', () => {
  it('has 7 entries, all isDecoy=false', () => {
    expect(CONCEPT_CARDS).toHaveLength(7)
    for (const card of CONCEPT_CARDS) {
      expect(card.isDecoy).toBe(false)
      expect(card.id).toBeTruthy()
      expect(card.label).toBeTruthy()
    }
  })
})

describe('DECOY_CARDS', () => {
  it('has 8 entries, all isDecoy=true', () => {
    expect(DECOY_CARDS).toHaveLength(8)
    for (const card of DECOY_CARDS) {
      expect(card.isDecoy).toBe(true)
      expect(card.id).toBeTruthy()
      expect(card.label).toBeTruthy()
    }
  })
})

describe('ALL_CARDS', () => {
  it('has 15 total entries with no duplicate IDs', () => {
    expect(ALL_CARDS).toHaveLength(15)
    const ids = ALL_CARDS.map(c => c.id)
    expect(new Set(ids).size).toBe(15)
  })
})

describe('ACT_SOLUTIONS', () => {
  it('each act references only real concept card IDs', () => {
    const realIds = CONCEPT_CARDS.map(c => c.id)
    for (const [act, solution] of Object.entries(ACT_SOLUTIONS)) {
      for (const id of solution) {
        expect(realIds).toContain(id)
      }
    }
  })

  it('act 1 has 1 card, act 2 has 3, act 3 has 5', () => {
    expect(ACT_SOLUTIONS[1]).toHaveLength(1)
    expect(ACT_SOLUTIONS[2]).toHaveLength(3)
    expect(ACT_SOLUTIONS[3]).toHaveLength(5)
  })
})

describe('STRIKE_LIMIT / HINT_ELIMINATES', () => {
  it('STRIKE_LIMIT is 3', () => {
    expect(STRIKE_LIMIT).toBe(3)
  })

  it('HINT_ELIMINATES is 5', () => {
    expect(HINT_ELIMINATES).toBe(5)
  })
})

describe('ACTS', () => {
  it('has 3 acts with name and slotCount', () => {
    expect(Object.keys(ACTS)).toHaveLength(3)
    expect(ACTS[1].slotCount).toBe(1)
    expect(ACTS[2].slotCount).toBe(3)
    expect(ACTS[3].slotCount).toBe(5)
    for (const act of Object.values(ACTS)) {
      expect(act.name).toBeTruthy()
    }
  })
})

describe('defaults', () => {
  it('TIMING_TOLERANCE is 30%', () => {
    expect(TIMING_TOLERANCE).toBe(0.3)
  })

  it('DEFAULT_ALIEN_OUTPUT has expected shape', () => {
    expect(DEFAULT_ALIEN_OUTPUT.emotion).toBe('curious')
    expect(DEFAULT_ALIEN_OUTPUT.light).toBeNull()
    expect(DEFAULT_ALIEN_OUTPUT.sound).toBeDefined()
  })

  it('INPUT_TYPES has 3 types', () => {
    expect(INPUT_TYPES).toEqual(['color', 'voice', 'morse'])
  })
})
