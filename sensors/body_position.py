"""
body_position.py — Body position detection via camera (MediaPipe Pose)

Detects:
- Leaning forward/back (engagement signal)
- Left/right position in frame
- Standing/sitting (based on hip-shoulder relationship)
- Movement vs stillness

This works without the Polar H10 — just uses webcam.

Run: python body_position.py
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import time
import math
import json

STATE_FILE = os.path.join(os.path.dirname(__file__), "..", "spatial_state.json")

# Download pose model if needed
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")


def download_model():
    if not os.path.exists(MODEL_PATH):
        print("Downloading pose model...")
        import urllib.request
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        print("Done.")


class BodyState:
    # Position in frame (0-1)
    x = 0.5  # left-right
    y = 0.5  # up-down
    
    # Posture
    lean = 0  # -1 = leaning back, 0 = neutral, 1 = leaning forward
    posture = "unknown"
    
    # Movement
    movement = "still"
    history = []
    
    def to_dict(self):
        return {
            "x": self.x,
            "y": self.y,
            "lean": self.lean,
            "posture": self.posture,
            "movement": self.movement
        }


def classify_from_landmarks(landmarks, frame_w, frame_h):
    """Extract body state from pose landmarks."""
    state = BodyState()
    
    if not landmarks:
        return state
    
    # Key landmarks
    nose = landmarks[0]
    left_shoulder = landmarks[11]
    right_shoulder = landmarks[12]
    left_hip = landmarks[23]
    right_hip = landmarks[24]
    
    # Body center (average of shoulders)
    center_x = (left_shoulder.x + right_shoulder.x) / 2
    center_y = (left_shoulder.y + right_shoulder.y) / 2
    
    state.x = center_x
    state.y = center_y
    
    # Lean detection: compare nose Z to shoulder Z
    # If nose is closer (smaller Z), leaning forward
    shoulder_z = (left_shoulder.z + right_shoulder.z) / 2
    lean_raw = shoulder_z - nose.z  # positive = leaning forward
    
    # Normalize to -1 to 1 range (roughly)
    state.lean = max(-1, min(1, lean_raw * 5))
    
    # Posture classification
    if state.lean > 0.3:
        state.posture = "leaning_forward"
    elif state.lean < -0.3:
        state.posture = "leaning_back"
    else:
        # Check if standing or sitting based on hip position
        hip_y = (left_hip.y + right_hip.y) / 2
        if hip_y > 0.7:  # hips low in frame
            state.posture = "sitting"
        else:
            state.posture = "standing"
    
    return state


def main():
    download_model()
    
    print("=" * 50)
    print("  BODY POSITION DETECTION (Camera)")
    print("=" * 50)
    print("\nDetecting:")
    print("  - Lean forward (engaged) / back (passive)")
    print("  - Position in frame")
    print("  - Movement")
    print("\nPress 'q' to quit\n")
    
    # Set up pose detector
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=False
    )
    detector = vision.PoseLandmarker.create_from_options(options)
    
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    frame_w, frame_h = 640, 480
    last_state = None
    position_history = []
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        
        result = detector.detect(mp_image)
        
        state = BodyState()
        
        if result.pose_landmarks and len(result.pose_landmarks) > 0:
            landmarks = result.pose_landmarks[0]
            state = classify_from_landmarks(landmarks, frame_w, frame_h)
            
            # Draw skeleton
            connections = [
                (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),  # arms
                (11, 23), (12, 24), (23, 24),  # torso
                (23, 25), (25, 27), (24, 26), (26, 28)  # legs
            ]
            
            for lm in landmarks:
                x, y = int(lm.x * frame_w), int(lm.y * frame_h)
                cv2.circle(frame, (x, y), 4, (0, 255, 0), -1)
            
            for start, end in connections:
                x1, y1 = int(landmarks[start].x * frame_w), int(landmarks[start].y * frame_h)
                x2, y2 = int(landmarks[end].x * frame_w), int(landmarks[end].y * frame_h)
                cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Track movement
            position_history.append((time.time(), state.x, state.y))
            position_history = position_history[-30:]
            
            if len(position_history) > 10:
                dx = position_history[-1][1] - position_history[0][1]
                dy = position_history[-1][2] - position_history[0][2]
                movement = math.sqrt(dx*dx + dy*dy)
                
                if movement < 0.02:
                    state.movement = "still"
                elif movement < 0.08:
                    state.movement = "slight"
                else:
                    state.movement = "moving"
        
        # Draw status
        lean_bar_x = int(frame_w/2 + state.lean * 100)
        cv2.rectangle(frame, (frame_w//2 - 100, 20), (frame_w//2 + 100, 40), (50, 50, 50), -1)
        cv2.circle(frame, (lean_bar_x, 30), 10, (0, 255, 255), -1)
        cv2.putText(frame, "BACK", (frame_w//2 - 95, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)
        cv2.putText(frame, "FWD", (frame_w//2 + 70, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (150, 150, 150), 1)
        
        # Posture and movement
        color = (0, 255, 0) if state.posture in ["standing", "leaning_forward"] else (0, 200, 255)
        cv2.putText(frame, f"{state.posture} | {state.movement}", (20, frame_h - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        # Print changes
        if last_state != state.posture:
            emoji = {"standing": "🧍", "sitting": "🪑", "leaning_forward": "🏃", "leaning_back": "😴"}.get(state.posture, "❓")
            print(f"  {emoji} {state.posture}")
            last_state = state.posture
        
        # Save state for other processes
        try:
            with open(STATE_FILE, "r") as f:
                file_state = json.load(f)
        except:
            file_state = {}
        
        file_state["body"] = state.to_dict()
        file_state["body"]["timestamp"] = time.time()
        
        with open(STATE_FILE, "w") as f:
            json.dump(file_state, f, indent=2)
        
        cv2.imshow("Body Position", frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    detector.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
