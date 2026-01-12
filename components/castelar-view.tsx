"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, Loader2, Plus, Repeat, Trophy, Users2, X } from "lucide-react"
import {
  addCastelarPlayer,
  deleteCastelarPlayer,
  fetchCastelarPlayers,
  fetchCastelarPlayersByYear,
  submitCastelarMatch,
  CastelarPlayerRow,
  saveCastelarPlayer,
  getMatchCount,
  getMatchCountByYear,
  setInitialMatchNumber,
  getInitialMatchNumber,
  fetchAllMatches,
  undoMatch,
  CastelarMatch,
  getMatchCountByYearAndMonth,
  fetchMatchesByYearAndMonth,
  fetchCastelarPlayersByYearAndMonth,
  updatePlayerStage,
} from "@/lib/castelar-service"
import { CastelarPlayer, formatPhaseLabel, computeWinPercentage } from "@/lib/castelar-logic"
import { ADMIN_PIN } from "@/lib/config"

interface CastelarViewProps {
  onBack: () => void
  remoteEnabled: boolean
}

const MAX_TEAM_SIZE = 5

function sortByWinPercentage(players: CastelarPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (b.wins === a.wins) {
      return b.winPercentage - a.winPercentage
    }
    return b.wins - a.wins
  })
}

const PHASE_RANK: Record<string, number> = {
  Final: 5,
  Semifinal: 4,
  Cuartos: 3,
  Octavos: 2,
  Grupos: 1,
}

