# Sensor Fusion Research — First Contact

## Input Sources

| Sensor/Source | Data Type | Protocol/Format | Rate |
|---------------|-----------|-----------------|------|
| Polar H10 | HR, RR intervals, ECG, ACC | BLE | 130Hz ECG, 25-200Hz ACC |
| Camera(s) | Video frames, depth? | USB/HDMI capture | 30-60 fps |
| Projector | Output (but tracking feedback) | HDMI out | 30-60 fps |
| Audio input | Microphone / ambient | Audio interface | 44.1-48kHz |
| Audio output | Generative audio | Audio interface | 44.1-48kHz |
| Visuals | Generated images/video | Internal | Variable |

---

## Sensor Fusion Engines — Options

### 1. **TouchDesigner** (Industry Standard for Installations)
- **What**: Visual programming environment for real-time multimedia
- **Strengths**: 
  - Built for exactly this use case (installations, performances)
  - Native BLE/serial input, camera, projector, audio I/O
  - GPU-accelerated visuals
  - Python scripting for custom logic
  - Excellent latency characteristics
- **Weaknesses**: 
  - Proprietary ($600 commercial, free non-commercial)
  - Windows-first (macOS version exists but weaker)
- **Used by**: TeamLab, Moment Factory, most big interactive installations
- **Verdict**: ⭐ **Industry standard for sensor→visual installations**

### 2. **Max/MSP + Jitter** (Industry Standard for Audio + Some Visual)
- **What**: Visual programming for audio/multimedia
- **Strengths**:
  - Best-in-class audio/music handling
  - Good sensor input ecosystem
  - Jitter for video processing
- **Weaknesses**:
  - Visual capabilities less fluid than TouchDesigner
  - Expensive ($399)
- **Used by**: Musicians, sound artists, academic installations
- **Verdict**: ⭐ Best if audio is primary; pair with TD for visuals

### 3. **openFrameworks** (C++ toolkit)
- **What**: Open-source C++ creative coding framework
- **Strengths**:
  - Very fast, low latency
  - Huge addon ecosystem (ofxBLE, ofxCV, ofxPD, etc.)
  - Free, open source
  - Cross-platform
- **Weaknesses**:
  - C++ = slower iteration
  - More "build it yourself"
- **Used by**: Artists wanting full control, research labs
- **Verdict**: ⭐ Best for performance-critical, custom builds

### 4. **Processing / p5.js**
- **What**: Beginner-friendly creative coding
- **Strengths**: Fast prototyping, huge community
- **Weaknesses**: Not performant enough for serious sensor fusion
- **Verdict**: Good for sketching ideas, not production

### 5. **Pure Data (Pd)**
- **What**: Open-source Max/MSP alternative
- **Strengths**: Free, great for audio, embeddable
- **Weaknesses**: Rougher UX, visuals limited
- **Verdict**: Good for audio processing pipeline component

### 6. **Python + Custom Stack** (What you're starting)
- **What**: Roll your own with asyncio, OpenCV, etc.
- **Strengths**:
  - Full control
  - ML/AI integration easy (PyTorch, etc.)
  - Good for data logging, analysis
- **Weaknesses**:
  - More glue code needed
  - Latency harder to manage
  - Graphics via pygame/pyglet less polished
- **Verdict**: Great for experimentation, may need to bridge to TD/OF for production

### 7. **Unity / Unreal** (Game Engines)
- **What**: Full game engines
- **Strengths**: Best-in-class rendering, VR/AR support
- **Weaknesses**: Overkill, latency less predictable, sensor input clunky
- **Verdict**: Only if you need 3D rendering or VR

---

## Interesting/Emerging Approaches

### **Bela** (for ultra-low-latency audio)
- Sub-millisecond audio latency on dedicated hardware
- Could be audio processing node in larger system

### **LLM-driven Sensor Interpretation**
- Use local LLM (Ollama/llama.cpp) to interpret sensor patterns
- "Heart rate spiking + stillness = anticipation" → drive generative systems
- Novel territory, high latency but interesting for non-real-time decisions

### **OSC (Open Sound Control) as the Fusion Bus**
- Industry standard for connecting creative tools
- TouchDesigner ↔ Max ↔ Python ↔ Ableton all speak OSC
- UDP-based, low latency, simple
- **Recommendation**: Use OSC as your message bus regardless of engine choice

