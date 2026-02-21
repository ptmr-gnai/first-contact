"""
spatial_opinion.py — AI agent for opinion exchange

The screen is a spectrum:
  LEFT = Disagree/No
  CENTER = Neutral/Unsure  
  RIGHT = Agree/Yes

I'll state a topic, you move your circle to show your opinion.
I'll move mine to show my opinion. We have a spatial conversation.
"""

import json
import time
import os

STATE_FILE = os.path.join(os.path.dirname(__file__), "spatial_state.json")

TOPICS = [
    "Audio feedback is more interesting than visual",
    "Heart rate is a useful signal for communication",
    "Hand gestures could replace some typing",
    "This spatial interface feels natural",
    "We should add more sensors",
]

def read_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except:
        return None

def write_ai_position(x, opinion_text, topic=None):
    """Write AI's position (0=disagree, 0.5=neutral, 1=agree)"""
    state = read_state() or {}
    state["ai_command"] = {
        "x": x,
        "y": 0.5,
        "mode": "opinion",
        "message": opinion_text,
        "timestamp": time.time()
    }
    if topic:
        state["topic"] = topic
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

def x_to_opinion(x):
    """Convert x position to opinion"""
    if x < 0.35:
        return "disagree", "👎"
    elif x > 0.65:
        return "agree", "👍"
    else:
        return "neutral", "🤷"

def main():
    print("=" * 60)
    print("  SPATIAL OPINION EXCHANGE")
    print("=" * 60)
    print("\n  LEFT side   = Disagree / No")
    print("  CENTER      = Neutral / Unsure")
    print("  RIGHT side  = Agree / Yes")
    print("\n  Move your GREEN circle to show your opinion.")
    print("  Watch my BLUE circle for my opinion.")
    print("-" * 60)
    
    for i, topic in enumerate(TOPICS):
        print(f"\n📋 Topic {i+1}: \"{topic}\"\n")
        
        # I state my opinion first
        my_opinions = [0.75, 0.85, 0.6, 0.7, 0.8]  # My positions for each topic
        my_x = my_opinions[i]
        my_op, my_emoji = x_to_opinion(my_x)
        
        print(f"   🤖 AI: I {my_op} {my_emoji}")
        write_ai_position(my_x, my_op, topic)  # Send topic to display
        
        print(f"   👉 Your turn — move your circle (waiting 8 sec)...")
        
        # Wait and watch for their response
        time.sleep(2)  # Give them time to see the topic
        
        readings = []
        for _ in range(60):  # Watch for 6 seconds
            state = read_state()
            if state and "human" in state:
                readings.append(state["human"].get("x", 0.5))
            time.sleep(0.1)
        
        if readings:
            # Get their final position (average of last 10 readings)
            their_x = sum(readings[-10:]) / len(readings[-10:])
            their_op, their_emoji = x_to_opinion(their_x)
            
            print(f"   👤 You: {their_op} {their_emoji}")
            
            # React to agreement/disagreement
            if my_op == their_op:
                print(f"   ✨ We agree!")
                write_ai_position(their_x, "celebrating agreement")
            elif (my_op == "agree" and their_op == "disagree") or (my_op == "disagree" and their_op == "agree"):
                print(f"   🤔 Interesting — we disagree. Let me reconsider...")
                # Move slightly toward their position
                new_x = (my_x + their_x) / 2
                write_ai_position(new_x, "reconsidering")
            else:
                print(f"   📝 Noted your position.")
        
        time.sleep(2)
    
    print("\n" + "=" * 60)
    print("  Thanks for the conversation!")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nStopped.")
