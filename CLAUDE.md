# SIGNAL: Alien Communication Experience

## Project Overview
SIGNAL is a 5-minute playable experience built as a React artifact for a hackathon. The player is stranded in space, encounters an alien, and must figure out how to communicate using light, sound, and pattern-based input to collaborate on a plan to get home. Think Project Hail Mary: mutual discovery of language between two beings who both need each other.

The interface IS the game. No chat boxes. No dropdowns. Communication happens through color pulses, tonal patterns, and rhythmic input. Claude powers the alien's brain via API, maintaining a consistent emergent language framework across each session.

## Tech Stack

- React (JSX) with Tailwind CSS
- SVG for alien sprite (CSS/JS animations preferred for performance)
- Canvas acceptable for particle effects or complex light patterns
- Claude API for alien intelligence
- Framer Motion for animations

## Architecture

Three workstreams build independent pieces that compose together:

- **P1 (Engine)**: Game state management via React context, Claude API integration, language framework logic
- **P2 (Visual)**: Alien display, light pattern rendering, clue log, narrative bookends, environment atmosphere
- **P3 (Input/Audio)**: Player input components (ColorWheel, VoiceInput, MorseCodePad) that dock into P2's layout

## P1: The Alien Brain (Engine + API)

### P1 Files
- `src/constants.js` - Shared concept mappings, beat definitions, emotional state enums, input/output schemas
- `src/prompts/alienSystemPrompt.js` - Claude system prompt template
- `src/engine/alienBrain.js` - API call wrapper
- `src/engine/gameState.js` - React context provider
- `src/engine/languageFramework.js` - Concept confirmation logic
- `src/engine/nudgeSystem.js` - Timer-based stuck detection

### Alien Response Schema
```json
{
  "light": {
    "colors": ["green", "green", "green"],
    "timing": [200, 200, 200],
    "intensity": [0.8, 0.8, 0.8]
  },
  "sound": {
    "pitches": [440, 440, 440],
    "rhythm": [200, 200, 200],
    "duration": [150, 150, 150]
  },
  "emotion": "curious",
  "conceptConfirmed": null,
  "narrative": null,
  "nudge": false,
  "alienIntent": "trying to establish basic acknowledgment pattern",
  "internalState": {
    "comprehensionLevel": 0.0,
    "urgency": 0.3,
    "confidence": 0.2
  }
}
```

### Player Input Schema
```json
{
  "type": "color" | "voice" | "morse",
  "colors": [],
  "timing": [],
  "holdDuration": [],
  "pitchContour": [],
  "rhythm": [],
  "volume": [],
  "pattern": [],
  "timestamp": number
}
```

### What Claude Receives Each Turn
```json
{
  "playerInput": {
    "type": "color",
    "colors": ["green", "green", "green"],
    "timing": [210, 195, 205],
    "holdDuration": [0, 0, 0],
    "timestamp": 1234567890
  },
  "gameState": {
    "currentBeat": 1,
    "confirmedConcepts": [],
    "recentHistory": [
      { "turn": 1, "alien": { "light": {}, "emotion": "curious" }, "player": null },
      { "turn": 2, "alien": null, "player": { "type": "color", "colors": ["red"] } }
    ],
    "timeSinceLastInput": 3200,
    "totalElapsed": 45000
  }
}
```

## Predefined Language Framework

| Concept | ID | Alien Light | Alien Sound | Player Match Criteria |
|---------|----|------------|-------------|----------------------|
| Yes/Acknowledge | `acknowledge` | 3 short green pulses | 3 short high tones (440Hz) | 3 quick inputs of any kind, or green color selection |
| No/Danger | `danger` | Sustained red glow | Low sustained hum (110Hz) | Sustained/held input, or red color selection |
| Self (me) | `self` | Soft blue pulse inward | Medium rising tone (220-440Hz) | Blue color, or inward/contracting gesture |
| Other (you) | `other` | Soft blue pulse outward | Medium falling tone (440-220Hz) | Blue color directed outward, or pointing gesture |
| Energy/Power | `energy` | Rapid yellow flicker | Staccato bright tones (880Hz) | Fast repeated tapping, or yellow color |
| Direction/Path | `direction` | Sweeping white arc | Sliding tone (220-880Hz) | Sweeping input, or white color |
| Home | `home` | Warm amber slow pulse | Gentle repeating melody (330Hz) | Slow deliberate input, or amber/orange color |

