// Re-export from the new engine module for backward compatibility.
// All P2 components import useGame from this path.
export { useGame } from '../engine/gameState.jsx'
export { GameEngineProvider as GameProvider } from '../engine/gameState.jsx'
