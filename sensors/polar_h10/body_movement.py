"""
body_movement.py — Detect body position/movement from Polar H10 accelerometer

The H10 on your chest can detect:
- Leaning forward (engaged) vs leaning back (passive)
- Standing vs sitting vs lying down
- Movement vs stillness
- Left/right tilt

This is a signal you don't consciously control — your body just does it.

Run: python body_movement.py
"""

import asyncio
import math
from bleak import BleakScanner, BleakClient
from bleakheart import PolarMeasurementData

class BodyState:
    # Raw accelerometer (milliG)
    acc_x = 0  # Left/right tilt
    acc_y = 0  # Forward/back lean  
    acc_z = 0  # Up/down (gravity)
    
    # Smoothed values
    smooth_x = 0
    smooth_y = 0
    smooth_z = 0
    
    # Derived posture
    posture = "unknown"  # standing, sitting, lying, leaning_forward, leaning_back
    movement = "still"   # still, moving, active
    
    # History for movement detection
    history = []
    
    connected = False
    status = "Scanning..."


def classify_posture(x, y, z):
    """
    Classify body posture from accelerometer.
    
    When H10 is on chest:
    - Standing upright: Z points forward (toward ground when looking down), Y is vertical
    - Leaning forward: Y tilts negative (chest pointing down)
    - Leaning back: Y tilts positive (chest pointing up)
    - Lying on back: Y near zero, Z pointing up
    
    Note: Exact mapping depends on H10 orientation on body.
    These are approximate — calibration needed for precision.
    """
    # Magnitude (should be ~1000 mG = 1G when still)
    mag = math.sqrt(x*x + y*y + z*z)
    
    # Normalize
    if mag < 100:
        return "unknown", "unknown"
    
    nx, ny, nz = x/mag, y/mag, z/mag
    
    # Posture based on gravity direction
    # Y axis along torso (positive = head direction)
    # Z axis perpendicular to chest (positive = forward)
    
    if abs(ny) > 0.8:
        # Y is dominant — lying down
        if ny > 0:
            posture = "lying_face_up"
        else:
            posture = "lying_face_down"
    elif abs(nz) > 0.7:
        # Z is dominant — upright
        if nz > 0:
            posture = "upright"
        else:
            posture = "upright"  # inverted but unlikely
    elif ny < -0.3:
        posture = "leaning_forward"
    elif ny > 0.3:
        posture = "leaning_back"
    else:
        posture = "upright"
    
    return posture


def classify_movement(history):
    """Classify movement from recent accelerometer history."""
    if len(history) < 10:
        return "unknown"
    
    # Calculate variance over recent samples
    recent = history[-20:]
    xs = [h[0] for h in recent]
    ys = [h[1] for h in recent]
    zs = [h[2] for h in recent]
    
    var_x = sum((x - sum(xs)/len(xs))**2 for x in xs) / len(xs)
    var_y = sum((y - sum(ys)/len(ys))**2 for y in ys) / len(ys)
    var_z = sum((z - sum(zs)/len(zs))**2 for z in zs) / len(zs)
    
    total_var = var_x + var_y + var_z
    
    if total_var < 1000:
        return "still"
    elif total_var < 50000:
        return "slight_movement"
    elif total_var < 200000:
        return "moving"
    else:
        return "active"


async def acc_task(state):
    """Connect to Polar H10 and stream accelerometer data."""
    print("Scanning for Polar H10...")
    
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=20
    )
    
    if not device:
        state.status = "No Polar H10 found"
        print("No Polar H10 found. Make sure it's worn (wet the strap).")
        return
    
    state.status = f"Connecting to {device.name}..."
    print(f"Found: {device.name}")
    
    async with BleakClient(device) as client:
        acc_queue = asyncio.Queue()
        pmd = PolarMeasurementData(client, acc_queue=acc_queue)
        
        # Check available measurements
        available = await pmd.available_measurements()
        print(f"Available measurements: {available}")
        
        if 'ACC' not in available:
            print("Accelerometer not available on this device")
            return
        
        # Start accelerometer stream (25Hz is enough for posture)
        err, msg, _ = await pmd.start_streaming('ACC', sample_rate=25)
        if err:
            print(f"Error starting ACC stream: {msg}")
            return
            
        state.connected = True
        state.status = "Streaming accelerometer"
        
        print("\nStreaming... (Ctrl+C to stop)\n")
        print("Move your body to see changes:")
        print("  - Lean forward/back")
        print("  - Stand up / sit down")
        print("  - Move around vs stay still\n")
        
        last_posture = None
        last_movement = None
        
        while True:
            dtype, tstamp, samples = await acc_queue.get()
            
            # samples is list of (x, y, z) tuples
            for (x, y, z) in samples:
                state.acc_x, state.acc_y, state.acc_z = x, y, z
                
                # Smooth with exponential moving average
                alpha = 0.2
                state.smooth_x = alpha * x + (1-alpha) * state.smooth_x
                state.smooth_y = alpha * y + (1-alpha) * state.smooth_y
                state.smooth_z = alpha * z + (1-alpha) * state.smooth_z
                
                # Record history
                state.history.append((x, y, z))
                state.history = state.history[-100:]  # Keep last 100
                
                # Classify
                state.posture = classify_posture(
                    state.smooth_x, state.smooth_y, state.smooth_z
                )
                state.movement = classify_movement(state.history)
            
            # Print changes
            if state.posture != last_posture or state.movement != last_movement:
                emoji = {
                    "upright": "🧍",
                    "leaning_forward": "🏃",
                    "leaning_back": "🪑",
                    "lying_face_up": "🛏️",
                    "lying_face_down": "🙇",
                    "unknown": "❓"
                }.get(state.posture, "❓")
                
                move_emoji = {
                    "still": "🔵",
                    "slight_movement": "🟡",
                    "moving": "🟠",
                    "active": "🔴",
                    "unknown": "⚪"
                }.get(state.movement, "⚪")
                
                print(f"  {emoji} {state.posture:18} | {move_emoji} {state.movement}")
                last_posture = state.posture
                last_movement = state.movement


async def main():
    print("=" * 50)
    print("  BODY MOVEMENT DETECTION")
    print("=" * 50)
    print("\nUsing Polar H10 accelerometer to detect:")
    print("  - Posture (upright, leaning, lying)")
    print("  - Movement (still, moving, active)")
    print()
    
    state = BodyState()
    await acc_task(state)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nStopped.")
