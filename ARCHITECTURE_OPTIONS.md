# Architecture Options for Multimodal Human↔AI Communication

## The Problem

Build an agentic harness that:
- Ingests: HR/HRV/ECG (Polar H10 via BLE), video (webcam), audio (mic)
- Processes: Face landmarks, gesture detection, physiological signal analysis, speech
- Connects: To Claude via WebSocket or JSON-RPC, bidirectionally
- Outputs: Screen UI, projector visuals, spatial audio, text with timing
- Feels: Hackable, explorable, low-latency, not enterprise-grade

This is a **sensing → reasoning → expression** loop that needs to run continuously with an AI in the loop.

---

## Option 1: Python Monolith with Async Core

```
┌─────────────────────────────────────────────────────────┐
│                    Python (asyncio)                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ BLE/HR  │ │ OpenCV  │ │ PyAudio │ │ Pygame  │       │
│  │ bleak   │ │MediaPipe│ │ Whisper │ │ Visuals │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       └───────────┴───────────┴───────────┘             │
│                       │                                  │
│              ┌────────▼────────┐                        │
│              │  Fusion Engine  │                        │
│              │  (your state)   │                        │
│              └────────┬────────┘                        │
│                       │                                  │
│              ┌────────▼────────┐                        │
│              │ WebSocket Client│ ←→ Claude API          │
│              └─────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Stack:** Python 3.11+, asyncio, bleak, OpenCV, MediaPipe, PyAudio, pygame, websockets

**Pros:**
- You already have pieces of this (polar scripts, fusion work)
- Single language, single process, easy to debug
- MediaPipe and OpenCV are Python-native
- Fastest path to "something working"
- Can run in terminal, no browser needed

**Cons:**
- Python's GIL makes true parallelism hard (video + audio + BLE all competing)
- UI options are limited (pygame, tkinter, or hacky web)
- Gets messy at scale — one file becomes 2000 lines
- Pygame visuals are primitive compared to web/GPU

**Best for:** Quick prototyping, proving the concept works

---

## Option 2: Python Backend + Web Frontend (Split Brain)

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     Python Backend      │     │     Browser Frontend    │
│  ┌─────────┐ ┌────────┐ │     │  ┌─────────┐ ┌────────┐ │
│  │ Sensors │ │ Claude │ │ WS  │  │ Three.js│ │Web Audio│ │
│  │ BLE/CV  │ │  API   │◄├────►│  │ Visuals │ │ Spatial│ │
│  └─────────┘ └────────┘ │     │  └─────────┘ └────────┘ │
│         │               │     │        │                │
│    ┌────▼────┐          │     │   ┌────▼────┐          │
│    │ FastAPI │          │     │   │  React  │          │
│    │   WS    │          │     │   │  Solid  │          │
│    └─────────┘          │     │   └─────────┘          │
└─────────────────────────┘     └─────────────────────────┘
```

**Stack:** Python (FastAPI/Starlette), Browser (React/Solid + Three.js + Web Audio API)

**Pros:**
- Best-in-class visuals (WebGL, shaders, Three.js)
- Spatial audio is trivial (Web Audio API has built-in HRTF)
- UI is infinitely flexible (CSS, canvas, WebGL)
- Natural separation: Python does sensing/AI, browser does expression
- Hot reload on frontend, iterate fast on visuals

**Cons:**
- Two languages, two processes, more complexity
- Webcam access: does Python get it or browser? Can't share easily
- Latency across the WebSocket boundary adds ~5-20ms
- Browser security model can be annoying (permissions, CORS)
- Projector as second display is awkward from browser

**Best for:** Rich visuals, if you're comfortable with JS/TS

---

## Option 3: Electron/Tauri Native App

