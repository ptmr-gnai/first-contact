import EnvironmentEffects from './EnvironmentEffects'
import AlienDisplay from './AlienDisplay'
import ClueLog from './ClueLog'
import DemoControls from './DemoControls'

export default function GameScreen() {
  return (
    <div className="relative w-full h-full">
      <EnvironmentEffects />
      <div className="relative z-10 flex h-full">
        {/* Main area: alien center stage */}
        <div className="flex-1 flex flex-col">
          <AlienDisplay />
          {/* Input slot for P3 controls */}
          <div className="h-32 flex items-center justify-center border-t border-chrome-subtle">
            <span className="text-chrome-dim text-xs opacity-30">[P3 input slot]</span>
          </div>
        </div>
        {/* Clue log sidebar */}
        <div className="w-72 border-l border-chrome-subtle">
          <ClueLog />
        </div>
      </div>
      {/* Demo controls overlay */}
      <DemoControls />
    </div>
  )
}
