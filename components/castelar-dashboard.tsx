"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trophy, Users } from "lucide-react"

import {
  addCastelarPlayer,
  fetchCastelarPlayers,
  upsertCastelarPlayers,
} from "@/lib/castelar-service"
import {
  CastelarPlayer,
  getStageLabel,
  processMatchResult,
  sortByWinRate,
} from "@/lib/castelar-logic"

const TEAM_SIZE = 5

type Team = "A" | "B"

interface CastelarDashboardProps {
  remoteEnabled: boolean
}

export function CastelarDashboard({ remoteEnabled }: CastelarDashboardProps) {
  const [players, setPlayers] = useState<CastelarPlayer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [teamA, setTeamA] = useState<(string | null)[]>(Array(TEAM_SIZE).fill(null))
  const [teamB, setTeamB] = useState<(string | null)[]>(Array(TEAM_SIZE).fill(null))
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (!remoteEnabled) {
      setError("Necesitamos conexión a Supabase para usar Castelar.")
      return
    }

    const loadPlayers = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchCastelarPlayers()
        setPlayers(result)
      } catch (err) {
        console.error("[castelar] fetch error", err)
        setError("No pudimos cargar los jugadores.")
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [remoteEnabled])

  const winRateTable = useMemo(() => sortByWinRate(players), [players])

  const resetSelections = () => {
    setTeamA(Array(TEAM_SIZE).fill(null))
    setTeamB(Array(TEAM_SIZE).fill(null))
  }

  const handleAddPlayer = async () => {
    const trimmed = newPlayerName.trim()
    if (!trimmed) return

    try {
      setError(null)
      const created = await addCastelarPlayer(trimmed)
      setPlayers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })))
      setNewPlayerName("")
      setSuccessMessage(`Jugador ${trimmed} agregado.`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error("[castelar] add player error", err)
      setError("No pudimos agregar el jugador.")
    }
  }

  const handleSelectChange = (team: Team, index: number, value: string) => {
    if (team === "A") {
      const next = [...teamA]
      next[index] = value || null
      setTeamA(next)
    } else {
      const next = [...teamB]
      next[index] = value || null
      setTeamB(next)
    }
  }

  const handleRecordMatch = async (winner: Team) => {
    setError(null)
    setSuccessMessage(null)

    const selectedA = teamA.filter((id): id is string => Boolean(id))
    const selectedB = teamB.filter((id): id is string => Boolean(id))

    if (selectedA.length !== TEAM_SIZE || selectedB.length !== TEAM_SIZE) {
      setError("Cada equipo debe tener 5 jugadores.")
      return
    }

    const combined = [...selectedA, ...selectedB]
    const unique = new Set(combined)
    if (unique.size !== combined.length) {
      setError("No puedes repetir jugadores entre los equipos.")
      return
    }

    const winners = winner === "A" ? selectedA : selectedB
    const losers = winner === "A" ? selectedB : selectedA

    setRecording(true)
    try {
      const updates = processMatchResult(players, winners, losers)
      await upsertCastelarPlayers(updates)
      const refreshed = await fetchCastelarPlayers()
      setPlayers(refreshed)
      resetSelections()
      setSuccessMessage("Partido registrado con éxito.")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error("[castelar] record match error", err)
      setError("No pudimos registrar el partido.")
    } finally {
      setRecording(false)
    }
  }

  if (!remoteEnabled) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-bold text-veggie-dark mb-4">Castelar</h1>
          <p className="text-veggie-text">
            Necesitas configurar Supabase para usar el registro de partidos.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light p-4 space-y-6">
      <header className="bg-white rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-veggie-dark flex items-center gap-2">
              ⚽ Castelar
            </h1>
            <p className="text-veggie-text mt-1">
              Registro de partidos y progreso del Mundial individual.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Nombre del jugador"
              className="px-4 py-2 rounded-xl border border-veggie-green focus:outline-none focus:ring-2 focus:ring-veggie-green"
            />
            <button
              onClick={handleAddPlayer}
              className="bg-veggie-orange text-white font-semibold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-veggie-orange-dark transition-colors"
            >
              <Plus size={18} />
              Agregar jugador
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 mt-4 p-3 rounded-xl">{error}</p>}
        {successMessage && (
          <p className="text-sm text-veggie-green bg-veggie-light mt-4 p-3 rounded-xl">{successMessage}</p>
        )}
      </header>

      <section className="bg-white rounded-3xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-veggie-dark mb-4 flex items-center gap-2">
          <Users size={22} />
          Registrar partido
        </h2>

        <p className="text-sm text-veggie-text mb-6">
          Elegí 5 jugadores por equipo y marca cuál ganó. Los progresos del Mundial y los récords se
          actualizan automáticamente.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TeamSelector
            label="Equipo A"
            players={players}
            selections={teamA}
            onChange={(index, value) => handleSelectChange("A", index, value)}
          />
          <TeamSelector
            label="Equipo B"
            players={players}
            selections={teamB}
            onChange={(index, value) => handleSelectChange("B", index, value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleRecordMatch("A")}
            disabled={recording || loading}
            className="flex-1 bg-veggie-green text-white font-bold py-3 rounded-xl hover:bg-veggie-green-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Ganó Equipo A
          </button>
          <button
            onClick={() => handleRecordMatch("B")}
            disabled={recording || loading}
            className="flex-1 bg-veggie-orange text-white font-bold py-3 rounded-xl hover:bg-veggie-orange-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Ganó Equipo B
          </button>
        </div>
      </section>

      <section className="bg-white rounded-3xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-veggie-dark mb-4 flex items-center gap-2">
          <Trophy size={22} />
          Progreso del Mundial
        </h2>

        {loading ? (
          <p className="text-veggie-text">Cargando jugadores...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-veggie-text uppercase text-xs tracking-wide border-b">
                  <th className="py-3">Jugador</th>
                  <th className="py-3">Fase</th>
                  <th className="py-3 text-center">Campeón</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b last:border-0">
                    <td className="py-3 font-semibold text-veggie-dark">{player.name}</td>
                    <td className="py-3 text-veggie-text">{getStageLabel(player)}</td>
                    <td className="py-3 text-center font-bold text-veggie-green">{player.championships}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-veggie-dark mb-4">Tabla histórica</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-veggie-text uppercase text-xs tracking-wide border-b">
                <th className="py-3">Jugador</th>
                <th className="py-3 text-center">Récord (V-D)</th>
                <th className="py-3 text-center">% Victorias</th>
                <th className="py-3 text-center">Partidos</th>
              </tr>
            </thead>
            <tbody>
              {winRateTable.map((player) => {
                const total = player.wins + player.losses
                const percentile = total === 0 ? 0 : (player.wins / total) * 100
                return (
                  <tr key={`table-${player.id}`} className="border-b last:border-0">
                    <td className="py-3 font-semibold text-veggie-dark">{player.name}</td>
                    <td className="py-3 text-center text-veggie-text">
                      {player.wins}-{player.losses}
                    </td>
                    <td className="py-3 text-center font-bold text-veggie-green">
                      {percentile.toFixed(1)}%
                    </td>
                    <td className="py-3 text-center text-veggie-text">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

interface TeamSelectorProps {
  label: string
  players: CastelarPlayer[]
  selections: (string | null)[]
  onChange: (index: number, value: string) => void
}

function TeamSelector({ label, players, selections, onChange }: TeamSelectorProps) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-veggie-dark mb-4">{label}</h3>
      <div className="space-y-3">
        {selections.map((selected, index) => (
          <select
            key={`${label}-${index}`}
            value={selected ?? ""}
            onChange={(e) => onChange(index, e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-veggie-green focus:outline-none focus:ring-2 focus:ring-veggie-green"
          >
            <option value="">Seleccionar jugador</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        ))}
      </div>
    </div>
  )
}

