"use client"

import { useState, useEffect } from "react"
import { GameSetup } from "@/components/game-setup"
import { GameScreen } from "@/components/game-screen"
import { PlayerManagement } from "@/components/player-management"
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
  const [gameState, setGameState] = useState<"menu" | "setup" | "playing" | "people">("menu")
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
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            <div className="mb-8">
              <div className="text-6xl mb-4">🥬🍅</div>
              <h1 className="text-4xl font-bold text-veggie-dark mb-2">Impostor CV</h1>
              <p className="text-veggie-text text-lg">Comunidad Veggie</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setGameState("setup")}
                className="w-full bg-veggie-green text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-green-dark transition-colors"
              >
                Jugar
              </button>
              <button
                onClick={() => setGameState("people")}
                className="w-full bg-veggie-orange text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-orange-dark transition-colors"
              >
                Gestionar Personas
              </button>
            </div>

            <p className="text-sm text-veggie-text mt-6">Personas disponibles: {people.length}</p>
            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          </div>
        </div>
      </main>
    )
  }

  if (gameState === "setup") {
    return <GameSetup availableWords={people.length} onStartGame={handleStartGame} onBack={handleBackToMenu} />
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
