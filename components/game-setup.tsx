"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ChevronLeft } from "lucide-react"

interface GameSetupProps {
  availableWords: number
  onStartGame: (playerCount: number, impostorCount: number) => void
  onBack: () => void
}

const MIN_PLAYERS = 3
const MAX_PLAYERS = 24
const MIN_IMPOSTORS = 1

export function GameSetup({ availableWords, onStartGame, onBack }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState(6)
  const [impostorCount, setImpostorCount] = useState(1)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (impostorCount >= playerCount) {
      setImpostorCount(Math.max(playerCount - 1, MIN_IMPOSTORS))
    }
  }, [playerCount, impostorCount])

  const incrementPlayers = () => {
    setPlayerCount((prev) => Math.min(prev + 1, MAX_PLAYERS))
  }

  const decrementPlayers = () => {
    setPlayerCount((prev) => Math.max(prev - 1, MIN_PLAYERS))
  }

  const incrementImpostors = () => {
    setImpostorCount((prev) => Math.min(prev + 1, playerCount - 1))
  }

  const decrementImpostors = () => {
    setImpostorCount((prev) => Math.max(prev - 1, MIN_IMPOSTORS))
  }

  const handleStartGame = () => {
    const newErrors: string[] = []

    if (playerCount < MIN_PLAYERS) {
      newErrors.push(`Necesitas al menos ${MIN_PLAYERS} jugadores`)
    }
    if (impostorCount < MIN_IMPOSTORS) {
      newErrors.push(`Necesitas al menos ${MIN_IMPOSTORS} impostor`)
    }
    if (impostorCount >= playerCount) {
      newErrors.push("Debe haber más jugadores que impostores")
    }
    if (availableWords === 0) {
      newErrors.push("Agrega al menos una persona a la base antes de jugar")
    }

    if (newErrors.length === 0) {
      onStartGame(playerCount, impostorCount)
    } else {
      setErrors(newErrors)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light p-4 flex flex-col">
      <button
        onClick={onBack}
        className="self-start mb-6 flex items-center gap-2 text-white font-semibold hover:opacity-80 transition-opacity"
      >
        <ChevronLeft size={24} />
        Volver
      </button>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-veggie-dark mb-4 text-center">Configurar Juego</h1>
          <p className="text-center text-sm text-veggie-text mb-6">
            Personas disponibles en la base: <span className="font-semibold text-veggie-dark">{availableWords}</span>
          </p>

          <div className="space-y-10">
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-veggie-dark text-center">
                Cantidad de jugadores
              </label>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={decrementPlayers}
                  disabled={playerCount <= MIN_PLAYERS}
                  className="w-14 h-14 rounded-full bg-veggie-light border-2 border-veggie-green text-3xl font-bold text-veggie-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Disminuir jugadores"
                >
                  −
                </button>
                <span className="text-5xl font-bold text-veggie-dark w-16 text-center">{playerCount}</span>
                <button
                  onClick={incrementPlayers}
                  disabled={playerCount >= MAX_PLAYERS}
                  className="w-14 h-14 rounded-full bg-veggie-light border-2 border-veggie-green text-3xl font-bold text-veggie-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Aumentar jugadores"
                >
                  +
                </button>
              </div>
              <p className="text-center text-xs text-veggie-text">
                Máximo recomendado: {MAX_PLAYERS} jugadores
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-lg font-semibold text-veggie-dark text-center">
                Cantidad de impostores
              </label>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={decrementImpostors}
                  disabled={impostorCount <= MIN_IMPOSTORS}
                  className="w-14 h-14 rounded-full bg-veggie-light border-2 border-veggie-orange text-3xl font-bold text-veggie-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Disminuir impostores"
                >
                  −
                </button>
                <span className="text-5xl font-bold text-veggie-dark w-16 text-center">{impostorCount}</span>
                <button
                  onClick={incrementImpostors}
                  disabled={impostorCount >= playerCount - 1}
                  className="w-14 h-14 rounded-full bg-veggie-light border-2 border-veggie-orange text-3xl font-bold text-veggie-dark disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Aumentar impostores"
                >
                  +
                </button>
              </div>
              <p className="text-center text-xs text-veggie-text">
                Siempre tiene que haber al menos un jugador honesto
              </p>
            </div>

            {/* Error Messages */}
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            ))}

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="w-full bg-veggie-green text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-green-dark transition-colors"
            >
              Iniciar Juego
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
