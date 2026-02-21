import { useState, useCallback, useMemo } from 'react'
import { GameEngineProvider } from './engine/gameState.jsx'
import NarrativePreamble from './components/NarrativePreamble'
import GameScreen from './components/GameScreen'
import Resolution from './components/Resolution'
import ActTransition from './components/ActTransition'
import GameOverScreen from './components/GameOverScreen'

function App() {
  const [phase, setPhase] = useState('preamble')
  const [transitionActs, setTransitionActs] = useState({ from: 1, to: 2 })

  // Read mode from URL: ?mode=live enables bridge connection, default is demo
  const mode = useMemo(
    () => new URL(window.location.href).searchParams.get('mode') ?? 'demo',
    []
  )

  const handlePreambleComplete = useCallback(() => setPhase('game'), [])

  const handlePhaseChange = useCallback((nextPhase, data) => {
    if (nextPhase === 'transition' && data?.fromAct && data?.toAct) {
      setTransitionActs({ from: data.fromAct, to: data.toAct })
    }
    setPhase(nextPhase)
  }, [])

  const handleTransitionComplete = useCallback(() => {
    setPhase('game')
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('game')
  }, [])

  return (
    <GameEngineProvider mode={mode} onPhaseChange={handlePhaseChange}>
      {phase === 'preamble' && <NarrativePreamble onComplete={handlePreambleComplete} />}
      {phase === 'game' && <GameScreen />}
      {phase === 'resolution' && <Resolution />}
      {phase === 'transition' && (
        <ActTransition
          fromAct={transitionActs.from}
          toAct={transitionActs.to}
          onComplete={handleTransitionComplete}
        />
      )}
      {(phase === 'gameover' || phase === 'victory') && (
        <GameOverScreen
          type={phase === 'victory' ? 'victory' : 'gameover'}
          onRestart={handleRestart}
        />
      )}
    </GameEngineProvider>
  )
}

export default App