### Concept Confirmation Logic
- Exact match: player reproduces pattern closely (timing within 30% tolerance, correct color) = confirmed
- Partial match: some elements right (right color, wrong timing) = alien shows partial recognition
- No match: alien shows mild frustration, tries again or different concept
- Confirmation threshold should be forgiving -- this is a 5-minute experience

### Compound Concepts (Beat 2+)
- `home` + `danger` = "our home situation is dire"
- `direction` + `home` = "the path home"
- `energy` + `direction` = "we need power to move"
- `self` + `other` + `home` = "we both need to get home"

## Narrative Arc (3 Beats)

### Beat 1: First Contact (~90 seconds)
- Alien initiates with simple single-concept patterns
- Goal: get at least 1 concept confirmed (ideally `acknowledge`)
- Alien emotion: curious -> excited on first confirmation
- If no input for 15s: alien nudges with simpler pattern
- Beat transition: first concept confirmed AND 60+ seconds elapsed

### Beat 2: Breakthrough (~2 minutes)
- Alien starts combining confirmed concepts
- Goal: 3-5 concepts confirmed, alien communicates it also needs to get home
- Key narrative moment: alien uses `self` + `home` + `danger` to reveal its situation
- Morse code input unlocks for player
- Beat transition: alien has communicated "also stranded" AND 3+ concepts confirmed

### Beat 3: The Plan (~90 seconds)
- Alien proposes collaborative plan using shared language
- Something like: `energy` + `direction` + `self` + `other` = "combine our power and navigate together"
- Player must respond with new compound concept
- Resolution trigger: player successfully combines 2+ concepts in novel way
- Alien emotion shifts to grateful, game ends

## Nudge System
- Track `timeSinceLastInput` in game state
- 15 seconds no input: `nudge: true`, alien simplifies current pattern
- 30 seconds no input: alien tries completely different concept
- 45 seconds no input: alien does something dramatic to re-engage
- After ANY player input, reset nudge timer

## P2: Visual Components (Built)

- `GameScreen.jsx` -- Main layout orchestrator
- `AlienDisplay.jsx` -- SVG alien sprite with emotional states and light pulse effects
- `ClueLog.jsx` -- Sidebar of confirmed/failed communication patterns
- `NarrativePreamble.jsx` -- Opening text crawl
- `EnvironmentEffects.jsx` -- Background atmosphere shifting with mood/beat
- `Resolution.jsx` -- Ending sequence
- `DemoControls.jsx` -- Dev panel for testing visual states

## Alien Emotional States

Each state has distinct visual characteristics (glow, movement speed, color temperature, scale):
- **Curious** (default): gentle ambient movement, soft neutral glow
- **Excited**: pulsing, expanding, brighter, faster
- **Frustrated**: dimming, contracting, slower, muted
- **Hopeful**: warm glow, steady rhythmic pulse
- **Grateful**: radiant, expansive, peaceful

Transitions between states must interpolate smoothly, never hard-cut.

## Style Rules

- Dark space background; alien and its light patterns are the brightest elements
- UI chrome (clue log, controls) stays subdued
- Typography: minimal, clean, slightly futuristic
- Feeling progression: isolated -> gradually warm and connected
- No emdashes in any text content (use -- or rewrite)
- Alien form: abstract/geometric/luminous, not humanoid
- Alien's base appearance should be neutral to contrast against light communications

## P3: Player Input + Audio

### P3 Files
- `src/components/ColorWheel.jsx` - Primary player input. Select, pulse, and sequence colors
- `src/components/VoiceInput.jsx` - Mic capture analyzing tonal characteristics, not words
- `src/components/MorseCodePad.jsx` - Rhythmic tap interface, unlocked in Beat 2
- `src/components/PlayerControls.jsx` - Container that docks inputs into GameScreen layout
- `src/audio/toneGenerator.js` - Web Audio API. Plays the alien's sound patterns
- `src/audio/voiceAnalyzer.js` - Pitch detection and rhythm extraction from mic input

