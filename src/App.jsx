import { useState, useCallback, useMemo, useEffect } from 'react'
import { GameEngineProvider } from './engine/gameState.jsx'
import NarrativePreamble from './components/NarrativePreamble'
import GameScreen from './components/GameScreen'
import Resolution from './components/Resolution'
import ActTransition from './components/ActTransition'
import GameOverScreen from './components/GameOverScreen'
import { startAmbient, stopAmbient, isAmbientRunning } from './audio/ambientAudio.js'

function App() {
  const [phase, setPhase] = useState('preamble')
  const [transitionActs, setTransitionActs] = useState({ from: 1, to: 2 })
  const [started, setStarted] = useState(false)
  const [musicOn, setMusicOn] = useState(true)

  // Read mode from URL: ?mode=live enables bridge connection, default is demo
  const mode = useMemo(
    () => new URL(window.location.href).searchParams.get('mode') ?? 'demo',
    []
  )

  const handleStart = useCallback(() => {
    startAmbient()
    setStarted(true)
  }, [])

  const toggleMusic = useCallback(() => {
    if (isAmbientRunning()) {
      stopAmbient()
      setMusicOn(false)
    } else {
      startAmbient()
      setMusicOn(true)
    }
  }, [])

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

  // Stop ambient on resolution
  useEffect(() => {
    if (phase === 'resolution') {
      stopAmbient()
    }
  }, [phase])

  return (
    <GameEngineProvider mode={mode} onPhaseChange={handlePhaseChange}>
      {!started && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black cursor-pointer"
          onClick={handleStart}
        >
          <p className="text-chrome-dim/60 font-mono text-sm tracking-[0.25em] uppercase animate-pulse">
            Click to begin
          </p>
        </div>
      )}
      {started && phase === 'preamble' && <NarrativePreamble onComplete={handlePreambleComplete} />}
      {started && phase === 'game' && <GameScreen />}
      {started && phase === 'resolution' && <Resolution />}
      {started && phase === 'transition' && (
        <ActTransition
          fromAct={transitionActs.from}
          toAct={transitionActs.to}
          onComplete={handleTransitionComplete}
        />
      )}
      {started && (phase === 'gameover' || phase === 'victory') && (
        <GameOverScreen
          type={phase === 'victory' ? 'victory' : 'gameover'}
          onRestart={handleRestart}
        />
      )}

      {/* Music toggle */}
      {started && (
        <button
          onClick={toggleMusic}
          className="fixed bottom-3 right-3 z-[90] w-8 h-8 flex items-center justify-center rounded-full bg-space-deep/60 border border-chrome-subtle/30 text-chrome-dim/40 hover:text-chrome-dim/70 hover:border-chrome-subtle/60 transition-all backdrop-blur-sm"
          title={musicOn ? 'Mute music' : 'Unmute music'}
        >
          {musicOn ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      )}
    </GameEngineProvider>
  )
}

export default App
