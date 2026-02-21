"""
Visual test harness for Polar H10 accelerometer.
Scans, connects, and prints ACC data with movement indication.

Run: python -m bridge.test_accel_visual
"""

import asyncio
import math
from bleak import BleakScanner, BleakClient
from bleakheart import PolarMeasurementData


def log(msg):
    print(msg, flush=True)


async def main():
    log("=" * 50)
    log("  POLAR H10 ACCELEROMETER TEST")
    log("=" * 50)
    log("\nMake sure your Polar H10 is:")
    log("  - Worn on chest")
    log("  - Contacts are wet")
    log("  - LED is blinking\n")

    log("Scanning for Polar H10...")
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name,
        timeout=15,
    )

    if not device:
        log("\n❌ No Polar H10 found!")
        return

    log(f"✅ Found: {device.name} ({device.address})")
    log("\nConnecting...")

    async with BleakClient(device) as client:
        log("✅ Connected!")

        queue = asyncio.Queue()
        pmd = PolarMeasurementData(client, acc_queue=queue)

        available = await pmd.available_measurements()
        log(f"Available: {available}")

        if "ACC" not in available:
            log("❌ ACC not available")
            return

        err, msg, _ = await pmd.start_streaming("ACC", sample_rate=25)
        if err:
            log(f"❌ Error: {msg}")
            return

        log("\nStreaming ACC — Ctrl+C to stop")
        log("Move around to see changes!\n")

        try:
            while True:
                dtype, tstamp, samples = await asyncio.wait_for(queue.get(), timeout=10)

                if samples:
                    x, y, z = samples[-1]
                    mag = int(math.sqrt(x*x + y*y + z*z))

                    # Simple movement bar
                    deviation = abs(mag - 1000)  # 1000 mG = 1G (gravity)
                    bars = min(20, deviation // 50)
                    bar = "█" * bars + "░" * (20 - bars)

                    log(f"  X:{x:5} Y:{y:5} Z:{z:5} | {bar} | mag:{mag}")

        except asyncio.TimeoutError:
            log("\n⚠️  No data for 10s")
        except KeyboardInterrupt:
            log("\n\nStopped.")

        await pmd.stop_streaming("ACC")

    log("Disconnected. Done.")


if __name__ == "__main__":
    asyncio.run(main())
