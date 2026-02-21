"""
BaseSensor — Abstract base class for all sensors.

Each sensor runs in its own asyncio task with automatic reconnection.
Sensors never know about the WebSocket — they just update the hub.
"""

import asyncio
import logging
from abc import ABC, abstractmethod

from .sensor_hub import SensorHub

logger = logging.getLogger(__name__)


class BaseSensor(ABC):
    def __init__(self, sensor_id: str, hub: SensorHub, reconnect_delay: float = 3.0):
        self.sensor_id = sensor_id
        self.hub = hub
        self.reconnect_delay = reconnect_delay
        self._task: asyncio.Task | None = None
        self._stop_event = asyncio.Event()

    async def start(self) -> asyncio.Task:
        """Start the sensor task. Returns the task for monitoring."""
        self._stop_event.clear()
        self._task = asyncio.create_task(
            self._run_forever(), name=f"sensor-{self.sensor_id}"
        )
        return self._task

    async def stop(self) -> None:
        """Stop the sensor gracefully."""
        self._stop_event.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _run_forever(self) -> None:
        """Outer loop with automatic reconnection."""
        while not self._stop_event.is_set():
            try:
                logger.info(f"[{self.sensor_id}] Connecting...")
                await self.connect()
                logger.info(f"[{self.sensor_id}] Connected, streaming...")
                await self.stream()
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"[{self.sensor_id}] Error: {e}")
                await self.hub.mark_disconnected(self.sensor_id, str(e))
                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(), timeout=self.reconnect_delay
                    )
                    break
                except asyncio.TimeoutError:
                    continue

        await self.hub.mark_disconnected(self.sensor_id, "stopped")
        logger.info(f"[{self.sensor_id}] Stopped.")

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to sensor hardware."""
        ...

    @abstractmethod
    async def stream(self) -> None:
        """Read loop. Call self.hub.update() with each reading."""
        ...
