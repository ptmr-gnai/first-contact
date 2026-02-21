#!/usr/bin/env python3
"""
entrain_live.py — HR entrainment with live feedback

Phase 1 (30s): Baseline — measure your resting HR
Phase 2 (3min): Entrainment — play heartbeat 8 BPM slower, watch if yours follows

Display:
  - Your HR as a live line (white)
  - Target entrainment rate as dotted line (cyan)
  - Baseline as reference line (gray)
  - Beat flash on each played heartbeat

Press ESC to quit early.
"""

import asyncio
import math
import time
import numpy as np
import sounddevice as sd
import pygame
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate

SAMPLE_RATE = 44100
BASELINE_SECS = 30
ENTRAIN_SECS = 180
ENTRAIN_OFFSET = 8       # BPM slower than baseline
HISTORY_SECS = 240       # how much history to show on graph
SCREEN_W, SCREEN_H = 900, 500
GRAPH_LEFT, GRAPH_RIGHT = 80, SCREEN_W - 40
GRAPH_TOP, GRAPH_BOTTOM = 60, SCREEN_H - 80


class State:
    hr = 70
    rr = 857
    connected = False
    status = "Scanning for Polar H10..."
    hr_log = []          # list of (timestamp, bpm)
    simulated = False


def make_heartbeat():
    dur = 0.2
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    lub = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 25)
    dub = np.sin(2 * np.pi * 45 * t) * np.exp(-(t - 0.1).clip(0) * 30)
    dub = np.roll(dub, int(0.08 * SAMPLE_RATE))
    mono = (lub + dub * 0.7) * 0.5
    delay = int(0.001 * SAMPLE_RATE)
    stereo = np.column_stack([mono, np.roll(mono, delay)]).astype(np.float32)
    return stereo


HEARTBEAT = make_heartbeat()


async def ble_task(state):
    state.status = "Scanning for Polar H10..."
    devices = await BleakScanner.discover(timeout=12)
    device = next((d for d in devices if d.name and "Polar H10" in d.name), None)
    if not device:
        state.status = "No Polar H10 — simulating HR"
        state.simulated = True
        while True:
            await asyncio.sleep(1.0)
            t = asyncio.get_event_loop().time()
            state.hr = int(72 + 6 * math.sin(t / 12))
            state.rr = 60000 // state.hr
            state.hr_log.append((time.time(), state.hr))
        return

    state.status = f"Connecting to {device.name}..."
    async with BleakClient(device) as client:
        queue = asyncio.Queue()
        hr_service = HeartRate(client, queue=queue)
        await hr_service.start_notify()
        state.connected = True
        state.status = f"Connected: {device.name}"
        while True:
            frame = await queue.get()
            _, _, (bpm, rr_list), _ = frame
            state.hr = bpm
            if rr_list:
                state.rr = rr_list[-1] if isinstance(rr_list, list) else rr_list
            state.hr_log.append((time.time(), bpm))


async def audio_task(state, start_time, baseline_hr):
    """Wait for baseline phase, then play entrainment beats."""
    target_hr = max(baseline_hr - ENTRAIN_OFFSET, 45)

    # Wait out baseline phase
    remaining = BASELINE_SECS - (time.time() - start_time)
    if remaining > 0:
        await asyncio.sleep(remaining)

    interval = 60.0 / target_hr
    while True:
        sd.play(HEARTBEAT, SAMPLE_RATE)
        await asyncio.sleep(interval)


def hr_range(hr_log, now):
    """Get min/max HR from log for y-axis scaling."""
    recent = [h for t, h in hr_log if now - t < HISTORY_SECS]
    if not recent:
        return 50, 100
    lo, hi = min(recent), max(recent)
    pad = max(10, (hi - lo) * 0.3)
    return lo - pad, hi + pad


def to_screen(t, hr, now, hr_lo, hr_hi):
    x = GRAPH_RIGHT - (now - t) / HISTORY_SECS * (GRAPH_RIGHT - GRAPH_LEFT)
    y = GRAPH_BOTTOM - (hr - hr_lo) / (hr_hi - hr_lo) * (GRAPH_BOTTOM - GRAPH_TOP)
    return int(x), int(y)


