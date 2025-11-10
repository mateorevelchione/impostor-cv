"use client"

import { useState, useEffect } from "react"
import { GameSetup } from "@/components/game-setup"
import { GameScreen } from "@/components/game-screen"
import { PlayerManagement } from "@/components/player-management"
import { CastelarView } from "@/components/castelar-view"
import { pickSecretPerson } from "@/lib/game-logic"
import { isSupabaseReady } from "@/lib/supabase-client"
import {
  fetchPeopleFromRemote,
  addPersonRemote,
  deletePersonRemote,
  bulkInsertPeopleRemote,
} from "@/lib/people-service"

export default function Home() {
  const [people, setPeople] = useState<Array<{ id: string; name: string }>>([])
  const [gameState, setGameState] = useState<"menu" | "setup" | "playing" | "people" | "castelar">("menu")
  const [gameConfig, setGameConfig] = useState<{
    playerCount: number
    impostorCount: number
    secretWord: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const remoteEnabled = isSupabaseReady()
  const generateLocalId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`

  useEffect(() => {
    async function loadPeople() {
      setLoading(true)
      setError(null)

      if (remoteEnabled) {
        try {
          const remotePeople = await fetchPeopleFromRemote()

          if (remotePeople.length === 0) {
            const response = await fetch("/initial-data.json")
            const json = await response.json()
            const seedPayload = json
              .map((person: { username?: string; name?: string }) => (person.username || person.name || "").trim())
              .filter((name: string) => name.length > 0)
              .map((name: string) => ({ name }))

            if (seedPayload.length > 0) {
              await bulkInsertPeopleRemote(seedPayload)
              const refreshed = await fetchPeopleFromRemote()
              setPeople(refreshed)
            } else {
              setPeople([])
            }
          } else {
            setPeople(remotePeople)
          }

          return
        } catch (remoteError) {
          console.error("[remote] Error fetching people:", remoteError)
          setError("No pudimos sincronizar con la base online. Usaremos los datos locales.")
        }
      }

      // Local fallback
      const savedPeople = localStorage.getItem("impostor_cv_people")

      if (savedPeople) {
        try {
          const parsed = JSON.parse(savedPeople)
          setPeople(parsed)
          return
        } catch (parseError) {
          console.error("[local] Error parsing people:", parseError)
        }
      }

      try {
        const response = await fetch("/initial-data.json")
        const json = await response.json()
        const fallbackPeople = json.map((person: { username?: string; name?: string }, index: number) => ({
          id: `initial_${index}`,
          name: person.username || person.name || "",
        }))
        setPeople(fallbackPeople)
        localStorage.setItem("impostor_cv_people", JSON.stringify(fallbackPeople))
      } catch (fallbackError) {
        console.error("[fallback] Error loading initial data:", fallbackError)
        setError("No pudimos cargar la base de personas.")
      } finally {
        setLoading(false)
      }
    }

    loadPeople().finally(() => setLoading(false))
  }, [remoteEnabled])

  useEffect(() => {
    if (people.length > 0) {
      console.log("[v0] Saving people to localStorage:", people)
      localStorage.setItem("impostor_cv_people", JSON.stringify(people))
    }
  }, [people])

  const handleStartGame = (playerCount: number, impostorCount: number) => {
    const secretPerson = pickSecretPerson(people)

    if (!secretPerson) {
      setGameState("people")
      return
    }

    const secretWord = secretPerson.name.trim() || "Veggie"

    setGameConfig({
      playerCount,
      impostorCount,
      secretWord,
    })
    setGameState("playing")
  }

  const handleAddPerson = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      setError(null)
      if (remoteEnabled) {
        const created = await addPersonRemote(trimmed)
        setPeople((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })))
      } else {
        const newPerson = {
          id: generateLocalId(),
          name: trimmed,
        }
        setPeople((prev) => [...prev, newPerson].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })))
      }
    } catch (e) {
      console.error("Error adding person:", e)
      setError("No se pudo agregar la persona. Intenta de nuevo.")
    }
  }

  const handleDeletePerson = async (id: string) => {
    try {
      setError(null)
      if (remoteEnabled) {
        await deletePersonRemote(id)
      }
      setPeople((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      console.error("Error deleting person:", e)
      setError("No se pudo eliminar la persona.")
    }
  }

  const handleImportJSON = async (jsonData: Array<{ id: string; name: string }>) => {
    const sanitized = jsonData
      .map((person) => ({
        id: person.id || generateLocalId(),
        name: (person.name || "").trim(),
      }))
      .filter((person) => person.name.length > 0)

    try {
      setError(null)
      if (remoteEnabled) {
        const payload = sanitized.map(({ name }) => ({ name }))
        await bulkInsertPeopleRemote(payload)
        const remotePeople = await fetchPeopleFromRemote()
        setPeople(remotePeople)
      } else {
        setPeople((prev) => [...prev, ...sanitized].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })))
      }
    } catch (e) {
      console.error("Error importing JSON:", e)
      setError("No se pudo importar el JSON.")
    }
  }

  const handleBackToMenu = () => {
    setGameState("menu")
    setError(null)
  }

  const handleOpenPeople = () => {
    setError(null)
    setGameState("people")
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-lg font-semibold text-veggie-dark">Cargando base de jugadores...</p>
        </div>
      </main>
    )
  }

  if (gameState === "menu") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-6">
          <header className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl px-6 py-7 text-center">
            <div className="text-5xl mb-3">🌱</div>
            <h1 className="text-3xl font-bold text-veggie-dark mb-1">Comunidad Veggie</h1>
            <p className="text-veggie-text text-base">Elegí la actividad para comenzar.</p>
          </header>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setGameState("castelar")}
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg px-5 py-6 text-left hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className="text-5xl mb-4">⚽️</div>
              <h2 className="text-2xl font-bold text-veggie-dark mb-2">Castelar</h2>
              {!remoteEnabled && (
                <span className="text-xs text-red-500 font-semibold block mt-3">
                  Requiere Supabase habilitado.
                </span>
              )}
            </button>

            <button
              onClick={() => setGameState("setup")}
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg px-5 py-6 text-left hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <div className="text-5xl mb-4">🕹️</div>
              <h2 className="text-2xl font-bold text-veggie-dark mb-2">Impostor</h2>
              <span className="text-sm text-veggie-dark font-semibold">Personas disponibles: {people.length}</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 shadow-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </main>
    )
  }

  if (gameState === "setup") {
    return (
      <GameSetup
        availableWords={people.length}
        onStartGame={handleStartGame}
        onBack={handleBackToMenu}
        onManagePeople={handleOpenPeople}
      />
    )
  }

  if (gameState === "castelar") {
    return <CastelarView onBack={handleBackToMenu} remoteEnabled={remoteEnabled} />
  }

  if (gameState === "people") {
    return (
      <PlayerManagement
        people={people}
        onAddPerson={handleAddPerson}
        onDeletePerson={handleDeletePerson}
        onImportJSON={handleImportJSON}
        onBack={handleBackToMenu}
        errorMessage={error}
        remoteEnabled={remoteEnabled}
      />
    )
  }

  if (gameState === "playing" && gameConfig) {
    return <GameScreen config={gameConfig} onGameEnd={handleBackToMenu} />
  }

  return null
}
