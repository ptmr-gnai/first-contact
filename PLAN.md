# P4 Implementation Plan: Roguelike Game Design

## Current Codebase State (as of master @ e8a5065)

**master branch** (local + remote in sync):
- P1 engine complete: gameState.jsx, languageFramework.js, nudgeSystem.js, bridge/
- P2 visuals complete: 3D Three.js alien (shaders + AlienMesh + useEmotionLerp + CSS glow), EnvironmentEffects, ClueLog, NarrativePreamble, Resolution
- P3 input complete: ColorWheel, MorseCodePad, VoiceInput, PlayerControls, toneGenerator, voiceAnalyzer
- Sensor experiments merged (sensors/ directory -- Python H10/hand tracking, not integrated into React app)
- **Latest fix (e8a5065)**: AlienDisplay replaced @react-three/postprocessing Bloom with CSS drop-shadow glow. No more EffectComposer/BloomController. Packages `@react-three/postprocessing` and `postprocessing` still in package.json but unused in code.

**feat/sensor-integration branch** (3 commits ahead of master, divergent):
- Adds Python FastAPI sensor bridge (bridge/main.py, bridge/sensor_hub.py)
- Adds React sensor hooks (src/bridge/useSensorStream.js, src/components/SensorDebugPanel.jsx)
- Adds architecture docs (docs/SIGNAL_ARCHITECTURE.md, docs/SENSOR_BRIDGE_SPEC.md)
- **Diverged before 3D alien commits** -- still has old SVG AlienDisplay. Needs rebase onto master before merging.

**P4 builds on master.** Sensor integration is orthogonal -- no conflicts expected. The sensor branch should be rebased onto master separately (before or after P4).

---

## Requirements Restatement

Transform SIGNAL from a linear 3-beat experience into a roguelike with:
- **3 acts** (replacing beats) as discrete puzzles with concept card answers
- **15 concept cards** (7 real + 8 decoys) for answer submission
- **3 strikes per run** -- wrong answers and hints cost strikes
- **Roguelike persistence** -- clue log, confirmed concepts, run history persist across runs
- **Hint system** -- spend a strike to eliminate 5 wrong cards
- **Repeat run acceleration** -- solved acts play faster on subsequent runs
- **New UI components** -- AnswerPanel, ActLabel, ActTransition, EndScreen

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `currentBeat` renamed to `currentAct` breaks all P2 consumers | HIGH | Search-and-replace across all files in one atomic phase |
| localStorage persistence introduces stale state bugs | MEDIUM | Version the persistence schema, add migration/reset |
| AnswerPanel toggle conflicts with PlayerControls layout | MEDIUM | Use shared `answerPanelOpen` state in gameState, PlayerControls reads it |
| Strike animations need AlienDisplay shader changes | LOW | Reuse existing pattern system (red wash = type 0) |
| 15-card grid doesn't fit small screens | MEDIUM | Responsive grid: 5x3 on desktop, 3x5 scrollable on mobile |
| Demo mode needs to work without bridge for all new features | LOW | Add mock act solutions + strike logic to demo mode |
| feat/sensor-integration needs rebase after P4 | LOW | Sensor branch is separate; rebase resolves cleanly since no overlapping files except AlienDisplay (already diverged) |

## Execution Strategy

**Agent swarms**: Each phase uses parallel agents for independent files.
**RALPH loops**: Each checkpoint follows Red-Assert-Loop-Prove-Harden (write failing test/assertion, implement, iterate, verify, lock down).
**Memory checkpoints**: Save progress to MEMORY.md after each phase, clear context between phases.
**Context budget**: Never exceed 50% context window per phase. Each phase is self-contained.

---

## Phase 1: Constants & Data Layer (P1 Foundation)

**Goal**: Add all new constants, card definitions, act solutions, strike config. Rename beat→act in constants.

**Files to modify**:
- `src/constants.js` -- add CARDS, DECOY_CARDS, ACT_SOLUTIONS, STRIKE_CONFIG, rename BEATS→ACTS

**Files to create**:
- `src/engine/persistence.js` -- localStorage read/write for roguelike state

