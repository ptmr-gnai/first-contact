# SIGNAL — Application Architecture & Sensor Integration Context

## Overview

**SIGNAL** is a 5-minute playable alien communication experience. The player is stranded in space, encounters an alien entity, and must establish communication through light, sound, and pattern-based input. Built for the AI Tinkerers Hackathon (2/21/26).

The game explores **non-verbal communication** — perfect context for integrating physiological and gestural sensors as alternative input channels.

---

## Game Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    PREAMBLE     │ ──► │   GAME SCREEN   │ ──► │   RESOLUTION    │
│  (text crawl)   │     │ (main gameplay) │     │  (ending)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 1: Preamble
- Sci-fi text crawl setting the scene
- 6 lines fade in sequentially
- Auto-advances to game screen

### Phase 2: Game Screen (Main Gameplay)
- Player communicates with alien through various input methods
- Alien responds with light patterns, sounds, emotions
- Progress through 3 narrative "beats"
- Build up confirmed communication concepts

### Phase 3: Resolution
- Triggered when key concepts confirmed in beat 3
- Warm amber ending sequence
- Fade to black

---

## Narrative Beats

| Beat | Theme | Tone | Alien State |
|------|-------|------|-------------|
| 1 | First Contact | Cold, dark, uncertain | Curious, cautious |
| 2 | Breakthrough | Warmer, purple-blue | Excited, hopeful |
| 3 | The Plan | Warm amber/gold | Grateful, connected |

Beat progression unlocks new input modes and concepts.

---

## Screen Layout

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                    ENVIRONMENT EFFECTS                           │
│                 (starfield, mood lighting)                       │
│                                                                  │
│  ┌────────────────────────────────────────────┐  ┌────────────┐ │
│  │                                            │  │            │ │
│  │              ALIEN DISPLAY                 │  │  CLUE LOG  │ │
│  │                                            │  │            │ │
│  │         - Crystalline SVG form             │  │ Confirmed: │ │
│  │         - Emotional states                 │  │  • Yes ✓   │ │
│  │         - Light patterns                   │  │  • No ✓    │ │
│  │         - Glow effects                     │  │            │ │
│  │                                            │  │ Failed:    │ │
│  │                                            │  │  • Energy  │ │
│  └────────────────────────────────────────────┘  │            │ │
│                                                  └────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐
│  │                    PLAYER CONTROLS                           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │  │  Color  │  │  Morse  │  │  Voice  │   ← tabs (beat 2+)   │
│  │  └─────────┘  └─────────┘  └─────────┘                      │
│  │                                                              │
│  │  [Active input component based on selected tab]              │
│  └──────────────────────────────────────────────────────────────┘
│                                                                  │
│  [Demo Controls] ← dev panel, bottom-left                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
App.jsx
├── GameEngineProvider (context wrapper)
│   ├── NarrativePreamble (phase: preamble)
│   ├── GameScreen (phase: game)
│   │   ├── EnvironmentEffects (background starfield + mood)
│   │   ├── AlienDisplay (SVG alien + emotions + light patterns)
│   │   ├── ClueLog (sidebar: confirmed/failed concepts)
│   │   ├── PlayerControls (input container)
│   │   │   ├── ColorWheel (color picker input)
│   │   │   ├── MorseCodePad (tap pattern input)
│   │   │   └── VoiceInput (speech input)
│   │   └── DemoControls (dev panel)
│   └── Resolution (phase: resolution)
```

---

## File Structure

```
src/
├── App.jsx                    # Phase routing (preamble → game → resolution)
├── main.jsx                   # Entry point
├── index.css                  # Tailwind v4 theme
├── constants.js               # BEATS, CONCEPTS, defaults
│
├── engine/
│   ├── gameState.jsx          # Central state provider (GameEngineProvider)
│   ├── languageFramework.js   # Concept matching logic
│   └── nudgeSystem.js         # Inactivity nudge logic
│
├── context/
│   └── GameContext.jsx        # Re-exports useGame() for compatibility
│
├── bridge/
│   ├── server.js              # WebSocket server for AI brain
│   └── useBridge.js           # React hook for bridge connection
│
├── components/
│   ├── AlienDisplay.jsx       # SVG alien + emotions + light patterns
│   ├── ClueLog.jsx            # Collapsible sidebar
│   ├── ColorWheel.jsx         # Color picker input
│   ├── MorseCodePad.jsx       # Morse code tap input
│   ├── VoiceInput.jsx         # Speech-to-text input
│   ├── DemoControls.jsx       # Dev panel
│   ├── EnvironmentEffects.jsx # Starfield background
│   ├── GameScreen.jsx         # Main game layout
│   ├── NarrativePreamble.jsx  # Opening crawl
│   ├── PlayerControls.jsx     # Input tab container
│   └── Resolution.jsx         # Ending sequence
│
├── audio/
│   ├── toneGenerator.js       # Alien sound synthesis
│   └── voiceAnalyzer.js       # Voice input processing
│
├── prompts/
│   └── alienSystemPrompt.js   # LLM prompt for alien brain
│
└── data/
    └── mockGameState.js       # Mock data for demo mode
