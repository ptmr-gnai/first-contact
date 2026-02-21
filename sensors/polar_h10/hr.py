import asyncio
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate

async def main():
    print("Scanning for Polar H10...")
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=10
    )
    if not device:
        print("No Polar H10 found. Make sure it's on and worn.")
        return

    print(f"Found: {device.name} ({device.address})")
    queue = asyncio.Queue()

    async with BleakClient(device) as client:
        hr = HeartRate(client, queue=queue)
        await hr.start_notify()
        print("Streaming HR — Ctrl+C to stop\n")
        while True:
            frame = await queue.get()
            kind, tstamp, (bpm, rr), energy = frame
            print(f"HR: {bpm} bpm  RR: {rr} ms")

asyncio.run(main())
