"""
Visual test harness for Polar H10 heart rate sensor.
Scans, connects, and prints HR data.

Run: python -m bridge.test_hr_visual
"""

import asyncio
import sys
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate


def log(msg):
    print(msg, flush=True)


async def main():
    log("=" * 50)
    log("  POLAR H10 HEART RATE TEST")
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
        log("   Try wetting the contacts and putting it on.")
        return

    log(f"✅ Found: {device.name} ({device.address})")
    log("\nConnecting...")

    async with BleakClient(device) as client:
        log("✅ Connected!")
        log("\nStreaming HR — Ctrl+C to stop\n")

        queue = asyncio.Queue()
        hr = HeartRate(client, queue=queue)
        await hr.start_notify()

        try:
            while True:
                frame = await asyncio.wait_for(queue.get(), timeout=10)
                kind, tstamp, (bpm, rr), energy = frame

                # Visual heart
                bar = "❤️ " * (bpm // 20)
                rr_str = f"RR: {rr}" if rr else ""
                log(f"  {bar} {bpm} bpm  {rr_str}")

        except asyncio.TimeoutError:
            log("\n⚠️  No data for 10s — check sensor contact")
        except KeyboardInterrupt:
            log("\n\nStopped.")

        await hr.stop_notify()

    log("Disconnected. Done.")


if __name__ == "__main__":
    asyncio.run(main())
