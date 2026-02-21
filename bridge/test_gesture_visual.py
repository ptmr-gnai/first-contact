"""
Visual test harness for gesture sensor.
Shows webcam feed with detected gesture overlay.

Run: python -m bridge.test_gesture_visual
"""

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import os

MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "sensors", "gesture_recognizer.task"
)

EMOJI_MAP = {
    "Thumb_Up": "👍",
    "Thumb_Down": "👎",
    "Closed_Fist": "✊",
    "Open_Palm": "🖐",
    "Pointing_Up": "👆",
    "Victory": "✌️",
    "ILoveYou": "🤟",
    "None": "",
}


def main():
    print("=" * 50)
    print("  GESTURE SENSOR VISUAL TEST")
    print("=" * 50)
    print("\nPress 'q' to quit\n")

    # Set up recognizer
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.GestureRecognizerOptions(base_options=base_options, num_hands=1)
    recognizer = vision.GestureRecognizer.create_from_options(options)

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("ERROR: Could not open camera")
        return

    print("Camera opened. Show your hand!\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        result = recognizer.recognize(mp_image)

        gesture_name = "None"
        confidence = 0.0

        if result.gestures and len(result.gestures) > 0:
            gesture = result.gestures[0][0]
            gesture_name = gesture.category_name
            confidence = gesture.score

        # Draw hand landmarks
        if result.hand_landmarks:
            for hand in result.hand_landmarks:
                for lm in hand:
                    x = int(lm.x * frame.shape[1])
                    y = int(lm.y * frame.shape[0])
                    cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)

        # Draw gesture label
        emoji = EMOJI_MAP.get(gesture_name, "")
        if gesture_name != "None":
            label = f"{emoji} {gesture_name} ({confidence:.0%})"
            cv2.putText(frame, label, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
            print(f"  {emoji} {gesture_name} ({confidence:.0%})")
        else:
            cv2.putText(frame, "No hand detected", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (128, 128, 128), 2)

        cv2.imshow("Gesture Test", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    recognizer.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
