import asyncio
from bleak import BleakScanner

async def main():
    print("Scanning 10s for all BLE devices...\n")
    devices = await BleakScanner.discover(timeout=10)
    for d in devices:
        print(f"{d.address}  {repr(d.name)}")

asyncio.run(main())
