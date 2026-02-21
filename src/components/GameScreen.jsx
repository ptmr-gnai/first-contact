import EnvironmentEffects from './EnvironmentEffects'
import AlienDisplay from './AlienDisplay'
import ClueLog from './ClueLog'
import DemoControls from './DemoControls'
import PlayerControls from './PlayerControls'
import AnswerPanel from './AnswerPanel'
import SignalStrip from './SignalStrip'
import VocabularyBar from './VocabularyBar'

export default function GameScreen() {
  return (
    <div className="relative w-full h-full">
      {/* Background layer -- fixed, behind everything */}
      <EnvironmentEffects />

      {/* Main layout -- full viewport, above environment */}
      <div className="relative z-10 flex h-full">
        {/* Center column: vocab bar + alien + signal strip + input slot */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Vocabulary bar -- unlocked concepts at top */}
          <VocabularyBar />

          {/* Alien center stage -- takes all remaining vertical space */}
          <div className="flex-1 flex items-center justify-center">
            <AlienDisplay />
          </div>

          {/* Signal strip -- persistent color "word" display */}
          <SignalStrip />

          {/* P3 input slot -- docked at bottom of center column */}
          <div className="h-32 border-t border-chrome-subtle shrink-0">
            <PlayerControls />
          </div>
        </div>

        {/* ClueLog sidebar -- collapsible, right edge */}
        <ClueLog />
      </div>

      {/* Answer panel -- slide-up overlay */}
      <AnswerPanel />

      {/* DemoControls -- floating overlay, bottom-left */}
      <DemoControls />
    </div>
  )
}