```

---

## Game State (useGame Hook)

The `useGame()` hook provides all game state and actions:

### State

| Field | Type | Description |
|-------|------|-------------|
| `currentBeat` | `1 \| 2 \| 3` | Current narrative beat |
| `alienEmotion` | `string` | curious, excited, frustrated, hopeful, grateful |
| `confirmedConcepts` | `array` | Successfully decoded communication patterns |
| `failedAttempts` | `array` | Failed pattern attempts |
| `alienOutput` | `object` | Current alien response (light, sound, emotion) |
| `interactionHistory` | `array` | Full turn-by-turn history |
| `isProcessing` | `boolean` | Waiting for alien response |
| `turnCount` | `number` | Total turns taken |

### Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `submitPlayerInput` | `(input) => void` | Send player input to game engine |
| `setEmotion` | `(emotion) => void` | Directly set alien emotion |
| `setBeat` | `(beat) => void` | Directly set narrative beat |
| `triggerLightPattern` | `(pattern) => void` | Trigger alien light pattern |
| `clearLightPattern` | `() => void` | Clear current light pattern |

### Alien Output Structure

```javascript
{
  emotion: 'curious',           // Alien's emotional state
  light: {
    colors: ['#00ff00'],        // Pattern colors
    timing: 'pulse',            // Animation type
    intensity: 0.8              // Brightness 0-1
  },
  sound: {
    pitches: [440, 550, 660],   // Frequencies in Hz
    rhythm: [0.2, 0.2, 0.4],    // Note durations
    duration: [0.15, 0.15, 0.3] // Actual sound lengths
  },
  conceptConfirmed: 'yes'       // If a concept was confirmed this turn
}
```

---

## Input Methods (Current)

### ColorWheel
- Visual color picker
- Player selects color to communicate
- Input: `{ type: 'color', hue: 0-360, saturation: 0-100, brightness: 0-100 }`

### MorseCodePad
- Tap interface for rhythm patterns
- Input: `{ type: 'morse', pattern: [100, 200, 100], raw: '.-.' }`

### VoiceInput
- Speech-to-text
- Input: `{ type: 'voice', transcript: 'hello', confidence: 0.95 }`

---

## Alien Emotions

| Emotion | Visual | Behavior |
|---------|--------|----------|
| `curious` | Soft blue glow | Gentle floating, attentive |
| `excited` | Bright, pulsing | Expanding, fast movement |
| `frustrated` | Dim, muted | Contracting, slow |
| `hopeful` | Warm golden | Steady rhythmic pulse |
| `grateful` | Radiant bright | Expanded, peaceful |

---

## Communication Concepts

Concepts are the "vocabulary" being established:

| Concept | Alien Light | Meaning |
|---------|-------------|---------|
| `yes` | Green expanding rings | Acknowledgment |
| `no` | Red sustained aura | Negation / danger |
| `self` | Blue rings inward | "Me" / the alien |
| `other` | Blue rings outward | "You" / the player |
| `energy` | Yellow strobe | Power / resource |
| `direction` | White sweeping arc | Path / movement |
| `home` | Amber breathing glow | Origin / destination |

---

## Modes

### Demo Mode (default)
- `?mode=demo` or no parameter
- Uses mock data
- No bridge connection
- DemoControls panel active

### Live Mode
- `?mode=live`
- Connects to bridge server
- Real AI-driven alien responses
- Full game loop active

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| State | React Context |
| Audio | Web Audio API |

---

## Sensor Integration Points

### Option A: New Input Tabs

Add alongside Color/Morse/Voice in PlayerControls:

```
[Color] [Morse] [Voice] [Gesture] [Spatial]
                         ↑          ↑
                    hand tracking  position game
```

### Option B: Ambient Signals

Sensors run continuously, influencing game without explicit input:

```
┌─────────────────────────────────────────────────────────────┐
│  AMBIENT LAYER (always running)                             │
│  • HR → influences alien's perception of player stress      │
│  • Body position → lean forward = engaged, alien notices    │
│  • Stillness → patience signal                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    modulates alienEmotion
                    affects response timing
                    unlocks hidden concepts
```

### Option C: Hybrid

- **Explicit inputs**: Hand gestures, spatial position
- **Ambient signals**: HR, body lean, stillness

---

## Available Sensors (from our experiments)

| Sensor | Data | Script | Integration Potential |
|--------|------|--------|----------------------|
| Polar H10 HR | BPM, RR intervals | `hr.py` | Stress/calm detection |
| Polar H10 Accelerometer | Body position, movement | `body_movement.py` | Engagement detection |
| Webcam Hand Tracking | Gestures, finger position | `hand_tracking.py` | Gestural input |
| Webcam Body Pose | Lean, posture | `body_position.py` | Engagement detection |
| Spatial Position | Object position | `spatial_talk.py` | Positional communication |

---

## Next Steps

1. **Define integration approach** — tabs vs ambient vs hybrid
2. **Build bridge** — Python sensors → WebSocket → React
3. **Create sensor input components** — React components that consume sensor data
4. **Wire into game state** — `submitPlayerInput` or ambient modulation
5. **Test end-to-end** — Full sensor → alien response loop
