"""
SensorHub — Central shared state for all sensors.

Latest-value dict pattern. Sensors write at their native rate,
WebSocket reads snapshots at display rate (30fps).
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Any


@dataclass
class SensorReading:
    data: dict
    timestamp: float  # time.monotonic() when updated
    connected: bool = True
    error: str | None = None


class SensorHub:
    def __init__(self, stale_threshold: float = 5.0):
        self._state: dict[str, SensorReading] = {}
        self._lock = asyncio.Lock()
        self._stale_threshold = stale_threshold

    async def update(self, sensor_id: str, data: dict) -> None:
        """Called by sensors to push latest reading."""
        async with self._lock:
            self._state[sensor_id] = SensorReading(
                data=data,
                timestamp=time.monotonic(),
                connected=True,
                error=None,
            )

    async def mark_disconnected(self, sensor_id: str, error: str = "") -> None:
        """Called when sensor disconnects or errors."""
        async with self._lock:
            if sensor_id in self._state:
                self._state[sensor_id].connected = False
                self._state[sensor_id].error = error
            else:
                self._state[sensor_id] = SensorReading(
                    data={}, timestamp=0, connected=False, error=error
                )

    async def snapshot(self) -> dict:
        """Called by WebSocket at 30fps to get unified state."""
        now = time.monotonic()
        async with self._lock:
            result = {}
            for sensor_id, reading in self._state.items():
                age = now - reading.timestamp if reading.timestamp else float("inf")
                result[sensor_id] = {
                    "data": reading.data,
                    "connected": reading.connected and age < self._stale_threshold,
                    "stale": age > self._stale_threshold,
                    "age_ms": round(age * 1000, 1),
                    "error": reading.error,
                }
            return {
                "timestamp": time.time(),
                "sensors": result,
            }
