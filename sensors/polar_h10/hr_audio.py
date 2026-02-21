"""
hr_audio.py — Heart rate audio experiment

Two modes:
1. MIRROR: Hear your own heartbeat (binaural thump synced to your HR)
2. ENTRAIN: Hear a target heartbeat slightly slower than yours (does your HR follow?)

Put on headphones!
"""

import asyncio
import numpy as np
import sounddevice as sd
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate
import math
import time

# Audio settings
SAMPLE_RATE = 44100

class State:
    hr = 70
    rr = 857
    connected = False
    status = "Scanning..."
    
    # For entrainment
    target_hr = None  # Set after baseline
    hr_history = []   # Track HR over time


def make_heartbeat_sound():
    """
    Creates a binaural heartbeat — slightly different in each ear
    so it feels "inside your head"
    """
    duration = 0.2
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration))
    
    # Two-part heartbeat: lub-dub
    lub = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 25)
    dub = np.sin(2 * np.pi * 45 * t) * np.exp(-(t - 0.1).clip(0) * 30)
    dub = np.roll(dub, int(0.08 * SAMPLE_RATE))  # delay the dub
    
    mono = (lub + dub * 0.7) * 0.6
    
    # Slight binaural difference — left ear gets it ~1ms earlier
    # This creates sense of it being "centered inside head"
    delay_samples = int(0.001 * SAMPLE_RATE)
    left = mono
    right = np.roll(mono, delay_samples)
    
    stereo = np.column_stack([left, right]).astype(np.float32)
    return stereo


def make_binaural_pulse(base_freq=100, beat_freq=10, duration=0.3):
    """
    Binaural beat — two frequencies create perceived pulsing
    beat_freq: the perceived pulse rate (Hz)
    """
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration))
    
    # Envelope so it fades in/out smoothly
    envelope = np.sin(np.pi * t / duration) ** 2
    
    left = np.sin(2 * np.pi * base_freq * t) * envelope
    right = np.sin(2 * np.pi * (base_freq + beat_freq) * t) * envelope
    
    stereo = np.column_stack([left, right]).astype(np.float32) * 0.4
    return stereo


async def ble_task(state):
    """Connect to Polar H10"""
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=10
    )
    if not device:
        state.status = "No Polar H10 — using simulated HR"
        while True:
            await asyncio.sleep(0.5)
            t = asyncio.get_event_loop().time()
            state.hr = int(72 + 8 * math.sin(t / 10))
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
            state.hr_history.append((time.time(), bpm))
            # Keep last 5 minutes
            cutoff = time.time() - 300
            state.hr_history = [(t, h) for t, h in state.hr_history if t > cutoff]
            
            if rr_list:
                state.rr = rr_list[-1] if isinstance(rr_list, list) else rr_list


async def audio_mirror_task(state):
    """
    MIRROR MODE: Play heartbeat sound synced to your actual HR
    You hear your own heart
    """
    heartbeat = make_heartbeat_sound()
    
    print("\n♥ MIRROR MODE — You're hearing your own heartbeat ♥")
    print("  Put on headphones for binaural effect\n")
    
    while True:
        # Play the heartbeat
        sd.play(heartbeat, SAMPLE_RATE)
        
        # Wait for next beat based on current HR
        interval = 60.0 / max(state.hr, 40)
        await asyncio.sleep(interval)


async def audio_entrain_task(state):
    """
    ENTRAIN MODE: Play heartbeat slightly slower than yours
    Theory: Your HR may drift down to match
    """
    heartbeat = make_heartbeat_sound()
    
    # Wait for baseline
    print("\n⏳ Measuring baseline HR for 15 seconds...")
    await asyncio.sleep(15)
    
    if state.hr_history:
        recent = [h for t, h in state.hr_history if t > time.time() - 15]
        baseline = sum(recent) / len(recent) if recent else state.hr
    else:
        baseline = state.hr
    
    # Target is 10 BPM slower
    target = max(baseline - 10, 50)
    state.target_hr = target
    
    print(f"\n♥ ENTRAIN MODE ♥")
    print(f"  Your baseline: {baseline:.0f} BPM")
    print(f"  Target pulse:  {target:.0f} BPM")
    print(f"  Let's see if your heart follows...\n")
    
    start_time = time.time()
    
    while True:
        sd.play(heartbeat, SAMPLE_RATE)
        
        # Fixed interval at target rate
        interval = 60.0 / target
        await asyncio.sleep(interval)
        
        # Report progress every 30 seconds
        elapsed = time.time() - start_time
        if int(elapsed) % 30 == 0 and int(elapsed) > 0:
            current = state.hr
            diff = baseline - current
            direction = "↓" if diff > 0 else "↑" if diff < 0 else "→"
            print(f"  [{elapsed/60:.1f} min] Your HR: {current} BPM ({direction} {abs(diff):.0f} from baseline)")


async def audio_binaural_task(state):
    """
    BINAURAL MODE: Pure binaural beat synced to HR
    Different experience — more "in your head" pulsing
    """
    print("\n🎧 BINAURAL MODE — Pulsing synced to your HR 🎧")
    print("  Put on headphones — you'll feel the beat inside your head\n")
    
    while True:
        # Create pulse with beat frequency matching HR
        # HR of 60 = 1 Hz beat, HR of 120 = 2 Hz beat
        beat_freq = state.hr / 60.0  # Convert BPM to Hz
        
        pulse = make_binaural_pulse(base_freq=80, beat_freq=beat_freq, duration=0.5)
        sd.play(pulse, SAMPLE_RATE)
        
        await asyncio.sleep(0.4)  # Overlap slightly for continuous sound


async def main():
    import sys
    
    mode = sys.argv[1] if len(sys.argv) > 1 else "mirror"
    
    print("=" * 50)
    print("  HR AUDIO EXPERIMENT")
    print("=" * 50)
    print(f"\nMode: {mode.upper()}")
    print("Press Ctrl+C to stop\n")
    
    state = State()
    
    ble = asyncio.create_task(ble_task(state))
    
    # Wait for connection
    await asyncio.sleep(2)
    print(f"Status: {state.status}")
    print(f"Current HR: {state.hr} BPM\n")
    
    if mode == "mirror":
        audio = asyncio.create_task(audio_mirror_task(state))
    elif mode == "entrain":
        audio = asyncio.create_task(audio_entrain_task(state))
    elif mode == "binaural":
        audio = asyncio.create_task(audio_binaural_task(state))
    else:
        print(f"Unknown mode: {mode}")
        print("Options: mirror, entrain, binaural")
        return
    
    # Run until Ctrl+C
    try:
        while True:
            await asyncio.sleep(1)
            print(f"\r  HR: {state.hr} BPM   ", end="", flush=True)
    except asyncio.CancelledError:
        pass
    finally:
        ble.cancel()
        audio.cancel()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nStopped.")
