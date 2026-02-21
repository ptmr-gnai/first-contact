"""
spatial_ai_agent.py — AI agent that watches state file and responds

Run this in one terminal, spatial_talk.py in another.
This script watches your movements and writes AI responses.

The AI in spatial_talk.py will read this file and move accordingly.
"""

import json
import time
import os
import math

STATE_FILE = os.path.join(os.path.dirname(__file__), "spatial_state.json")

def read_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except:
        return None

def write_ai_command(x, y, mode, message=""):
    """Write AI's desired position to state file"""
    state = read_state()
    if state is None:
        state = {}
    
    state["ai_command"] = {
        "x": x,
        "y": y,
        "mode": mode,
        "message": message,
        "timestamp": time.time()
    }
    
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def main():
    print("=" * 50)
    print("  AI SPATIAL AGENT")
    print("=" * 50)
    print("\nWatching for your movements...")
    print("Run 'python spatial_talk.py' in another terminal\n")
    
    last_gesture = None
    last_human_x = 0.5
    last_response_time = time.time()
    
    while True:
        state = read_state()
        
        if state is None or "human" not in state:
            time.sleep(0.1)
            continue
        
        human = state["human"]
        gesture = human.get("gesture", "none")
        human_x = human.get("x", 0.5)
        human_y = human.get("y", 0.5)
        
        # Detect significant movement
        dx = human_x - last_human_x
        
        # Respond to gestures
        if gesture != last_gesture and gesture != "none":
            print(f"\n👁  Detected: {gesture}")
            
            if gesture == "right":
                print("   → You moved right")
                print("   💬 AI: I agree! Moving with you.")
                write_ai_command(min(human_x + 0.15, 0.9), 0.5, "agreeing", "following your lead")
                
            elif gesture == "left":
                print("   ← You moved left")
                print("   💬 AI: Hmm, I disagree. Holding position.")
                write_ai_command(0.7, 0.5, "disagreeing", "let me think about that")
                
            elif gesture == "up":
                print("   ↑ You moved up")
                print("   💬 AI: Acknowledged! I see the emphasis.")
                write_ai_command(human_x, 0.4, "acknowledging", "noted")
                
            elif gesture == "down":
                print("   ↓ You moved down")
                print("   💬 AI: Understood, backing off.")
                write_ai_command(0.8, 0.6, "retreating", "giving you space")
                
            elif gesture == "still":
                print("   • You're waiting")
                print("   💬 AI: I'll come to you...")
                write_ai_command(human_x + 0.1, human_y, "approaching", "here I am")
            
            last_gesture = gesture
            last_response_time = time.time()
        
        # If human hasn't moved in a while, AI can initiate
        if time.time() - last_response_time > 5.0 and gesture == "still":
            print("\n🤖 AI initiating: *moves toward you curiously*")
            write_ai_command(human_x + 0.08, human_y, "curious", "are you there?")
            last_response_time = time.time()
        
        last_human_x = human_x
        time.sleep(0.1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAI agent stopped.")
