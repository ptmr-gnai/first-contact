import { useState, useCallback, useMemo } from 'react'
import { GameEngineProvider } from './engine/gameState.jsx'
import NarrativePreamble from './components/NarrativePreamble'
import GameScreen from './components/GameScreen'
import Resolution from './components/Resolution'
import SensorSliceDemo from './components/SensorSliceDemo'

function App() {
  const [phase, setPhase] = useState('preamble') // 'preamble' | 'game' | 'resolution'

  // Read mode from URL: ?mode=live enables bridge connection, default is demo
  // ?mode=sensors shows the sensor test UI
  const mode = useMemo(
    () => new URL(window.location.href).searchParams.get('mode') ?? 'demo',
    []
  )

  // Sensor demo mode — standalone UI for testing all sensors
  if (mode === 'sensors') {
    return <SensorSliceDemo />
  }

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
