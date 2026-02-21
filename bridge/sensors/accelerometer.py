"""
PolarAccelerometerSensor — Real accelerometer from Polar H10 via BLE.

Uses bleak + bleakheart PMD (Polar Measurement Data) for accelerometer stream.
Streams at 25Hz, downsampled to latest value for the 30fps bridge tick.

Requires: Polar H10 chest strap, worn and active.
"""

import asyncio
import logging
import math

from bleak import BleakScanner, BleakClient
from bleakheart import PolarMeasurementData

from ..base_sensor import BaseSensor
from ..sensor_hub import SensorHub

logger = logging.getLogger(__name__)

SCAN_TIMEOUT = 15.0
SAMPLE_RATE = 25  # Hz - enough for posture/movement detection


class PolarAccelerometerSensor(BaseSensor):
    """Streams accelerometer data from Polar H10."""

    def __init__(
        self,
        hub: SensorHub,
        device_name: str = "Polar H10",
    ):
        super().__init__("accelerometer", hub, reconnect_delay=5.0)
        self.device_name = device_name
        self._device = None
        self._client: BleakClient | None = None
        self._pmd: PolarMeasurementData | None = None
        self._queue: asyncio.Queue | None = None

    async def connect(self) -> None:
        """Scan for and connect to Polar H10, start ACC stream."""
        logger.info(f"[{self.sensor_id}] Scanning for {self.device_name}...")

        self._device = await BleakScanner.find_device_by_filter(
            lambda d, _: d.name and self.device_name in d.name,
            timeout=SCAN_TIMEOUT,
        )

        if not self._device:
            raise RuntimeError(
                f"No {self.device_name} found. Is it worn and active?"
            )

        logger.info(
            f"[{self.sensor_id}] Found {self._device.name} ({self._device.address})"
        )

        # Connect
        self._client = BleakClient(self._device)
        await self._client.connect()

        if not self._client.is_connected:
            raise RuntimeError(f"Failed to connect to {self._device.name}")

        logger.info(f"[{self.sensor_id}] Connected to {self._device.name}")

        # Set up accelerometer streaming via PMD
        self._queue = asyncio.Queue()
        self._pmd = PolarMeasurementData(self._client, acc_queue=self._queue)

        # Check if ACC is available
        available = await self._pmd.available_measurements()
        logger.info(f"[{self.sensor_id}] Available measurements: {available}")

        if "ACC" not in available:
            raise RuntimeError("Accelerometer not available on this device")

        # Start streaming
        err, msg, _ = await self._pmd.start_streaming("ACC", sample_rate=SAMPLE_RATE)
        if err:
            raise RuntimeError(f"Failed to start ACC stream: {msg}")

        logger.info(f"[{self.sensor_id}] ACC stream started at {SAMPLE_RATE}Hz")

    async def stream(self) -> None:
        """Read accelerometer data from queue and push to hub."""
        while not self._stop_event.is_set():
            try:
                # Wait for next ACC frame with timeout
                dtype, tstamp, samples = await asyncio.wait_for(
                    self._queue.get(), timeout=5.0
                )

                # samples is list of (x, y, z) tuples in mG
                # Take the latest sample for this tick
                if samples:
                    x, y, z = samples[-1]
                    mag = int(math.sqrt(x * x + y * y + z * z))

                    await self.hub.update(
                        self.sensor_id,
                        {
                            "x": x,
                            "y": y,
                            "z": z,
                            "magnitude": mag,
                            "sample_count": len(samples),
                        },
                    )

            except asyncio.TimeoutError:
                logger.warning(f"[{self.sensor_id}] No ACC data for 5s")
                if self._client and not self._client.is_connected:
                    raise RuntimeError("BLE connection lost")

    async def stop(self) -> None:
        """Clean up BLE resources."""
        # Stop streaming
        if self._pmd:
            try:
                await self._pmd.stop_streaming("ACC")
            except Exception as e:
                logger.debug(f"[{self.sensor_id}] Error stopping stream: {e}")
            self._pmd = None

        # Disconnect
        if self._client and self._client.is_connected:
            try:
                await self._client.disconnect()
                logger.info(f"[{self.sensor_id}] Disconnected from BLE")
            except Exception as e:
                logger.debug(f"[{self.sensor_id}] Error disconnecting: {e}")
            self._client = None

        self._queue = None
        self._device = None

        await super().stop()
