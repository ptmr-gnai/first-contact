// ── Emotions ──────────────────────────────────────────────
export const EMOTIONS = ['curious', 'excited', 'frustrated', 'hopeful', 'grateful']

// ── Signal Colors (hex values matching AlienDisplay.identifyPattern) ──
export const COLORS = {
  green: '#4ade80',
  red: '#ef4444',
  blue: '#60a5fa',
  yellow: '#facc15',
  white: '#e2e8f0',
  amber: '#f59e0b',
}

// ── Concepts (same shape as LIGHT_PATTERNS in mockGameState) ──
export const CONCEPTS = {
  acknowledge: {
    id: 'acknowledge',
    label: 'Yes / Acknowledge',
    light: {
      colors: [COLORS.green, COLORS.green, COLORS.green],
      timing: [200, 200, 200],
      intensity: [1, 1, 1],
    },
    sound: {
      pitches: [440, 440, 440],
      rhythm: [200, 200, 200],
      duration: [150, 150, 150],
    },
    matchCriteria: { colors: ['green'], minInputs: 3, timing: 'quick' },
  },
  danger: {
    id: 'danger',
    label: 'No / Danger',
    light: {
      colors: [COLORS.red],
      timing: [1500],
      intensity: [0.9],
    },
    sound: {
      pitches: [110],
      rhythm: [1500],
      duration: [1400],
    },
    matchCriteria: { colors: ['red'], sustained: true },
  },
  self: {
    id: 'self',
    label: 'Self (me)',
    light: {
      colors: [COLORS.blue],
      timing: [800],
      intensity: [0.7],
      direction: 'inward',
    },
    sound: {
      pitches: [220, 440],
      rhythm: [400, 400],
      duration: [350, 350],
    },
    matchCriteria: { colors: ['blue'], direction: 'inward' },
  },
  other: {
    id: 'other',
    label: 'Other (you)',
    light: {
      colors: [COLORS.blue],
      timing: [800],
      intensity: [0.7],
      direction: 'outward',
    },
    sound: {
      pitches: [440, 220],
      rhythm: [400, 400],
      duration: [350, 350],
    },
    matchCriteria: { colors: ['blue'], direction: 'outward' },
  },
  energy: {
    id: 'energy',
    label: 'Energy / Power',
    light: {
      colors: [COLORS.yellow, COLORS.yellow, COLORS.yellow, COLORS.yellow, COLORS.yellow],
      timing: [80, 80, 80, 80, 80],
      intensity: [1, 0.4, 1, 0.4, 1],
    },
    sound: {
      pitches: [880, 880, 880, 880, 880],
      rhythm: [80, 80, 80, 80, 80],
      duration: [60, 60, 60, 60, 60],
    },
    matchCriteria: { colors: ['yellow'], timing: 'rapid' },
  },
  direction: {
    id: 'direction',
    label: 'Direction / Path',
    light: {
      colors: [COLORS.white],
      timing: [1000],
      intensity: [0.8],
      direction: 'sweep',
    },
    sound: {
      pitches: [220, 880],
      rhythm: [500, 500],
      duration: [450, 450],
    },
    matchCriteria: { colors: ['white'], direction: 'sweep' },
  },
  home: {
    id: 'home',
    label: 'Home',
    light: {
      colors: [COLORS.amber],
      timing: [1200],
      intensity: [0.6],
    },
    sound: {
      pitches: [330, 330, 330],
      rhythm: [400, 400, 400],
      duration: [350, 350, 350],
    },
    matchCriteria: { colors: ['amber'], timing: 'slow' },
  },
}

// ── Map between CONCEPTS IDs and legacy LIGHT_PATTERNS keys ──
// AlienDisplay.identifyPattern uses 'yes'/'no', but engine uses 'acknowledge'/'danger'
export const CONCEPT_TO_PATTERN = {
  acknowledge: 'yes',
  danger: 'no',
  self: 'self',
  other: 'other',
  energy: 'energy',
  direction: 'direction',
  home: 'home',
}

export const PATTERN_TO_CONCEPT = Object.fromEntries(
  Object.entries(CONCEPT_TO_PATTERN).map(([k, v]) => [v, k])
)

// ── Beat Configuration ──
export const BEATS = {
  1: {
    name: 'First Contact',
    durationMs: 90_000,
    minElapsedMs: 60_000,
    targetConcepts: 1,
    availableConcepts: ['acknowledge', 'danger', 'self'],
    openingConcept: 'acknowledge',
  },
  2: {
    name: 'Breakthrough',
    durationMs: 120_000,
    minElapsedMs: 60_000,
    targetConcepts: 3,
    availableConcepts: ['acknowledge', 'danger', 'self', 'other', 'energy', 'direction', 'home'],
    compoundConcepts: [
      { combo: ['home', 'danger'], meaning: 'our home situation is dire' },
      { combo: ['direction', 'home'], meaning: 'the path home' },
      { combo: ['energy', 'direction'], meaning: 'we need power to move' },
      { combo: ['self', 'other', 'home'], meaning: 'we both need to get home' },
    ],
  },
  3: {
    name: 'The Plan',
    durationMs: 90_000,
    minElapsedMs: 30_000,
    targetConcepts: 5,
    availableConcepts: ['acknowledge', 'danger', 'self', 'other', 'energy', 'direction', 'home'],
    resolutionCombo: ['energy', 'direction', 'self', 'other'],
  },
}

// ── Nudge Thresholds ──
export const NUDGE_THRESHOLDS = {
  gentle: 15_000,   // 15s -- simplify current pattern
  redirect: 30_000, // 30s -- try different concept
  dramatic: 45_000, // 45s -- dramatic re-engagement
}

// ── Beat Advancement Criteria ──
export const BEAT_ADVANCE = {
  1: { minConcepts: 1, minElapsedMs: 60_000 },
  2: { minConcepts: 3, minElapsedMs: 60_000 },
  // Beat 3 ends via resolution, not advancement
}

// ── Timing Match Tolerance ──
export const TIMING_TOLERANCE = 0.3 // 30% tolerance for timing match

// ── Bridge Configuration ──
export const BRIDGE = {
  port: 8787,
  inputPath: '/tmp/signal-input.json',
  outputPath: '/tmp/signal-output.json',
  readyFlag: '/tmp/signal-input.ready',
  outputReadyFlag: '/tmp/signal-output.ready',
  pollIntervalMs: 200,
  reconnectDelayMs: 2000,
  maxReconnectAttempts: 10,
}

// ── Default Alien Output ──
export const DEFAULT_ALIEN_OUTPUT = {
  light: null,
  sound: { pitches: [], rhythm: [], duration: [] },
  emotion: 'curious',
  conceptConfirmed: null,
  narrative: null,
  nudge: false,
  alienIntent: '',
  internalState: {
    comprehensionLevel: 0.0,
    urgency: 0.3,
    confidence: 0.2,
  },
}

// ── Input Types ──
export const INPUT_TYPES = ['color', 'voice', 'morse']

// ── Player Input Debounce ──
export const INPUT_DEBOUNCE_MS = 250
