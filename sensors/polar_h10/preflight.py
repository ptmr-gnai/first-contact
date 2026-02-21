"""
preflight.py — Pre-flight check for H10 experiment pipeline.

Run this before every experiment session. Verifies:
  1. BLE connects to H10
  2. HR frames arrive with correct structure
  3. rr_window fills with real RR data
  4. RMSSD computes non-zero
  5. Log write + parse round-trip works
  6. pygame display initializes (font render)

Exits 0 if all checks pass, 1 if any fail.
"""
import asyncio, json, math, sys, tempfile, os, time
from collections import deque
from pathlib import Path

DEVICE_ADDR = "154D49A0-459A-F874-D4FF-6A352454C040"
CHECKS = []

def check(name):
    def decorator(fn):
        CHECKS.append((name, fn))
        return fn
    return decorator

# ── 1. BLE import ────────────────────────────────────────────────────────────
@check("BLE libraries importable")
async def check_imports():
    from bleak import BleakScanner, BleakClient
    from bleakheart import HeartRate
    return True, "bleak + bleakheart ok"

# ── 2. H10 discoverable ──────────────────────────────────────────────────────
@check("H10 discoverable via BLE scan")
async def check_scan():
    from bleak import BleakScanner
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=10
    )
    if device:
        return True, f"Found: {device.name} ({device.address})"
    # fallback: try known address
    from bleak import BleakClient
    try:
        async with BleakClient(DEVICE_ADDR, timeout=5) as c:
            if c.is_connected:
                return True, f"Found via known address: {DEVICE_ADDR}"
    except Exception:
        pass
    return False, "H10 not found — is it worn and powered on?"

# ── 3. HR frames arrive with correct structure ───────────────────────────────
@check("HR frames: correct tuple structure")
async def check_hr_frames():
    from bleak import BleakClient
    from bleakheart import HeartRate
    q = asyncio.Queue()
    async with BleakClient(DEVICE_ADDR) as client:
        hr = HeartRate(client, queue=q, unpack=False)
        await hr.start_notify()
        frame = await asyncio.wait_for(q.get(), timeout=5)
    kind, tstamp, (bpm, rr_list), energy = frame
    assert kind == "HR", f"Expected 'HR', got {kind!r}"
    assert isinstance(bpm, int), f"bpm should be int, got {type(bpm)}"
    assert isinstance(rr_list, list), f"rr_list should be list, got {type(rr_list)}"
    assert 30 < bpm < 220, f"bpm {bpm} out of plausible range"
    return True, f"HR={bpm} bpm, rr_list={rr_list}"

# ── 4. rr_window fills and RMSSD is non-zero ─────────────────────────────────
@check("rr_window fills + RMSSD non-zero")
async def check_rmssd():
    from bleak import BleakClient
    from bleakheart import HeartRate
    rr_window = deque(maxlen=120)
    q = asyncio.Queue()
    async with BleakClient(DEVICE_ADDR) as client:
        hr = HeartRate(client, queue=q, unpack=False)
        await hr.start_notify()
        # collect 10 frames
        for _ in range(10):
            _, _, (_, rr_list), _ = await asyncio.wait_for(q.get(), timeout=5)
            for rr in rr_list:
                rr_window.append(rr)
    rrs = list(rr_window)
    assert len(rrs) >= 5, f"Only {len(rrs)} RR values — not enough"
    diffs = [rrs[i+1]-rrs[i] for i in range(len(rrs)-1)]
    rmssd = math.sqrt(sum(d*d for d in diffs) / len(diffs))
    assert rmssd > 0, "RMSSD is zero — something is wrong"
    return True, f"rr_window={len(rrs)} samples, RMSSD={rmssd:.1f}ms"

# ── 5. Log write + parse round-trip ──────────────────────────────────────────
@check("Log write + parse round-trip")
async def check_log():
    entry = {"color": "test", "hr_mean": 75.0, "rmssd_mean": 25.0, "delta_rr_max": 30, "samples": []}
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        f.write(json.dumps(entry) + "\n")
        fname = f.name
    with open(fname) as f:
        parsed = json.loads(f.readline())
    os.unlink(fname)
    assert parsed["color"] == "test"
    return True, "write/parse ok"

# ── 6. pygame display + font ─────────────────────────────────────────────────
@check("pygame display + font render")
async def check_pygame():
    import pygame
    pygame.init()
    # headless surface — doesn't need a display
    surf = pygame.Surface((400, 200))
    font = pygame.font.Font(None, 60)
    rendered = font.render("91 bpm", True, (255, 255, 255))
    assert rendered.get_width() > 0
    pygame.quit()
    return True, f"font render ok, surface size={rendered.get_size()}"

# ── Runner ────────────────────────────────────────────────────────────────────
async def run():
    print("\n── Preflight Check ─────────────────────────────────")
    passed = 0
    failed = 0
    for name, fn in CHECKS:
        try:
            ok, msg = await fn()
            status = "✓" if ok else "✗"
            if ok: passed += 1
            else:  failed += 1
        except Exception as e:
            status, msg, ok = "✗", str(e), False
            failed += 1
        print(f"  {status}  {name}")
        print(f"       {msg}")
    print(f"────────────────────────────────────────────────────")
    print(f"  {passed} passed, {failed} failed\n")
    return failed == 0

if __name__ == "__main__":
    ok = asyncio.run(run())
    sys.exit(0 if ok else 1)
