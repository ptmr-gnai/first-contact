import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  BEATS,
  CONCEPTS,
  DEFAULT_ALIEN_OUTPUT,
} from '../constants.js'
import { useBridge } from '../bridge/useBridge.js'
import {
  shouldConfirmConcept,
  shouldAdvanceBeat,
  shouldTriggerResolution,
  formatPlayerResponse,
  getDistractorConcepts,
} from './languageFramework.js'
import {
  calculateNudgeLevel,
  shouldSendNudge,
  buildNudgePayload,
} from './nudgeSystem.js'
import { validateAnswer, getAvailableCards, getHintEliminations } from './answerValidation.js'
import { addStrike } from './strikeSystem.js'
import { shouldAdvanceAct as checkActAdvance, shouldTriggerVictory } from './actProgression.js'
import { loadPersistentState, savePersistentState } from './persistence.js'
import { mockGameState } from '../data/mockGameState.js'

// ── Context ────────────────────────────────────────────────────────────────────

const GameContext = createContext(null)

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a confirmed concept entry in the shape ClueLog expects.
 * @param {string} conceptId
 * @returns {{ id: string, label: string, alienLight: object, playerResponse: string }}
 */
function buildConfirmedEntry(conceptId) {
  const concept = CONCEPTS[conceptId]
  if (!concept) return null
  return {
    id: conceptId,
    label: concept.label,
    alienLight: concept.light,
    playerResponse: formatPlayerResponse(conceptId),
  }
}

/**
 * Builds a failed attempt entry in the shape ClueLog expects.
 * @param {string} conceptId
 * @returns {{ id: string, label: string, alienLight: object, playerResponse: string }}
 */