async def display_task(state, start_time):
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption("HR Entrainment")
    clock = pygame.time.Clock()
    font = pygame.font.Font(None, 18)
    font_lg = pygame.font.Font(None, 36)

    baseline_hr = None
    target_hr = None
    beat_flash = 0.0  # 0-1, decays

    running = True
    while running:
        now = time.time()
        elapsed = now - start_time
        phase = "BASELINE" if elapsed < BASELINE_SECS else "ENTRAIN"

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        # Compute baseline once phase ends
        if phase == "ENTRAIN" and baseline_hr is None:
            window = [h for t, h in state.hr_log if start_time <= t <= start_time + BASELINE_SECS]
            baseline_hr = sum(window) / len(window) if window else state.hr
            target_hr = max(baseline_hr - ENTRAIN_OFFSET, 45)

        # Beat flash: detect when audio fires (approximate via time)
        if phase == "ENTRAIN" and target_hr:
            beat_interval = 60.0 / target_hr
            beat_phase = (elapsed - BASELINE_SECS) % beat_interval / beat_interval
            if beat_phase < 0.05:
                beat_flash = 1.0

        beat_flash = max(0.0, beat_flash - 0.08)

        # === DRAW ===
        bg = (8, 8, 16)
        screen.fill(bg)

        # Beat flash overlay
        if beat_flash > 0:
            flash_surf = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
            flash_surf.fill((0, 180, 255, int(beat_flash * 30)))
            screen.blit(flash_surf, (0, 0))

        # Graph axes
        pygame.draw.line(screen, (60, 60, 80), (GRAPH_LEFT, GRAPH_TOP), (GRAPH_LEFT, GRAPH_BOTTOM))
        pygame.draw.line(screen, (60, 60, 80), (GRAPH_LEFT, GRAPH_BOTTOM), (GRAPH_RIGHT, GRAPH_BOTTOM))

        # Baseline / target reference lines
        if state.hr_log:
            hr_lo, hr_hi = hr_range(state.hr_log, now)

            if baseline_hr:
                _, by = to_screen(now, baseline_hr, now, hr_lo, hr_hi)
                pygame.draw.line(screen, (80, 80, 80), (GRAPH_LEFT, by), (GRAPH_RIGHT, by), 1)
                screen.blit(font.render(f"baseline {baseline_hr:.0f}", True, (80, 80, 80)), (GRAPH_LEFT + 4, by - 16))

            if target_hr:
                _, ty = to_screen(now, target_hr, now, hr_lo, hr_hi)
                # Dotted line
                for x in range(GRAPH_LEFT, GRAPH_RIGHT, 12):
                    pygame.draw.line(screen, (0, 200, 220), (x, ty), (min(x + 6, GRAPH_RIGHT), ty), 1)
                screen.blit(font.render(f"target {target_hr:.0f}", True, (0, 200, 220)), (GRAPH_LEFT + 4, ty + 4))

            # Y-axis labels
            for hr_tick in range(int(hr_lo) + 5, int(hr_hi), 5):
                _, y = to_screen(now, hr_tick, now, hr_lo, hr_hi)
                if GRAPH_TOP < y < GRAPH_BOTTOM:
                    pygame.draw.line(screen, (40, 40, 55), (GRAPH_LEFT, y), (GRAPH_RIGHT, y), 1)
                    screen.blit(font.render(str(hr_tick), True, (80, 80, 100)), (GRAPH_LEFT - 36, y - 7))

            # HR line
            points = [(t, h) for t, h in state.hr_log if now - t < HISTORY_SECS]
            if len(points) >= 2:
                pts = [to_screen(t, h, now, hr_lo, hr_hi) for t, h in points]
                pts = [(x, max(GRAPH_TOP, min(GRAPH_BOTTOM, y))) for x, y in pts]
                pygame.draw.lines(screen, (220, 220, 220), False, pts, 2)

            # Current HR dot
            if points:
                last_t, last_h = points[-1]
                cx, cy = to_screen(last_t, last_h, now, hr_lo, hr_hi)
                pygame.draw.circle(screen, (255, 255, 255), (cx, cy), 5)

        # Phase timer
        if phase == "BASELINE":
            remaining = BASELINE_SECS - elapsed
            phase_label = f"BASELINE  {remaining:.0f}s remaining — measuring your resting HR"
            color = (180, 180, 100)
        else:
            remaining = ENTRAIN_SECS - (elapsed - BASELINE_SECS)
            delta = (baseline_hr - state.hr) if baseline_hr else 0
            arrow = "↓" if delta > 0.5 else "↑" if delta < -0.5 else "→"
            phase_label = f"ENTRAIN  {max(0,remaining):.0f}s  |  target {target_hr:.0f} BPM  |  your HR {state.hr} {arrow}"
            color = (0, 220, 200)

        screen.blit(font_lg.render(f"{state.hr} BPM", True, (255, 255, 255)), (GRAPH_LEFT, 10))
        screen.blit(font.render(phase_label, True, color), (GRAPH_LEFT, SCREEN_H - 50))
        screen.blit(font.render(state.status, True, (100, 100, 120)), (GRAPH_LEFT, SCREEN_H - 30))

        # Phase divider line on graph (where baseline ended)
        if elapsed > BASELINE_SECS:
            div_x = GRAPH_RIGHT - (elapsed - BASELINE_SECS) / HISTORY_SECS * (GRAPH_RIGHT - GRAPH_LEFT)
            if GRAPH_LEFT < div_x < GRAPH_RIGHT:
                pygame.draw.line(screen, (80, 60, 40), (int(div_x), GRAPH_TOP), (int(div_x), GRAPH_BOTTOM), 1)

        pygame.display.flip()
        clock.tick(30)
        await asyncio.sleep(0)

    pygame.quit()
    return baseline_hr, target_hr