### ColorWheel.jsx - Primary Input
Interaction model:
- Player sees a circular color palette with 6 key colors: green, red, blue, yellow, white, amber
- Tap a color = short pulse (dot). Hold a color = sustained glow (dash/hold)
- Sequence multiple taps = a pattern (e.g., tap green three times)
- Visual feedback: selected color glows/ripples on each interaction
- Pattern preview strip shows the sequence being built
- Auto-submits after 1.5s of no input (batches the sequence)
- Must feel like an instrument, not a form

Output event:
```json
{
  "type": "color",
  "colors": ["green", "green", "green"],
  "timing": [210, 195, 205],
  "holdDuration": [0, 0, 0],
  "timestamp": 1234567890
}
```

### VoiceInput.jsx - Tonal Capture
The alien understands pitch, rhythm, and volume -- not words. Player hums, clicks, makes tonal sounds.
- Push-to-talk mic button (hold to record, release to submit)
- Real-time waveform visualization while recording
- Extract tonal features on release via voiceAnalyzer.js
- Max 3-5 seconds per recording

Output event:
```json
{
  "type": "voice",
  "pitchContour": [220, 235, 280, 310, 440],
  "rhythm": [0, 200, 400, 550, 800],
  "volume": [0.6, 0.7, 0.8, 0.7, 0.5],
  "duration": 1200,
  "timestamp": 1234567890
}
```

### MorseCodePad.jsx - Rhythmic Tap Input
Unlocked in Beat 2. Single large tappable area for dot/dash patterns.
- Short tap = dot, long press = dash (threshold ~250ms)
- Visual feedback: pad lights up on contact
- Auto-submits after 1.5s of no input

Output event:
```json
{
  "type": "morse",
  "pattern": [".", "-", ".", "."],
  "timing": [0, 300, 600, 850],
  "holdDuration": [80, 400, 80, 80],
  "timestamp": 1234567890
}
```

### toneGenerator.js - The Alien's Voice
Takes `alienOutput.sound` and plays it through Web Audio API:
- Shared AudioContext (created on first user gesture)
- OscillatorNode (sine wave) + GainNode for volume envelope
- 20ms attack, 50ms release fade on each tone to avoid clicks
- Schedule tones using AudioContext.currentTime for precise timing
- Optional: layer second oscillator with slight detuning for richness

### voiceAnalyzer.js - Pitch Detection
- getUserMedia for mic access
- AudioContext + AnalyserNode for real-time frequency data
- Autocorrelation pitch detection on time-domain data
- Sample at ~20Hz (every 50ms) for pitch contour
- Detect onsets via volume spikes for rhythm extraction

### P3 Integration Points
- All inputs call `submitPlayerInput(input)` from `useGame()` context
- Read `alienOutput.sound` to feed toneGenerator.js
- Read `currentBeat` to control which inputs are visible (color always, morse from beat 2+)
- Components mount inside GameScreen.jsx bottom-docked container (h-32, border-t border-chrome-subtle)
- All components accept a `disabled` prop for preamble/resolution phases
- AudioContext must be created after user gesture (browser autoplay policy)

### P3 Priority Order
1. ColorWheel.jsx - primary input, unblocks integration testing
2. toneGenerator.js - alien needs a voice
3. PlayerControls.jsx - container wiring into GameScreen
4. MorseCodePad.jsx - simpler, unlocked later
5. VoiceInput.jsx + voiceAnalyzer.js - wow factor but complex
6. ambientAudio.js - stretch goal

## Technical Notes
- Claude API: use `claude-sonnet-4-20250514` for speed
- Keep conversation history to last 5-8 turns for token limits
- Parse Claude's JSON responses with error handling; fallback to previous state on malformed JSON
- Debounce player inputs (200-300ms) to batch quick inputs
- System prompt must be firm about JSON-only responses
- Export clear JSDoc comments on all public functions
- Keep code modular -- teammates need to understand interfaces quickly
- AudioContext must be created after a user gesture (browser autoplay policy)
- Web Audio API: test on both Chrome and Safari (Safari has quirks)
- Clean up AudioContext oscillators and nodes to prevent memory leaks
- Keep all audio synthesized in real time, no external audio files
