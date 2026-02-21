import { useGame } from '../context/GameContext'
import { EMOTIONS, LIGHT_PATTERNS } from '../data/mockGameState'

export default function DemoControls() {
  const { setEmotion, setBeat, triggerLightPattern, clearLightPattern } = useGame()

  return (
    <div className="text-chrome-dim text-sm opacity-50 p-4">
      [DemoControls -- placeholder]
    </div>
  )
}
