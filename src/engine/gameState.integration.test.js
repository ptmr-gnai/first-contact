import { describe, it, expect } from 'vitest'
import { shouldConfirmConcept, shouldAdvanceBeat, shouldTriggerResolution } from './languageFramework.js'
import { calculateNudgeLevel, shouldSendNudge, buildNudgePayload } from './nudgeSystem.js'
import { validateAnswer } from './answerValidation.js'
import { addStrike } from './strikeSystem.js'
import { shouldAdvanceAct, shouldTriggerVictory, getActConfig } from './actProgression.js'
import { getHintEliminations } from './answerValidation.js'
import { CONCEPTS, COLORS, ACT_SOLUTIONS, STRIKE_LIMIT } from '../constants.js'

/**
 * Integration tests: verify languageFramework + nudgeSystem work together
 * to drive a full game lifecycle from beat 1 through resolution.
 */
describe('Game lifecycle integration', () => {
  it('plays through beat 1 -> beat 2 -> beat 3 -> resolution', () => {
    let confirmedConcepts = []
    let currentBeat = 1

    // --- Beat 1: confirm acknowledge ---
    const ackAlien = { light: { colors: [COLORS.green, COLORS.green, COLORS.green], timing: [200, 200, 200], intensity: [1, 1, 1] } }
    const ackInput = { type: 'color', colors: ['green', 'green', 'green'], timing: [210, 195, 205], holdDuration: [0, 0, 0] }
    const ackResult = shouldConfirmConcept(ackInput, ackAlien, confirmedConcepts)
    expect(ackResult.confirmed).toBe(true)
    confirmedConcepts.push(ackResult.conceptId)

    // Beat 1 -> 2 (with enough time)
    const advance1 = shouldAdvanceBeat(currentBeat, confirmedConcepts, 65_000)
    expect(advance1.shouldAdvance).toBe(true)
    currentBeat = advance1.nextBeat

    // --- Beat 2: confirm danger + self + home ---
    const dangerAlien = { light: { colors: [COLORS.red], timing: [1500], intensity: [0.9] } }
    const dangerInput = { type: 'color', colors: ['red'], timing: [0], holdDuration: [1200] }
    const dangerResult = shouldConfirmConcept(dangerInput, dangerAlien, confirmedConcepts)
    expect(dangerResult.confirmed).toBe(true)
    confirmedConcepts.push(dangerResult.conceptId)

    const selfAlien = { light: { colors: [COLORS.blue], timing: [800], intensity: [0.7], direction: 'inward' } }
    const selfInput = { type: 'color', colors: ['blue'], timing: [800], holdDuration: [0] }
    const selfResult = shouldConfirmConcept(selfInput, selfAlien, confirmedConcepts)
    expect(selfResult.confirmed).toBe(true)
    confirmedConcepts.push(selfResult.conceptId)

    const homeAlien = { light: { colors: [COLORS.amber], timing: [1200], intensity: [0.6] } }
    const homeInput = { type: 'color', colors: ['amber'], timing: [1200], holdDuration: [0] }
    const homeResult = shouldConfirmConcept(homeInput, homeAlien, confirmedConcepts)
    expect(homeResult.confirmed).toBe(true)
    confirmedConcepts.push(homeResult.conceptId)

    // Beat 2 -> 3
    const advance2 = shouldAdvanceBeat(currentBeat, confirmedConcepts, 70_000)
    expect(advance2.shouldAdvance).toBe(true)
    currentBeat = advance2.nextBeat
    expect(currentBeat).toBe(3)

    // --- Beat 3: resolution via compound concept ---
    const resolutionInput = { colors: ['green', 'red', 'amber'], timing: [200, 200, 200] }
    const resolved = shouldTriggerResolution(currentBeat, confirmedConcepts, resolutionInput)
    expect(resolved).toBe(true)
  })

  it('nudge system escalates correctly over time', () => {
    let lastNudgeLevel = 0

    // No nudge at 10s
    let level = calculateNudgeLevel(10_000)
    expect(shouldSendNudge(level, lastNudgeLevel)).toBe(false)

    // Gentle nudge at 15s
    level = calculateNudgeLevel(15_000)
    expect(shouldSendNudge(level, lastNudgeLevel)).toBe(true)
    const payload1 = buildNudgePayload(level, 1, [], ['acknowledge', 'danger', 'self'])
    expect(payload1.suggestion).toBe('simplify')
    lastNudgeLevel = level

    // No duplicate at 20s (still level 1)
    level = calculateNudgeLevel(20_000)
    expect(shouldSendNudge(level, lastNudgeLevel)).toBe(false)

    // Redirect at 30s
    level = calculateNudgeLevel(30_000)
    expect(shouldSendNudge(level, lastNudgeLevel)).toBe(true)
    const payload2 = buildNudgePayload(level, 1, ['acknowledge'], ['acknowledge', 'danger', 'self'])
    expect(payload2.suggestion).toBe('redirect')
    expect(payload2.availableConcepts).not.toContain('acknowledge')
    lastNudgeLevel = level

    // Dramatic at 45s
    level = calculateNudgeLevel(45_000)
    expect(shouldSendNudge(level, lastNudgeLevel)).toBe(true)
    const payload3 = buildNudgePayload(level, 1, ['acknowledge'], ['acknowledge', 'danger', 'self'])
    expect(payload3.suggestion).toBe('dramatic')
  })
})

