"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, Loader2, Plus, Repeat, Shield, Trophy, Users2, X } from "lucide-react"
import {
  addCastelarPlayer,
  deleteCastelarPlayer,
  fetchCastelarPlayers,
  submitCastelarMatch,
  CastelarPlayerRow,
  saveCastelarPlayer,
} from "@/lib/castelar-service"
import { CastelarPlayer, formatPhaseLabel, computeWinPercentage } from "@/lib/castelar-logic"
import { ADMIN_PIN } from "@/lib/config"

interface CastelarViewProps {
  onBack: () => void
  remoteEnabled: boolean
}


function sortByWinPercentage(players: CastelarPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (b.wins === a.wins) {
      return b.winPercentage - a.winPercentage
    }
    return b.wins - a.wins
  })
}

function toCastelarPlayer(row: CastelarPlayerRow): CastelarPlayer {
  const { phaseLabel: _phase, winPercentage: _pct, record: _record, ...rest } = row
  return rest
}

export function CastelarView({ onBack, remoteEnabled }: CastelarViewProps) {
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newPlayerName, setNewPlayerName] = useState("")
  const [savingPlayer, setSavingPlayer] = useState(false)
  const [selectedWinners, setSelectedWinners] = useState<string[]>([])
  const [selectedLosers, setSelectedLosers] = useState<string[]>([])
  const [submittingMatch, setSubmittingMatch] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinModalError, setPinModalError] = useState<string | null>(null)
  const [matchMode, setMatchMode] = useState<"teams" | "individual">("teams")

  useEffect(() => {
    if (!remoteEnabled) {
      setLoading(false)
      setError("Necesitas Supabase configurado para usar Castelar.")
      return
    }

    fetchCastelarPlayers()
      .then((rows) => {
        setPlayers(rows)
        setError(null)
      })
      .catch((err) => {
        console.error("[castelar] Error fetching players:", err)
        setError("No pudimos cargar los datos. Intenta de nuevo.")
      })
      .finally(() => setLoading(false))
  }, [remoteEnabled])

  const standings = useMemo(() => sortByWinPercentage(players), [players])

  const phaseSummary = useMemo(() => {
    return players.map((player) => ({
      id: player.id,
      name: player.name,
      phaseLabel: player.phaseLabel,
      championships: player.championships,
    }))
  }, [players])

  const canRemoveWin = (player: CastelarPlayerRow) => player.wins > 0

  const canRemoveLoss = (player: CastelarPlayerRow) => player.losses > 0

  const canSubmitMatch =
    matchMode === "teams" &&
    selectedWinners.length > 0 &&
    selectedLosers.length > 0 &&
    selectedWinners.every((id) => !selectedLosers.includes(id)) &&
    !submittingMatch

  const handleAddPlayer = async () => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    const trimmed = newPlayerName.trim()
    if (!trimmed || savingPlayer) return
    setSavingPlayer(true)
    setError(null)
    try {
      const created = await addCastelarPlayer(trimmed)
      setPlayers((prev) => [...prev, created])
      setNewPlayerName("")
    } catch (err) {
      console.error("[castelar] Error adding player:", err)
      setError("No se pudo agregar el jugador. ¿Ya existe?")
    } finally {
      setSavingPlayer(false)
    }
  }

  const handleDeletePlayer = async (id: string) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    if (savingPlayer || submittingMatch) return
    if (!confirm("¿Seguro que querés eliminar a este jugador?")) return

    try {
      await deleteCastelarPlayer(id)
      setPlayers((prev) => prev.filter((p) => p.id !== id))
      setSelectedWinners((prev) => prev.filter((pid) => pid !== id))
      setSelectedLosers((prev) => prev.filter((pid) => pid !== id))
    } catch (err) {
      console.error("[castelar] Error deleting player:", err)
      setError("No se pudo eliminar al jugador.")
    }
  }

  const handleSubmitMatch = async () => {
    if (matchMode !== "teams") return
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    if (!canSubmitMatch) return

    setSubmittingMatch(true)
    setError(null)

    try {
      const winners = selectedWinners
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean)
        .map((row) => toCastelarPlayer(row as CastelarPlayerRow))
      const losers = selectedLosers
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean)
        .map((row) => toCastelarPlayer(row as CastelarPlayerRow))

      const result = await submitCastelarMatch({ winningTeam: winners, losingTeam: losers })
      const updates = [...result.winners, ...result.losers]

      setPlayers((prev) =>
        prev.map((player) => {
          const updated = updates.find((p) => p.id === player.id)
          if (!updated) return player
          return {
            ...player,
            ...updated,
            phaseLabel: formatPhaseLabel(updated),
            winPercentage: computeWinPercentage(updated),
            record: `${updated.wins}-${updated.losses}`,
          }
        }),
      )

      setSelectedWinners([])
      setSelectedLosers([])
    } catch (err) {
      console.error("[castelar] Error submitting match:", err)
      setError("No se pudo registrar el partido.")
    } finally {
      setSubmittingMatch(false)
    }
  }

  const openPinModal = () => {
    setPinModalError(null)
    setPinInput("")
    setShowPinModal(true)
  }

  const closePinModal = () => {
    setShowPinModal(false)
    setPinInput("")
    setPinModalError(null)
  }

  const handleUnlock = () => {
    if (pinInput.trim() === ADMIN_PIN) {
      setAdminUnlocked(true)
      closePinModal()
      setError(null)
    } else {
      setPinModalError("PIN incorrecto.")
    }
  }

  useEffect(() => {
    if (matchMode !== "teams") {
      setSelectedWinners([])
      setSelectedLosers([])
    }
  }, [matchMode])

  const handleWinnerToggle = (id: string) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    setSelectedWinners((prev) => {
      const exists = prev.includes(id)
      if (!exists && prev.length >= TEAM_SIZE) {
        return prev
      }
      const next = exists ? prev.filter((pid) => pid !== id) : [...prev, id]
      if (!exists) {
        setSelectedLosers((prevLosers) => prevLosers.filter((pid) => pid !== id))
      }
      return next
    })
  }

  const handleLoserToggle = (id: string) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    setSelectedLosers((prev) => {
      const exists = prev.includes(id)
      if (!exists && prev.length >= TEAM_SIZE) {
        return prev
      }
      const next = exists ? prev.filter((pid) => pid !== id) : [...prev, id]
      if (!exists) {
        setSelectedWinners((prevWinners) => prevWinners.filter((pid) => pid !== id))
      }
      return next
    })
  }

  const handleIndividualResult = async (playerId: string, didWin: boolean) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    if (submittingMatch) return

    const playerRow = players.find((p) => p.id === playerId)
    if (!playerRow) return

    setSubmittingMatch(true)
    setError(null)

    try {
      const payloadPlayer = toCastelarPlayer(playerRow)
      const { winners, losers } = await submitCastelarMatch({
        winningTeam: didWin ? [payloadPlayer] : [],
        losingTeam: !didWin ? [payloadPlayer] : [],
      })

      const updates = [...winners, ...losers]
      setPlayers((prev) =>
        prev.map((player) => {
          const updated = updates.find((p) => p.id === player.id)
          if (!updated) return player
          return {
            ...player,
            ...updated,
            phaseLabel: formatPhaseLabel(updated),
            winPercentage: computeWinPercentage(updated),
            record: `${updated.wins}-${updated.losses}`,
          }
        }),
      )
    } catch (err) {
      console.error("[castelar] Error updating player:", err)
      setError("No se pudo actualizar el jugador.")
    } finally {
      setSubmittingMatch(false)
    }
  }

  const handleManualAdjustment = async (playerId: string, didWin: boolean) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    if (submittingMatch) return

    const playerRow = players.find((p) => p.id === playerId)
    if (!playerRow) return
    const player = toCastelarPlayer(playerRow)

    if (didWin) {
      if (player.wins <= 0) {
        return
      }
      player.wins = Math.max(0, player.wins - 1)
      if (player.stageIndex === 0) {
        player.groupWins = Math.max(0, player.groupWins - 1)
      } else {
        player.stageIndex = Math.max(0, player.stageIndex - 1)
        if (player.stageIndex === 0) {
          player.groupWins = Math.max(0, player.groupWins - 1)
        }
      }
    } else {
      if (player.losses <= 0) {
        return
      }
      player.losses = Math.max(0, player.losses - 1)
      if (player.stageIndex === 0) {
        player.groupLosses = Math.max(0, player.groupLosses - 1)
      } else {
        player.stageIndex = Math.max(0, player.stageIndex - 1)
      }
    }

    const totalGroupMatches = player.groupWins + player.groupLosses

    player.groupWins = Math.max(0, Math.min(player.groupWins, 3))
    player.groupLosses = Math.max(0, Math.min(player.groupLosses, 3))

  if (totalGroupMatches >= 3) {
    if (player.groupWins >= 2) {
      player.stageIndex = 1
    } else {
      player.stageIndex = 0
    }
  } else {
      player.stageIndex = 0
    }

    if (player.stageIndex === 0 && player.groupWins === 0 && player.groupLosses === 0 && player.wins === 0 && player.losses === 0) {
      player.championships = Math.max(0, player.championships)
    }

    setSubmittingMatch(true)
    setError(null)

    try {
      await saveCastelarPlayer(player)
      const updatedRow: CastelarPlayerRow = {
        ...playerRow,
        ...player,
        phaseLabel: formatPhaseLabel(player),
        winPercentage: computeWinPercentage(player),
        record: `${player.wins}-${player.losses}`,
      }
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? updatedRow : p)))
    } catch (err) {
      console.error("[castelar] Error ajustando jugador:", err)
      setError("No se pudo ajustar el jugador.")
    } finally {
      setSubmittingMatch(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-veggie-green to-veggie-light p-4 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white mb-4" />
        <p className="text-white font-semibold">Cargando Castelar...</p>
      </main>
    )
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

        <div className="w-full max-w-5xl mx-auto flex-1 space-y-8">
          <header className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⚽️</span>
                <h1 className="text-3xl font-bold text-veggie-dark">Castelar</h1>
              </div>
              {remoteEnabled && (
                <div className="flex items-center gap-3 text-sm">
                  {adminUnlocked && <span className="text-veggie-green font-semibold">Modo edición desbloqueado.</span>}
                  {!adminUnlocked && (
                    <button
                      onClick={openPinModal}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-veggie-orange text-white font-semibold hover:bg-veggie-orange-dark transition-colors"
                    >
                      Ingresar PIN
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {!remoteEnabled && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                  Configura Supabase para habilitar esta sección.
                </p>
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => {
                    if (!remoteEnabled) return
                    if (!adminUnlocked) {
                      openPinModal()
                      return
                    }
                    setShowMatchForm(false)
                    setShowAddForm((prev) => !prev)
                  }}
                  className="px-4 py-2 rounded-xl bg-veggie-green text-white font-semibold hover:bg-veggie-green-dark transition-colors disabled:opacity-50"
                  disabled={!remoteEnabled}
                >
                  {showAddForm ? "Cerrar agregar jugador" : "Agregar jugador"}
                </button>
                <button
                  onClick={() => {
                    if (!remoteEnabled) return
                    if (!adminUnlocked) {
                      openPinModal()
                      return
                    }
                    setShowAddForm(false)
                    setShowMatchForm((prev) => !prev)
                  }}
                  className="px-4 py-2 rounded-xl bg-veggie-orange text-white font-semibold hover:bg-veggie-orange-dark transition-colors disabled:opacity-50"
                  disabled={!remoteEnabled}
                >
                  {showMatchForm ? "Cerrar registrar partido" : "Registrar partido"}
                </button>
              </div>
            </div>
          </header>

          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-2xl">
              {error}
            </div>
          )}

          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield size={18} className="text-veggie-green" />
                <h2 className="text-xl font-bold text-veggie-dark">Mundial</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-veggie-text">
                    <tr>
                      <th className="py-3 pr-4 text-left font-semibold">Jugador</th>
                      <th className="py-3 pr-4 text-left font-semibold">Fase</th>
                      <th className="py-3 text-right font-semibold">Campeonatos</th>
                      {adminUnlocked && <th className="py-3 text-right font-semibold">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-veggie-light">
                    {phaseSummary.length === 0 ? (
                      <tr>
                        <td colSpan={adminUnlocked ? 4 : 3} className="py-6 text-center text-veggie-text">
                          Agregá jugadores para comenzar el mundial.
                        </td>
                      </tr>
                    ) : (
                      phaseSummary.map((player) => (
                        <tr key={player.id} className="hover:bg-veggie-light/60 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-veggie-dark">{player.name}</td>
                          <td className="py-3 pr-4 text-veggie-text">{player.phaseLabel}</td>
                          <td className="py-3 text-right text-veggie-green font-semibold">{player.championships}</td>
                          {adminUnlocked && (
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeletePlayer(player.id)}
                                className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors"
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-veggie-orange" />
                <h2 className="text-xl font-bold text-veggie-dark">Tabla de victorias</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-xs uppercase text-veggie-text">
                    <tr>
                      <th className="py-3 pr-4 text-left font-semibold">#</th>
                      <th className="py-3 pr-4 text-left font-semibold">Jugador</th>
                      <th className="py-3 pr-4 text-left font-semibold">Record</th>
                      <th className="py-3 text-right font-semibold">% Victorias</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-veggie-light">
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-veggie-text">
                          Aún no hay partidos registrados.
                        </td>
                      </tr>
                    ) : (
                      standings.map((player, index) => (
                        <tr key={player.id} className="hover:bg-veggie-light/60 transition-colors">
                          <td className="py-3 pr-4 font-semibold text-veggie-orange">{index + 1}</td>
                          <td className="py-3 pr-4 font-semibold text-veggie-dark">{player.name}</td>
                          <td className="py-3 pr-4 text-veggie-text">{player.record}</td>
                          <td className="py-3 text-right text-veggie-green font-semibold">
                            {player.winPercentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {showAddForm && (
            <section className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-veggie-dark">Agregar jugador</h2>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewPlayerName("")
                  }}
                  className="text-sm text-veggie-text hover:text-veggie-dark transition-colors"
                >
                  Cancelar
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:items-center">
                <input
                  value={newPlayerName}
                  onChange={(event) => setNewPlayerName(event.target.value)}
                  placeholder="Nombre del jugador"
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-veggie-green focus:outline-none focus:border-veggie-orange"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleAddPlayer()
                    }
                  }}
                />
                <button
                  onClick={handleAddPlayer}
                  disabled={savingPlayer || !newPlayerName.trim()}
                  className="bg-veggie-green text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:bg-veggie-green-dark transition-colors disabled:opacity-50"
                >
                  {savingPlayer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={18} />}
                  Guardar jugador
                </button>
              </div>
            </section>
          )}

          {showMatchForm && (
            <section className="bg-white rounded-3xl shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Repeat className="text-veggie-green" />
                  <h2 className="text-2xl font-bold text-veggie-dark">Registrar partido</h2>
                </div>
                <button
                  onClick={() => {
                    setShowMatchForm(false)
                    setSelectedWinners([])
                    setSelectedLosers([])
                  }}
                  className="text-sm text-veggie-text hover:text-veggie-dark transition-colors"
                >
                  Cancelar
                </button>
              </div>

              <div className="flex items-center gap-3 bg-veggie-light rounded-2xl p-2">
                <button
                  onClick={() => setMatchMode("teams")}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    matchMode === "teams" ? "bg-white text-veggie-dark shadow" : "text-veggie-text"
                  }`}
                >
                  Equipos
                </button>
                <button
                  onClick={() => setMatchMode("individual")}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                    matchMode === "individual" ? "bg-white text-veggie-dark shadow" : "text-veggie-text"
                  }`}
                >
                  Individual
                </button>
              </div>

              {matchMode === "teams" ? (
                <>
                  <p className="text-sm text-veggie-text">
                    Seleccioná 5 jugadores por lado y registrá el resultado. Un jugador no puede estar en ambos equipos.
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold text-veggie-dark flex items-center gap-2">
                        <Users2 size={18} className="text-veggie-green" />
                        Equipo ganador
                      </h3>
                      <div className="bg-veggie-light rounded-2xl p-4 max-h-72 overflow-y-auto space-y-2">
                        {players.map((player) => {
                          const checked = selectedWinners.includes(player.id)
                          const disabled = !checked && selectedWinners.length >= TEAM_SIZE
                          return (
                            <label
                              key={player.id}
                              className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm ${
                                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => handleWinnerToggle(player.id)}
                                className="h-4 w-4 text-veggie-green rounded border-veggie-green focus:ring-veggie-green"
                              />
                              <div>
                                <p className="font-semibold text-veggie-dark">{player.name}</p>
                                <p className="text-xs text-veggie-text">{player.record} • {player.phaseLabel}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-xs text-veggie-text text-right">
                        {selectedWinners.length}/{TEAM_SIZE} seleccionados
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold text-veggie-dark flex items-center gap-2">
                        <Users2 size={18} className="text-red-500" />
                        Equipo perdedor
                      </h3>
                      <div className="bg-veggie-light rounded-2xl p-4 max-h-72 overflow-y-auto space-y-2">
                        {players.map((player) => {
                          const checked = selectedLosers.includes(player.id)
                          const disabled = !checked && selectedLosers.length >= TEAM_SIZE
                          return (
                            <label
                              key={player.id}
                              className={`flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm ${
                                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => handleLoserToggle(player.id)}
                                className="h-4 w-4 text-red-500 rounded border-red-400 focus:ring-red-500"
                              />
                              <div>
                                <p className="font-semibold text-veggie-dark">{player.name}</p>
                                <p className="text-xs text-veggie-text">{player.record} • {player.phaseLabel}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                      <p className="text-xs text-veggie-text text-right">
                        {selectedLosers.length}/{TEAM_SIZE} seleccionados
                      </p>
                    </div>
                  </div>

                  {selectedWinners.some((id) => selectedLosers.includes(id)) && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">
                      Quitá al jugador duplicado: no puede estar en ambos equipos.
                    </p>
                  )}

                  <button
                    onClick={handleSubmitMatch}
                    disabled={!canSubmitMatch}
                    className="w-full bg-veggie-green text-white font-bold py-4 rounded-xl text-lg hover:bg-veggie-green-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingMatch ? <Loader2 className="h-5 w-5 animate-spin" /> : <Repeat size={20} />}
                    Registrar resultado
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-veggie-text">
                    Sumá victorias o derrotas individuales rápidamente. Cada acción se guarda al instante.
                  </p>

                  <div className="bg-veggie-light rounded-2xl p-4 max-h-96 overflow-y-auto space-y-2">
                    {players.length === 0 ? (
                      <p className="text-veggie-text text-sm text-center py-4">No hay jugadores cargados.</p>
                    ) : (
                      players.map((player) => (
                        <div
                          key={player.id}
                          className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-semibold text-veggie-dark">{player.name}</p>
                            <p className="text-xs text-veggie-text">
                              Mundial: {player.phaseLabel} • Campeonatos: {player.championships}
                            </p>
                            <p className="text-xs text-veggie-text">
                              Record {player.record} • {player.winPercentage.toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              onClick={() => handleIndividualResult(player.id, true)}
                              disabled={submittingMatch}
                              className="px-3 py-2 rounded-lg bg-veggie-green text-white text-xs font-semibold hover:bg-veggie-green-dark transition-colors disabled:opacity-50"
                            >
                              + Victoria
                            </button>
                            <button
                              onClick={() => handleIndividualResult(player.id, false)}
                              disabled={submittingMatch}
                              className="px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                              + Derrota
                            </button>
                            <button
                              onClick={() => handleManualAdjustment(player.id, true)}
                              disabled={submittingMatch || !adminUnlocked || !canRemoveWin(player)}
                              className="px-3 py-2 rounded-lg bg-veggie-light text-veggie-dark text-xs font-semibold border border-veggie-green hover:bg-veggie-green/10 transition-colors disabled:opacity-40"
                            >
                              - Victoria
                            </button>
                            <button
                              onClick={() => handleManualAdjustment(player.id, false)}
                              disabled={submittingMatch || !adminUnlocked || !canRemoveLoss(player)}
                              className="px-3 py-2 rounded-lg bg-veggie-light text-veggie-dark text-xs font-semibold border border-red-300 hover:bg-red-100 transition-colors disabled:opacity-40"
                            >
                              - Derrota
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </main>

      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-veggie-green text-2xl">🔒</span>
              <h2 className="text-xl font-bold text-veggie-dark">Ingresá el PIN</h2>
            </div>
            <p className="text-sm text-veggie-text">
              Desbloqueá el modo edición para agregar jugadores o registrar partidos.
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
                  handleUnlock()
                }
              }}
            />
            {pinModalError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{pinModalError}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleUnlock}
                className="flex-1 bg-veggie-green text-white font-bold py-3 rounded-xl hover:bg-veggie-green-dark transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={closePinModal}
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

