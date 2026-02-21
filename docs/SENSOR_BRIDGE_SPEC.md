# Sensor Bridge Specification

## Overview

FastAPI WebSocket server that streams sensor data from Python to React at 30fps.

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Polar HR   │  │  Polar Acc  │  │  MediaPipe  │
│  (1Hz)      │  │  (200Hz)    │  │  (30fps)    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │               │
       └────────────────┼───────────────┘
                        ▼
              ┌──────────────────┐
              │    SensorHub     │
              │  (shared state)  │
              └────────┬─────────┘
                       │
                  30fps tick
                       │
                       ▼
              ┌──────────────────┐
              │ FastAPI WebSocket │───→ React Frontend
              │  /ws/sensors     │
              └──────────────────┘
```

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| SensorHub | ✅ Done | `bridge/sensor_hub.py` |
| BaseSensor | ✅ Done | `bridge/base_sensor.py` with auto-reconnect |
| FastAPI server | ✅ Done | `bridge/main.py` at 30fps |
| Mock sensors | ✅ Done | `bridge/sensors/mock.py` for testing |
| React hook | ✅ Done | `src/bridge/useSensorStream.js` |
| Debug panel | ✅ Done | `src/components/SensorDebugPanel.jsx` |
| Real HR sensor | ⏳ TODO | Wire `bleakheart` into `bridge/sensors/heart_rate.py` |
| Real gesture sensor | ⏳ TODO | Wire MediaPipe into `bridge/sensors/gesture.py` |
| Real accelerometer | ⏳ TODO | Wire `bleakheart` ACC into `bridge/sensors/accelerometer.py` |
| Game integration | ⏳ TODO | Connect `useSensorStream` to `useGame` |

## Design Decisions

### Why Shared State Dict (not Queues)

Sensors produce at wildly different rates:
- HR: 1Hz
- Accelerometer: 200Hz  
- Gestures: 30fps

WebSocket sends at 30fps. With queues you'd either:
- Buffer 200 accel samples per frame (backpressure risk)
- Drop messages (then why use a queue?)

**Solution**: Latest-value dict. Each sensor writes latest, WebSocket reads snapshot at 30fps.

### Why Single WebSocket (not per-sensor)

- One connection, one reconnect handler
- Frontend gets unified state
- Simpler to add/remove sensors

### Why Fixed 30fps Tick (not event-driven)

- Matches display refresh rate
- Predictable bandwidth (~15KB/s)
- No thundering herd when multiple sensors update

## Wire Protocol

### Server → Client (30fps)

```json
{
  "timestamp": 1708534892.123,
  "sensors": {
    "heart_rate": {
      "data": {"bpm": 72, "rr_intervals": [831, 845]},
      "connected": true,
      "stale": false,
      "age_ms": 234.5,
      "error": null
    },
    "accelerometer": {
      "data": {"x": 12, "y": -981, "z": 45, "magnitude": 982},
      "connected": true,
      "stale": false,
      "age_ms": 12.3,
      "error": null
    },
    "gesture": {
      "data": {"gesture": "Thumb_Up", "confidence": 0.92},
      "connected": true,
      "stale": false,
      "age_ms": 28.1,
      "error": null
    }
  }
}
```

### Client → Server (optional commands)

```json
{"type": "ping"}
{"type": "pause", "sensors": ["accelerometer"]}
{"type": "resume", "sensors": ["accelerometer"]}
```

## Staleness & Disconnection

Each sensor reading tracks:
- `connected`: Sensor task is running and producing data
- `stale`: No data received in >5 seconds
- `age_ms`: Time since last update
- `error`: Last error message if disconnected

Frontend can show degraded UI when sensors disconnect without crashing.

## File Structure

```
bridge/
├── __init__.py
├── sensor_hub.py      # ✅ SensorHub class (shared state)
├── base_sensor.py     # ✅ BaseSensor ABC with reconnect loop
├── sensors/
│   ├── __init__.py
│   ├── mock.py        # ✅ Mock sensors for testing
│   ├── heart_rate.py  # ⏳ TODO: PolarHRSensor
│   ├── accelerometer.py # ⏳ TODO: PolarAccelerometerSensor
│   └── gesture.py     # ⏳ TODO: MediaPipeGestureSensor
├── main.py            # ✅ FastAPI app + WebSocket endpoint
└── run.py             # ✅ Entry point: uvicorn launcher

src/
├── bridge/
│   └── useSensorStream.js  # ✅ React hook for consuming sensor data
└── components/
    └── SensorDebugPanel.jsx # ✅ Debug overlay
```

## React Integration

```typescript
// Hook usage
const { sensorData, connected } = useSensorStream();

// Access sensors
const hr = sensorData?.sensors.heart_rate;
const gesture = sensorData?.sensors.gesture;

// Check health
if (hr?.stale) showWarning("Heart rate sensor stale");
if (!gesture?.connected) showWarning("Camera disconnected");
```

## Running

```bash
# Terminal 1: Start bridge server (currently uses mock sensors)
cd ~/Arrival/first-contact
source .venv/bin/activate
python -m bridge.run

# Terminal 2: Start React app  
npm run dev
```

Server runs on `ws://localhost:8000/ws/sensors`

Health check: `curl http://localhost:8000/health`

## Key Gotchas

1. **Use `--workers 1`** — Multiple workers = multiple BLE connections = conflict
2. **Wrap blocking code** — `await asyncio.to_thread(cap.read)` for OpenCV
3. **WebSocket is not thread-safe** — Single send loop only
4. **Lifespan context** — Start/stop sensors in FastAPI lifespan, not module level

## Fallback Behavior

If a sensor disconnects:
1. Sensor task enters reconnect loop (retries every 3-5s)
2. Hub marks sensor as disconnected
3. WebSocket keeps streaming (with `connected: false` for that sensor)
4. Frontend shows degraded UI
5. Game continues with remaining sensors

## Performance Targets

| Metric | Target |
|--------|--------|
| WebSocket latency | <50ms |
| Payload size | <1KB per frame |
| Bandwidth | ~30KB/s |
| CPU (server) | <10% |