```
┌─────────────────────────────────────────────────────────┐
│                   Electron / Tauri                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │                  Web View (Chromium)             │    │
│  │   React/Solid + Three.js + Web Audio            │    │
│  └─────────────────────┬───────────────────────────┘    │
│                        │ IPC                             │
│  ┌─────────────────────▼───────────────────────────┐    │
│  │              Native Backend                      │    │
│  │   Electron: Node.js    /    Tauri: Rust         │    │
│  │   - BLE (noble)             - btleplug          │    │
│  │   - OpenCV (opencv4nodejs)  - opencv-rust       │    │
│  │   - Claude WS               - tokio WS          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Stack:** Electron (Node.js + Chromium) or Tauri (Rust + WebView)

**Pros:**
- Native access to BLE, USB, file system, multiple displays
- Web tech for UI (best of both worlds)
- Can open multiple windows (main screen + projector)
- Tauri is fast and small; Electron is easier
- Single distributable app

**Cons:**
- Electron is bloated (200MB+ for Chromium)
- Tauri requires Rust (steep learning curve)
- OpenCV bindings for Node/Rust are less mature than Python
- More infrastructure before you can experiment
- IPC complexity between renderer and main process

**Best for:** If you want a "real app" eventually, or need multi-display

---

## Option 4: Python + Touch Designer / Max/MSP (Creative Coding Hybrid)

```
┌─────────────────────────┐     ┌─────────────────────────┐
│        Python           │     │    TouchDesigner        │
│  ┌─────────┐ ┌────────┐ │ OSC │  ┌─────────┐ ┌────────┐ │
│  │ Sensors │ │ Claude │ │ or  │  │ Visuals │ │ Audio  │ │
│  │  + AI   │ │  API   │◄├────►│  │ GLSL    │ │ CHOP   │ │
│  └─────────┘ └────────┘ │ WS  │  └─────────┘ └────────┘ │
│                         │     │       ↓                 │
│                         │     │   Projector + Screen    │
└─────────────────────────┘     └─────────────────────────┘
```

**Stack:** Python + TouchDesigner (or Max/MSP, Processing, openFrameworks)

**Pros:**
- TouchDesigner is built for this: real-time visuals, multi-display, sensors
- GPU-accelerated everything, 60fps no problem
- Visual programming = fast iteration on aesthetics
- OSC protocol is made for this kind of sensor→visual flow
- Artists/performers use this stack for exactly this reason

**Cons:**
- TouchDesigner is not free (non-commercial license is limited)
- Another tool to learn (node-based, different paradigm)
- Python↔TouchDesigner boundary can be awkward
- Harder to version control, share, reproduce
- Overkill if you don't need fancy visuals

**Best for:** If visuals are primary, or you're doing installation/performance

---

## Option 5: Rust/Zig Native with Minimal UI

```
┌─────────────────────────────────────────────────────────┐
│                    Rust Binary                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │btleplug │ │ opencv  │ │ cpal    │ │ wgpu    │       │
│  │  BLE    │ │  video  │ │  audio  │ │ visuals │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       └───────────┴───────────┴───────────┘             │
│                       │                                  │
│              ┌────────▼────────┐                        │
│              │  State Machine  │                        │
│              └────────┬────────┘                        │
│                       │                                  │
│              ┌────────▼────────┐                        │
│              │ tokio WebSocket │ ←→ Claude API          │
│              └─────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**Stack:** Rust (tokio, btleplug, opencv-rust, cpal, wgpu) or Zig

**Pros:**
- True parallelism, no GIL, real-time guarantees
- Single binary, no runtime dependencies
- wgpu for GPU visuals, cpal for low-latency audio
- If this becomes a product, Rust scales
- Most control over everything

**Cons:**
- Slowest iteration speed (compile times, type system friction)
- Rust OpenCV bindings are finicky
- Way more code to do simple things
- You're building infrastructure, not experimenting
- Premature optimization

**Best for:** If latency is critical (sub-10ms) or this becomes a product

---

## Comparison Matrix

