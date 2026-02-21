"""
Mock sensor for testing the bridge without hardware.
Generates fake HR and gesture data.
"""

import asyncio
import math
import random

from ..base_sensor import BaseSensor
from ..sensor_hub import SensorHub


class MockHRSensor(BaseSensor):
    """Simulates heart rate data for testing."""

    def __init__(self, hub: SensorHub):
        super().__init__("heart_rate", hub, reconnect_delay=2.0)
        self._base_hr = 70

    async def connect(self) -> None:
        # Simulate connection delay
        await asyncio.sleep(0.5)

    async def stream(self) -> None:
        t = 0
        while not self._stop_event.is_set():
            # Simulate HR that varies naturally
            hr = int(self._base_hr + 10 * math.sin(t / 10) + random.randint(-2, 2))
            rr = int(60000 / hr) + random.randint(-20, 20)

            await self.hub.update(self.sensor_id, {
                "bpm": hr,
                "rr_intervals": [rr],
            })

            t += 1
            await asyncio.sleep(1.0)  # 1Hz like real HR


class MockGestureSensor(BaseSensor):
    """Simulates hand gesture detection for testing."""

    GESTURES = ["None", "Thumb_Up", "Open_Palm", "Closed_Fist", "Pointing_Up", "Victory"]

    def __init__(self, hub: SensorHub):
        super().__init__("gesture", hub, reconnect_delay=2.0)

    async def connect(self) -> None:
        await asyncio.sleep(0.3)

    async def stream(self) -> None:
        current_gesture = "None"
        frames_until_change = random.randint(60, 180)  # 2-6 seconds

        while not self._stop_event.is_set():
            frames_until_change -= 1
            if frames_until_change <= 0:
                current_gesture = random.choice(self.GESTURES)
                frames_until_change = random.randint(60, 180)

            await self.hub.update(self.sensor_id, {
                "gesture": current_gesture,
                "confidence": 0.85 + random.random() * 0.15 if current_gesture != "None" else 0.0,
            })

            await asyncio.sleep(1 / 30)  # 30fps


class MockAccelerometerSensor(BaseSensor):
    """Simulates accelerometer data for testing."""

    def __init__(self, hub: SensorHub):
        super().__init__("accelerometer", hub, reconnect_delay=2.0)

    async def connect(self) -> None:
        await asyncio.sleep(0.3)

    async def stream(self) -> None:
        t = 0
        while not self._stop_event.is_set():
            # Simulate slight movement around gravity (0, -1000, 0) in mG
            x = int(50 * math.sin(t / 20) + random.randint(-10, 10))
            y = int(-980 + 30 * math.sin(t / 15) + random.randint(-10, 10))
            z = int(50 * math.cos(t / 25) + random.randint(-10, 10))
            mag = int(math.sqrt(x*x + y*y + z*z))

            await self.hub.update(self.sensor_id, {
                "x": x,
                "y": y,
                "z": z,
                "magnitude": mag,
            })

            t += 1
            await asyncio.sleep(1 / 30)  # Downsampled to 30fps for bridge