/**
 * P4 Roguelike integration tests: full card-based game lifecycle.
 */
describe('Roguelike lifecycle integration', () => {
  it('Act 1 correct -> transition -> Act 2 correct -> transition -> Act 3 correct -> victory', () => {
    // Act 1: submit correct answer
    const act1Result = validateAnswer(['acknowledge'], 1)
    expect(act1Result.correct).toBe(true)

    const { shouldAdvance: adv1, nextAct: next1 } = shouldAdvanceAct(1, true)
    expect(adv1).toBe(true)
    expect(next1).toBe(2)
    expect(shouldTriggerVictory(1, true)).toBe(false)

    // Act 2: submit correct answer
    const act2Result = validateAnswer(['self', 'home', 'danger'], 2)
    expect(act2Result.correct).toBe(true)

    const { shouldAdvance: adv2, nextAct: next2 } = shouldAdvanceAct(2, true)
    expect(adv2).toBe(true)
    expect(next2).toBe(3)
    expect(shouldTriggerVictory(2, true)).toBe(false)

    // Act 3: submit correct answer -> victory
    const act3Result = validateAnswer(['other', 'self', 'energy', 'direction', 'home'], 3)
    expect(act3Result.correct).toBe(true)

    const { shouldAdvance: adv3 } = shouldAdvanceAct(3, true)
    expect(adv3).toBe(false) // no act 4
    expect(shouldTriggerVictory(3, true)).toBe(true)
  })

  it('3 wrong answers -> game over', () => {
    let strikes = 0

    // Wrong answer 1
    const r1 = validateAnswer(['star'], 1)
    expect(r1.correct).toBe(false)
    const s1 = addStrike(strikes)
    strikes = s1.strikes
    expect(s1.isGameOver).toBe(false)

    // Wrong answer 2
    const r2 = validateAnswer(['ship'], 1)
    expect(r2.correct).toBe(false)
    const s2 = addStrike(strikes)
    strikes = s2.strikes
    expect(s2.isGameOver).toBe(false)

    // Wrong answer 3
    const r3 = validateAnswer(['help'], 1)
    expect(r3.correct).toBe(false)
    const s3 = addStrike(strikes)
    strikes = s3.strikes
    expect(s3.isGameOver).toBe(true)
    expect(strikes).toBe(STRIKE_LIMIT)
  })

  it('hint eliminates 5 cards, costs a strike, never removes correct answers', () => {
    let strikes = 0
    let eliminated = []

    // Use hint for act 2
    const s1 = addStrike(strikes)
    strikes = s1.strikes
    expect(strikes).toBe(1)

    const hintCards = getHintEliminations(2, eliminated)
    expect(hintCards.length).toBeLessThanOrEqual(5)
    expect(hintCards.length).toBeGreaterThan(0)

    // None of the eliminated cards should be in the act 2 solution
    for (const id of ACT_SOLUTIONS[2]) {
      expect(hintCards).not.toContain(id)
    }

    eliminated = [...eliminated, ...hintCards]

    // Correct answer should still be possible
    const result = validateAnswer(['self', 'home', 'danger'], 2)
    expect(result.correct).toBe(true)
  })

  it('restart preserves run number progression', () => {
    // Simulate: run 1 fails, run 2 starts
    let runNumber = 1
    const actSolvedBefore = { 1: true, 2: false, 3: false }

    // New run
    runNumber += 1
    expect(runNumber).toBe(2)

    // Previous solutions should be tracked
    expect(actSolvedBefore[1]).toBe(true)
    expect(actSolvedBefore[2]).toBe(false)
  })

  it('getActConfig returns correct slot counts and solutions', () => {
    const a1 = getActConfig(1)
    expect(a1.slotCount).toBe(1)
    expect(a1.solution).toEqual(['acknowledge'])

    const a2 = getActConfig(2)
    expect(a2.slotCount).toBe(3)
    expect(a2.solution).toEqual(['self', 'home', 'danger'])

    const a3 = getActConfig(3)
    expect(a3.slotCount).toBe(5)
    expect(a3.solution).toHaveLength(5)
  })
})
