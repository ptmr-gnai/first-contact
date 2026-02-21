"""
hr_binaural.py — HR-reactive binaural beats

Uses the `binaural` library to generate beats that respond to your heart rate.

Brainwave frequency bands:
- Delta (0.5-4 Hz): Deep sleep
- Theta (4-8 Hz): Meditation, creativity  
- Alpha (8-13 Hz): Relaxation, calm focus
- Beta (13-30 Hz): Alert, active thinking
- Gamma (30+ Hz): Peak concentration

The idea: As your HR changes, we shift the binaural beat frequency
to guide you toward a target state.
"""

import asyncio
import numpy as np
import sounddevice as sd
import binaural
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate
import math
import time
import sys

SAMPLE_RATE = 44100

class State:
    hr = 70
    connected = False
    status = "Scanning..."
    
    # Target state
    target_brainwave = 10  # Hz (alpha)
    current_beat_freq = 10


def hr_to_target_brainwave(hr):
    """
    Map heart rate to target brainwave frequency.
    
    High HR (stressed) → guide toward alpha/theta (calming)
    Low HR (relaxed) → can stay in alpha or go to beta (alertness)
    """
    if hr > 90:
        # Stressed - guide toward theta (calming)
        return 6  # theta
    elif hr > 75:
        # Elevated - guide toward alpha
        return 10  # alpha
    elif hr > 60:
        # Normal - alpha for relaxed focus
        return 11  # alpha
    else:
        # Very relaxed - can nudge toward beta for alertness
        return 14  # low beta


async def ble_task(state):
    """Connect to Polar H10"""
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=10
    )
    if not device:
        state.status = "No Polar H10 — simulating HR"
        while True:
            await asyncio.sleep(0.5)
            t = asyncio.get_event_loop().time()
            # Simulate HR that varies
            state.hr = int(72 + 15 * math.sin(t / 20))
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


async def audio_task(state):
    """
    Generate continuous binaural beats that adapt to HR.
    Uses streaming callback for seamless audio — no clicks or gaps.
    """
    print("\n🎧 HR-REACTIVE BINAURAL BEATS")
    print("   Put on headphones!\n")
    print("   Brainwave targets:")
    print("   - High HR (>90): Theta (6Hz) - calming")
    print("   - Elevated (75-90): Alpha (10Hz) - relaxation")
    print("   - Normal (60-75): Alpha (11Hz) - calm focus")
    print("   - Low (<60): Beta (14Hz) - alertness\n")
    
    base_freq = 150  # Base carrier frequency
    
    # Phase accumulators for continuous waveform (no clicks)
    phase_left = 0.0
    phase_right = 0.0
    
    def audio_callback(outdata, frames, time_info, status):
        nonlocal phase_left, phase_right
        
        # Calculate target based on current HR
        target = hr_to_target_brainwave(state.hr)
        
        # Smooth transition
        state.current_beat_freq += (target - state.current_beat_freq) * 0.05
        beat_freq = state.current_beat_freq
        
        # Frequencies for left and right (difference = beat frequency)
        freq_left = base_freq
        freq_right = base_freq + beat_freq
        
        # Generate samples with continuous phase
        t = np.arange(frames) / SAMPLE_RATE
        
        # Left channel
        left = np.sin(2 * np.pi * freq_left * t + phase_left) * 0.35
        phase_left += 2 * np.pi * freq_left * frames / SAMPLE_RATE
        phase_left %= 2 * np.pi
        
        # Right channel
        right = np.sin(2 * np.pi * freq_right * t + phase_right) * 0.35
        phase_right += 2 * np.pi * freq_right * frames / SAMPLE_RATE
        phase_right %= 2 * np.pi
        
        outdata[:, 0] = left.astype(np.float32)
        outdata[:, 1] = right.astype(np.float32)
    
    # Start continuous stream
    with sd.OutputStream(samplerate=SAMPLE_RATE, channels=2, callback=audio_callback, blocksize=2048):
        last_print = 0
        while True:
            await asyncio.sleep(0.1)
            
            # Print status every 500ms
            now = time.time()
            if now - last_print > 0.5:
                beat_freq = state.current_beat_freq
                band = "θ theta" if beat_freq < 8 else "α alpha" if beat_freq < 13 else "β beta"
                print(f"\r  HR: {state.hr:3d} BPM → {beat_freq:.1f}Hz ({band})   ", end="", flush=True)
                last_print = now


async def audio_entrainment_task(state):
    """
    Alternative mode: Fixed target frequency for entrainment experiment.
    Tries to guide your brain to a specific state regardless of HR.
    """
    target_hz = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
    
    print(f"\n🎧 ENTRAINMENT MODE — Target: {target_hz}Hz")
    
    band = "δ delta" if target_hz < 4 else "θ theta" if target_hz < 8 else "α alpha" if target_hz < 13 else "β beta" if target_hz < 30 else "γ gamma"
    print(f"   Band: {band}")
    print("   Put on headphones! Running for 10 minutes.\n")
    
    chunk_duration = 3.0
    base_freq = 150
    
    start_time = time.time()
    start_hr = state.hr
    
    while True:
        left, right = binaural.generate_binaural_beat(
            base_frequency=base_freq,
            beat_frequency=target_hz,
            duration=chunk_duration,
            amplitude=0.35,
            attack=0.1,
            decay=0.1
        )
        
        chunk = np.column_stack([left, right]).astype(np.float32)
        sd.play(chunk, SAMPLE_RATE)
        
        elapsed = time.time() - start_time
        hr_change = state.hr - start_hr
        direction = "↓" if hr_change < 0 else "↑" if hr_change > 0 else "→"
        
        print(f"\r  [{elapsed/60:.1f}min] HR: {state.hr:3d} BPM ({direction}{abs(hr_change):+.0f} from start) | Target: {target_hz}Hz   ", end="", flush=True)
        
        await asyncio.sleep(chunk_duration - 0.1)


async def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "adaptive"
    
    print("=" * 50)
    print("  HR-REACTIVE BINAURAL BEATS")
    print("=" * 50)
    print(f"\nMode: {mode}")
    print("Press Ctrl+C to stop\n")
    
    state = State()
    
    ble = asyncio.create_task(ble_task(state))
    await asyncio.sleep(2)
    print(f"Status: {state.status}")
    print(f"Current HR: {state.hr} BPM\n")
    
    if mode == "adaptive":
        audio = asyncio.create_task(audio_task(state))
    elif mode == "entrain":
        audio = asyncio.create_task(audio_entrainment_task(state))
    else:
        print(f"Unknown mode: {mode}")
        print("Options: adaptive, entrain [freq_hz]")
        print("Example: python hr_binaural.py entrain 8")
        return
    
    try:
        await asyncio.gather(ble, audio)
    except asyncio.CancelledError:
        pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nStopped.")