async def main():
    state = State()
    start_time = time.time()
    log_path = f"entrain_{int(start_time)}.jsonl"

    print("Starting HR Entrainment experiment")
    print(f"  Phase 1: {BASELINE_SECS}s baseline")
    print(f"  Phase 2: {ENTRAIN_SECS}s entrainment ({ENTRAIN_OFFSET} BPM below baseline)")
    print(f"  Logging to: {log_path}")
    print("  Press ESC to quit\n")

    ble = asyncio.create_task(ble_task(state))

    # Wait briefly for connection attempt
    await asyncio.sleep(3)
    print(f"Status: {state.status}")

    # Placeholder baseline — will be computed properly after baseline phase
    placeholder_baseline = state.hr

    # Log writer task
    async def log_task():
        seen = 0
        with open(log_path, "w") as f:
            while True:
                if len(state.hr_log) > seen:
                    for ts, hr in state.hr_log[seen:]:
                        elapsed = ts - start_time
                        phase = "baseline" if elapsed < BASELINE_SECS else "entrain"
                        f.write(f'{{"t":{ts:.3f},"elapsed":{elapsed:.1f},"phase":"{phase}","hr":{hr}}}\n')
                    f.flush()
                    seen = len(state.hr_log)
                await asyncio.sleep(0.5)

    log = asyncio.create_task(log_task())

    audio = asyncio.create_task(audio_task(state, start_time, placeholder_baseline))
    baseline_hr, target_hr = await display_task(state, start_time)

    ble.cancel()
    audio.cancel()
    log.cancel()

    # Summary
    if baseline_hr and state.hr_log:
        entrain_start = start_time + BASELINE_SECS
        entrain_hrs = [h for t, h in state.hr_log if t >= entrain_start]
        if entrain_hrs:
            final_avg = sum(entrain_hrs[-10:]) / len(entrain_hrs[-10:])
            delta = baseline_hr - final_avg
            print(f"\n=== Results ===")
            print(f"Baseline HR:      {baseline_hr:.1f} BPM")
            print(f"Target:           {target_hr:.1f} BPM")
            print(f"Final HR (avg):   {final_avg:.1f} BPM")
            print(f"Delta:            {delta:+.1f} BPM {'(followed ↓)' if delta > 2 else '(no follow)' if delta < -1 else '(slight follow)'}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped.")