function sortWorldCupPlayers(players: CastelarPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (b.stageIndex !== a.stageIndex) {
      return b.stageIndex - a.stageIndex
    }

    if (a.stageIndex === 0) {
      if (b.groupWins !== a.groupWins) {
        return b.groupWins - a.groupWins
      }
      if (a.groupLosses !== b.groupLosses) {
        return a.groupLosses - b.groupLosses
      }
    }

    if (b.championships !== a.championships) {
      return b.championships - a.championships
    }

    if (b.wins !== a.wins) {
      return b.wins - a.wins
    }

    return b.winPercentage - a.winPercentage
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
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinModalError, setPinModalError] = useState<string | null>(null)
  const [matchMode, setMatchMode] = useState<"teams" | "individual">("teams")
  const [selectedYear, setSelectedYear] = useState<number | null>(2026) // Default to 2026
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null) // null = todos los meses
  const [matchCount, setMatchCount] = useState<number>(0)
  const [showInitialMatchModal, setShowInitialMatchModal] = useState(false)
  const [initialMatchInput, setInitialMatchInput] = useState("")
  const [settingInitialMatch, setSettingInitialMatch] = useState(false)
  const [showMatchHistory, setShowMatchHistory] = useState(false) // Renamed from showUndoMatches
  const [matches, setMatches] = useState<CastelarMatch[]>([])
  const [undoingMatch, setUndoingMatch] = useState<string | null>(null)
  const [allPlayersForNames, setAllPlayersForNames] = useState<CastelarPlayerRow[]>([])
  const [editingPlayerStage, setEditingPlayerStage] = useState<string | null>(null)

  // Check if initial match number is set
  useEffect(() => {
    if (!remoteEnabled) return

    getInitialMatchNumber()
      .then((initial) => {
        if (initial === null) {
          // No initial match number set, show modal to configure
          setShowInitialMatchModal(true)
        }
      })
      .catch((err) => {
        console.error("[castelar] Error checking initial match number:", err)
      })
  }, [remoteEnabled])

  // Load players and match count based on selected year and month
  useEffect(() => {
    if (!remoteEnabled) {
      setLoading(false)
      setError("Necesitas Supabase configurado para usar Castelar.")
      return
    }

    setLoading(true)
    setError(null)

    Promise.all([
      fetchCastelarPlayersByYearAndMonth(selectedYear, selectedMonth),
      getMatchCountByYearAndMonth(selectedYear, selectedMonth),
    ])
      .then(([rows, count]) => {
        setPlayers(rows)
        setMatchCount(count)
        setError(null)
      })
      .catch((err) => {
        console.error("[castelar] Error fetching data:", err)
        setError("No pudimos cargar los datos. Intenta de nuevo.")
      })
      .finally(() => setLoading(false))
  }, [remoteEnabled, selectedYear, selectedMonth])

  // Load matches when showing match history
  useEffect(() => {
    if (!showMatchHistory || !remoteEnabled) return

    Promise.all([
      fetchMatchesByYearAndMonth(selectedYear, selectedMonth),
      fetchCastelarPlayers()
    ])
      .then(([filteredMatches, allPlayers]) => {
        setMatches(filteredMatches)
        setAllPlayersForNames(allPlayers)
      })
      .catch((err) => {
        console.error("[castelar] Error fetching matches:", err)
        setError("No pudimos cargar los partidos registrados.")
      })
  }, [showMatchHistory, remoteEnabled, selectedYear, selectedMonth])

  const standings = useMemo(() => sortByWinPercentage(players), [players])

  const phaseSummary = useMemo(
    () =>
      sortWorldCupPlayers(players).map((player) => ({
        id: player.id,
        name: player.name,
        phaseLabel: player.phaseLabel,
        championships: player.championships,
      })),
    [players],
  )

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

      // Reload players and match count based on selected year and month
      const [reloadedPlayers, newCount] = await Promise.all([
        fetchCastelarPlayersByYearAndMonth(selectedYear, selectedMonth),
        getMatchCountByYearAndMonth(selectedYear, selectedMonth),
      ])

      setPlayers(reloadedPlayers)
      setMatchCount(newCount)

      // Reload matches if match history is open
      if (showMatchHistory) {
        const filteredMatches = await fetchMatchesByYearAndMonth(selectedYear, selectedMonth)
        setMatches(filteredMatches)
      }

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
      if (!exists && prev.length >= MAX_TEAM_SIZE) {
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
      if (!exists && prev.length >= MAX_TEAM_SIZE) {
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
      await submitCastelarMatch({
        winningTeam: didWin ? [payloadPlayer] : [],
        losingTeam: !didWin ? [payloadPlayer] : [],
      })

      // Reload players and match count based on selected year and month
      const [reloadedPlayers, newCount] = await Promise.all([
        fetchCastelarPlayersByYearAndMonth(selectedYear, selectedMonth),
        getMatchCountByYearAndMonth(selectedYear, selectedMonth),
      ])

      setPlayers(reloadedPlayers)
      setMatchCount(newCount)

      // Reload matches if match history is open
      if (showMatchHistory) {
        const filteredMatches = await fetchMatchesByYearAndMonth(selectedYear, selectedMonth)
        setMatches(filteredMatches)
      }
    } catch (err) {
      console.error("[castelar] Error updating player:", err)
      setError("No se pudo actualizar el jugador.")
    } finally {
      setSubmittingMatch(false)
    }
  }

  const handleUndoMatch = async (matchId: string) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    if (!confirm("¿Seguro que querés deshacer este partido? Esto revertirá todas las estadísticas de los jugadores involucrados.")) {
      return
    }

    setUndoingMatch(matchId)
    setError(null)

    try {
      await undoMatch(matchId)
      
      // Reload everything
      const [reloadedPlayers, newCount, filteredMatches, allPlayers] = await Promise.all([
        fetchCastelarPlayersByYearAndMonth(selectedYear, selectedMonth),
        getMatchCountByYearAndMonth(selectedYear, selectedMonth),
        fetchMatchesByYearAndMonth(selectedYear, selectedMonth),
        fetchCastelarPlayers(),
      ])

      setPlayers(reloadedPlayers)
      setMatchCount(newCount)
      setMatches(filteredMatches)
      setAllPlayersForNames(allPlayers)
    } catch (err) {
      console.error("[castelar] Error undoing match:", err)
      setError("No se pudo deshacer el partido.")
    } finally {
      setUndoingMatch(null)
    }
  }

  const handleSetInitialMatchNumber = async () => {
    const num = parseInt(initialMatchInput.trim(), 10)
    if (isNaN(num) || num < 0) {
      setError("Ingresá un número válido.")
      return
    }

    setSettingInitialMatch(true)
    setError(null)

    try {
      await setInitialMatchNumber(num)
      setShowInitialMatchModal(false)
      setInitialMatchInput("")
      // Reload match count
      const count = await getMatchCount()
      setMatchCount(count)
    } catch (err) {
      console.error("[castelar] Error setting initial match number:", err)
      setError("No se pudo configurar el contador inicial.")
    } finally {
      setSettingInitialMatch(false)
    }
  }

  const handleUpdatePlayerStage = async (playerId: string, newStageIndex: number) => {
    if (!adminUnlocked) {
      openPinModal()
      return
    }
    if (submittingMatch) return

    setSubmittingMatch(true)
    setError(null)

    try {
      await updatePlayerStage(playerId, newStageIndex)
      
      // Reload players
      const reloadedPlayers = await fetchCastelarPlayersByYearAndMonth(selectedYear, selectedMonth)
      setPlayers(reloadedPlayers)
      setEditingPlayerStage(null)
    } catch (err) {
      console.error("[castelar] Error updating player stage:", err)
      setError("No se pudo actualizar la fase del jugador.")
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

        <div className="w-full max-w-5xl mx-auto flex-1 space-y-6">
          <header className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl px-6 py-5 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⚽️</span>
                <h1 className="text-3xl font-bold text-veggie-dark">Castelar</h1>
              </div>
              {remoteEnabled && (
                <div className="flex items-center gap-3 text-sm text-veggie-text">
                  {adminUnlocked ? (
                    <span className="inline-flex items-center gap-2 text-veggie-green font-semibold">
                      <span className="text-lg">🔓</span>
                      Modo edición desbloqueado
                    </span>
                  ) : (
                    <button
                      onClick={openPinModal}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-veggie-orange text-white font-semibold hover:bg-veggie-orange-dark transition-colors"
                    >
                      <span className="text-lg">🔒</span>
                      Ingresar PIN
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Year and month filters and match counter */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-veggie-light">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-veggie-dark">Año:</label>
                  <select
                    value={selectedYear === null ? "2026" : selectedYear.toString()}
                    onChange={(e) => {
                      const value = e.target.value
                      setSelectedYear(value === "todos" ? null : parseInt(value, 10))
                    }}
                    className="px-3 py-2 rounded-xl border-2 border-veggie-green focus:outline-none focus:border-veggie-orange text-veggie-dark font-semibold text-sm"
                  >
                    <option value="2026">2026</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-veggie-dark">Mes:</label>
                  <select
                    value={selectedMonth === null ? "todos" : selectedMonth.toString()}
                    onChange={(e) => {
                      const value = e.target.value
                      setSelectedMonth(value === "todos" ? null : parseInt(value, 10))
                    }}
                    className="px-3 py-2 rounded-xl border-2 border-veggie-green focus:outline-none focus:border-veggie-orange text-veggie-dark font-semibold text-sm"
                  >
                    <option value="todos">Todos</option>
                    <option value="1">Enero</option>
                    <option value="2">Febrero</option>
                    <option value="3">Marzo</option>
                    <option value="4">Abril</option>
                    <option value="5">Mayo</option>
                    <option value="6">Junio</option>
                    <option value="7">Julio</option>
                    <option value="8">Agosto</option>
                    <option value="9">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 text-veggie-dark">
                <span className="text-lg font-bold">Partidos:</span>
                <span className="text-2xl font-bold text-veggie-green">{matchCount}</span>
              </div>
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
                    setShowMatchHistory(false)
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
                    setShowMatchHistory((prev) => !prev)
                  }}
                  className="px-4 py-2 rounded-xl bg-veggie-orange text-white font-semibold hover:bg-veggie-orange-dark transition-colors disabled:opacity-50"
                  disabled={!remoteEnabled}
                >
                  {showMatchHistory ? "Cerrar registro de partidos" : "Registro de partidos"}
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
                <span className="text-2xl">🏆</span>
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
                      phaseSummary.map((player) => {
                        const fullPlayer = players.find((p) => p.id === player.id)
                        const isEditing = editingPlayerStage === player.id
                        return (
                          <tr key={player.id} className="hover:bg-veggie-light/60 transition-colors">
                            <td className="py-3 pr-4 font-semibold text-veggie-dark">{player.name}</td>
                            <td className="py-3 pr-4 text-veggie-text">
                              {isEditing && adminUnlocked ? (
                                <select
                                  value={fullPlayer?.stageIndex ?? 0}
                                  onChange={(e) => {
                                    const newStage = parseInt(e.target.value, 10)
                                    handleUpdatePlayerStage(player.id, newStage)
                                  }}
                                  className="px-2 py-1 rounded border border-veggie-green text-sm"
                                  autoFocus
                                  onBlur={() => setEditingPlayerStage(null)}
                                >
                                  <option value={0}>Grupos</option>
                                  <option value={1}>Octavos</option>
                                  <option value={2}>Cuartos</option>
                                  <option value={3}>Semifinal</option>
                                  <option value={4}>Final</option>
                                </select>
                              ) : (
                                <span
                                  onClick={() => {
                                    if (adminUnlocked) setEditingPlayerStage(player.id)
                                  }}
                                  className={adminUnlocked ? "cursor-pointer hover:text-veggie-green" : ""}
                                >
                                  {player.phaseLabel}
                                </span>
                              )}
                            </td>
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
                        )
                      })
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

          {showMatchHistory && (
            <section className="bg-white rounded-3xl shadow-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Repeat className="text-veggie-green" />
                  <h2 className="text-2xl font-bold text-veggie-dark">Registro de partidos</h2>
                </div>
                <button
                  onClick={() => {
                    setShowMatchHistory(false)
                    setSelectedWinners([])
                    setSelectedLosers([])
                  }}
                  className="text-sm text-veggie-text hover:text-veggie-dark transition-colors"
                >
                  Cerrar
                </button>
              </div>

              {/* Match History */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-veggie-dark">Historial de partidos</h3>
                <div className="bg-veggie-light rounded-2xl p-4 max-h-96 overflow-y-auto space-y-2">
                  {matches.length === 0 ? (
                    <p className="text-veggie-text text-sm text-center py-4">
                      No hay partidos registrados.
                    </p>
                  ) : (
                    matches.map((match) => {
                      const matchDate = new Date(match.match_date)
                      const winningTeamNames = match.winning_team
                        .map((id) => {
                          const player = allPlayersForNames.find((p) => p.id === id)
                          return player?.name || id
                        })
                        .filter(Boolean)
                      const losingTeamNames = match.losing_team
                        .map((id) => {
                          const player = allPlayersForNames.find((p) => p.id === id)
                          return player?.name || id
                        })
                        .filter(Boolean)

                      return (
                        <div
                          key={match.id}
                          className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-veggie-text">
                                Partido #{match.match_number}
                              </span>
                              <span className="text-xs text-veggie-text">•</span>
                              <span className="text-xs text-veggie-text">
                                {matchDate.toLocaleDateString("es-AR", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="text-xs font-semibold text-veggie-green">{match.year}</span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm">
                                <span className="font-semibold text-veggie-green">Ganadores: </span>
                                <span className="text-veggie-dark">
                                  {winningTeamNames.length > 0 ? winningTeamNames.join(", ") : "N/A"}
                                </span>
                              </div>
                              <div className="text-sm">
                                <span className="font-semibold text-red-500">Perdedores: </span>
                                <span className="text-veggie-dark">
                                  {losingTeamNames.length > 0 ? losingTeamNames.join(", ") : "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUndoMatch(match.id)}
                            disabled={undoingMatch === match.id || submittingMatch}
                            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {undoingMatch === match.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Deshaciendo...
                              </>
                            ) : (
                              <>
                                <X size={16} />
                                Deshacer
                              </>
                            )}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Add New Match Form */}
              <div className="space-y-4 border-t border-veggie-light pt-6">
                <h3 className="text-xl font-bold text-veggie-dark">Registrar nuevo partido</h3>

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
                          const disabled = !checked && selectedWinners.length >= MAX_TEAM_SIZE
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
                        {selectedWinners.length}/{MAX_TEAM_SIZE} seleccionados
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
                          const disabled = !checked && selectedLosers.length >= MAX_TEAM_SIZE
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
                        {selectedLosers.length}/{MAX_TEAM_SIZE} seleccionados
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
              </div>
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

      {showInitialMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-veggie-green text-2xl">📊</span>
              <h2 className="text-xl font-bold text-veggie-dark">Configurar contador inicial</h2>
            </div>
            <p className="text-sm text-veggie-text">
              Configurá el número inicial de partidos. Este será el punto de partida para el contador.
            </p>
            <input
              type="number"
              value={initialMatchInput}
              onChange={(event) => setInitialMatchInput(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-veggie-green focus:outline-none focus:border-veggie-orange"
              placeholder="Número inicial de partidos"
              autoFocus
              min="0"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  handleSetInitialMatchNumber()
                }
              }}
            />
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleSetInitialMatchNumber}
                disabled={settingInitialMatch || !initialMatchInput.trim()}
                className="flex-1 bg-veggie-green text-white font-bold py-3 rounded-xl hover:bg-veggie-green-dark transition-colors disabled:opacity-50"
              >
                {settingInitialMatch ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

