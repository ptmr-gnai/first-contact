import { createContext, useContext, useState } from 'react'
import { mockGameState } from '../data/mockGameState'

const GameContext = createContext(null)

export function GameProvider({ children, initialState = mockGameState }) {
  const [gameState, setGameState] = useState(initialState)

  const setEmotion = (emotion) => {
    setGameState((prev) => ({
      ...prev,
      alienEmotion: emotion,
      alienOutput: { ...prev.alienOutput, emotion },
    }))
  }

  const setBeat = (beat) => {
    setGameState((prev) => ({ ...prev, currentBeat: beat }))
  }

  const triggerLightPattern = (pattern) => {
    setGameState((prev) => ({
      ...prev,
      alienOutput: { ...prev.alienOutput, light: pattern },
    }))
  }

  const clearLightPattern = () => {
    setGameState((prev) => ({
      ...prev,
      alienOutput: { ...prev.alienOutput, light: null },
    }))
  }

  return (
    <GameContext.Provider
      value={{
        ...gameState,
        setEmotion,
        setBeat,
        triggerLightPattern,
        clearLightPattern,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
