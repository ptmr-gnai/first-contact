# SIGNAL

A 5-minute playable alien communication experience. You are stranded in space, encounter an alien, and must communicate through light, sound, and pattern-based input. Built for the AI Tinkerers Hackathon (2/21/26).

## Quick Start

```bash
npm install
npm run dev
```

Open the URL shown in your terminal (typically `http://localhost:5173`).

## Demo Walkthrough

The app runs through three phases automatically:

### 1. Narrative Preamble

A sci-fi text crawl plays on load. Six lines fade in one at a time, setting the scene. Wait for it to finish -- the game screen appears automatically.

### 2. Game Screen (Demo Mode)

This is where the P2 visual demo lives. You will see:

- **Center**: The alien -- a crystalline geometric SVG form with a soft glow
- **Right sidebar**: Clue Log showing confirmed and failed communication patterns (populated with mock data)
- **Bottom**: A placeholder slot labeled `[P3 input controls]` for future input components
- **Bottom-left**: A "Demo" button

#### Using Demo Controls

Click **Demo** in the bottom-left corner to open the dev panel. It has three sections:

**Beat** -- Click 1, 2, or 3 to switch narrative beats.
- Beat 1: Cold/dark space tones (first contact)
- Beat 2: Warmer purple-blue hues (breakthrough)
- Beat 3: Warm amber/gold tones (the plan)

Watch the background starfield shift color temperature as you switch.

**Emotion** -- Click any of the five emotions to change the alien's state:
- `curious` -- gentle floating, soft blue glow (default)
- `excited` -- pulsing, expanding, bright fast movement
- `frustrated` -- dimming, contracting, slow muted movement
- `hopeful` -- warm golden glow, steady rhythmic pulse
- `grateful` -- radiant bright glow, expanded peaceful movement

Transitions between emotions interpolate smoothly -- try clicking between different states rapidly to see the blending.

**Light Pattern** -- Click any pattern to trigger the alien's light communication:
- `Yes / Acknowledge` -- three expanding green rings
- `No / Danger` -- sustained red aura
- `Self (me)` -- blue rings contracting inward
- `Other (you)` -- blue rings expanding outward
- `Energy / Power` -- rapid yellow strobe flashes
- `Direction / Path` -- sweeping white arc
- `Home` -- gentle breathing amber glow

Each pattern plays once and auto-clears. Click **Clear** to cancel a pattern early.

#### Clue Log

The sidebar starts open with mock data. Click the `>` chevron to collapse it, `<` to expand. It shows:
- **Confirmed** section: successfully decoded patterns with colored dots
- **Failed** section: dimmed/struck-through failed attempts

### 3. Resolution

Not triggered in demo mode. To see it, you can temporarily change the initial phase in `src/App.jsx`:

```js
const [phase, setPhase] = useState('resolution')  // change 'preamble' to 'resolution'
```

This plays a warm amber text sequence ending with three green pulse indicators and a fade to black.

## Project Structure

```
src/
  components/
    AlienDisplay.jsx        -- SVG alien + emotions + light patterns
    ClueLog.jsx             -- Collapsible pattern history sidebar
    DemoControls.jsx        -- Dev panel for testing visual states
    EnvironmentEffects.jsx  -- Starfield background + mood lighting
    GameScreen.jsx          -- Layout orchestrator
    NarrativePreamble.jsx   -- Opening text crawl
    Resolution.jsx          -- Ending sequence
  context/
    GameContext.jsx          -- React context (game state + actions)
  data/
    mockGameState.js         -- Mock data for all beats, emotions, patterns
  App.jsx                    -- Phase sequencing (preamble -> game -> resolution)
  main.jsx                   -- Entry point
  index.css                  -- Tailwind v4 theme + global styles
```

## Tech Stack

- React 19 + Vite 7
- Tailwind CSS v4
- Framer Motion (animations)

## Build

```bash
npm run build    # production build -> dist/
npm run preview  # preview production build locally
```
