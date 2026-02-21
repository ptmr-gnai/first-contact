# Polar H10 BLE — First Contact

Exploratory Python project to connect a Polar H10 chest strap via BLE on macOS.

## Goal

Stream live data from the Polar H10 to this machine. Start with heart rate, then
expand to ECG and accelerometer as needed.

## Library Choice

**`bleakheart`** (MIT-compatible, MPL-2.0) — built specifically for Polar H10.

- Wraps `bleak` (the standard async Python BLE library)
- Supports: heart rate (BPM), RR intervals, ECG, accelerometer
- Confirmed working on macOS
- Active as of Oct 2025 (v0.2.0)
- Install: `pip install bleakheart`

Runner-up: `polar-python` (MIT) — also Polar-specific, slightly newer (Dec 2025),
but less battle-tested. Good fallback if bleakheart has issues.

## Data Available from H10

| Signal       | Description                          | Use case              |
|--------------|--------------------------------------|-----------------------|
| Heart Rate   | BPM via standard BLE HR service      | Basic monitoring      |
| RR Intervals | Beat-to-beat timing (ms)             | HRV analysis          |
| ECG          | Raw ECG at 130 Hz, 14-bit            | Signal quality / research |
| Accelerometer| 3-axis at 25/50/100/200 Hz           | Motion / activity     |
| Battery      | Charge % via standard BLE service    | Device health         |

## BLE Services / UUIDs (for reference)

- Heart Rate Service: `0x180D`
- Heart Rate Measurement characteristic: `0x2A37`
- Polar Measurement Data (PMD) service: proprietary (for ECG/ACC)

## macOS Notes

- BLE works via CoreBluetooth — no drivers needed
- Terminal needs Bluetooth permission (System Settings → Privacy → Bluetooth)
- No need to pair the H10 first; BLE scanning handles discovery
- H10 must be worn (wet strap) to advertise HR data

## Steps

1. [ ] Set up Python env (`python3 -m venv .venv`)
2. [ ] Install deps (`pip install bleakheart`)
3. [ ] Scan for H10 and verify it's discoverable
4. [ ] Stream heart rate + RR intervals to stdout
5. [ ] Add ECG stream
6. [ ] Add accelerometer stream
7. [ ] Decide on output format (CSV / JSON / live plot / etc.)

## References

- [bleakheart on GitHub](https://github.com/fsmeraldi/bleakheart)
- [polar-python on PyPI](https://pypi.org/project/polar-python/)
- [Polar BLE SDK docs](https://github.com/polarofficial/polar-ble-sdk)
- [BLE Heart Rate Service spec](https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/)
