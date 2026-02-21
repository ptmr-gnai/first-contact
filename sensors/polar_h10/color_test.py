"""
color_test.py — Fullscreen color stimulus test with live H10 biometric logging.

Shows each color for COLOR_DURATION seconds, logs HR/RR/RMSSD to color_test.jsonl.
Press Q or ESC to quit early.
"""
import asyncio, json, math, time, threading
from collections import deque
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate
import pygame

# --- Config ---
COLOR_DURATION = 5  # seconds per color
COLORS = [
    ("black",  (0,   0,   0)),
    ("red",    (220, 30,  30)),
    ("black",  (0,   0,   0)),
    ("blue",   (30,  80,  220)),
    ("black",  (0,   0,   0)),
    ("white",  (255, 255, 255)),
    ("black",  (0,   0,   0)),
    ("yellow", (240, 220, 20)),
    ("black",  (0,   0,   0)),
    ("green",  (30,  180, 60)),
    ("black",  (0,   0,   0)),
]

# --- Shared state ---
rr_window = deque(maxlen=120)
hr_current = [0]
log_entries = []

def rmssd(rr_list):
    if len(rr_list) < 2:
        return 0.0
    diffs = [rr_list[i+1] - rr_list[i] for i in range(len(rr_list)-1)]
    return math.sqrt(sum(d*d for d in diffs) / len(diffs))

def delta_rr():
    if len(rr_window) < 2:
        return 0
    return list(rr_window)[-1] - list(rr_window)[-2]

# --- BLE thread ---
def ble_thread():
    asyncio.run(ble_main())

async def ble_main():
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=20
    )
    if not device:
        device = "154D49A0-459A-F874-D4FF-6A352454C040"
    q = asyncio.Queue()
    async with BleakClient(device) as client:
        hr = HeartRate(client, queue=q, unpack=False)
        await hr.start_notify()
        while True:
            _, _, (bpm, rr_list), _ = await q.get()
            hr_current[0] = bpm
            for rr in rr_list:
                rr_window.append(rr)

# --- Main ---
def main():
    threading.Thread(target=ble_thread, daemon=True).start()

    pygame.init()
    screen = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
    font_big = pygame.font.Font(None, 90)
    font_small = pygame.font.Font(None, 42)
    clock = pygame.time.Clock()

    # Wait for first real HR reading
    print("Waiting for H10 connection...")
    while hr_current[0] == 0:
        for e in pygame.event.get():
            if e.type == pygame.QUIT or (e.type == pygame.KEYDOWN and e.key in (pygame.K_q, pygame.K_ESCAPE)):
                pygame.quit(); return
        screen.fill((20, 20, 20))
        txt = font_small.render("Connecting to Polar H10...", True, (180, 180, 180))
        screen.blit(txt, txt.get_rect(center=screen.get_rect().center))
        pygame.display.flip()
        clock.tick(30)

    # Extra settle time so rr_window has data
    print("Connected. Settling 3s...")
    settle_start = time.time()
    while time.time() - settle_start < 8:
        for e in pygame.event.get():
            if e.type == pygame.QUIT or (e.type == pygame.KEYDOWN and e.key in (pygame.K_q, pygame.K_ESCAPE)):
                pygame.quit(); return
        screen.fill((20, 20, 20))
        txt = font_small.render(f"Starting in {8 - (time.time()-settle_start):.0f}s...", True, (180, 180, 180))
        screen.blit(txt, txt.get_rect(center=screen.get_rect().center))
        pygame.display.flip()
        clock.tick(30)

    print("Starting color sequence.")

    for color_name, color_rgb in COLORS:
        start = time.time()
        # collect samples throughout the window
        samples = []

        while time.time() - start < COLOR_DURATION:
            for e in pygame.event.get():
                if e.type == pygame.QUIT or (e.type == pygame.KEYDOWN and e.key in (pygame.K_q, pygame.K_ESCAPE)):
                    _save_and_quit(); pygame.quit(); return

            # sample every ~500ms
            if not samples or time.time() - samples[-1]["t"] > 0.5:
                rr_snap = list(rr_window)
                samples.append({
                    "t": time.time(),
                    "hr": hr_current[0],
                    "rr_last": rr_snap[-1] if rr_snap else None,
                    "delta_rr": delta_rr(),
                    "rmssd": rmssd(rr_snap[-80:]),
                })

            screen.fill(color_rgb)
            lum = 0.299*color_rgb[0] + 0.587*color_rgb[1] + 0.114*color_rgb[2]
            tc = (0, 0, 0) if lum > 128 else (255, 255, 255)

            elapsed = time.time() - start
            rr_snap = list(rr_window)
            screen.blit(font_big.render(f"{hr_current[0]} bpm", True, tc),
                        font_big.render(f"{hr_current[0]} bpm", True, tc)
                        .get_rect(center=(screen.get_width()//2, screen.get_height()//2 - 40)))
            screen.blit(font_small.render(f"RMSSD {rmssd(rr_snap[-80:]):.1f}ms", True, tc),
                        font_small.render(f"RMSSD {rmssd(rr_snap[-80:]):.1f}ms", True, tc)
                        .get_rect(center=(screen.get_width()//2, screen.get_height()//2 + 50)))
            screen.blit(font_small.render(color_name.upper(), True, tc),
                        (40, 40))
            screen.blit(font_small.render(f"{COLOR_DURATION - elapsed:.1f}s", True, tc),
                        font_small.render(f"{COLOR_DURATION - elapsed:.1f}s", True, tc)
                        .get_rect(topright=(screen.get_width()-40, 40)))
            pygame.display.flip()
            clock.tick(30)

        # summarise this color window
        if samples:
            entry = {
                "color": color_name,
                "t_start": start,
                "hr_mean": sum(s["hr"] for s in samples) / len(samples),
                "hr_start": samples[0]["hr"],
                "hr_end": samples[-1]["hr"],
                "rmssd_mean": sum(s["rmssd"] for s in samples) / len(samples),
                "delta_rr_max": max(abs(s["delta_rr"]) for s in samples),
                "samples": samples,
            }
            log_entries.append(entry)
            print(f"[{color_name:8s}] HR={entry['hr_mean']:.1f}  RMSSD={entry['rmssd_mean']:.1f}  dRR_max={entry['delta_rr_max']}")

    _save_and_quit()
    pygame.quit()

def _save_and_quit():
    with open("color_test.jsonl", "w") as f:
        for e in log_entries:
            f.write(json.dumps(e) + "\n")
    print(f"\nSaved {len(log_entries)} entries to color_test.jsonl")

if __name__ == "__main__":
    main()
