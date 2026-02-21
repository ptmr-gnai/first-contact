# Arousal Signal Stack — Design Doc

## The Problem

We want to detect changes in physiological state in response to visual stimuli
in near-real-time. The H10 gives us raw RR intervals — we need to derive
meaningful signals from them at multiple timescales.

## Three-Layer Signal Stack

### Layer 1: RR Sudden Change (fast, ~1-2s)
Detects beat-to-beat surprises.

```
delta_rr = rr[n] - rr[n-1]
```

A sharp negative delta (RR shortens suddenly) = acute arousal/startle.
A sharp positive delta (RR lengthens) = relaxation or deep breath.

Threshold: |delta_rr| > 50ms is meaningful. > 100ms is significant.

### Layer 2: HR Trend (medium, ~3-5s)
Rolling mean of last N beats. Detects sustained direction of change.

```
hr_trend = mean(60000 / rr[-8:])   # last ~8 beats
```

Rising trend = increasing arousal. Falling = calming.

### Layer 3: RMSSD (slow, ~60s)
Root mean square of successive RR differences. The gold standard HRV metric.

```
diffs = [rr[i+1] - rr[i] for i in range(len(rr)-1)]
rmssd = sqrt(mean([d**2 for d in diffs]))
```

High RMSSD (>50ms) = calm, parasympathetic dominance.
Low RMSSD (<20ms) = stressed, sympathetic dominance.
Needs minimum 60s window (~60-80 beats) to be reliable.

## Fused Arousal Score

Combine all three into a single 0.0–1.0 value:

```
arousal = weighted_sum(
    rr_delta_score * 0.4,    # fast layer, high weight for reactivity
    hr_trend_score * 0.35,   # medium layer
    rmssd_score    * 0.25,   # slow layer, context/baseline
)
```

The fast layer dominates for immediate reactions. The slow layer provides
the baseline context (a calm person and a stressed person can both have
the same HR spike, but their RMSSD tells you their starting state).

## Experiment Design: Color Stimulus Test

### Goal
Determine if we can detect physiological response to visual stimuli
using the H10 signal stack.

### Protocol
- Display fullscreen color blocks, each held for 5 seconds
- Colors chosen to span arousal spectrum:
  - Red (high arousal association)
  - Blue (low arousal / calming)
  - White (neutral)
  - Black (neutral/dark)
  - Yellow (alerting)
  - Green (neutral/natural)
- Log: timestamp, color shown, HR, RR, delta_rr, rmssd at each transition
- After session: correlate color transitions with signal changes

### What to Look For
- Does RR shorten within 1-2 beats of a high-arousal color appearing?
- Does RMSSD trend lower during sustained red vs blue?
- Is there a consistent latency between stimulus and response?

### Output
- Live display: fullscreen color + current HR overlay
- Log file: `color_test.jsonl` with all signals timestamped
- Post-run: summary table of mean HR/RMSSD per color

## Limitations
- N=1, single session — directional only, not statistically significant
- Expectation effects: knowing what colors "should" do affects response
- Breathing artifacts: a deep breath causes large RR change unrelated to arousal
- Baseline drift: HR naturally varies ±5-10 bpm over minutes

## Next Steps After Color Test
- Add more ecologically valid stimuli (images, sounds, video clips)
- Blind the subject to the hypothesis
- Add breathing rate from ACC to separate breath artifacts from arousal
- Build the fused arousal score emitter as a reusable module