**Agent swarm**: Single agent (sequential dependency on constants)

**RALPH loop**:
1. **Red**: Define expected exports -- `CONCEPT_CARDS`, `DECOY_CARDS`, `ALL_CARDS`, `ACT_SOLUTIONS`, `ACTS`, `STRIKE_LIMIT`, `PERSISTENCE_KEY`
2. **Assert**: Verify all 15 cards have id, label, isDecoy fields. Verify ACT_SOLUTIONS maps to valid card IDs.
3. **Loop**: Implement constants + persistence module
4. **Prove**: Import and validate all exports. localStorage round-trip test.
5. **Harden**: Freeze objects, add schema version to persistence

**Deliverables**:
```js
// New in constants.js
export const CONCEPT_CARDS = [
  { id: 'acknowledge', label: 'Acknowledge (Yes)', isDecoy: false },
  // ... 6 more real
]
export const DECOY_CARDS = [
  { id: 'star', label: 'Star', isDecoy: true },
  // ... 7 more decoys
]
export const ALL_CARDS = [...CONCEPT_CARDS, ...DECOY_CARDS] // 15 total
export const ACT_SOLUTIONS = {
  1: ['acknowledge'],
  2: ['self', 'home', 'danger'],
  3: ['other', 'self', 'energy', 'direction', 'home'],
}
export const ACTS = { // replaces BEATS
  1: { name: 'First Words', slotCount: 1, ... },
  2: { name: 'Building Meaning', slotCount: 3, ... },
  3: { name: 'The Plan', slotCount: 5, ... },
}
export const STRIKE_LIMIT = 3
export const HINT_ELIMINATES = 5

// persistence.js
export function loadPersistentState() -> object
export function savePersistentState(state) -> void
export function resetPersistentState() -> void
```

**Checkpoint**: Save to MEMORY.md, verify build passes.

---

## Phase 2: Game State Refactor (P1 Core)

**Goal**: Refactor gameState.jsx to support acts, strikes, roguelike persistence, answer submission, hints, and new run lifecycle.

**Files to modify**:
- `src/engine/gameState.jsx` -- major refactor: add strikes, currentAct, roguelike fields, submitAnswer(), useHint(), startNewRun()
- `src/engine/languageFramework.js` -- rename beat refs to act, adjust shouldAdvanceBeat→shouldAdvanceAct
- `src/engine/nudgeSystem.js` -- add repeat-run shorter thresholds
- `src/context/GameContext.jsx` -- ensure re-exports still work
- `src/data/mockGameState.js` -- update mock to use acts

**Agent swarm**: 2 parallel agents
- Agent A: gameState.jsx + mockGameState.js (state provider)
- Agent B: languageFramework.js + nudgeSystem.js (pure functions)

**RALPH loop**:
1. **Red**: Define new useGame() interface with all P4 fields + actions
2. **Assert**: submitAnswer(['acknowledge']) on Act 1 returns { correct: true }. submitAnswer(['star']) returns { correct: false } and increments strikes. 3 strikes triggers gameover phase.
3. **Loop**: Implement state changes, persistence integration, answer validation
4. **Prove**: Full lifecycle test -- preamble→act1→act2→act3→victory. Also: preamble→act1→3 strikes→gameover→newRun
5. **Harden**: Edge cases -- submit during transition, hint when no decoys left, double-submit prevention

**New state shape additions**:
```js
{
  // Renamed
  currentAct: 1,           // was currentBeat

  // New per-run (reset each run)
  strikes: 0,
  eliminatedCards: [],
  gamePhase: 'preamble',   // 'preamble'|'playing'|'transition'|'victory'|'gameover'

  // New persistent (survive across runs)
  actSolvedBefore: { 1: false, 2: false, 3: false },
  runNumber: 1,
  totalTime: 0,
  totalSubmissions: 0,
  correctSubmissions: 0,
  // confirmedConcepts already persists (just add to localStorage)
  // failedAttempts already exists (add persistence)
  observedPatterns: [],

  // New computed
  isRepeatRun: false,       // derived from runNumber > 1

  // New actions
  submitAnswer: (cardIds: string[]) => { correct: boolean, strikes: number },
  useHint: () => { eliminatedCards: string[], strikes: number },
  startNewRun: () => void,
  openAnswerPanel: () => void,
  closeAnswerPanel: () => void,
  answerPanelOpen: false,
}
```

