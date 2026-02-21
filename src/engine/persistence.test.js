import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadPersistentState,
  savePersistentState,
  resetPersistentState,
  DEFAULT_STATE,
} from './persistence.js'

// Simple localStorage mock
const store = {}
const localStorageMock = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, val) => { store[key] = val },
  removeItem: (key) => { delete store[key] },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
})

describe('persistence', () => {
  it('returns default state on first load', () => {
    const state = loadPersistentState()
    expect(state).toEqual(DEFAULT_STATE)
    expect(state.runNumber).toBe(1)
    expect(state.schemaVersion).toBe(1)
  })

  it('round-trips: save then load returns equal state', () => {
    const custom = {
      ...DEFAULT_STATE,
      runNumber: 3,
      totalSubmissions: 12,
      actSolvedBefore: { 1: true, 2: true, 3: false },
    }
    savePersistentState(custom)
    const loaded = loadPersistentState()
    expect(loaded).toEqual(custom)
  })

  it('reset clears persisted state', () => {
    savePersistentState({ ...DEFAULT_STATE, runNumber: 5 })
    resetPersistentState()
    const state = loadPersistentState()
    expect(state).toEqual(DEFAULT_STATE)
  })

  it('returns default on corrupted JSON', () => {
    store['signal-roguelike'] = 'not valid json{'
    const state = loadPersistentState()
    expect(state).toEqual(DEFAULT_STATE)
  })

  it('returns default on wrong schema version', () => {
    store['signal-roguelike'] = JSON.stringify({ ...DEFAULT_STATE, schemaVersion: 99 })
    const state = loadPersistentState()
    expect(state).toEqual(DEFAULT_STATE)
  })
})
