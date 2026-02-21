"""
spatial_talk.py — Bidirectional spatial communication

You control a green circle with your finger.
AI controls a blue circle that responds to your movements.

The conversation:
- Move right → AI agrees (follows) or disagrees (goes opposite)
- Move toward AI → AI accepts (stays) or rejects (retreats)
- Stay still → AI initiates (moves toward you)

Run: python spatial_talk.py
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import json
import time
import math

MODEL_PATH = os.path.join(os.path.dirname(__file__), "gesture_recognizer.task")
STATE_FILE = os.path.join(os.path.dirname(__file__), "spatial_state.json")

FRAME_W, FRAME_H = 640, 480
CIRCLE_RADIUS = 30


class SpatialState:
    def __init__(self):
        # Human object (green) — controlled by finger
        self.human_x = FRAME_W // 3
        self.human_y = FRAME_H // 2
        self.human_vel_x = 0
        self.human_vel_y = 0
        
        # AI object (blue) — controlled by AI logic
        self.ai_x = 2 * FRAME_W // 3
        self.ai_y = FRAME_H // 2
        self.ai_target_x = self.ai_x
        self.ai_target_y = self.ai_y
        
        # History for detecting gestures
        self.human_history = []
        self.last_human_move_time = time.time()
        
        # AI state
        self.ai_mode = "waiting"  # waiting, following, retreating, approaching
        self.ai_pulse = 0
        
    def update_human(self, finger_x, finger_y):
        """Update human object position based on finger"""
        if finger_x is not None:
            # Smooth movement
            old_x, old_y = self.human_x, self.human_y
            self.human_x += (finger_x - self.human_x) * 0.3
            self.human_y += (finger_y - self.human_y) * 0.3
            
            # Calculate velocity
            self.human_vel_x = self.human_x - old_x
            self.human_vel_y = self.human_y - old_y
            
            # Record history
            self.human_history.append((time.time(), self.human_x, self.human_y))
            self.human_history = self.human_history[-30:]  # Keep last 30 frames
            
            if abs(self.human_vel_x) > 2 or abs(self.human_vel_y) > 2:
                self.last_human_move_time = time.time()
    
    def get_human_gesture(self):
        """Detect what gesture human is making based on movement"""
        if len(self.human_history) < 10:
            return "none"
        
        # Get movement over last 10 frames
        recent = self.human_history[-10:]
        dx = recent[-1][1] - recent[0][1]
        dy = recent[-1][2] - recent[0][2]
        
        # Check if moving significantly
        if abs(dx) < 20 and abs(dy) < 20:
            # Check if still for a while
            if time.time() - self.last_human_move_time > 2.0:
                return "still"
            return "none"
        
        # Determine direction
        if abs(dx) > abs(dy):
            return "right" if dx > 0 else "left"
        else:
            return "down" if dy > 0 else "up"
    
    def update_ai(self):
        """AI reads commands from external agent via state file"""
        # Try to read AI command from file (written by spatial_ai_agent.py)
        try:
            with open(STATE_FILE) as f:
                file_state = json.load(f)
                if "ai_command" in file_state:
                    cmd = file_state["ai_command"]
                    # Only use recent commands (< 2 seconds old)
                    if time.time() - cmd.get("timestamp", 0) < 2.0:
                        self.ai_target_x = cmd["x"] * FRAME_W
                        self.ai_target_y = cmd["y"] * FRAME_H
                        self.ai_mode = cmd.get("mode", "responding")
                        self.ai_pulse = 1.0
        except:
            pass
        
        # Fallback: simple local behavior if no external agent
        gesture = self.get_human_gesture()
        dist = math.sqrt((self.ai_x - self.human_x)**2 + (self.ai_y - self.human_y)**2)
        
        # Only use local logic if no recent external command
        if self.ai_mode == "waiting":
            if dist < 100:
                # Human approaching — AI retreats slightly
                self.ai_mode = "retreating"
                dx = self.ai_x - self.human_x
                dy = self.ai_y - self.human_y
                norm = max(math.sqrt(dx**2 + dy**2), 1)
                self.ai_target_x = self.ai_x + (dx / norm) * 50
                self.ai_target_y = self.ai_y + (dy / norm) * 50
        
        # Clamp targets
        self.ai_target_x = max(50, min(FRAME_W - 50, self.ai_target_x))
        self.ai_target_y = max(50, min(FRAME_H - 50, self.ai_target_y))
        
        # Move toward target smoothly
        self.ai_x += (self.ai_target_x - self.ai_x) * 0.08
        self.ai_y += (self.ai_target_y - self.ai_y) * 0.08
        
        # Decay pulse and mode
        self.ai_pulse *= 0.95
        if self.ai_pulse < 0.1:
            self.ai_mode = "waiting"
    
    def save_state(self):
        """Save state to file for external reading"""
        state = {
            "timestamp": time.time(),
            "human": {
                "x": self.human_x / FRAME_W,
                "y": self.human_y / FRAME_H,
                "gesture": self.get_human_gesture()
            },
            "ai": {
                "x": self.ai_x / FRAME_W,
                "y": self.ai_y / FRAME_H,
                "mode": self.ai_mode
            }
        }
        # Preserve ai_command and topic if they exist
        try:
            with open(STATE_FILE) as f:
                old = json.load(f)
                if "ai_command" in old:
                    state["ai_command"] = old["ai_command"]
                if "topic" in old:
                    state["topic"] = old["topic"]
        except:
            pass
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)


def main():
    print("=" * 50)
    print("  SPATIAL COMMUNICATION")
    print("=" * 50)
    print("\n🟢 Green = You (control with finger)")
    print("🔵 Blue = AI (responds to your movements)")
    print("\nConversation:")
    print("  → Move right = AI agrees (follows)")
    print("  ← Move left = AI disagrees (goes opposite)")
    print("  ↑ Move up = AI acknowledges (pulses)")
    print("  • Stay still = AI approaches you")
    print("\nPress 'q' to quit\n")
    
    # Set up hand tracking
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.GestureRecognizerOptions(base_options=base_options, num_hands=1)
    recognizer = vision.GestureRecognizer.create_from_options(options)
    
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_H)
    
    state = SpatialState()
    last_print = ""
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        
        result = recognizer.recognize(mp_image)
        
        # Get finger position
        finger_x, finger_y = None, None
        if result.hand_landmarks and len(result.hand_landmarks) > 0:
            hand = result.hand_landmarks[0]
            index_tip = hand[8]
            finger_x = int(index_tip.x * FRAME_W)
            finger_y = int(index_tip.y * FRAME_H)
            
            # Draw hand
            for landmark in hand:
                x = int(landmark.x * FRAME_W)
                y = int(landmark.y * FRAME_H)
                cv2.circle(frame, (x, y), 3, (100, 100, 100), -1)
        
        # Update state
        state.update_human(finger_x, finger_y)
        state.update_ai()
        state.save_state()
        
        # Draw human object (green)
        cv2.circle(frame, (int(state.human_x), int(state.human_y)), 
                  CIRCLE_RADIUS, (0, 255, 0), -1)
        cv2.circle(frame, (int(state.human_x), int(state.human_y)), 
                  CIRCLE_RADIUS, (255, 255, 255), 2)
        
        # Draw AI object (blue) with pulse effect
        pulse_radius = int(CIRCLE_RADIUS + state.ai_pulse * 20)
        cv2.circle(frame, (int(state.ai_x), int(state.ai_y)), 
                  pulse_radius, (255, 100, 0), -1)
        cv2.circle(frame, (int(state.ai_x), int(state.ai_y)), 
                  pulse_radius, (255, 255, 255), 2)
        
        # Draw connection line
        cv2.line(frame, (int(state.human_x), int(state.human_y)),
                (int(state.ai_x), int(state.ai_y)), (50, 50, 50), 1)
        
        # Status
        gesture = state.get_human_gesture()
        status = f"You: {gesture} | AI: {state.ai_mode}"
        cv2.putText(frame, status, (20, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Show topic if one is set
        try:
            with open(STATE_FILE) as f:
                file_state = json.load(f)
                if "topic" in file_state:
                    topic = file_state["topic"]
                    # Draw topic box at bottom
                    cv2.rectangle(frame, (10, FRAME_H - 80), (FRAME_W - 10, FRAME_H - 10), (0, 0, 0), -1)
                    cv2.rectangle(frame, (10, FRAME_H - 80), (FRAME_W - 10, FRAME_H - 10), (255, 255, 255), 2)
                    cv2.putText(frame, topic[:50], (20, FRAME_H - 50),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    if len(topic) > 50:
                        cv2.putText(frame, topic[50:], (20, FRAME_H - 25),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    # Labels
                    cv2.putText(frame, "DISAGREE", (30, FRAME_H - 90),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 255), 1)
                    cv2.putText(frame, "AGREE", (FRAME_W - 100, FRAME_H - 90),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 255, 100), 1)
        except:
            pass
        
        # Print state changes
        if state.ai_mode != last_print and state.ai_mode != "waiting":
            print(f"  You: {gesture:10} → AI: {state.ai_mode}")
            last_print = state.ai_mode
        
        cv2.imshow('Spatial Communication', frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    recognizer.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
