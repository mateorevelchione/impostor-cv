"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Eye, Repeat, SkipForward } from "lucide-react"
import { GameTimer } from "./game-timer"
import { generateImpostorIndices } from "@/lib/game-logic"

interface GameScreenProps {
  config: {
    playerCount: number
    impostorCount: number
    secretWord: string
  }
  onGameEnd: () => void
}

interface PlayerRole {
  id: string
  name: string
  isImpostor: boolean
  word?: string
}

type RevealState = "hidden" | "revealing" | "options"

export function GameScreen({ config, onGameEnd }: GameScreenProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [playerRoles, setPlayerRoles] = useState<PlayerRole[]>([])
  const [timerActive, setTimerActive] = useState(false)
  const [roundFinished, setRoundFinished] = useState(false)
  const [revealState, setRevealState] = useState<RevealState>("hidden")

  useEffect(() => {
    const impostorIndices = generateImpostorIndices(config.playerCount, config.impostorCount)

    const roles = Array.from({ length: config.playerCount }, (_, index) => ({
      id: index.toString(),
      name: `Jugador ${index + 1}`,
      isImpostor: impostorIndices.includes(index),
      word: impostorIndices.includes(index) ? undefined : config.secretWord,
    }))

    setPlayerRoles(roles)
    setCurrentPlayerIndex(0)
    setGameStarted(false)
    setRevealState("hidden")
    setTimerActive(false)
    setRoundFinished(false)
  }, [config.playerCount, config.impostorCount, config.secretWord])

  const currentPlayer = playerRoles[currentPlayerIndex]
  const totalPlayers = playerRoles.length

  const handleReveal = () => {
    if (roundFinished || revealState === "revealing") return
    setRevealState("revealing")
    setTimerActive(true)
  }

  const handleTimerEnd = () => {
    setTimerActive(false)
    setRevealState("options")
  }

  const handleViewAgain = () => {
    setRevealState("revealing")
    setTimerActive(true)
  }

  const goToNextPlayer = () => {
    if (currentPlayerIndex >= totalPlayers - 1) {
      setTimerActive(false)
      setRevealState("hidden")
      setRoundFinished(true)
      return
    }

    setCurrentPlayerIndex((prev) => prev + 1)
    setRevealState("hidden")
    setTimerActive(false)
  }

  if (!totalPlayers) {
    return null
  }

  if (roundFinished) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🥗</div>
            <h1 className="text-3xl font-bold text-veggie-dark mb-4">¡Cartas reveladas!</h1>
            <p className="text-veggie-text mb-2">Ya pueden debatir y descubrir al impostor.</p>
            <p className="text-sm text-veggie-text">
              Recuerden: solo uno (o más) no conoce la palabra secreta.
            </p>
          </div>

          <button
            onClick={onGameEnd}
            className="w-full bg-veggie-green text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-green-dark transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    )
  }

  if (!gameStarted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="mb-8">
            <div className="text-5xl mb-4">🎮</div>
            <h1 className="text-3xl font-bold text-veggie-dark mb-4">¡Listo!</h1>
            <p className="text-veggie-text mb-6">
              {totalPlayers} jugadores, {config.impostorCount} impostor(es)
            </p>
            <p className="text-sm text-veggie-text mb-6">Pasen el teléfono al Jugador 1 para comenzar</p>
          </div>

          <button
            onClick={() => setGameStarted(true)}
            className="w-full bg-veggie-green text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-green-dark transition-colors"
          >
            Comenzar
          </button>
        </div>
      </main>
    )
  }

  if (!currentPlayer) {
    return null
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light p-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onGameEnd}
          className="flex items-center gap-2 text-white font-semibold hover:opacity-80 transition-opacity"
        >
          <ChevronLeft size={24} />
          Terminar
        </button>
        <p className="text-white font-semibold">
          Jugador {currentPlayerIndex + 1} de {totalPlayers}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 text-center">
            <p className="text-veggie-text text-sm mb-2">Es el turno de:</p>
            <h1 className="text-4xl font-bold text-veggie-dark">{currentPlayer.name}</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-12 mb-6 text-center min-h-64 flex flex-col items-center justify-center gap-6">
            {revealState === "hidden" && (
              <>
                <div className="text-6xl">👀</div>
                <p className="text-veggie-text">¿Estás seguro de que nadie está mirando?</p>
                <button
                  onClick={handleReveal}
                  className="bg-veggie-orange text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 hover:bg-veggie-orange-dark transition-colors"
                >
                  <Eye size={20} />
                  Ver palabra
                </button>
              </>
            )}

            {revealState === "revealing" && (
              <>
                <div className="space-y-4">
                  {currentPlayer.isImpostor ? (
                    <>
                      <div className="text-6xl mb-2">🕵️</div>
                      <p className="text-2xl font-bold text-red-600">IMPOSTOR</p>
                      <p className="text-veggie-text">No sabes la palabra. ¡Intenta engañar!</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-2">💚</div>
                      <p className="text-lg font-semibold text-veggie-text">Tu palabra es:</p>
                      <p className="text-5xl font-bold text-veggie-green">{currentPlayer.word}</p>
                    </>
                  )}
                </div>
                {timerActive && <GameTimer duration={3} onEnd={handleTimerEnd} />}
              </>
            )}

            {revealState === "options" && (
              <div className="space-y-6 w-full text-center">
                <div className="text-5xl">✅</div>
                <p className="text-veggie-text">
                  ¿Querés volver a ver la palabra o pasamos al siguiente jugador?
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleViewAgain}
                    className="w-full bg-veggie-orange text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-veggie-orange-dark transition-colors"
                  >
                    <Repeat size={20} />
                    Ver palabra de nuevo
                  </button>
                  <button
                    onClick={goToNextPlayer}
                    className="w-full bg-veggie-green text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-veggie-green-dark transition-colors"
                  >
                    <SkipForward size={20} />
                    Pasar al siguiente jugador
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
