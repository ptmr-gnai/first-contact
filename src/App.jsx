import { useState, useCallback } from 'react'
import { GameProvider } from './context/GameContext'
import NarrativePreamble from './components/NarrativePreamble'
import GameScreen from './components/GameScreen'
import Resolution from './components/Resolution'

function App() {
  const [phase, setPhase] = useState('preamble') // 'preamble' | 'game' | 'resolution'

  const handlePreambleComplete = useCallback(() => setPhase('game'), [])
  const handleResolution = useCallback(() => setPhase('resolution'), [])

  return (
    <GameProvider>
      {phase === 'preamble' && <NarrativePreamble onComplete={handlePreambleComplete} />}
      {phase === 'game' && <GameScreen />}
      {phase === 'resolution' && <Resolution />}
    </GameProvider>
  )
}

export default App
