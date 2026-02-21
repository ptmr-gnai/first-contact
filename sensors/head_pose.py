"""
head_pose.py — Real-time head nod/shake detection via MediaPipe FaceLandmarker

Detects:
  - NOD  (yes): pitch moves down then up, or sustained down tilt
  - SHAKE (no): yaw swings left then right (or right then left)
  - NEUTRAL: neither

Usage:
    from sensors.head_pose import HeadPoseDetector

    detector = HeadPoseDetector()
    detector.start()
    gesture = detector.gesture()   # "nod", "shake", or None
    pitch, yaw, roll = detector.angles()
    detector.stop()
"""

import threading
import time
import numpy as np
import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from pathlib import Path

MODEL_PATH = Path(__file__).parent.parent / "face_landmarker.task"

NOD_THRESHOLD   = 6.0   # degrees pitch change to count as nod motion
SHAKE_THRESHOLD = 8.0   # degrees yaw change to count as shake motion
GESTURE_WINDOW  = 1.5   # seconds of history to look for gesture pattern
GESTURE_COOLDOWN = 1.2  # seconds before same gesture can fire again


def _rotation_to_euler(matrix_data):
    R = np.array(matrix_data).reshape(4, 4)
    pitch = np.degrees(np.arcsin(-R[2][1]))
    yaw   = np.degrees(np.arctan2(R[2][0], R[2][2]))
    roll  = np.degrees(np.arctan2(R[0][1], R[1][1]))
    return pitch, yaw, roll


class HeadPoseDetector:
    def __init__(self):
        self._pitch = 0.0
        self._yaw   = 0.0
        self._roll  = 0.0
        self._face  = False
        self._gesture = None
        self._gesture_time = 0.0
        self._history = []   # list of (timestamp, pitch, yaw)
        self._lock = threading.Lock()
        self._running = False
        self._thread = None

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2)

    def angles(self):
        with self._lock:
            return self._pitch, self._yaw, self._roll

    def face_detected(self):
        with self._lock:
            return self._face

    def gesture(self):
        """Returns 'nod', 'shake', or None. Each gesture fires once per GESTURE_COOLDOWN."""
        with self._lock:
            if self._gesture and time.time() - self._gesture_time > GESTURE_COOLDOWN:
                self._gesture = None
            return self._gesture

    def _detect_gesture(self, history):
        if len(history) < 4:
            return None
        now = time.time()
        recent = [(t, p, y) for t, p, y in history if now - t < GESTURE_WINDOW]
        if len(recent) < 4:
            return None

        pitches = [p for _, p, _ in recent]
        yaws    = [y for _, _, y in recent]
        pitch_range = max(pitches) - min(pitches)
        yaw_range   = max(yaws)   - min(yaws)

        if pitch_range > NOD_THRESHOLD and pitch_range > yaw_range * 1.5:
            return "nod"
        if yaw_range > SHAKE_THRESHOLD and yaw_range > pitch_range * 1.5:
            return "shake"
        return None

    def _run(self):
        opts = vision.FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(MODEL_PATH)),
            num_faces=1,
            output_facial_transformation_matrixes=True,
        )
        cap = cv2.VideoCapture(0)
        with vision.FaceLandmarker.create_from_options(opts) as landmarker:
            while self._running:
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.05)
                    continue
                img = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                )
                result = landmarker.detect(img)
                now = time.time()
                if result.facial_transformation_matrixes:
                    pitch, yaw, roll = _rotation_to_euler(
                        result.facial_transformation_matrixes[0].data
                    )
                    with self._lock:
                        self._pitch, self._yaw, self._roll = pitch, yaw, roll
                        self._face = True
                        self._history.append((now, pitch, yaw))
                        cutoff = now - GESTURE_WINDOW * 2
                        self._history = [(t, p, y) for t, p, y in self._history if t > cutoff]
                        g = self._detect_gesture(self._history)
                        if g and (g != self._gesture or time.time() - self._gesture_time > GESTURE_COOLDOWN):
                            self._gesture = g
                            self._gesture_time = now
                            # Clear history so gesture doesn't re-trigger immediately
                            self._history = []
                else:
                    with self._lock:
                        self._face = False
        cap.release()
