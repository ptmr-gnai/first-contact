# Spatial Communication Primitive — Touch & Move

## The Idea

Bidirectional communication through shared spatial objects:
- **You** move something with your hand
- **I** see it and respond by moving something back
- No words needed — just spatial gestures

## Vertical Slice: Shared Object Protocol

```
┌─────────────────────────────────────────────────────────────┐
│                      SHARED SPACE                           │
│                                                             │
│    [Object A]                              [Object B]       │
│       ↑                                        ↑            │
│    You move                               I move            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ state.json  │  ← Both read/write
                    └─────────────┘
```

### State File Format

```json
{
  "timestamp": 1234567890.123,
  "human": {
    "object_x": 0.5,
    "object_y": 0.3,
    "gesture": "pointing",
    "last_action": "moved_right"
  },
  "ai": {
    "object_x": 0.7,
    "object_y": 0.5,
    "message": "acknowledged",
    "last_action": "moved_left"
  }
}
```

### The Conversation

| You do | I see | I respond |
|--------|-------|-----------|
| Move object right | `object_x` increased | Move my object right (agreement) or left (disagreement) |
| Push object toward me | `object_y` increased | Accept (pull it in) or reject (push back) |
| Tap object rapidly | Velocity spike | Urgency — I respond faster |
| Leave object still | No movement | Waiting — I can initiate |

## Implementation Plan

### Script 1: `spatial_human.py` (You run this)
- Shows webcam with draggable object
- You move it with your finger
- Writes position to `spatial_state.json`
- Reads AI object position and displays it

### Script 2: `spatial_ai.py` (I run this)
- Reads your object position from `spatial_state.json`
- Decides how to respond (rules or LLM-based)
- Writes my object position back
- Simple rules first:
  - Mirror: I follow your movement
  - Oppose: I move opposite
  - Acknowledge: I pulse/bounce when you move

### Script 3: `spatial_combined.py` (Single window)
- Both in one window
- Your object (green) — controlled by hand
- My object (blue) — controlled by AI logic
- File-based or in-memory state

## Simplest Vertical Slice

**Phase 1: Echo**
- You move object → I move my object to same position (with delay)
- Proves: bidirectional communication works

**Phase 2: Response**
- You move object right → I move mine left (disagreement)
- You move object up → I move mine up (agreement)
- You tap → I pulse

**Phase 3: Meaning**
- Map spatial gestures to semantic meaning:
  - Right = "yes" / "more" / "continue"
  - Left = "no" / "less" / "stop"
  - Up = "important" / "urgent"
  - Down = "dismiss" / "later"
  - Center = "reset" / "neutral"

## The Vision

```
You: [drag object right]
Me:  [move my object right, then pulse] — "I agree, acknowledged"

You: [push object toward center aggressively]
Me:  [retreat my object, then slowly return] — "OK, I hear the urgency, let me reconsider"

You: [leave object still for 5 seconds]
Me:  [gently move my object toward yours] — "I'm here when you're ready"
```

This is **embodied conversation** — meaning through movement, not words.

## Code Sketch

```python
# spatial_state.json watcher
import json
import time

def read_state():
    with open("spatial_state.json") as f:
        return json.load(f)

def write_ai_response(x, y, action):
    state = read_state()
    state["ai"] = {"object_x": x, "object_y": y, "last_action": action, "timestamp": time.time()}
    with open("spatial_state.json", "w") as f:
        json.dump(state, f)

# AI response loop
while True:
    state = read_state()
    human_x = state["human"]["object_x"]
    
    # Simple mirror behavior
    target_x = human_x
    write_ai_response(target_x, 0.5, "mirroring")
    time.sleep(0.1)
```

## Next Steps

1. [ ] Build `spatial_combined.py` — single window with both objects
2. [ ] Your finger controls green object
3. [ ] AI logic controls blue object (start with simple mirror)
4. [ ] Add response rules (agree/disagree based on direction)
5. [ ] Test the "conversation" — can you feel the back-and-forth?

## Open Questions

- Should objects have physics (momentum, bounce)?
- Should there be a "neutral zone" in the center?
- What's the right delay for AI response? (Too fast = mechanical, too slow = unresponsive)
- Should AI object have different visual feedback (pulse, glow, trail)?
