# Audio Tools Research — Spatial & Generative

## Spatial/Binaural Audio (Making sound come from "somewhere")

### Best Bets for Quick Experimentation

| Project | Stars | What it does | Install |
|---------|-------|--------------|---------|
| **spaudiopy** | 183★ | Full spatial audio toolkit — binaural, ambisonics, HRTF | `pip install spaudiopy` |
| **audio3d** | 30★ | HRTF-based 3D positioning with GUI | `pip install audio3d` |
| **NeuralBeat** | 23★ | Binaural beats generator (brainwave entrainment) | Clone from GitHub |
| **binaural-generator** | 17★ | Simple binaural beat generator | `pip install binaural-generator` |

### spaudiopy (Recommended Start)
```python
# pip install spaudiopy soundfile
import spaudiopy as spa
import numpy as np

# Create a virtual sound source at position
azimuth = 45  # degrees (left/right)
elevation = 0  # degrees (up/down)
distance = 1.0

# Load HRTF and render
# Can position sounds anywhere in 3D space around the listener
```

### Simple Binaural with Just Pygame
```python
# Minimal spatial audio — just stereo panning
import pygame

pygame.mixer.init(frequency=44100, channels=2)

def pan_sound(sound, position):
    """position: -1 (left) to +1 (right)"""
    left = min(1.0, 1.0 - position)
    right = min(1.0, 1.0 + position)
    # Set channel volumes
    channel = sound.play()
    channel.set_volume(left, right)
```

---

## Generative/Synthesis Audio (Making sound respond to data)

### Best Bets

| Project | Stars | What it does | Notes |
|---------|-------|--------------|-------|
| **pyo** | 1416★ | Full DSP/synthesis in Python | Most powerful pure Python option |
| **supriya** | 385★ | Python API for SuperCollider | Best sound quality, requires SC install |
| **sardine** | 300★ | Live coding / algorave | Fun, designed for performance |
| **python-sonic** | 327★ | Talk to Sonic Pi from Python | Easy, Sonic Pi must be running |

### pyo (Recommended for Real-Time Synthesis)
```python
# pip install pyo
from pyo import *

s = Server().boot().start()

# Sine wave that responds to HR
freq = Sig(220)  # control signal
sine = Sine(freq=freq, mul=0.3).out()

# Update from your sensor loop:
freq.value = 200 + (hr - 60) * 2  # HR modulates pitch
```

### pyo Spatial Features
```python
# pyo has built-in binaural/HRTF
from pyo import *

s = Server().boot().start()
src = Noise(mul=0.3)

# HRTF-based spatialization
hrtf = HRTF(src, azim=45, elev=0).out()

# Move sound around:
hrtf.azim = -30  # sound moves to left
```

---

## Simplest Possible Audio Test

### Binaural Beat (Two slightly different frequencies → perceived "beat")
```python
# pip install numpy sounddevice
import numpy as np
import sounddevice as sd

sr = 44100  # sample rate
duration = 10  # seconds
base_freq = 200  # Hz
beat_freq = 10  # Hz (perceived frequency)

t = np.linspace(0, duration, int(sr * duration))
left = np.sin(2 * np.pi * base_freq * t)
right = np.sin(2 * np.pi * (base_freq + beat_freq) * t)

stereo = np.column_stack([left, right])
sd.play(stereo * 0.3, sr)
sd.wait()
```

This creates a 10 Hz "pulse" that you perceive *inside your head* — neither ear is pulsing, but the brain creates it from the difference.

---

## For HR Entrainment Specifically

The idea: Generate a pulse at *target* HR (say, 60 BPM) while you're at 80. See if your body follows.

```python
# Concept: audio pulse that's slightly slower than current HR
import numpy as np
import sounddevice as sd
import time

def generate_heartbeat_sound(bpm, duration=0.15):
    """Short bass thump like a heartbeat"""
    sr = 44100
    t = np.linspace(0, duration, int(sr * duration))
    # Low frequency thump with quick decay
    freq = 60
    envelope = np.exp(-t * 20)
    wave = np.sin(2 * np.pi * freq * t) * envelope
    return wave * 0.5

def entrainment_loop(target_bpm=60):
    interval = 60.0 / target_bpm
    sound = generate_heartbeat_sound(target_bpm)
    
    while True:
        sd.play(sound, 44100)
        time.sleep(interval)
```

---

## Recommendation: What to Try First

### Option A: Minimal (15 min)
1. `pip install sounddevice numpy`
2. Run the binaural beat code above with headphones
3. Feel the weird "third tone" in the center of your head

### Option B: HR-Synced Audio (30 min)  
1. Add audio output to `hr_camera_fusion.py`
2. Play a soft "thump" on each heartbeat
3. You hear your own heart

### Option C: Full Spatial (1 hr)
1. `pip install pyo`
2. Use HRTF to position sounds
3. Voice from center, ambient from sides

### Option D: Entrainment Experiment (1 hr)
1. Record your HR baseline for 2 min
2. Start audio pulse at HR - 10 BPM
3. See if your HR drifts down over 5-10 min

---

## The Vision

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR PHYSIOLOGY                          │
│              HR: 75 → Audio pulse at 68 BPM                 │
│              HRV low → Ambient sound smooths                │
│              Face: confused → Sound clarifies spatially     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SPATIAL AUDIO FIELD                      │
│                                                             │
│     [ambient/context]      [MAIN VOICE]     [tangents]      │
│          ←LEFT                CENTER             RIGHT→     │
│                                                             │
│                        [warnings]                           │
│                          BEHIND                             │
└─────────────────────────────────────────────────────────────┘
```

AI voice comes from spatial positions that convey meaning. Your physiology influences the soundscape. It's a conversation in 3D space, shaped by your body.
