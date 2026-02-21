const STORAGE_KEY = 'signal-roguelike'

const DEFAULT_STATE = {
  runNumber: 1,
  actSolvedBefore: { 1: false, 2: false, 3: false },
  confirmedConceptsHistory: [],
  failedAttemptsHistory: [],
  observedPatterns: [],
  totalTime: 0,
  totalSubmissions: 0,
  correctSubmissions: 0,
  schemaVersion: 1,
}

/**
 * Loads persistent roguelike state from localStorage.
 * Returns default state on first run or corrupted data.
 * @returns {object}
 */
export function loadPersistentState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.schemaVersion !== 1) return { ...DEFAULT_STATE }
    return parsed
  } catch {
    return { ...DEFAULT_STATE }
  }
}

/**
 * Saves persistent roguelike state to localStorage.
 * @param {object} state
 */
export function savePersistentState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

/**
 * Clears persistent roguelike state from localStorage.
 */
export function resetPersistentState() {
  localStorage.removeItem(STORAGE_KEY)
}

export { DEFAULT_STATE }