function buildFailedEntry(conceptId) {
  const concept = CONCEPTS[conceptId]
  if (!concept) return null
  return {
    id: `${conceptId}-fail-${Date.now()}`,
    label: concept.label,
    alienLight: concept.light,
    playerResponse: 'Pattern not matched',
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Central game state provider. Replaces GameProvider from GameContext.jsx.
 * In 'demo' mode it behaves exactly like the original GameProvider (uses mock
 * state, no bridge). In 'live' mode it connects to the bridge and drives the
 * full game loop.
 *
 * @param {{
 *   children: React.ReactNode,
 *   mode?: 'live' | 'demo',
 *   onPhaseChange?: (phase: string) => void
 * }} props
 */
export function GameEngineProvider({ children, mode = 'demo', onPhaseChange }) {
  const isLive = mode === 'live'

  // ── Core game state ──────────────────────────────────────────────────────
  const [currentBeat, setCurrentBeatState] = useState(mockGameState.currentBeat)
  const [alienEmotion, setAlienEmotionState] = useState(mockGameState.alienEmotion)
  const [confirmedConcepts, setConfirmedConcepts] = useState(
    isLive ? [] : mockGameState.confirmedConcepts
  )
  const [failedAttempts, setFailedAttempts] = useState(
    isLive ? [] : mockGameState.failedAttempts
  )
  const [alienOutput, setAlienOutput] = useState(
    isLive ? DEFAULT_ALIEN_OUTPUT : mockGameState.alienOutput
  )
  const [interactionHistory, setInteractionHistory] = useState([])
  const [elapsedTime, setElapsedTime] = useState(0)

  // ── Live-mode-only state ─────────────────────────────────────────────────
  const [turnCount, setTurnCount] = useState(0)
  const [timeSinceLastInput, setTimeSinceLastInput] = useState(0)
  const [nudgeLevel, setNudgeLevel] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [bridgeError, setBridgeError] = useState(null)

  // ── Vocabulary / guess state ─────────────────────────────────────────
  const [guessOptions, setGuessOptions] = useState(null)   // string[] | null
  const [guessResult, setGuessResult] = useState(null)      // 'correct' | 'wrong' | 'close' | null
  const [isTeaching, setIsTeaching] = useState(false)       // alien is in teach mode
  const [eliminatedGuesses, setEliminatedGuesses] = useState([]) // wrong guess IDs this round
  const teachingTargetRef = useRef(null)                     // sync ref for current teaching target
  const guessTimerRef = useRef(null)                         // cleanup handle for guess timers

  // ── P4 Roguelike state ─────────────────────────────────────────────────
  const persistedRef = useRef(loadPersistentState())
  const [strikes, setStrikes] = useState(0)
  const [currentAct, setCurrentActState] = useState(1)
  const [isGameOver, setIsGameOver] = useState(false)
  const [eliminatedCards, setEliminatedCards] = useState([])
  const [answerPanelOpen, setAnswerPanelOpen] = useState(false)
  const [runNumber, setRunNumber] = useState(persistedRef.current.runNumber)
  const [actSolvedBefore, setActSolvedBefore] = useState(persistedRef.current.actSolvedBefore)
  const [gamePhase, setGamePhase] = useState('preamble')

  // ── Refs (prevent stale closures in timer and callbacks) ─────────────────
  const timerRef = useRef(null)
  const lastNudgeLevelRef = useRef(0)
  const hasStartedRef = useRef(false)

  // Always-current mirrors of state that need to be read inside intervals/callbacks
  const currentBeatRef = useRef(currentBeat)
  const confirmedConceptsRef = useRef(confirmedConcepts)
  const interactionHistoryRef = useRef(interactionHistory)
  const timeSinceLastInputRef = useRef(0)
  const elapsedTimeRef = useRef(0)
  const alienOutputRef = useRef(alienOutput)

  useEffect(() => { currentBeatRef.current = currentBeat }, [currentBeat])
  useEffect(() => { confirmedConceptsRef.current = confirmedConcepts }, [confirmedConcepts])
  useEffect(() => { interactionHistoryRef.current = interactionHistory }, [interactionHistory])
  useEffect(() => { alienOutputRef.current = alienOutput }, [alienOutput])

  // ── Cleanup timers on unmount ────────────────────────────────────────────
  useEffect(() => () => clearTimeout(guessTimerRef.current), [])

  // ── Bridge ────────────────────────────────────────────────────────────────

  /**
   * Processes an alien response coming from the bridge.
   * @param {object} response - parsed alien response JSON
   */
  const processAlienResponse = useCallback((response) => {
    if (!response) return

    setAlienOutput(response)

    if (response.emotion) {
      setAlienEmotionState(response.emotion)
    }

    if (response.conceptConfirmed) {
      const conceptId = response.conceptConfirmed
      const currentIds = confirmedConceptsRef.current.map((c) => c.id)
      if (!currentIds.includes(conceptId)) {
        const entry = buildConfirmedEntry(conceptId)
        if (entry) {
          setConfirmedConcepts((prev) => {
            if (prev.some((c) => c.id === conceptId)) return prev
            return [...prev, entry]
          })
        }
      }
    }

    // Detect teaching sequence: if alien has a conceptTarget and it's not yet confirmed, show guess options
    const target = response.conceptTarget ?? null
    teachingTargetRef.current = target
    if (target && !confirmedConceptsRef.current.some((c) => c.id === target)) {
      const confirmedIds = confirmedConceptsRef.current.map((c) => c.id)
      const optionCount = currentBeatRef.current <= 1 ? 2 : Math.min(4, 2 + confirmedIds.length)
      const options = getDistractorConcepts(target, confirmedIds, optionCount)
      setGuessOptions(options)
      setGuessResult(null)
      setEliminatedGuesses([])
      setIsTeaching(true)
    }

    setInteractionHistory((prev) => {
      const entry = {
        turn: prev.length + 1,
        alien: {
          light: response.light ?? null,
          sound: response.sound ?? null,
          emotion: response.emotion ?? null,
          gesture: response.gesture ?? null,
          conceptConfirmed: response.conceptConfirmed ?? null,
          nudge: response.nudge ?? false,
        },
        player: null,
        timestamp: Date.now(),
      }
      return [...prev, entry]
    })

    setIsProcessing(false)
  }, [])

  const {
    sendInput,
    isConnected: bridgeConnected,
    error: bridgeErr,
  } = useBridge({
    onAlienResponse: processAlienResponse,
    enabled: isLive,
  })

  // Mirror bridge connection/error into local state
  useEffect(() => { setIsConnected(bridgeConnected) }, [bridgeConnected])
  useEffect(() => { setBridgeError(bridgeErr) }, [bridgeErr])

  // ── Auto-start when bridge connects in live mode ─────────────────────────
  useEffect(() => {
    if (!isLive || !bridgeConnected || hasStartedRef.current) return
    hasStartedRef.current = true

    sendInput({
      type: 'start',
      gameState: {
        currentBeat: 1,
        confirmedConcepts: [],
        recentHistory: [],
        timeSinceLastInput: 0,
        totalElapsed: 0,
      },
    })
    setIsProcessing(true)
  }, [isLive, bridgeConnected, sendInput])

  // ── Timer (live mode only) ────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return

    timerRef.current = setInterval(() => {
      // Increment elapsed time via ref so we always have current value
      elapsedTimeRef.current += 1000
      setElapsedTime(elapsedTimeRef.current)

      // Increment inactivity timer via ref
      timeSinceLastInputRef.current += 1000
      const inactiveMs = timeSinceLastInputRef.current
      setTimeSinceLastInput(inactiveMs)

      const level = calculateNudgeLevel(inactiveMs)
      setNudgeLevel(level)

      if (shouldSendNudge(level, lastNudgeLevelRef.current)) {
        lastNudgeLevelRef.current = level

        const beat = currentBeatRef.current
        const confirmedIds = confirmedConceptsRef.current.map((c) => c.id)
        const beatConfig = BEATS[beat] ?? {}
        const available = beatConfig.availableConcepts ?? []

        const nudgePayload = buildNudgePayload(level, beat, confirmedIds, available)
        const recentHistory = interactionHistoryRef.current.slice(-6)

        sendInput({
          type: 'nudge',
          ...nudgePayload,
          gameState: {
            currentBeat: beat,
            confirmedConcepts: confirmedIds,
            recentHistory,
            timeSinceLastInput: inactiveMs,
            totalElapsed: elapsedTimeRef.current,
          },
        })
        setIsProcessing(true)
      }
    }, 1000)

    return () => {
      clearInterval(timerRef.current)
    }
    // sendInput is stable (useCallback with no deps); safe to omit from dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive])

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Submits player input. Evaluates concept confirmation, updates history,
   * and forwards the input to the alien brain via the bridge.
   *
   * @param {object} playerInput - player input object (color / voice / morse)
   */
  const submitPlayerInput = useCallback((playerInput) => {
    // Reset inactivity tracking immediately via refs so the timer sees 0 next tick
    timeSinceLastInputRef.current = 0
    lastNudgeLevelRef.current = 0
    setTimeSinceLastInput(0)
    setNudgeLevel(0)

    // Read current confirmed IDs synchronously from ref to avoid stale closure
    const currentConfirmedIds = confirmedConceptsRef.current.map((c) => c.id)

    const { confirmed, conceptId, confidence } = shouldConfirmConcept(
      playerInput,
      alienOutputRef.current,
      currentConfirmedIds
    )

    let nextConfirmedIds = currentConfirmedIds

    if (confirmed && conceptId) {
      if (!currentConfirmedIds.includes(conceptId)) {
        const entry = buildConfirmedEntry(conceptId)
        if (entry) {
          setConfirmedConcepts((prev) => {
            if (prev.some((c) => c.id === conceptId)) return prev
            return [...prev, entry]
          })
        }
        nextConfirmedIds = [...currentConfirmedIds, conceptId]

        // Beat advancement check
        const { shouldAdvance, nextBeat } = shouldAdvanceBeat(
          currentBeatRef.current,
          nextConfirmedIds,
          elapsedTimeRef.current
        )
        if (shouldAdvance && nextBeat) {
          setCurrentBeatState(nextBeat)
        }

        // Resolution check (beat 3 only)
        if (shouldTriggerResolution(currentBeatRef.current, nextConfirmedIds, playerInput)) {
          onPhaseChange?.('resolution')
        }
      }
    } else if (!confirmed && conceptId && confidence > 0) {
      const failEntry = buildFailedEntry(conceptId)
      if (failEntry) {
        setFailedAttempts((prev) => [...prev, failEntry])
      }
    }

    // Append to interaction history and send bridge payload
    setInteractionHistory((prev) => {
      const entry = {
        turn: prev.length + 1,
        alien: null,
        player: playerInput,
        timestamp: Date.now(),
      }
      const nextHistory = [...prev, entry]

      if (isLive) {
        const recentHistory = nextHistory.slice(-6)
        sendInput({
          playerInput,
          gameState: {
            currentBeat: currentBeatRef.current,
            confirmedConcepts: nextConfirmedIds,
            recentHistory,
            timeSinceLastInput: 0,
            totalElapsed: elapsedTimeRef.current,
          },
        })
        setIsProcessing(true)
      }

      return nextHistory
    })

    setTurnCount((prev) => prev + 1)
  }, [isLive, sendInput, onPhaseChange])

  // ── Vocabulary / guess actions ──────────────────────────────────────

  /**
   * Submit a guess from the ConceptPicker.
   * @param {string} conceptId - the concept the player thinks the alien meant
   */
  const submitGuess = useCallback((conceptId) => {
    // Read target from sync ref (not alienOutputRef which may be stale)
    const target = teachingTargetRef.current
    if (!target) return

    // Clear any pending guess timer
    clearTimeout(guessTimerRef.current)

    if (conceptId === target) {
      // Correct guess!
      setGuessResult('correct')
      setAlienEmotionState('excited')

      const currentIds = confirmedConceptsRef.current.map((c) => c.id)
      if (!currentIds.includes(target)) {
        const entry = buildConfirmedEntry(target)
        if (entry) {
          setConfirmedConcepts((prev) => {
            if (prev.some((c) => c.id === target)) return prev
            return [...prev, entry]
          })
        }

        const nextConfirmedIds = [...currentIds, target]
        const { shouldAdvance, nextBeat } = shouldAdvanceBeat(
          currentBeatRef.current,
          nextConfirmedIds,
          elapsedTimeRef.current
        )
        if (shouldAdvance && nextBeat) {
          setCurrentBeatState(nextBeat)
        }
      }

      // Keep isTeaching true briefly so ConceptPicker shows the correct highlight,
      // then dismiss after delay
      guessTimerRef.current = setTimeout(() => {
        setIsTeaching(false)
        setGuessOptions(null)
        setGuessResult(null)
        setEliminatedGuesses([])
      }, 1200)
    } else {
      // Check if it's a "close" guess (same color family)
      const targetConcept = CONCEPTS[target]
      const guessConcept = CONCEPTS[conceptId]
      const isClose = targetConcept && guessConcept &&
        targetConcept.light.colors[0] === guessConcept.light.colors[0]

      setGuessResult(isClose ? 'close' : 'wrong')
      setEliminatedGuesses(prev => [...prev, conceptId])
      setAlienEmotionState(isClose ? 'hopeful' : 'frustrated')

      // Reset emotion after brief flash
      guessTimerRef.current = setTimeout(() => {
        setAlienEmotionState('curious')
        setGuessResult(null)
      }, 1000)
    }
    // Reads refs only (confirmedConceptsRef, currentBeatRef, elapsedTimeRef, teachingTargetRef),
    // calls stable setters -- empty deps is correct
  }, [])

  /**
   * Trigger a teaching sequence in demo mode.
   * Sets conceptTarget on alienOutput and generates guess options.
   * @param {string} conceptId - the concept to teach
   */
  const triggerTeaching = useCallback((conceptId) => {
    const concept = CONCEPTS[conceptId]
    if (!concept) return

    // Update sync ref immediately so submitGuess reads correctly
    teachingTargetRef.current = conceptId

    const confirmedIds = confirmedConceptsRef.current.map((c) => c.id)
    const optionCount = currentBeatRef.current <= 1 ? 2 : Math.min(4, 2 + confirmedIds.length)
    const options = getDistractorConcepts(conceptId, confirmedIds, optionCount)

    setAlienOutput((prev) => ({
      ...prev,
      light: concept.light,
      sound: concept.sound,
      gesture: conceptId,
      gestureFirst: true,
      conceptTarget: conceptId,
    }))

    setGuessOptions(options)
    setGuessResult(null)
    setEliminatedGuesses([])
    setIsTeaching(true)
  }, [])

  // ── P2-compatible mutation helpers ────────────────────────────────────────

  /**
   * Directly sets the alien's emotion. Used by demo controls and narrative transitions.
   * @param {string} emotion
   */
  const setEmotion = useCallback((emotion) => {
    setAlienEmotionState(emotion)
    setAlienOutput((prev) => ({ ...prev, emotion }))
  }, [])

  /**
   * Directly sets the current beat. Used by demo controls.
   * @param {number} beat
   */
  const setBeat = useCallback((beat) => {
    setCurrentBeatState(beat)
  }, [])

  /**
   * Overrides the alien display's current light pattern.
   * @param {object} pattern - { colors, timing, intensity }
   */
  const triggerLightPattern = useCallback((pattern) => {
    setAlienOutput((prev) => ({ ...prev, light: pattern }))
  }, [])

  /**
   * Clears the current light pattern from the alien display.
   */
  const clearLightPattern = useCallback(() => {
    setAlienOutput((prev) => ({ ...prev, light: null }))
  }, [])

  // ── P4 Roguelike actions ─────────────────────────────────────────────

  /**
   * Submit a card-based answer for the current act.
   * @param {string[]} cardIds - Array of selected card IDs
   */
  const submitAnswer = useCallback((cardIds) => {
    const { correct } = validateAnswer(cardIds, currentAct)

    if (correct) {
      // Mark act solved in persistence
      const nextSolved = { ...actSolvedBefore, [currentAct]: true }
      setActSolvedBefore(nextSolved)

      const persisted = persistedRef.current
      persisted.actSolvedBefore = nextSolved
      persisted.correctSubmissions = (persisted.correctSubmissions || 0) + 1
      persisted.totalSubmissions = (persisted.totalSubmissions || 0) + 1
      savePersistentState(persisted)

      if (shouldTriggerVictory(currentAct, true)) {
        setGamePhase('victory')
        onPhaseChange?.('victory')
      } else {
        const { shouldAdvance, nextAct } = checkActAdvance(currentAct, true)
        if (shouldAdvance && nextAct) {
          setCurrentActState(nextAct)
          setCurrentBeatState(nextAct) // keep backward compat
          setEliminatedCards([])
          setAnswerPanelOpen(false)
          setGamePhase('transition')
          onPhaseChange?.('transition', { fromAct: currentAct, toAct: nextAct })
        }
      }
    } else {
      const { strikes: newStrikes, isGameOver: gameOver } = addStrike(strikes)
      setStrikes(newStrikes)

      const persisted = persistedRef.current
      persisted.totalSubmissions = (persisted.totalSubmissions || 0) + 1
      savePersistentState(persisted)

      if (gameOver) {
        setIsGameOver(true)
        setGamePhase('gameover')
        onPhaseChange?.('gameover')
      }
    }
  }, [currentAct, strikes, actSolvedBefore, onPhaseChange])

  /**
   * Use a hint: costs 1 strike, eliminates up to 5 wrong cards.
   */
  const useHint = useCallback(() => {
    const { strikes: newStrikes, isGameOver: gameOver } = addStrike(strikes)
    setStrikes(newStrikes)

    const toEliminate = getHintEliminations(currentAct, eliminatedCards)
    setEliminatedCards(prev => [...prev, ...toEliminate])

    if (gameOver) {
      setIsGameOver(true)
      setGamePhase('gameover')
      onPhaseChange?.('gameover')
    }
  }, [strikes, currentAct, eliminatedCards, onPhaseChange])

  /**
   * Toggle the answer panel open/closed.
   */
  const toggleAnswerPanel = useCallback(() => {
    setAnswerPanelOpen(prev => !prev)
  }, [])

  /**
   * Start a new roguelike run. Resets strikes/cards/act but preserves persistence.
   */
  const startNewRun = useCallback(() => {
    const persisted = persistedRef.current
    persisted.runNumber = (persisted.runNumber || 1) + 1
    savePersistentState(persisted)

    setRunNumber(persisted.runNumber)
    setStrikes(0)
    setCurrentActState(1)
    setCurrentBeatState(1)
    setIsGameOver(false)
    setEliminatedCards([])
    setAnswerPanelOpen(false)
    setGamePhase('playing')
    onPhaseChange?.('game')
  }, [onPhaseChange])

  /**
   * Set the current act directly (used by demo controls).
   * @param {number} act
   */
  const setAct = useCallback((act) => {
    setCurrentActState(act)
    setCurrentBeatState(act) // keep backward compat
  }, [])

  /**
   * Set game phase and propagate to App-level phase handler.
   * @param {'preamble'|'playing'|'transition'|'victory'|'gameover'} phase
   */
  const setGamePhaseAndPropagate = useCallback((phase) => {
    setGamePhase(phase)
    onPhaseChange?.(phase)
  }, [onPhaseChange])

  // ── Context value ─────────────────────────────────────────────────────────

  const contextValue = {
    // Existing P2-compatible interface (all original useGame() fields)
    currentBeat,
    alienEmotion,
    confirmedConcepts,
    failedAttempts,
    alienOutput,
    interactionHistory,
    elapsedTime,
    setEmotion,
    setBeat,
    triggerLightPattern,
    clearLightPattern,

    // New fields (additive -- P2 components will not break)
    turnCount,
    timeSinceLastInput,
    nudgeLevel,
    isProcessing,
    isConnected,
    bridgeError,

    // New actions (called by P3 input components)
    submitPlayerInput,
    processAlienResponse,

    // Vocabulary / guess state
    guessOptions,
    guessResult,
    isTeaching,
    eliminatedGuesses,
    submitGuess,
    triggerTeaching,

    // P4 Roguelike state
    strikes,
    currentAct,
    isGameOver,
    eliminatedCards,
    answerPanelOpen,
    runNumber,
    actSolvedBefore,
    gamePhase,

    // P4 Roguelike actions
    submitAnswer,
    useHint,
    toggleAnswerPanel,
    startNewRun,
    setAct,
    setGamePhase: setGamePhaseAndPropagate,
  }

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the full game context value. Must be used within GameEngineProvider.
 * Drop-in replacement for the original useGame() from GameContext.jsx.
 *
 * @returns {object}
 */
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameEngineProvider')
  return ctx
}

export default GameEngineProvider