### **ROS 2 (Robot Operating System)**
- Serious sensor fusion framework from robotics
- Overkill for art installation, but very rigorous
- Good if this becomes a product

### **Reactive Extensions (RxPY / RxJS)**
- Treat all sensors as observable streams
- Merge, filter, combine with time windows
- Good mental model even if you don't use the library

---

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SENSOR LAYER                             │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  Polar H10  │   Camera    │    Mic      │  Projector  │  Other  │
│   (BLE)     │   (USB)     │  (Audio IF) │  Feedback   │         │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       └──────────┬──┴─────────────┴──────┬──────┘           │
                  │                       │                  │
                  ▼                       ▼                  │
       ┌─────────────────┐     ┌─────────────────┐           │
       │  Python Bridge  │     │  Python Bridge  │           │
       │  (bleakheart)   │     │  (OpenCV/PyAudio)│          │
       └────────┬────────┘     └────────┬────────┘           │
                │                       │                    │
                └───────────┬───────────┘                    │
                            │                                │
                            ▼                                │
                 ┌─────────────────────┐                     │
                 │      OSC BUS        │◄────────────────────┘
                 │  (localhost:9000)   │
                 └──────────┬──────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │TouchDesigner│  │  Max/MSP    │  │   Ableton   │
   │  (Visuals)  │  │ (Audio Gen) │  │  (Music)    │
   └──────┬──────┘  └──────┬──────┘  └─────────────┘
          │                │
          ▼                ▼
   ┌─────────────┐  ┌─────────────┐
   │  Projector  │  │  Speakers   │
   └─────────────┘  └─────────────┘
```

---

## Tracer Bullet / Vertical Slice

**Goal**: End-to-end data flow proving the architecture, as fast as possible.

### Slice Definition
> **Heart rate → OSC → Visual feedback**
> 
> When heart rate changes, a visual responds in real-time on the projector.

### Minimum Steps

| Step | Task | Time Est. |
|------|------|-----------|
| 1 | Get HR streaming from Polar H10 (you're here) | 1-2 hrs |
| 2 | Send HR over OSC from Python | 30 min |
| 3 | Receive OSC in TouchDesigner (or Processing as simpler alt) | 30 min |
| 4 | Map HR to visual parameter (e.g., circle size, color, pulse) | 30 min |
| 5 | Output to projector (just second display) | 10 min |

### Python OSC Sender (Step 2)

```python
# pip install python-osc bleakheart
from pythonosc import udp_client
import asyncio
from bleakheart import PolarH10

osc = udp_client.SimpleUDPClient("127.0.0.1", 9000)

async def hr_callback(hr, rr_intervals):
    osc.send_message("/heart/bpm", hr)
    if rr_intervals:
        osc.send_message("/heart/rr", rr_intervals[-1])
    print(f"HR: {hr} bpm → OSC")

async def main():
    async with PolarH10() as polar:
        await polar.start_hr_stream(hr_callback)
        await asyncio.sleep(300)  # run for 5 min

asyncio.run(main())
```

### TouchDesigner Receiver (Step 3)
1. Add `OSC In` CHOP
2. Set port to 9000
3. You'll see `/heart/bpm` channel appear
4. Connect to visual generator

### Processing Alternative (Simpler for first slice)

```java
// Uses oscP5 library
import oscP5.*;
OscP5 osc;
float heartRate = 60;

void setup() {
  fullScreen(P2D, 2);  // projector on display 2
  osc = new OscP5(this, 9000);
}

void draw() {
  background(0);
  float size = map(heartRate, 50, 150, 100, 600);
  fill(255, 0, 0, 150);
  ellipse(width/2, height/2, size, size);
}

