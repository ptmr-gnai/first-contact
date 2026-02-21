import EnvironmentEffects from './EnvironmentEffects'
import AlienDisplay from './AlienDisplay'
import ClueLog from './ClueLog'
import DemoControls from './DemoControls'

export default function GameScreen() {
  return (
    <div className="relative w-full h-full">
      {/* Background layer -- fixed, behind everything */}
      <EnvironmentEffects />

      {/* Main layout -- full viewport, above environment */}
      <div className="relative z-10 flex h-full">
        {/* Center column: alien + input slot */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Alien center stage -- takes all remaining vertical space */}
          <div className="flex-1 flex items-center justify-center">
            <AlienDisplay />
          </div>

          {/* P3 input slot -- docked at bottom of center column */}
          <div className="h-32 flex items-center justify-center border-t border-chrome-subtle shrink-0">
            <span className="text-chrome-dim text-xs opacity-30 tracking-widest uppercase font-mono">
              [P3 input controls]
            </span>
          </div>
        </div>

        {/* ClueLog sidebar -- collapsible, right edge */}
        <ClueLog />
      </div>

      {/* DemoControls -- floating overlay, bottom-left */}
      <DemoControls />
    </div>
  )
}
