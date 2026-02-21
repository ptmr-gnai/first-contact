"""
hand_tracking.py — Thin vertical slice for hand gesture input

Uses MediaPipe's new Tasks API with built-in gesture recognition.

Recognizes: Closed_Fist, Open_Palm, Pointing_Up, Thumb_Down, Thumb_Up, Victory, ILoveYou

Run: python hand_tracking.py
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os

# Path to model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "gesture_recognizer.task")


def main():
    print("=" * 50)
    print("  HAND TRACKING — Gesture Detection")
    print("=" * 50)
    print("\nBuilt-in gestures:")
    print("  👍 Thumb_Up     = Yes/Confirm")
    print("  👎 Thumb_Down   = No/Reject")
    print("  ✊ Closed_Fist  = Stop/Hold")
    print("  🖐 Open_Palm    = Pause/Wait")
    print("  👆 Pointing_Up  = Select/Attention")
    print("  ✌️ Victory      = Peace/OK")
    print("  🤟 ILoveYou     = Acknowledge")
    print("\nPress 'q' to quit\n")
    
    # Set up gesture recognizer
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.GestureRecognizerOptions(
        base_options=base_options,
        num_hands=1
    )
    recognizer = vision.GestureRecognizer.create_from_options(options)
    
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    last_gesture = None
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # Flip for mirror effect
        frame = cv2.flip(frame, 1)
        
        # Convert to RGB for MediaPipe
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        
        # Recognize gestures
        result = recognizer.recognize(mp_image)
        
        gesture_name = ""
        gesture_emoji = ""
        
        if result.gestures and len(result.gestures) > 0:
            gesture = result.gestures[0][0]
            gesture_name = gesture.category_name
            confidence = gesture.score
            
            # Map to emoji
            emoji_map = {
                "Thumb_Up": "👍",
                "Thumb_Down": "👎", 
                "Closed_Fist": "✊",
                "Open_Palm": "🖐",
                "Pointing_Up": "👆",
                "Victory": "✌️",
                "ILoveYou": "🤟",
                "None": ""
            }
            gesture_emoji = emoji_map.get(gesture_name, "")
            
            # Print when gesture changes
            if gesture_name != last_gesture and gesture_name != "None" and confidence > 0.7:
                print(f"  → {gesture_emoji} {gesture_name} ({confidence:.0%})")
                last_gesture = gesture_name
            
            # Draw hand landmarks if detected
            if result.hand_landmarks:
                for hand_landmarks in result.hand_landmarks:
                    for landmark in hand_landmarks:
                        x = int(landmark.x * frame.shape[1])
                        y = int(landmark.y * frame.shape[0])
                        cv2.circle(frame, (x, y), 4, (0, 255, 0), -1)
        
        # Display gesture on frame
        if gesture_name and gesture_name != "None":
            label = f"{gesture_emoji} {gesture_name}"
            cv2.putText(frame, label, (20, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
        else:
            cv2.putText(frame, "Show hand gesture", (20, 50),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (128, 128, 128), 2)
        
        cv2.imshow('Hand Tracking', frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    recognizer.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
