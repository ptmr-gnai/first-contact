"""
PolarHRSensor — Real heart rate from Polar H10 via BLE.

Uses bleak + bleakheart for Bluetooth LE communication.
Auto-scans for device on connect, streams HR + RR intervals.

Requires: Polar H10 chest strap, worn and active (wet contacts).
"""

import asyncio
import logging

from bleak import BleakScanner, BleakClient
from bleakheart import HeartRate

from ..base_sensor import BaseSensor
from ..sensor_hub import SensorHub

logger = logging.getLogger(__name__)

# How long to scan for the device
SCAN_TIMEOUT = 15.0


class PolarHRSensor(BaseSensor):
    """Streams heart rate from Polar H10 at ~1Hz."""

    def __init__(
        self,
        hub: SensorHub,
        device_name: str = "Polar H10",
    ):
        super().__init__("heart_rate", hub, reconnect_delay=5.0)
        self.device_name = device_name
        self._device = None
        self._client: BleakClient | None = None
        self._queue: asyncio.Queue | None = None
        self._hr: HeartRate | None = None

    async def connect(self) -> None:
        """Scan for and connect to Polar H10."""
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

        # Set up heart rate streaming
        self._queue = asyncio.Queue()
        self._hr = HeartRate(self._client, queue=self._queue)
        await self._hr.start_notify()

        logger.info(f"[{self.sensor_id}] HR notifications started")

    async def stream(self) -> None:
        """Read HR data from queue and push to hub."""
        while not self._stop_event.is_set():
            try:
                # Wait for next HR frame with timeout
                frame = await asyncio.wait_for(
                    self._queue.get(), timeout=5.0
                )

                # bleakheart frame format: (kind, timestamp, (bpm, rr_list), energy)
                kind, tstamp, (bpm, rr_intervals), energy = frame

                # rr_intervals is a list (can have multiple per beat)
                # Convert to ms if needed (bleakheart returns ms)
                await self.hub.update(
                    self.sensor_id,
                    {
                        "bpm": bpm,
                        "rr_intervals": rr_intervals if rr_intervals else [],
                        "energy_expended": energy,
                    },
                )

            except asyncio.TimeoutError:
                # No data for 5s — sensor might be disconnected
                logger.warning(f"[{self.sensor_id}] No HR data for 5s")
                # Check if still connected
                if self._client and not self._client.is_connected:
                    raise RuntimeError("BLE connection lost")

    async def stop(self) -> None:
        """Clean up BLE resources."""
        # Stop notifications
        if self._hr:
            try:
                await self._hr.stop_notify()
            except Exception as e:
                logger.debug(f"[{self.sensor_id}] Error stopping notify: {e}")
            self._hr = None

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