void oscEvent(OscMessage msg) {
  if (msg.checkAddrPattern("/heart/bpm")) {
    heartRate = msg.get(0).floatValue();
  }
}
```

---

## Decision Matrix

| If your priority is... | Use... |
|------------------------|--------|
| Get something working TODAY | Processing + python-osc |
| Production installation | TouchDesigner + Python bridges |
| Audio-heavy generative | Max/MSP + Python + OSC |
| Maximum control / ML integration | openFrameworks or pure Python |
| Learning / education | Processing or p5.js |

---

## Development Roadmap (Screen-First)

Projector/projection mapping saved for last — work with screen until core fusion is solid.

### Phase 1: Single Sensor → Visual (CURRENT)
- [x] HR streaming from Polar H10 (`hr.py` working)
- [ ] **Slice 1A**: HR → simple visual on screen (pygame/Processing window)
- [ ] **Slice 1B**: HR → OSC → visual (proves the bus architecture)

### Phase 2: Add Second Sensor (Fusion Begins)
- [ ] **Slice 2A**: Camera input (OpenCV) → Python → visual
- [ ] **Slice 2B**: HR + Camera fused → combined visual response
  - e.g., "presence detection modulates how HR affects visual"
  - or "face proximity + HR = intensity"

### Phase 3: Add Audio
- [ ] **Slice 3A**: HR → generative audio (sonification)
- [ ] **Slice 3B**: Audio input (mic) → affects visual
- [ ] **Slice 3C**: Full loop: HR + Camera + Audio in → Audio + Visual out

### Phase 4: Richer Visuals
- [ ] Move from pygame/Processing sketch to TouchDesigner or openFrameworks
- [ ] Build out actual visual language/aesthetic

### Phase 5: Projector + Physical Space
- [ ] Projector calibration
- [ ] Camera tracking in projected space
- [ ] Projection mapping if needed
- [ ] Final installation tuning

---

## Recommended Next Slice: 1A — HR → Visual on Screen

**Simplest possible proof**: HR data drives a visual element in a window.

### Option A: Pure Python (pygame)

```python
# hr_visual.py — run alongside hr.py via shared queue or OSC
import pygame
import random

pygame.init()
screen = pygame.display.set_mode((800, 600))
clock = pygame.time.Clock()

hr = 70  # will come from sensor
running = True

while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    # Pulse effect based on HR
    pulse = (pygame.time.get_ticks() % (60000 // hr)) / (60000 // hr)
    size = 100 + 200 * (1 - pulse)
    
    screen.fill((0, 0, 0))
    pygame.draw.circle(screen, (255, 50, 50), (400, 300), int(size))
    pygame.display.flip()
    clock.tick(60)

pygame.quit()
```

### Option B: Processing (separate process, OSC)

Already in the doc above — cleaner separation, but requires OSC plumbing.

---

## Recommended Next Slice: 2A — Camera → Visual

**After HR→visual works**, add camera as second input.

```python
# camera_visual.py — standalone test
import cv2
import pygame

cap = cv2.VideoCapture(0)
pygame.init()
screen = pygame.display.set_mode((800, 600))

running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
    
    ret, frame = cap.read()
    if ret:
        # Simple: average brightness as a signal
        brightness = frame.mean()
        
        # Convert for pygame display (optional)
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame = cv2.resize(frame, (400, 300))
        surf = pygame.surfarray.make_surface(frame.swapaxes(0, 1))
        
        screen.fill((0, 0, 0))
        screen.blit(surf, (200, 50))
        
        # Brightness bar
        pygame.draw.rect(screen, (0, 255, 0), (200, 400, brightness * 2, 30))
        pygame.display.flip()

cap.release()
pygame.quit()
```

---

## Slice 2B: First Real Fusion

Combine HR + Camera into one visual response:

```python
# Pseudocode for fusion logic
hr_intensity = map(hr, 50, 150, 0.0, 1.0)
presence = 1.0 if face_detected else 0.3
motion = optical_flow_magnitude

# Fused output
visual_energy = hr_intensity * presence * (1 + motion * 0.5)
audio_density = hr_intensity * 0.7 + motion * 0.3
```

This is where it gets interesting — defining *how* the sensors talk to each other.

---

## Open Questions

- [ ] What's the installation environment? (room size, lighting, single user vs many?)
- [ ] What's the projector setup? (single projector, mapped surface, multiple?)
- [ ] Is camera for tracking people, or capturing something else?
- [ ] What kind of generative audio? (ambient, rhythmic, reactive to HR?)
- [ ] Any ML/AI inference needed? (pose detection, emotion recognition?)
