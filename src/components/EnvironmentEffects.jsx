import { useGame } from '../context/GameContext'

export default function EnvironmentEffects() {
  const { currentBeat, alienEmotion } = useGame()

  return (
    <div className="fixed inset-0 -z-10 bg-space-black">
      <div className="text-chrome-dim text-xs absolute top-2 left-2 opacity-30">
        [Environment -- beat: {currentBeat}, mood: {alienEmotion}]
      </div>
    </div>
  )
}
