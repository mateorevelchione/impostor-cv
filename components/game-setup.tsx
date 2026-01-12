"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ChevronLeft, Lock } from "lucide-react"
import { ADMIN_PIN } from "@/lib/config"

interface GameSetupProps {
  availableWords: number
  onStartGame: (playerCount: number, impostorCount: number) => void
  onBack: () => void
  onManagePeople?: () => void
}

const MIN_PLAYERS = 3
const MAX_PLAYERS = 24
const MIN_IMPOSTORS = 1

export function GameSetup({ availableWords, onStartGame, onBack, onManagePeople }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState(6)
  const [impostorCount, setImpostorCount] = useState(1)
  const [errors, setErrors] = useState<string[]>([])
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState("")
  const [showPinModal, setShowPinModal] = useState(false)

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

  const handleConfirmPin = () => {
    if (pinInput.trim() === ADMIN_PIN) {
      setShowPinModal(false)
      setPinInput("")
      setPinError(null)
      onManagePeople?.()
    } else {
      setPinError("PIN incorrecto.")
    }
  }

  const handleCloseModal = () => {
    setShowPinModal(false)
    setPinInput("")
    setPinError(null)
  }

  return (
    <>
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

            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </p>
            ))}

            <button
              onClick={handleStartGame}
              className="w-full bg-veggie-green text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-green-dark transition-colors"
            >
              Iniciar Juego
            </button>

              {onManagePeople && (
                <button
                  onClick={() => {
                    setPinError(null)
                    setPinInput("")
                    setShowPinModal(true)
                  }}
                  className="w-full bg-veggie-orange text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-veggie-orange-dark transition-colors"
                >
                  <Lock size={18} />
                  Gestionar Personas
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Lock className="text-veggie-green" />
              <h2 className="text-xl font-bold text-veggie-dark">Ingresá el PIN</h2>
            </div>
            <p className="text-sm text-veggie-text">
              Solo miembros autorizados pueden gestionar la base de personas del juego.
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-veggie-green focus:outline-none focus:border-veggie-orange"
              placeholder="PIN"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleConfirmPin()
                }
              }}
            />
            {pinError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{pinError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleConfirmPin}
                className="flex-1 bg-veggie-green text-white font-bold py-3 rounded-xl hover:bg-veggie-green-dark transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
          </div>
        </div>
      </div>
      )}
    </>
  )
}
