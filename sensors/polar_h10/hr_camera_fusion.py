"""
hr_camera_fusion.py — Heart rate + camera presence fusion

Two sensors:
1. Polar H10 → heart rate
2. Webcam → face detection (presence/proximity)

Fusion rule:
- Face detected = visual responds to HR
- No face = visual goes dormant
- Face size (proximity) = intensity multiplier
"""

import asyncio
import math
import cv2
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate


class State:
    # HR data
    hr = 70
    rr = 857
    hr_connected = False
    hr_status = "Scanning for Polar H10..."
    
    # Camera data
    face_detected = False
    face_size = 0.0  # 0-1, based on face bounding box size
    face_x = 0.5     # 0-1, horizontal position
    face_y = 0.5     # 0-1, vertical position
    camera_ok = False
    
    # Fused output
    presence = 0.0   # smoothed presence value (0 = gone, 1 = fully present)


async def ble_task(state):
    """Connect to Polar H10 and update shared state with HR data."""
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=10
    )
    if not device:
        state.hr_status = "No Polar H10 found — using simulated HR"
        while True:
            await asyncio.sleep(0.5)
            # Simulate HR that varies over time
            t = asyncio.get_event_loop().time()
            state.hr = int(70 + 15 * math.sin(t / 8) + 10 * math.sin(t / 3))
            state.rr = 60000 // max(state.hr, 40)
        return

    state.hr_status = f"Connecting to {device.name}..."
    
    async with BleakClient(device) as client:
        queue = asyncio.Queue()
        hr_service = HeartRate(client, queue=queue)
        await hr_service.start_notify()
        
        state.hr_connected = True
        state.hr_status = f"Connected: {device.name}"
        
        while True:
            frame = await queue.get()
            kind, tstamp, (bpm, rr_list), energy = frame
            state.hr = bpm
            if rr_list:
                state.rr = rr_list[-1] if isinstance(rr_list, list) else rr_list


async def camera_task(state):
    """Capture webcam and detect faces."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        state.hr_status = "Camera not available"
        return
    
    state.camera_ok = True
    
    # Load face detector (Haar cascade — fast, good enough)
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    
    frame_w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    frame_h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            await asyncio.sleep(0.1)
            continue
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80)
        )
        
        if len(faces) > 0:
            # Take largest face
            largest = max(faces, key=lambda f: f[2] * f[3])
            x, y, w, h = largest
            
            state.face_detected = True
            state.face_size = min((w * h) / (frame_w * frame_h) * 10, 1.0)  # normalize
            state.face_x = (x + w/2) / frame_w
            state.face_y = (y + h/2) / frame_h
        else:
            state.face_detected = False
            state.face_size = 0.0
        
        # Smooth presence (ease in/out)
        target = 1.0 if state.face_detected else 0.0
        state.presence += (target - state.presence) * 0.1
        
        await asyncio.sleep(0.033)  # ~30 fps
    
    cap.release()


async def display_task(state):
    """Pygame display with fused HR + presence."""
    import pygame
    
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    pygame.display.set_caption("HR + Camera Fusion")
    clock = pygame.time.Clock()
    
    beat_phase = 0.0
    last_time = pygame.time.get_ticks()
    last_print = 0
    
    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
        
        current_time = pygame.time.get_ticks()
        dt = current_time - last_time
        last_time = current_time
        
        # Beat phase
        beat_duration_ms = 60000 / max(state.hr, 40)
        beat_phase += dt / beat_duration_ms
        if beat_phase >= 1.0:
            beat_phase -= 1.0
        
        # Pulse shape
        if beat_phase < 0.1:
            pulse = beat_phase / 0.1
        else:
            pulse = 1.0 - ((beat_phase - 0.1) / 0.9)
        pulse = pulse ** 0.5
        
        # === FUSION HAPPENS HERE ===
        # Presence modulates the visual response
        presence = state.presence
        
        # Base size: small when no presence, larger when present
        base_size = 30 + 70 * presence
        
        # Pulse amplitude: subtle when no presence, strong when present
        pulse_amplitude = 20 + 150 * presence
        
        size = base_size + pulse_amplitude * pulse
        
        # Color: dim/blue when dormant, red when present+high HR
        hr_factor = min(max((state.hr - 50) / 100, 0), 1)
        
        if presence < 0.3:
            # Dormant: dim blue-gray
            red = int(40 + 30 * presence)
            green = int(40 + 20 * presence)
            blue = int(80 + 40 * presence)
        else:
            # Active: HR drives color
            red = int(100 + 155 * hr_factor * presence)
            green = int(50 * (1 - hr_factor * presence))
            blue = int(80 * (1 - presence) + 50 * (1 - hr_factor))
        
        # Position: follows face slightly
        center_x = 400 + int((state.face_x - 0.5) * 100 * presence)
        center_y = 300 + int((state.face_y - 0.5) * 100 * presence)
        
        # === DRAW ===
        # Background: darker when dormant
        bg = int(10 + 10 * presence)
        screen.fill((bg, bg, bg + 5))
        
        # Glow (stronger with presence)
        glow_intensity = int(30 * presence)
        for i in range(5, 0, -1):
            glow_size = size + i * 20
            alpha = glow_intensity - i * 5
            if alpha > 0:
                glow_surf = pygame.Surface((int(glow_size * 2), int(glow_size * 2)), pygame.SRCALPHA)
                pygame.draw.circle(glow_surf, (red, green, blue, alpha),
                                 (int(glow_size), int(glow_size)), int(glow_size))
                screen.blit(glow_surf, (center_x - int(glow_size), center_y - int(glow_size)))
        
        # Main circle
        pygame.draw.circle(screen, (red, green, blue), (center_x, center_y), int(size))
        
        # Small presence indicator in corner
        indicator_color = (0, 200, 0) if state.face_detected else (100, 100, 100)
        pygame.draw.circle(screen, indicator_color, (750, 50), 15)
        
        pygame.display.flip()
        clock.tick(60)
        
        # Console output
        if current_time - last_print > 500:
            face_str = f"FACE ({state.face_size:.1%})" if state.face_detected else "no face"
            print(f"\rHR: {state.hr:3d} BPM | {face_str:16s} | presence: {presence:.0%}", end="", flush=True)
            last_print = current_time
        
        await asyncio.sleep(0)
    
    pygame.quit()


async def main():
    state = State()
    
    ble = asyncio.create_task(ble_task(state))
    camera = asyncio.create_task(camera_task(state))
    display = asyncio.create_task(display_task(state))
    
    await display
    ble.cancel()
    camera.cancel()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