**Checkpoint**: Save to MEMORY.md, verify build passes, demo mode works.

---

## Phase 3: Beat→Act Rename Across Codebase

**Goal**: Atomic rename of `currentBeat`→`currentAct`, `beat`→`act` in all consumer files. No logic changes, just naming.

**Files to modify** (all consumers of `currentBeat` or `beat` from useGame):
- `src/components/GameScreen.jsx`
- `src/components/AlienDisplay.jsx` (via identifyPattern, reads alienOutput not beat directly -- verify)
- `src/components/ClueLog.jsx`
- `src/components/EnvironmentEffects.jsx` -- `currentBeat`→`currentAct`, `BEAT_GRADIENTS`→`ACT_GRADIENTS`
- `src/components/PlayerControls.jsx` -- `currentBeat`→`currentAct`
- `src/components/DemoControls.jsx` -- `setBeat`→`setAct`, beat buttons→act buttons
- `src/prompts/alienSystemPrompt.js` -- `currentBeat`→`currentAct` in prompt text
- `src/bridge/server.js` -- if gameState references beat

**Agent swarm**: 3 parallel agents (each handles 2-3 files)
- Agent A: EnvironmentEffects + DemoControls (heavy beat references)
- Agent B: PlayerControls + GameScreen + ClueLog
- Agent C: alienSystemPrompt + bridge files

