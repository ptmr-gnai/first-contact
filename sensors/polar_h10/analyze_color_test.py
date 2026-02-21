import json, sys
from pathlib import Path

LOG = Path(__file__).parent.parent.parent / "color_test.jsonl"

def load(path):
    with open(path) as f:
        return [json.loads(l) for l in f]

def summary(entries):
    blacks = [e for e in entries if e["color"] == "black"]
    colors = [e for e in entries if e["color"] != "black"]

    baseline_hr    = sum(e["hr_mean"]    for e in blacks) / len(blacks) if blacks else 0
    baseline_rmssd = sum(e["rmssd_mean"] for e in blacks) / len(blacks) if blacks else 0

    print(f"\n{'='*62}")
    print(f"  COLOR STIMULUS TEST — ANALYSIS REPORT")
    print(f"  Baseline (black):  HR={baseline_hr:.1f} bpm  RMSSD={baseline_rmssd:.1f}ms")
    print(f"{'='*62}")
    print(f"  {'Color':8s}  {'HR':>5s}  {'ΔHR':>5s}  {'RMSSD':>7s}  {'ΔRMSSD':>8s}  {'dRR_max':>7s}  Response")
    print(f"  {'-'*60}")

    responses = []
    for e in colors:
        dhr    = e["hr_mean"]    - baseline_hr
        drmssd = e["rmssd_mean"] - baseline_rmssd
        if abs(dhr) < 2 and abs(drmssd) < 5:   resp = "flat"
        elif dhr > 3 or drmssd < -8:            resp = "↑ arousal"
        elif dhr < -3 or drmssd > 8:            resp = "↓ calm"
        else:                                    resp = "mild"
        responses.append((e["color"], dhr, drmssd, resp))
        print(f"  {e['color']:8s}  {e['hr_mean']:>5.1f}  {dhr:>+5.1f}  {e['rmssd_mean']:>7.1f}  {drmssd:>+8.1f}  {e['delta_rr_max']:>7d}  {resp}")

    if responses:
        print(f"\n  Most arousing: {max(responses, key=lambda x: x[1])[0]}")
        print(f"  Most calming:  {min(responses, key=lambda x: x[1])[0]}")

    big = [(e["color"], e["delta_rr_max"]) for e in colors if e["delta_rr_max"] > 80]
    if big:
        print(f"\n  Startle responses (dRR_max > 80ms): {big}")
    else:
        print(f"\n  No strong startle responses (dRR_max < 80ms for all)")

    print(f"{'='*62}\n")

if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else LOG
    if not path.exists():
        print(f"No log at {path} — run color_test.py first."); sys.exit(1)
    summary(load(path))
