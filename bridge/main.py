"""
FastAPI WebSocket server for sensor bridge.

Streams all sensor data to React frontend at 30fps.

Environment variables:
    USE_REAL_GESTURE=1  - Use MediaPipe webcam gesture detection
    USE_REAL_HR=1       - Use Polar HR sensor (TODO)
    USE_REAL_ACCEL=1    - Use Polar accelerometer (TODO)
"""

import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .sensor_hub import SensorHub
from .sensors.mock import MockHRSensor, MockGestureSensor, MockAccelerometerSensor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("bridge")

# Shared hub instance
hub = SensorHub(stale_threshold=5.0)
sensors = []


def get_sensor_instances():
    """Build sensor list based on environment config."""
    instances = []

    # Gesture sensor
    if os.environ.get("USE_REAL_GESTURE", "").strip() == "1":
        from .sensors.gesture import MediaPipeGestureSensor
        instances.append(MediaPipeGestureSensor(hub))
        logger.info("Using REAL gesture sensor (MediaPipe)")
    else:
        instances.append(MockGestureSensor(hub))
        logger.info("Using MOCK gesture sensor")

    # Heart rate sensor
    if os.environ.get("USE_REAL_HR", "").strip() == "1":
        # TODO: from .sensors.heart_rate import PolarHRSensor
        # instances.append(PolarHRSensor(hub))
        logger.warning("Real HR sensor not implemented yet, using mock")
        instances.append(MockHRSensor(hub))
    else:
        instances.append(MockHRSensor(hub))
        logger.info("Using MOCK HR sensor")

    # Accelerometer sensor
    if os.environ.get("USE_REAL_ACCEL", "").strip() == "1":
        # TODO: from .sensors.accelerometer import PolarAccelerometerSensor
        # instances.append(PolarAccelerometerSensor(hub))
        logger.warning("Real accelerometer not implemented yet, using mock")
        instances.append(MockAccelerometerSensor(hub))
    else:
        instances.append(MockAccelerometerSensor(hub))
        logger.info("Using MOCK accelerometer sensor")

    return instances


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start sensors on startup, stop on shutdown."""
    logger.info("Starting sensor bridge...")

    sensor_instances = get_sensor_instances()
    sensors.extend(sensor_instances)

    for sensor in sensor_instances:
        await sensor.start()
        logger.info(f"Started sensor: {sensor.sensor_id}")

    yield

    logger.info("Shutting down sensors...")
    for sensor in sensor_instances:
        await sensor.stop()
    logger.info("Bridge stopped.")


app = FastAPI(title="Sensor Bridge", lifespan=lifespan)

# Allow CORS for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/sensors")
async def sensor_websocket(websocket: WebSocket):
    """Main WebSocket endpoint. Streams sensor data at 30fps."""
    await websocket.accept()
    client_id = id(websocket)
    logger.info(f"Client {client_id} connected")

    tick_interval = 1 / 30  # 30fps

    try:
        while True:
            tick_start = time.monotonic()

            # Get current sensor state
            snapshot = await hub.snapshot()

            # Send as compact JSON
            await websocket.send_text(json.dumps(snapshot, separators=(",", ":")))

            # Non-blocking check for incoming messages
            try:
                msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                await handle_client_message(msg, websocket)
            except asyncio.TimeoutError:
                pass

            # Maintain consistent tick rate
            elapsed = time.monotonic() - tick_start
            sleep_time = tick_interval - elapsed
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass


async def handle_client_message(msg: str, websocket: WebSocket):
    """Handle commands from React frontend."""
    try:
        cmd = json.loads(msg)
        if cmd.get("type") == "ping":
            await websocket.send_text(json.dumps({"type": "pong"}))
    except json.JSONDecodeError:
        pass


@app.get("/health")
async def health():
    """Health check endpoint."""
    snapshot = await hub.snapshot()
    return {
        "status": "ok",
        "sensors": {
            sid: {"connected": s["connected"], "age_ms": s["age_ms"]}
            for sid, s in snapshot["sensors"].items()
        },
    }


@app.get("/")
async def root():
    return {"message": "Sensor Bridge", "websocket": "/ws/sensors"}
