"""
hr_visual.py — Heart rate visualization

Connects to Polar H10 and displays a pulsing circle that beats with your heart.
"""

import asyncio
import math
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate

# We'll use pygame for the visual, but import it lazily in the display task
# so BLE can start scanning while pygame initializes

# Shared state between BLE and display
class State:
    hr = 70  # BPM
    rr = 857  # RR interval in ms (60000/70)
    last_beat_time = 0
    connected = False
    status = "Scanning for Polar H10..."


async def ble_task(state):
    """Connect to Polar H10 and update shared state with HR data."""
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=10
    )
    if not device:
        state.status = "No Polar H10 found. Using simulated HR."
        # Continue with simulated data for testing
        while True:
            await asyncio.sleep(1)
            state.hr = 70 + int(10 * math.sin(asyncio.get_event_loop().time() / 5))
            state.rr = 60000 // state.hr
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
            kind, tstamp, (bpm, rr_list), energy = frame
            state.hr = bpm
            if rr_list:
                state.rr = rr_list[-1] if isinstance(rr_list, list) else rr_list


async def display_task(state):
    """Pygame display that pulses with heart rate."""
    import pygame
    
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    pygame.display.set_caption("Heart Rate Visual")
    clock = pygame.time.Clock()
    
    beat_phase = 0.0  # 0 to 1, resets each beat
    last_time = pygame.time.get_ticks()
    
    running = True
    while running:
        # Handle events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False
        
        # Calculate beat phase
        current_time = pygame.time.get_ticks()
        dt = current_time - last_time
        last_time = current_time
        
        # Advance phase based on current HR
        # One full cycle per beat: phase increases by (dt / beat_duration)
        beat_duration_ms = 60000 / state.hr
        beat_phase += dt / beat_duration_ms
        if beat_phase >= 1.0:
            beat_phase -= 1.0
        
        # Visual: circle that pulses
        # Quick expansion at beat, slow contraction
        if beat_phase < 0.1:
            # Systole: quick expansion
            pulse = beat_phase / 0.1
        else:
            # Diastole: slow contraction
            pulse = 1.0 - ((beat_phase - 0.1) / 0.9)
        
        # Easing for more organic feel
        pulse = pulse ** 0.5  # ease out
        
        base_size = 80
        pulse_size = 120
        size = base_size + pulse_size * pulse
        
        # Color intensifies with HR
        hr_normalized = min(max((state.hr - 50) / 100, 0), 1)  # 50-150 BPM range
        red = int(150 + 105 * hr_normalized)
        green = int(50 * (1 - hr_normalized))
        blue = int(50 * (1 - hr_normalized))
        
        # Draw
        screen.fill((10, 10, 15))
        
        # Glow effect (concentric circles with alpha)
        for i in range(5, 0, -1):
            glow_size = size + i * 20
            alpha = 30 - i * 5
            glow_surf = pygame.Surface((glow_size * 2, glow_size * 2), pygame.SRCALPHA)
            pygame.draw.circle(glow_surf, (red, green, blue, alpha), 
                             (glow_size, glow_size), glow_size)
            screen.blit(glow_surf, (400 - glow_size, 300 - glow_size))
        
        # Main circle
        pygame.draw.circle(screen, (red, green, blue), (400, 300), int(size))
        
        # No text rendering - pygame.font broken on Python 3.14
        # HR is printed to console instead
        
        pygame.display.flip()
        clock.tick(60)
        
        # Print HR to console periodically
        if int(beat_phase * 10) == 0:
            print(f"\rHR: {state.hr} BPM | RR: {state.rr}ms | {state.status}", end="", flush=True)
        
        # Let asyncio breathe
        await asyncio.sleep(0)
    
    pygame.quit()


async def main():
    state = State()
    
    # Run BLE and display concurrently
    ble = asyncio.create_task(ble_task(state))
    display = asyncio.create_task(display_task(state))
    
    # When display closes, we're done
    await display
    ble.cancel()


if __name__ == "__main__":
    asyncio.run(main())
