import { useGame } from '../context/GameContext'

export default function ClueLog() {
  const { confirmedConcepts, failedAttempts } = useGame()

  return (
    <div className="text-chrome-dim text-sm opacity-50 p-4">
      [ClueLog -- {confirmedConcepts.length} confirmed, {failedAttempts.length} failed]
    </div>
  )
}