| Criteria                  | Python Mono | Py + Web | Electron/Tauri | TouchDesigner | Rust Native |
|---------------------------|-------------|----------|----------------|---------------|-------------|
| Time to first prototype   | ★★★★★       | ★★★☆☆    | ★★☆☆☆          | ★★★☆☆         | ★☆☆☆☆       |
| Visual quality ceiling    | ★★☆☆☆       | ★★★★★    | ★★★★★          | ★★★★★         | ★★★★☆       |
| Audio flexibility         | ★★★☆☆       | ★★★★☆    | ★★★★☆          | ★★★★★         | ★★★★★       |
| Latency                   | ★★★☆☆       | ★★★☆☆    | ★★★☆☆          | ★★★★☆         | ★★★★★       |
| Multi-display support     | ★★☆☆☆       | ★★☆☆☆    | ★★★★☆          | ★★★★★         | ★★★★☆       |
| Hackability               | ★★★★★       | ★★★★☆    | ★★★☆☆          | ★★★☆☆         | ★★☆☆☆       |
| Code as documentation     | ★★★★★       | ★★★★☆    | ★★★★☆          | ★★☆☆☆         | ★★★★★       |
| Your current familiarity  | ★★★★★       | ★★★☆☆    | ★★☆☆☆          | ★☆☆☆☆         | ★★☆☆☆       |

---

## My Recommendation: Hybrid Path

**Start with Option 1 (Python Monolith) but structure it for Option 2.**

```
first-contact/
├── core/                    # Python - the brain
│   ├── sensors/
│   │   ├── polar.py         # BLE heart rate
│   │   ├── face.py          # MediaPipe face/gesture
│   │   └── audio.py         # Mic input, VAD
│   ├── fusion.py            # Combine all signals into state
│   ├── claude.py            # WebSocket to Claude
│   └── server.py            # Optional: expose state via WS
│
├── expression/              # Can be Python OR web later
│   ├── terminal.py          # Rich/textual TUI (start here)
│   ├── pygame_vis.py        # Simple visuals (step 2)
│   └── web/                 # Graduate to this when ready
│       ├── index.html
│       └── app.js           # Three.js, Web Audio
│
├── protocol.py              # Define the WS message format NOW
└── main.py                  # Glue
```

**Key insight:** Define `protocol.py` first — the messages between components. Then it doesn't matter if expression is pygame or browser.

```python
# protocol.py
from dataclasses import dataclass
from typing import Literal

@dataclass
class HumanState:
    hr: float
    hrv: float
    engagement: float  # derived
    face_landmarks: list | None
    gaze: Literal["screen", "away", "down"]
    gesture: Literal["none", "nod", "shake", "wave"] 
    speaking: bool
    
@dataclass 
class AIExpression:
    text: str | None
    text_timing: list[float] | None  # per-word delays
    audio_spatial: tuple[float, float, float] | None  # x, y, z
    visual_state: dict | None  # whatever the renderer needs
    pulse_hz: float | None  # for entrainment
```

**Why this path:**
1. You get something working THIS WEEK in Python
2. The protocol means you can swap renderers without rewriting core
3. When pygame feels limiting, add `server.py` and build web frontend
4. You're not blocked by learning Rust/Electron/TouchDesigner
5. The structure scales; the code stays hackable

---

## The Runtime Loop

Whatever architecture, the core loop is:

```
every 16ms (60fps):
    1. poll sensors → raw data
    2. process → features (HR, face landmarks, speech)
    3. fuse → your state (engagement, cognitive load, gesture)
    4. maybe send state to claude, get response
    5. render response through expression channels
    6. goto 1
```

Claude doesn't need 60fps updates. Batch physiological state, send every 1-5 seconds or on significant change. But the sensing and expression loops should be fast.

---

## Next Concrete Steps

1. **Define `protocol.py`** — what is HumanState, what is AIExpression
2. **Get sensors flowing** — you have polar working, add face.py with MediaPipe
3. **Build fusion.py** — combine into single state object
4. **Terminal-first expression** — use `rich` or `textual` for styled output
5. **Add WebSocket to Claude** — send state, receive structured response
6. **Iterate on expression** — upgrade to pygame, then web, as needed

The architecture will emerge from the protocol. Get that right, and the rest is plumbing.
