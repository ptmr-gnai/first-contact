// Re-export from canonical constants for backward compatibility
export { EMOTIONS } from '../constants.js'
export { CONCEPTS as CONCEPTS_MAP } from '../constants.js'

export const LIGHT_PATTERNS = {
  yes: {
    id: 'yes',
    label: 'Yes / Acknowledge',
    light: {
      colors: ['#4ade80', '#4ade80', '#4ade80'],
      timing: [200, 200, 200],
      intensity: [1, 1, 1],
    },
  },
  no: {
    id: 'no',
    label: 'No / Danger',
    light: {
      colors: ['#ef4444'],
      timing: [1500],
      intensity: [0.9],
    },
  },
  self: {
    id: 'self',
    label: 'Self (me)',
    light: {
      colors: ['#60a5fa'],
      timing: [800],
      intensity: [0.7],
      direction: 'inward',
    },
  },
  other: {
    id: 'other',
    label: 'Other (you)',
    light: {
      colors: ['#60a5fa'],
      timing: [800],
      intensity: [0.7],
      direction: 'outward',
    },
  },
  energy: {
    id: 'energy',
    label: 'Energy / Power',
    light: {
      colors: ['#facc15', '#facc15', '#facc15', '#facc15', '#facc15'],
      timing: [80, 80, 80, 80, 80],
      intensity: [1, 0.4, 1, 0.4, 1],
    },
  },
  direction: {
    id: 'direction',
    label: 'Direction / Path',
    light: {
      colors: ['#e2e8f0'],
      timing: [1000],
      intensity: [0.8],
      direction: 'sweep',
    },
  },
  home: {
    id: 'home',
    label: 'Home',
    light: {
      colors: ['#f59e0b'],
      timing: [1200],
      intensity: [0.6],
    },
  },
}

export const mockConfirmedConcepts = [
  {
    id: 'acknowledge',
    label: 'Yes / Acknowledge',
    alienLight: LIGHT_PATTERNS.yes.light,
    playerResponse: 'Mimicked 3 green pulses',
  },
  {
    id: 'self',
    label: 'Self (me)',
    alienLight: LIGHT_PATTERNS.self.light,
    playerResponse: 'Blue pulse matched',
  },
]

export const mockFailedAttempts = [
  {
    id: 'energy-fail',
    label: 'Energy / Power',
    alienLight: LIGHT_PATTERNS.energy.light,
    playerResponse: 'Wrong color used',
  },
]

export const mockGameState = {
  currentBeat: 1,
  alienEmotion: 'curious',
  confirmedConcepts: mockConfirmedConcepts,
  failedAttempts: mockFailedAttempts,
  alienOutput: {
    light: null,
    sound: { pitches: [], rhythm: [], duration: [] },
    emotion: 'curious',
    conceptConfirmed: null,
    narrative: null,
    nudge: false,
  },
  interactionHistory: [],
  elapsedTime: 0,
}
