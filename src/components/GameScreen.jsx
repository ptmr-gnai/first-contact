import EnvironmentEffects from './EnvironmentEffects'
import AlienDisplay from './AlienDisplay'
import ClueLog from './ClueLog'
import DemoControls from './DemoControls'
import PlayerControls from './PlayerControls'

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
          <div className="h-32 border-t border-chrome-subtle shrink-0">
            <PlayerControls />
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