**RALPH loop**:
1. **Red**: grep -r "beat" to find all references
2. **Assert**: Zero occurrences of "currentBeat" in codebase after rename (except comments explaining the change)
3. **Loop**: Search-replace with context awareness (don't rename "heartbeat" or unrelated uses)
4. **Prove**: `npm run dev` starts clean, demo mode renders, all components reference `currentAct`
5. **Harden**: Verify backward compat layer in GameContext.jsx

**Checkpoint**: Save to MEMORY.md, verify build + visual check.

---

## Phase 4: New P2 Components (Visual Layer)

**Goal**: Build AnswerPanel, ActLabel (with strikes), ActTransition, EndScreen. Integrate into GameScreen layout.

**Files to create**:
- `src/components/AnswerPanel.jsx` -- card grid, answer slots, submit/hint/clear buttons
- `src/components/ActLabel.jsx` -- act name + 3 strike circles
- `src/components/ActTransition.jsx` -- between-act celebration screens
- `src/components/EndScreen.jsx` -- victory and gameover screens with stats

**Files to modify**:
- `src/components/GameScreen.jsx` -- integrate new components into layout
- `src/components/ClueLog.jsx` -- add observed (yellow) state, show run number on entries
- `src/App.jsx` -- handle new gamePhase values (transition, victory, gameover)

**Agent swarm**: 4 parallel agents (one per new component), then 1 integration agent
- Agent A: AnswerPanel.jsx (most complex -- card grid, slots, hint dialog)
- Agent B: ActLabel.jsx (simple -- act name + strike marks)
- Agent C: ActTransition.jsx (animation sequence between acts)
- Agent D: EndScreen.jsx (victory + gameover screens with stats)
- Agent E (sequential, after A-D): Integration into GameScreen + App + ClueLog updates

**RALPH loop per component**:

### AnswerPanel.jsx
1. **Red**: Must render 15 cards in grid, N answer slots, submit/hint/clear buttons
2. **Assert**: Tapping card adds to slot. Tapping filled slot removes. Submit validates. Hint grays out 5 cards.
3. **Loop**: Build with Framer Motion slide-up, card grid with tap handlers, slot array
4. **Prove**: Full answer flow -- select cards, submit correct answer, submit wrong answer (strike feedback)
5. **Harden**: Prevent double-submit, handle all 15 cards selected edge case, responsive grid

### ActLabel.jsx
1. **Red**: Shows "ACT 1: First Words" + 3 circles
2. **Assert**: Circles fill red matching strike count from useGame()
3. **Loop**: Simple component, motion.div for strike fill animation
4. **Prove**: Strike 0/1/2/3 all render correctly
5. **Harden**: Smooth transition between strike states

### ActTransition.jsx
1. **Red**: Full-screen overlay with celebration text + alien emotion
2. **Assert**: Shows correct text per act transition, auto-dismisses after delay
3. **Loop**: Similar structure to NarrativePreamble (timed text sequence)
4. **Prove**: Act 1→2 and 2→3 transitions both render correctly
5. **Harden**: Cannot interact during transition, proper phase cleanup

### EndScreen.jsx
1. **Red**: Victory shows stats (runs, time, accuracy). Gameover shows clue count + "Try Again"
2. **Assert**: Victory renders all stats from useGame(). Gameover calls startNewRun() on button click.
3. **Loop**: Two modes based on gamePhase, motion animations
4. **Prove**: Both screens render with mock data
5. **Harden**: "Play Again" also works on victory, stats formatted nicely

**Checkpoint**: Save to MEMORY.md, verify build + all new components render in demo mode.

---

## Phase 5: AlienDisplay Strike Reactions + ClueLog States

**Goal**: Add strike animations to alien, update clue log for 3 states.

**Architecture note**: AlienDisplay now uses CSS drop-shadow glow (not postprocessing Bloom). Strike reactions can layer via:
- CSS glow override (red drop-shadow pulse) on the Canvas wrapper div
- Shader uniform for shake displacement (already has noise displacement in vertex shader)
- CSS transform for recoil (scale/translate on wrapper div)

**Files to modify**:
- `src/components/AlienDisplay.jsx` -- add strike reaction (CSS red glow flash + shake via wrapper div transform)
- `src/three/AlienMesh.jsx` -- optional: add shake amplitude uniform for displacement boost
- `src/components/ClueLog.jsx` -- confirmed (green), failed (gray), observed (yellow) states

**Agent swarm**: 2 parallel agents
- Agent A: AlienDisplay + AlienMesh (strike reaction via CSS glow + optional shader shake)
- Agent B: ClueLog (3-state rendering)

**RALPH loop**:
1. **Red**: Strike 1 = brief shake + red CSS glow flash (200ms). Strike 2 = harder shake, red holds longer (1s). Strike 3 = recoil + fade off screen.
2. **Assert**: Passing `strikes` changes triggers visible reaction on alien
3. **Loop**: Implement via CSS glow override (red drop-shadow) + CSS transform (shake/recoil) on wrapper div. AlienMesh keeps current emotion system untouched.
4. **Prove**: Demo controls can trigger strikes, visual feedback is clear
5. **Harden**: Strike animation doesn't permanently alter emotion glow state; reverts after animation

**Checkpoint**: Save to MEMORY.md, verify build + visual check of strike reactions.

---

## Phase 6: System Prompt + Bridge Updates

**Goal**: Update Claude system prompt for acts/strikes/roguelike awareness. Update bridge payloads.

**Files to modify**:
- `src/prompts/alienSystemPrompt.js` -- acts, strikes, repeat run context, card-based answers
- `src/bridge/server.js` -- expanded gameState payload
- `src/bridge/useBridge.js` -- no changes expected (generic transport)

**Agent swarm**: Single agent (sequential, prompt is nuanced)

**RALPH loop**:
1. **Red**: Prompt must instruct Claude about act structure, that answers are card-based, strike implications
2. **Assert**: Built prompt includes act number, strikes remaining, repeat run flag, confirmed concepts
3. **Loop**: Rewrite prompt sections for act-based play
4. **Prove**: JSON output still matches alien response schema
5. **Harden**: Test prompt with mock inputs for each act

**Checkpoint**: Save to MEMORY.md, verify build.

---

## Phase 7: P3 Integration + Polish

**Goal**: Wire answer panel toggle to dim/disable player controls. Final integration testing.

**Files to modify**:
- `src/components/PlayerControls.jsx` -- read `answerPanelOpen`, apply disabled/dimmed state
- `src/components/DemoControls.jsx` -- add act/strike/answer demo controls

**Agent swarm**: 2 parallel agents
- Agent A: PlayerControls integration
- Agent B: DemoControls update

**RALPH loop**:
1. **Red**: When answer panel opens, player controls dim with opacity transition
2. **Assert**: Controls are non-interactive while answer panel is open
3. **Loop**: Add opacity/pointer-events based on `answerPanelOpen`
4. **Prove**: Toggle answer panel, verify controls disable/enable
5. **Harden**: Audio stops when controls disable, resumes on re-enable

**Checkpoint**: Save to MEMORY.md, full integration test.

---

## Phase 8: Full Integration Test + Demo Mode

**Goal**: End-to-end verification in demo mode. All phases compose correctly.

**Test scenarios**:
1. Preamble → Act 1 (alien sends pattern) → Player experiments → Opens answer panel → Submits correct answer → Act transition → Act 2
2. Act 1 → Wrong answer (strike 1) → Wrong answer (strike 2) → Hint (strike 3) → Game over → Try Again → New run with persisted clues
3. Full run: Act 1 → Act 2 → Act 3 → Victory screen with stats
4. Repeat run: Previous clues visible, faster pacing
5. Edge cases: Submit during transition, hint with no decoys remaining, all strikes used on hints

**Agent swarm**: Single agent for holistic testing

**Checkpoint**: Final MEMORY.md update with completed P4 status.

---

## Phase Dependency Graph

```
Phase 1 (Constants)
    ↓
Phase 2 (Game State) ←── Phase 3 (Rename) can run in parallel
    ↓                         ↓
    └─────────┬───────────────┘
              ↓
Phase 4 (New Components) ←── Phase 5 (Strike/Clue Visual) parallel
              ↓                         ↓
              └─────────┬───────────────┘
                        ↓
              Phase 6 (Prompt/Bridge)
                        ↓
              Phase 7 (P3 Integration)
                        ↓
              Phase 8 (Full Test)
```

## Files Changed Summary

### New files (4):
- `src/engine/persistence.js`
- `src/components/AnswerPanel.jsx`
- `src/components/ActLabel.jsx`
- `src/components/ActTransition.jsx`
- `src/components/EndScreen.jsx`

### Modified files (15):
- `src/constants.js`
- `src/engine/gameState.jsx`
- `src/engine/languageFramework.js`
- `src/engine/nudgeSystem.js`
- `src/data/mockGameState.js`
- `src/context/GameContext.jsx`
- `src/App.jsx`
- `src/components/GameScreen.jsx`
- `src/components/AlienDisplay.jsx`
- `src/components/ClueLog.jsx`
- `src/components/EnvironmentEffects.jsx`
- `src/components/PlayerControls.jsx`
- `src/components/DemoControls.jsx`
- `src/prompts/alienSystemPrompt.js`
- `src/bridge/server.js`

### Untouched files:
- `src/components/NarrativePreamble.jsx` (no beat/act references)
- `src/components/ColorWheel.jsx` (no changes needed)
- `src/components/MorseCodePad.jsx` (no changes needed)
- `src/components/VoiceInput.jsx` (no changes needed)
- `src/audio/toneGenerator.js` (no changes needed)
- `src/audio/voiceAnalyzer.js` (no changes needed)
- `src/bridge/useBridge.js` (generic transport, no changes)
- `src/shaders/alienShaders.js` (strike animation via existing pattern system)
- `src/three/AlienMesh.jsx` (strike via emotion override, not shader change)
- `src/three/useEmotionLerp.js` (no changes needed)

### Out of scope (sensor infrastructure -- separate branch):
- `sensors/` directory (Python H10/hand tracking experiments, not integrated)
- `bridge/` root directory (only on feat/sensor-integration, not master)
- `src/bridge/useSensorStream.js` (only on feat/sensor-integration)
- `src/components/SensorDebugPanel.jsx` (only on feat/sensor-integration)
- `docs/SIGNAL_ARCHITECTURE.md` (only on feat/sensor-integration)

## Estimated Complexity: HIGH
- 8 phases, ~20 files touched
- Each phase is self-contained and completable in one context window
- Agent swarms reduce wall-clock time by ~40%
- RALPH loops catch regressions early
