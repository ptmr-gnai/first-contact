# Color Stimulus Study — Session 1

**Date:** 2026-02-21  
**Subject:** 1 (petmer)  
**Protocol:** Fullscreen color blocks, 5s each, black neutral between each  
**Sequence:** black → red → black → blue → black → white → black → yellow → black → green → black

---

## Results

| Color  | HR mean | ΔHR  | RMSSD | ΔRMSSD | dRR_max | Classification |
|--------|---------|------|-------|--------|---------|----------------|
| red    | 76.2    | -1.3 | 24.4  | -2.9   | 31ms    | flat           |
| blue   | 80.4    | +2.9 | 25.6  | -1.7   | 30ms    | mild           |
| white  | 80.6    | +3.1 | 25.5  | -1.8   | 126ms   | ↑ arousal      |
| yellow | 75.4    | -2.1 | 30.7  | +3.4   | 21ms    | mild           |
| green  | 74.6    | -2.9 | 29.8  | +2.5   | mild    | mild           |

Baseline (black): HR=77.5 bpm, RMSSD=27.3ms

---

## Key Findings

### 1. Luminance contrast > hue for fast arousal
White produced the only statistically notable response: dRR_max=126ms (a genuine
startle-class event). The transition was black → white — maximum possible luminance
contrast. Red, which is conventionally "high arousal," was flat.

This suggests that for fast (sub-5s) physiological responses, **brightness change
dominates over color semantics**.

### 2. RMSSD is too slow for 5s windows
RMSSD shifts were small (±3ms) and inconsistent. This is expected — RMSSD needs
60-120s of data to stabilize. At 5s per color, we're measuring noise, not signal.

### 3. Green/yellow trended calming, blue trended arousing
Small effects, but directionally consistent with existing literature. Not
significant at N=1 with 5s windows.

### 4. HR mean is a lagging indicator at this timescale
HR averaged over 5s reflects the previous state more than the current stimulus.
Beat-to-beat RR (dRR) is the right fast signal.

---

## What We'd Need to See Real Effects

| Signal    | Minimum exposure | Notes |
|-----------|-----------------|-------|
| dRR spike | 1-2 beats (~1s) | Already working — white showed this |
| HR trend  | 15-30s          | Need longer color windows |
| RMSSD     | 60-120s         | Need much longer windows or rest periods |

---

## Recommended Next Experiments

### Experiment 2: Luminance-matched colors
Hold luminance constant (all colors at ~50% brightness), vary hue only.
This isolates color semantics from brightness contrast.
Duration: 15s per color.

### Experiment 3: Sustained exposure
Single color held for 2 minutes. Measure RMSSD trajectory over time.
Establishes whether sustained color exposure shifts autonomic state.

### Experiment 4: Ecological stimuli
Replace solid colors with images/video (nature, urban, threatening, calm).
More ecologically valid. Expect larger effects.

### Experiment 5: Sound + color
Add audio layer. Sound is a stronger fast arousal trigger than color.
Combine to see if they compound.

---

## Process Learnings & Feedback Loop Failures

### What broke and when we found out

| Issue | When discovered | Cost |
|-------|----------------|------|
| `unpack=True` default → rr_list was int | After first full run | Wasted 1 run |
| Snapshot at color start → rr_window empty | After first full run | Wasted 1 run |
| pygame font broken on Python 3.14 | After first run attempt | ~15min debugging |
| analyze script used old field names | After second run | Minor |

### Root cause
No automated pre-flight check. The pipeline (BLE → data → display → log → analysis)
was only verified end-to-end by running the full experiment. Bugs that could have
been caught in 10 seconds of unit testing cost full experiment runs.

### Required: Pre-flight harness
Before any experiment run, automatically verify:
1. BLE connects and emits valid frames
2. rr_window fills with real data
3. RMSSD computes non-zero
4. Log file writes and is parseable by analyzer
5. Display renders without errors

See `preflight.py` — run this before every experiment session.

---

## Signal Quality Notes

- RMSSD of 27ms at rest is on the lower end of normal (healthy range: 20-80ms)
- Could reflect mild stress from the experimental setup itself
- Recommend 5-minute seated rest before future sessions to establish true baseline
