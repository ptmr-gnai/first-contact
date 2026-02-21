"""
MediaPipeGestureSensor — Real gesture recognition via webcam.

Uses MediaPipe Tasks API with the gesture_recognizer.task model.
Wraps blocking OpenCV calls in asyncio.to_thread() for non-blocking operation.

Recognized gestures: Closed_Fist, Open_Palm, Pointing_Up, Thumb_Down, 
                     Thumb_Up, Victory, ILoveYou, None
"""

import asyncio
import logging
import os

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from ..base_sensor import BaseSensor
from ..sensor_hub import SensorHub

logger = logging.getLogger(__name__)

# Model path - relative to project root
MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "sensors", "gesture_recognizer.task"
)


class MediaPipeGestureSensor(BaseSensor):
    """Streams hand gesture recognition at ~30fps."""

    def __init__(
        self,
        hub: SensorHub,
        camera_index: int = 0,
        frame_width: int = 640,
        frame_height: int = 480,
    ):
        super().__init__("gesture", hub, reconnect_delay=3.0)
        self.camera_index = camera_index
        self.frame_width = frame_width
        self.frame_height = frame_height
        self._cap: cv2.VideoCapture | None = None
        self._recognizer: vision.GestureRecognizer | None = None

    async def connect(self) -> None:
        """Initialize camera and MediaPipe recognizer."""
        # Load gesture recognizer (blocking, but fast)
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Gesture model not found: {MODEL_PATH}")

        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.GestureRecognizerOptions(
            base_options=base_options,
            num_hands=1,
        )
        self._recognizer = vision.GestureRecognizer.create_from_options(options)
        logger.info(f"[{self.sensor_id}] Loaded gesture model")

        # Open camera (potentially slow, do in thread)
        def open_camera():
            cap = cv2.VideoCapture(self.camera_index)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.frame_width)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.frame_height)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize latency
            if not cap.isOpened():
                raise RuntimeError(f"Failed to open camera {self.camera_index}")
            return cap

        self._cap = await asyncio.to_thread(open_camera)
        logger.info(f"[{self.sensor_id}] Camera opened")

    async def stream(self) -> None:
        """Read frames and recognize gestures at ~30fps."""
        frame_interval = 1 / 30

        while not self._stop_event.is_set():
            loop_start = asyncio.get_event_loop().time()

            # Read frame (blocking)
            ret, frame = await asyncio.to_thread(self._cap.read)
            if not ret:
                raise RuntimeError("Camera read failed")

            # Process frame (blocking)
            data = await asyncio.to_thread(self._process_frame, frame)
            await self.hub.update(self.sensor_id, data)

            # Maintain 30fps
            elapsed = asyncio.get_event_loop().time() - loop_start
            sleep_time = max(0, frame_interval - elapsed)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    def _process_frame(self, frame) -> dict:
        """Synchronous frame processing (runs in thread)."""
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)

        # Convert BGR -> RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        # Run recognition
        result = self._recognizer.recognize(mp_image)

        gesture_name = "None"
        confidence = 0.0
        hand_landmarks = None

        if result.gestures and len(result.gestures) > 0:
            gesture = result.gestures[0][0]
            gesture_name = gesture.category_name
            confidence = gesture.score

        # Optionally include hand landmarks for visualization
        if result.hand_landmarks and len(result.hand_landmarks) > 0:
            hand = result.hand_landmarks[0]
            # Just send key points: wrist(0), index_tip(8), thumb_tip(4)
            hand_landmarks = {
                "wrist": {"x": hand[0].x, "y": hand[0].y},
                "index_tip": {"x": hand[8].x, "y": hand[8].y},
                "thumb_tip": {"x": hand[4].x, "y": hand[4].y},
            }

        return {
            "gesture": gesture_name,
            "confidence": round(confidence, 3),
            "hand_detected": hand_landmarks is not None,
            "landmarks": hand_landmarks,
        }

    async def stop(self) -> None:
        """Clean up resources."""
        await super().stop()

        if self._cap is not None:
            self._cap.release()
            self._cap = None
            logger.info(f"[{self.sensor_id}] Camera released")

        if self._recognizer is not None:
            self._recognizer.close()
            self._recognizer = None
            logger.info(f"[{self.sensor_id}] Recognizer closed")
