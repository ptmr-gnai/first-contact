# Polar H10 — Data Streams & Immersive Experience Proposal

## What the H10 Can Actually Send

| Stream | Rate | Resolution | Notes |
|--------|------|------------|-------|
| Heart Rate (BPM) | ~1 Hz | 8-bit avg | Standard BLE HR service |
| RR Intervals | per-beat (~1 Hz) | ms precision | Beat-to-beat timing, gold standard for HRV |
| ECG | 130 Hz | 14-bit | Raw electrical signal from chest electrodes |
| Accelerometer | 25 / 50 / 100 / 200 Hz | 16-bit, ±2/4/8G | 3-axis (X/Y/Z) chest movement |
| Battery Level | on-demand | % | Standard BLE battery service |

The H10 also has 200 samples of internal memory for offline recording, but
that's not relevant for real-time use.

---

## Derived Signals (computed from raw streams)

These aren't sent directly — you compute them client-side:

| Derived Signal | Source | What it tells you |
|----------------|--------|-------------------|
| HRV (RMSSD) | RR intervals | Autonomic nervous system state, stress/recovery |
| HRV (SDNN) | RR intervals | Overall variability over a window |
| Breathing rate | RR intervals or ACC | ~0.2–0.3 Hz oscillation in RR series |
| Arousal / stress index | HR + HRV | High HR + low HRV = high stress/arousal |
| Coherence score | RR intervals | Resonance between breath and heart (biofeedback) |
| Movement intensity | ACC magnitude | sqrt(x²+y²+z²), proxy for physical exertion |
| Breathing depth | ACC (Z-axis) | Chest expansion during inhale/exhale |
| Posture / orientation | ACC | Tilt angle from gravity component |
| ECG quality / contact | ECG signal | Detect if strap is properly seated |

---

## Immersive Experience / Game Use Cases

### 1. Adaptive Difficulty
The most researched application. HR and HRV together give a reliable signal of
cognitive/physical load. Research confirms HR from ECG can dynamically adjust
game difficulty in real time.

- High HR + low HRV → player is stressed/overloaded → ease off
- Low HR + high HRV → player is calm/bored → increase challenge
- Latency: ~2–5 seconds for a stable HR reading; RR is beat-by-beat

### 2. Physiological Presence / Immersion Feedback
Use the player's own heartbeat as a game element:

- Sync ambient audio/music to live BPM
- Pulse visual effects (vignette, bloom) to the actual heartbeat via RR timestamps
- "Heartbeat echo" — the environment literally breathes with you
- Studies show heartbeat-synchronised feedback increases sense of presence in VR

### 3. Stress / Fear Detection
Horror games, high-stakes scenarios:

- Sudden HR spike + HRV drop = fear/startle response
- Can trigger narrative events, enemy AI reactions, environmental changes
- Breathing rate (from RR) slows under genuine fear — detectable

### 4. Calm / Flow State Detection
Meditation apps, focus environments, relaxation games:

- High HRV coherence = flow/calm state → unlock content, reward player
- HRV biofeedback loop: show player their coherence score, teach them to
  regulate it as a game mechanic (proven effective in clinical research)
- Breathing rate from ACC can guide paced breathing exercises

### 5. Physical Exertion Mapping
For movement-based experiences:

- ACC magnitude → real-time exertion level
- Combine with HR to distinguish "moving but calm" vs "moving and stressed"
- Chest breathing depth (ACC Z-axis) → detect breath-holds under tension

### 6. Narrative / Cinematic Triggers
Biometric-gated story moments:

- Scene only plays when player's HR drops below threshold (they must calm down)
- Dialogue changes based on detected arousal state
- "The world reacts to how you feel" — not just what you do

### 7. Multiplayer / Social Biometrics
With multiple H10s:

- Show other players' stress levels as a shared resource
- Cooperative calm: both players must synchronise breathing to unlock a door
- Competitive: whose HR spikes first loses

### 8. Health / Training Integration
Outside pure games:

- Real-time zone training (HR zones 1–5) with environmental feedback
- Recovery monitoring between sessions
- Breathing coach with live coherence feedback

---

## Technical Constraints to Design Around

| Constraint | Detail |
|------------|--------|
| BLE latency | ~50–200ms raw BLE; HR averaging adds ~1–2s lag |
| RR precision | ±1ms — excellent for HRV, but only ~1 sample/beat |
| ECG latency | Low (~100ms), but 130Hz means you need a buffer for analysis |
| Connection range | ~10m typical indoors |
| Single connection | H10 supports one BLE central at a time (no multi-host) |
| Strap must be wet | Dry electrodes = noisy/no signal |
| Motion artifacts | ACC and ECG both degrade with vigorous movement |
| HRV window | Need 60–300s of RR data for reliable RMSSD/SDNN |

---

## Recommended Signal Stack for an Immersive Experience

```
H10 Hardware
  ├── HR + RR  →  rolling HRV (RMSSD, 60s window)  →  arousal/calm state
  ├── ECG      →  beat detection, signal quality check
  └── ACC      →  breathing rate, movement intensity, posture

State Engine
  ├── arousal_level  (0.0–1.0, from HR + HRV)
  ├── calm_score     (0.0–1.0, from HRV coherence)
  ├── breath_rate    (breaths/min, from RR or ACC)
  └── movement       (g-force magnitude, from ACC)

Experience Layer
  └── subscribes to state events → drives audio, visuals, narrative, AI
```

---

## Next Steps

- [ ] Run `capture.py` to collect live ECG + ACC + HR data
- [ ] Inspect `data.jsonl` to understand raw frame formats
- [ ] Implement rolling RMSSD calculator on RR stream
- [ ] Build a simple state emitter (arousal_level, calm_score)
- [ ] Wire state to a demo output (OSC, WebSocket, stdout)

---

## References

- [Polar BLE SDK](https://github.com/polarofficial/polar-ble-sdk)
- [bleakheart library](https://github.com/fsmeraldi/bleakheart)
- [On the applicability of HR for affective gaming](https://www.researchgate.net/publication/262283016)
- [HRV biofeedback in VR](https://www.frontiersin.org/articles/10.3389/fpsyg.2019.02172/full)
- [Polar H10 validity study (NIH)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9459793/)
