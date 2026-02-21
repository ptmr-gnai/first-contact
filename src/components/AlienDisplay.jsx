import { useGame } from '../context/GameContext'

export default function AlienDisplay() {
  const { alienEmotion, alienOutput } = useGame()

  return (
    <div className="flex items-center justify-center flex-1">
      <div className="text-chrome-dim text-sm opacity-50">
        [AlienDisplay -- emotion: {alienEmotion}]
      </div>
    </div>
  )
}
