import { useState, useCallback, useMemo } from 'react'
import { GameEngineProvider } from './engine/gameState.jsx'
import NarrativePreamble from './components/NarrativePreamble'
import GameScreen from './components/GameScreen'
import Resolution from './components/Resolution'

function App() {
  const [phase, setPhase] = useState('preamble') // 'preamble' | 'game' | 'resolution'

  // Read mode from URL: ?mode=live enables bridge connection, default is demo
  const mode = useMemo(
    () => new URL(window.location.href).searchParams.get('mode') ?? 'demo',
    []
  )

  const handlePreambleComplete = useCallback(() => setPhase('game'), [])
  const handlePhaseChange = useCallback((nextPhase) => setPhase(nextPhase), [])

  return (
    <GameEngineProvider mode={mode} onPhaseChange={handlePhaseChange}>
      {phase === 'preamble' && <NarrativePreamble onComplete={handlePreambleComplete} />}
      {phase === 'game' && <GameScreen />}
      {phase === 'resolution' && <Resolution />}
    </GameEngineProvider>
  )
}

export default App
