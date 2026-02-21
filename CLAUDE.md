# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SIGNAL is a 5-minute playable alien communication experience built as a React artifact for the AI Tinkerers Hackathon (2/21/26). The player is stranded in space, encounters an alien, and must communicate through light, sound, and pattern-based input -- no chat boxes or dropdowns. Claude API powers the alien's brain.

## Tech Stack

- React (JSX) with Tailwind CSS
- SVG for alien sprite (CSS/JS animations preferred for performance)
- Canvas acceptable for particle effects or complex light patterns
- Claude API for alien intelligence

## Architecture

Three workstreams build independent pieces that compose together:

- **P1 (Engine)**: Game state management via React context, Claude API integration, language framework logic
- **P2 (Visual)**: Alien display, light pattern rendering, clue log, narrative bookends, environment atmosphere
- **P3 (Input/Audio)**: Player input components (ColorWheel, VoiceInput, MorseCodePad) that dock into P2's layout

### Game State Contract

All visual components read from a shared React context provided by the engine:

```js
{
  currentBeat: 1 | 2 | 3,
  alienEmotion: 'curious' | 'excited' | 'frustrated' | 'hopeful' | 'grateful',
  confirmedConcepts: [{ id, label, alienLight, playerResponse }],
  failedAttempts: [...],
  alienOutput: { light, sound, emotion, conceptConfirmed, narrative, nudge },
  interactionHistory: [...],
  elapsedTime: number
}
```

### Alien Output Schema

```json
{
  "light": { "colors": [], "timing": [], "intensity": [] },
  "sound": { "pitches": [], "rhythm": [], "duration": [] },
  "emotion": "string",
  "conceptConfirmed": "string | null",
  "narrative": "string | null",
  "nudge": "boolean"
}
```

### Layout Hierarchy

GameScreen orchestrates the layout: EnvironmentEffects as full background, AlienDisplay center stage, ClueLog collapsible sidebar, P3 input controls docked at bottom.

## Key Components (P2 -- Visual)

- `GameScreen.jsx` -- Main layout orchestrator
- `AlienDisplay.jsx` -- SVG alien sprite with emotional states and light pulse effects
- `ClueLog.jsx` -- Sidebar of confirmed/failed communication patterns
- `NarrativePreamble.jsx` -- Opening text crawl
- `EnvironmentEffects.jsx` -- Background atmosphere shifting with mood/beat
- `Resolution.jsx` -- Ending sequence

## Alien Emotional States

Each state has distinct visual characteristics (glow, movement speed, color temperature, scale):
- **Curious** (default): gentle ambient movement, soft neutral glow
- **Excited**: pulsing, expanding, brighter, faster
- **Frustrated**: dimming, contracting, slower, muted
- **Hopeful**: warm glow, steady rhythmic pulse
- **Grateful**: radiant, expansive, peaceful

Transitions between states must interpolate smoothly, never hard-cut.

## Predefined Light Language

| Concept | Pattern |
|---------|---------|
| Yes/Acknowledge | 3 short green pulses |
| No/Danger | Sustained red glow |
| Self (me) | Soft blue pulse inward |
| Other (you) | Soft blue pulse outward |
| Energy/Power | Rapid yellow flicker |
| Direction/Path | Sweeping white arc |
| Home | Warm amber slow pulse |

Each must render as a visually distinct pattern emanating from the alien.

## Narrative Beats

1. **First Contact** (~90s): Dark/cold tones, alien appears curious, simple patterns
2. **Breakthrough** (~2min): Communication clicks, environment warms, clue log populates
3. **The Plan** (~90s): Collaborative puzzle, environment brightens, resolution/farewell

## Style Rules

- Dark space background; alien and its light patterns are the brightest elements
- UI chrome (clue log, controls) stays subdued
- Typography: minimal, clean, slightly futuristic
- Feeling progression: isolated -> gradually warm and connected
- No emdashes in any text content (use -- or rewrite)
- Alien form: abstract/geometric/luminous, not humanoid
- Alien's base appearance should be neutral to contrast against light communications

## Development Notes

- All components should work with mock/hardcoded data for independent development
- P2 deliverable checkpoint: render alien in all emotional states, play a hardcoded light pattern sequence, show populated clue log with mock data -- no API connection needed
