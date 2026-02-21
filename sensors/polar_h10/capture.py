"""Continuous capture of all H10 streams to data.jsonl — runs until Ctrl+C."""
import asyncio, json, time
from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate, PolarMeasurementData

async def main():
    print("Scanning for Polar H10...")
    device = await BleakScanner.find_device_by_filter(
        lambda d, _: d.name and "Polar H10" in d.name, timeout=20
    )
    if not device:
        # fallback to known address
        from bleak import BleakClient as _BC
        device = "154D49A0-459A-F874-D4FF-6A352454C040"
        print(f"Using known address: {device}")
    print(f"Connected: {device.name}")

    hr_q = asyncio.Queue()
    ecg_q = asyncio.Queue()
    acc_q = asyncio.Queue()

    async with BleakClient(device) as client:
        hr = HeartRate(client, queue=hr_q)
        pmd = PolarMeasurementData(client, ecg_queue=ecg_q, acc_queue=acc_q)

        await hr.start_notify()
        await pmd.start_streaming("ECG")
        await pmd.start_streaming("ACC")

        print("Streaming HR + ECG + ACC → data.jsonl\n")

        with open("data.jsonl", "a") as f:
            async def drain(q, kind):
                while True:
                    frame = await q.get()
                    record = {"t": time.time(), "kind": kind, "data": str(frame)}
                    f.write(json.dumps(record) + "\n")
                    f.flush()
                    if kind == "HR":
                        _, _, (bpm, rr), _ = frame
                        print(f"HR: {bpm} bpm  RR: {rr}")

            await asyncio.gather(
                drain(hr_q, "HR"),
                drain(ecg_q, "ECG"),
                drain(acc_q, "ACC"),
            )

asyncio.run(main())
