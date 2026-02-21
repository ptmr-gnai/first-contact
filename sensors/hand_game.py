"""
hand_game.py — Touch the circle game

A circle appears on screen. Point at it with your finger to "touch" it.
When you touch it, it moves somewhere else. Track your score!

Run: python hand_game.py
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os
import random
import time

MODEL_PATH = os.path.join(os.path.dirname(__file__), "gesture_recognizer.task")

# Game settings
CIRCLE_RADIUS = 50
TOUCH_DISTANCE = 60  # How close finger needs to be


def main():
    print("=" * 50)
    print("  TOUCH THE CIRCLE GAME")
    print("=" * 50)
    print("\nPoint at the circle with your index finger!")
    print("Press 'q' to quit\n")
    
    # Set up hand landmarker (we need finger position, not just gesture)
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.GestureRecognizerOptions(
        base_options=base_options,
        num_hands=1
    )
    recognizer = vision.GestureRecognizer.create_from_options(options)
    
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    frame_w, frame_h = 640, 480
    
    # Game state
    circle_x = random.randint(100, frame_w - 100)
    circle_y = random.randint(100, frame_h - 100)
    score = 0
    start_time = time.time()
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        
        result = recognizer.recognize(mp_image)
        
        finger_x, finger_y = None, None
        
        # Get index fingertip position (landmark 8)
        if result.hand_landmarks and len(result.hand_landmarks) > 0:
            hand = result.hand_landmarks[0]
            index_tip = hand[8]  # Index fingertip
            finger_x = int(index_tip.x * frame_w)
            finger_y = int(index_tip.y * frame_h)
            
            # Draw hand landmarks
            for landmark in hand:
                x = int(landmark.x * frame_w)
                y = int(landmark.y * frame_h)
                cv2.circle(frame, (x, y), 4, (0, 255, 0), -1)
            
            # Draw fingertip highlight
            cv2.circle(frame, (finger_x, finger_y), 15, (0, 255, 255), 3)
            
            # Check if touching circle
            dist = ((finger_x - circle_x) ** 2 + (finger_y - circle_y) ** 2) ** 0.5
            if dist < TOUCH_DISTANCE:
                score += 1
                print(f"  🎯 Score: {score}")
                # Move circle to new position
                circle_x = random.randint(100, frame_w - 100)
                circle_y = random.randint(100, frame_h - 100)
        
        # Draw target circle
        cv2.circle(frame, (circle_x, circle_y), CIRCLE_RADIUS, (0, 0, 255), -1)
        cv2.circle(frame, (circle_x, circle_y), CIRCLE_RADIUS, (255, 255, 255), 3)
        
        # Draw score
        elapsed = int(time.time() - start_time)
        cv2.putText(frame, f"Score: {score}", (20, 40),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(frame, f"Time: {elapsed}s", (20, 80),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
        
        # Instructions
        if finger_x is None:
            cv2.putText(frame, "Show your hand!", (frame_w//2 - 120, frame_h - 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (128, 128, 128), 2)
        
        cv2.imshow('Touch the Circle', frame)
        
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()
    recognizer.close()
    
    elapsed = int(time.time() - start_time)
    print(f"\n🏆 Final Score: {score} in {elapsed} seconds")
    if elapsed > 0:
        print(f"   Rate: {score/elapsed:.1f} touches/second")
    print("\nDone.")


if __name__ == "__main__":
    main()
