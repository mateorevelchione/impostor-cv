"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  Loader2,
  Plus,
  RotateCcw,
  Trophy,
  Users,
  X,
  Lock,
  Unlock,
  ClipboardList,
  ChevronDown,
} from "lucide-react"
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
  undoMatch,
  CastelarMatch,
  fetchMatchesByYear,
  updatePlayerStage,
} from "@/lib/castelar-service"
import { CastelarPlayer, formatPhaseLabel, computeWinPercentage } from "@/lib/castelar-logic"
import { isAdminUnlocked, unlockAdmin } from "@/lib/admin-session"
import { RatingsEditor } from "@/components/ratings-editor"
import { Sliders } from "lucide-react"

interface CastelarViewProps {
  onBack: () => void
  remoteEnabled: boolean
}

const MAX_TEAM_SIZE = 5

const STAGE_LABELS = ["Grupos", "Octavos", "Cuartos", "Semifinal", "Final"]

function sortByWins(players: CastelarPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.winPercentage - a.winPercentage
  })
}

function sortWorldCup(players: CastelarPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (b.stageIndex !== a.stageIndex) return b.stageIndex - a.stageIndex
    if (a.stageIndex === 0) {
      if (b.groupWins !== a.groupWins) return b.groupWins - a.groupWins
      if (a.groupLosses !== b.groupLosses) return a.groupLosses - b.groupLosses
    }
    if (b.championships !== a.championships) return b.championships - a.championships
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.winPercentage - a.winPercentage
  })
}

function toCastelarPlayer(row: CastelarPlayerRow): CastelarPlayer {
  const { phaseLabel: _p, winPercentage: _w, record: _r, ...rest } = row
  return rest
}

function WinPctBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-1 bg-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(pct, 100)}%`,
          background: pct >= 60 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444",
        }}
      />
    </div>
  )
}

function StageBadge({ stageIndex, championships }: { stageIndex: number; championships: number }) {
  const colors: Record<number, string> = {
    0: "bg-muted text-muted-foreground",
    1: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    2: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    3: "bg-warning/20 text-warning border border-warning/30",
    4: "bg-primary/20 text-primary border border-primary/30",
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${colors[stageIndex] ?? colors[0]}`}>
      {STAGE_LABELS[stageIndex] ?? "Grupos"}
      {championships > 0 && (
        <span className="ml-1 text-warning font-bold">{championships > 1 ? `x${championships}` : ""}</span>
      )}
    </span>
  )
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
  const [selectedYear, setSelectedYear] = useState<number | null>(2026)
  const [matchCount, setMatchCount] = useState<number>(0)
  const [showInitialMatchModal, setShowInitialMatchModal] = useState(false)
  const [initialMatchInput, setInitialMatchInput] = useState("")
  const [settingInitialMatch, setSettingInitialMatch] = useState(false)
  const [showMatchHistory, setShowMatchHistory] = useState(false)
  const [showRatings, setShowRatings] = useState(false)
  const [matches, setMatches] = useState<CastelarMatch[]>([])
  const [undoingMatch, setUndoingMatch] = useState<string | null>(null)
  const [allPlayersForNames, setAllPlayersForNames] = useState<CastelarPlayerRow[]>([])
  const [editingPlayerStage, setEditingPlayerStage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"mundial" | "victorias">("mundial")

  // Inherit the unlocked state from the session (PIN entered at the nav gear).
  useEffect(() => {
    if (isAdminUnlocked()) setAdminUnlocked(true)
  }, [])

  useEffect(() => {
    if (!remoteEnabled) return
    getInitialMatchNumber()
      .then((initial) => { if (initial === null) setShowInitialMatchModal(true) })
      .catch(console.error)
  }, [remoteEnabled])

  useEffect(() => {
    if (!remoteEnabled) { setLoading(false); setError("Necesitás Supabase configurado."); return }
    setLoading(true)
    setError(null)
    Promise.all([
      fetchCastelarPlayersByYear(selectedYear),
      getMatchCountByYear(selectedYear),
    ])
      .then(([rows, count]) => { setPlayers(rows); setMatchCount(count) })
      .catch(() => setError("No se pudieron cargar los datos."))
      .finally(() => setLoading(false))
  }, [remoteEnabled, selectedYear])

  useEffect(() => {
    if (!showMatchHistory || !remoteEnabled) return
    Promise.all([
      fetchMatchesByYear(selectedYear),
      fetchCastelarPlayers(),
    ])
      .then(([m, all]) => { setMatches(m); setAllPlayersForNames(all) })
      .catch(() => setError("No se pudieron cargar los partidos."))
  }, [showMatchHistory, remoteEnabled, selectedYear])

  const standings = useMemo(() => sortByWins(players), [players])
  const phaseSummary = useMemo(() => sortWorldCup(players), [players])

  const canSubmitMatch =
    matchMode === "teams" &&
    selectedWinners.length > 0 &&
    selectedLosers.length > 0 &&
    selectedWinners.every((id) => !selectedLosers.includes(id)) &&
    !submittingMatch

  const openPinModal = () => { setPinModalError(null); setPinInput(""); setShowPinModal(true) }
  const closePinModal = () => { setShowPinModal(false); setPinInput(""); setPinModalError(null) }

  const handleUnlock = () => {
    if (unlockAdmin(pinInput)) { setAdminUnlocked(true); closePinModal() }
    else setPinModalError("PIN incorrecto.")
  }

  const handleAddPlayer = async () => {
    if (!adminUnlocked) { openPinModal(); return }
    const trimmed = newPlayerName.trim()
    if (!trimmed || savingPlayer) return
    setSavingPlayer(true)
    try {
      const created = await addCastelarPlayer(trimmed)
      setPlayers((prev) => [...prev, created])
      setNewPlayerName("")
    } catch { setError("No se pudo agregar el jugador.") }
    finally { setSavingPlayer(false) }
  }

  const handleDeletePlayer = async (id: string) => {
    if (!adminUnlocked) { openPinModal(); return }
    if (!confirm("¿Eliminar este jugador?")) return
    try {
      await deleteCastelarPlayer(id)
      setPlayers((prev) => prev.filter((p) => p.id !== id))
      setSelectedWinners((prev) => prev.filter((pid) => pid !== id))
      setSelectedLosers((prev) => prev.filter((pid) => pid !== id))
    } catch { setError("No se pudo eliminar al jugador.") }
  }

  const reloadAfterMatch = async () => {
    const [rows, count] = await Promise.all([
      fetchCastelarPlayersByYear(selectedYear),
      getMatchCountByYear(selectedYear),
    ])
    setPlayers(rows)
    setMatchCount(count)
    if (showMatchHistory) {
      const m = await fetchMatchesByYear(selectedYear)
      setMatches(m)
    }
  }

  const handleSubmitMatch = async () => {
    if (!adminUnlocked) { openPinModal(); return }
    if (!canSubmitMatch) return
    setSubmittingMatch(true)
    setError(null)
    try {
      const winners = selectedWinners.map((id) => players.find((p) => p.id === id)).filter(Boolean).map((r) => toCastelarPlayer(r as CastelarPlayerRow))
      const losers = selectedLosers.map((id) => players.find((p) => p.id === id)).filter(Boolean).map((r) => toCastelarPlayer(r as CastelarPlayerRow))
      await submitCastelarMatch({ winningTeam: winners, losingTeam: losers })
      await reloadAfterMatch()
      setSelectedWinners([])
      setSelectedLosers([])
    } catch { setError("No se pudo registrar el partido.") }
    finally { setSubmittingMatch(false) }
  }

  const handleWinnerToggle = (id: string) => {
    if (!adminUnlocked) { openPinModal(); return }
    setSelectedWinners((prev) => {
      if (prev.includes(id)) return prev.filter((pid) => pid !== id)
      if (prev.length >= MAX_TEAM_SIZE) return prev
      setSelectedLosers((l) => l.filter((pid) => pid !== id))
      return [...prev, id]
    })
  }

  const handleLoserToggle = (id: string) => {
    if (!adminUnlocked) { openPinModal(); return }
    setSelectedLosers((prev) => {
      if (prev.includes(id)) return prev.filter((pid) => pid !== id)
      if (prev.length >= MAX_TEAM_SIZE) return prev
      setSelectedWinners((w) => w.filter((pid) => pid !== id))
      return [...prev, id]
    })
  }

  const handleIndividualResult = async (playerId: string, didWin: boolean) => {
    if (!adminUnlocked) { openPinModal(); return }
    if (submittingMatch) return
    const playerRow = players.find((p) => p.id === playerId)
    if (!playerRow) return
    setSubmittingMatch(true)
    try {
      const p = toCastelarPlayer(playerRow)
      await submitCastelarMatch({
        winningTeam: didWin ? [p] : [],
        losingTeam: !didWin ? [p] : [],
      })
      await reloadAfterMatch()
    } catch { setError("No se pudo actualizar el jugador.") }
    finally { setSubmittingMatch(false) }
  }

  const handleUndoMatch = async (matchId: string) => {
    if (!adminUnlocked) { openPinModal(); return }
    if (!confirm("¿Deshacer este partido? Revertirá todas las estadísticas.")) return
    setUndoingMatch(matchId)
    try {
      await undoMatch(matchId)
      const [rows, count, m, all] = await Promise.all([
        fetchCastelarPlayersByYear(selectedYear),
        getMatchCountByYear(selectedYear),
        fetchMatchesByYear(selectedYear),
        fetchCastelarPlayers(),
      ])
      setPlayers(rows); setMatchCount(count); setMatches(m); setAllPlayersForNames(all)
    } catch { setError("No se pudo deshacer el partido.") }
    finally { setUndoingMatch(null) }
  }

  const handleSetInitialMatchNumber = async () => {
    const num = parseInt(initialMatchInput.trim(), 10)
    if (isNaN(num) || num < 0) { setError("Ingresá un número válido."); return }
    setSettingInitialMatch(true)
    try {
      await setInitialMatchNumber(num)
      setShowInitialMatchModal(false)
      setInitialMatchInput("")
      const count = await getMatchCount()
      setMatchCount(count)
    } catch { setError("No se pudo configurar el contador.") }
    finally { setSettingInitialMatch(false) }
  }

  const handleUpdatePlayerStage = async (playerId: string, newStageIndex: number) => {
    if (!adminUnlocked) { openPinModal(); return }
    setSubmittingMatch(true)
    try {
      await updatePlayerStage(playerId, newStageIndex)
      const rows = await fetchCastelarPlayersByYear(selectedYear)
      setPlayers(rows)
      setEditingPlayerStage(null)
    } catch { setError("No se pudo actualizar la fase.") }
    finally { setSubmittingMatch(false) }
  }

  const handleManualAdjustment = async (playerId: string, didWin: boolean) => {
    if (!adminUnlocked) { openPinModal(); return }
    if (submittingMatch) return
    const playerRow = players.find((p) => p.id === playerId)
    if (!playerRow) return
    const player = toCastelarPlayer(playerRow)

    if (didWin) {
      if (player.wins <= 0) return
      player.wins = Math.max(0, player.wins - 1)
      if (player.stageIndex === 0) player.groupWins = Math.max(0, player.groupWins - 1)
      else { player.stageIndex = Math.max(0, player.stageIndex - 1); if (player.stageIndex === 0) player.groupWins = Math.max(0, player.groupWins - 1) }
    } else {
      if (player.losses <= 0) return
      player.losses = Math.max(0, player.losses - 1)
      if (player.stageIndex === 0) player.groupLosses = Math.max(0, player.groupLosses - 1)
      else player.stageIndex = Math.max(0, player.stageIndex - 1)
    }

    player.groupWins = Math.max(0, Math.min(player.groupWins, 3))
    player.groupLosses = Math.max(0, Math.min(player.groupLosses, 3))
    const total = player.groupWins + player.groupLosses
    if (total >= 3) player.stageIndex = player.groupWins >= 2 ? 1 : 0
    else player.stageIndex = 0

    setSubmittingMatch(true)
    try {
      await saveCastelarPlayer(player)
      setPlayers((prev) => prev.map((p) => p.id === playerId ? {
        ...playerRow, ...player,
        phaseLabel: formatPhaseLabel(player),
        winPercentage: computeWinPercentage(player),
        record: `${player.wins}-${player.losses}`,
      } : p))
    } catch { setError("No se pudo ajustar el jugador.") }
    finally { setSubmittingMatch(false) }
  }

  useEffect(() => { if (matchMode !== "teams") { setSelectedWinners([]); setSelectedLosers([]) } }, [matchMode])

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Cargando...</p>
      </main>
    )
  }

  return (
    <>
      <main className="min-h-screen bg-background">
        {/* Top nav bar */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              <ChevronLeft size={16} />
              Inicio
            </button>

            <div className="flex items-center gap-2">
              <span className="text-foreground font-bold tracking-tight">Castelar FC</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Year filter */}
              <select
                value={selectedYear ?? "todos"}
                onChange={(e) => setSelectedYear(e.target.value === "todos" ? null : parseInt(e.target.value, 10))}
                className="text-xs bg-muted border border-border text-foreground rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="2026">2026</option>
                <option value="todos">Todos</option>
              </select>

              {/* Admin lock */}
              {remoteEnabled && (
                adminUnlocked ? (
                  <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                    <Unlock size={13} /> Admin
                  </span>
                ) : (
                  <button
                    onClick={openPinModal}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Lock size={13} />
                  </button>
                )
              )}
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold tabular text-primary">{matchCount}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Partidos</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold tabular text-foreground">{players.length}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Jugadores</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold tabular text-warning">
                {players.reduce((s, p) => s + p.championships, 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">Campeonatos</p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-4 rounded-xl">
              {error}
            </div>
          )}


          {/* Tables — tab switcher */}
          <section className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("mundial")}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === "mundial"
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Trophy size={15} />
                Mundial
              </button>
              <button
                onClick={() => setActiveTab("victorias")}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                  activeTab === "victorias"
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users size={15} />
                Rankings
              </button>
            </div>

            {activeTab === "mundial" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fase</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Copas</th>
                      {adminUnlocked && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {phaseSummary.length === 0 ? (
                      <tr>
                        <td colSpan={adminUnlocked ? 4 : 3} className="px-4 py-10 text-center text-muted-foreground text-sm">
                          Sin jugadores todavía.
                        </td>
                      </tr>
                    ) : phaseSummary.map((player, i) => {
                      const full = players.find((p) => p.id === player.id)
                      const isEditing = editingPlayerStage === player.id
                      return (
                        <tr key={player.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                              <span className="font-semibold text-foreground">{player.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {isEditing && adminUnlocked ? (
                              <select
                                value={full?.stageIndex ?? 0}
                                onChange={(e) => handleUpdatePlayerStage(player.id, parseInt(e.target.value, 10))}
                                className="text-xs bg-muted border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                                onBlur={() => setEditingPlayerStage(null)}
                              >
                                {STAGE_LABELS.map((l, idx) => <option key={idx} value={idx}>{l}</option>)}
                              </select>
                            ) : (
                              <span
                                onClick={() => adminUnlocked && setEditingPlayerStage(player.id)}
                                className={adminUnlocked ? "cursor-pointer" : ""}
                              >
                                <StageBadge stageIndex={full?.stageIndex ?? 0} championships={player.championships} />
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {player.championships > 0 ? (
                              <span className="text-warning font-bold tabular">{player.championships}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          {adminUnlocked && (
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => handleDeletePlayer(player.id)}
                                className="text-xs text-destructive hover:text-destructive/80 transition-colors"
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "victorias" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">PJ</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">PG</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">PP</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">% V</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                          Sin partidos registrados.
                        </td>
                      </tr>
                    ) : standings.map((player, i) => (
                      <tr key={player.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-3.5 font-semibold text-foreground">{player.name}</td>
                        <td className="px-4 py-3.5 tabular text-muted-foreground">{player.wins + player.losses}</td>
                        <td className="px-4 py-3.5 tabular text-success font-medium">{player.wins}</td>
                        <td className="px-4 py-3.5 tabular text-destructive font-medium">{player.losses}</td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 hidden sm:block">
                              <WinPctBar pct={player.winPercentage} />
                            </div>
                            <span className={`tabular font-bold text-sm ${
                              player.winPercentage >= 60 ? "text-success" :
                              player.winPercentage >= 40 ? "text-warning" : "text-destructive"
                            }`}>
                              {player.winPercentage.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Admin actions */}
          {remoteEnabled && (
            <div className="flex gap-2 overflow-x-auto pb-1 [&>button]:flex-shrink-0 [&>button]:whitespace-nowrap">
              <button
                onClick={() => {
                  if (!adminUnlocked) { openPinModal(); return }
                  setShowMatchHistory(false)
                  setShowAddForm((p) => !p)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all"
              >
                <Plus size={15} />
                {showAddForm ? "Cancelar" : "Agregar jugador"}
              </button>
              <button
                onClick={() => {
                  if (!adminUnlocked) { openPinModal(); return }
                  setShowAddForm(false)
                  setShowRatings(false)
                  setShowMatchHistory((p) => !p)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-foreground text-sm font-semibold hover:bg-card-elevated transition-all"
              >
                <ClipboardList size={15} />
                {showMatchHistory ? "Cerrar partidos" : "Registrar / historial"}
              </button>
              <button
                onClick={() => {
                  if (!adminUnlocked) { openPinModal(); return }
                  setShowAddForm(false)
                  setShowMatchHistory(false)
                  setShowRatings((p) => !p)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-foreground text-sm font-semibold hover:bg-card-elevated transition-all"
              >
                <Sliders size={15} />
                {showRatings ? "Cerrar puntajes" : "Puntajes para equipos"}
              </button>
            </div>
          )}

          {/* Player ratings (for the team generator) */}
          {showRatings && adminUnlocked && <RatingsEditor />}

          {/* Add player form */}
          {showAddForm && (
            <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-foreground">Agregar jugador</h2>
              <div className="flex gap-3">
                <input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Nombre del jugador"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddPlayer() } }}
                />
                <button
                  onClick={handleAddPlayer}
                  disabled={savingPlayer || !newPlayerName.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-40"
                >
                  {savingPlayer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={15} />}
                  Guardar
                </button>
              </div>
            </section>
          )}

          {/* Match history + new match */}
          {showMatchHistory && (
            <section className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-bold text-foreground flex items-center gap-2">
                  <ClipboardList size={16} className="text-primary" />
                  Partidos
                </h2>
              </div>

              {/* Match list */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                {matches.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Sin partidos registrados.</p>
                ) : matches.map((match) => {
                  const date = new Date(match.match_date)
                  const winners = match.winning_team.map((id) => allPlayersForNames.find((p) => p.id === id)?.name ?? id)
                  const losers = match.losing_team.map((id) => allPlayersForNames.find((p) => p.id === id)?.name ?? id)
                  return (
                    <div key={match.id} className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">#{match.match_number}</span>
                          <span>·</span>
                          <span>{date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          <span className="text-sm"><span className="text-success font-semibold">G: </span><span className="text-foreground">{winners.join(", ") || "—"}</span></span>
                          <span className="text-sm"><span className="text-destructive font-semibold">P: </span><span className="text-foreground">{losers.join(", ") || "—"}</span></span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUndoMatch(match.id)}
                        disabled={!!undoingMatch || submittingMatch}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-40"
                      >
                        {undoingMatch === match.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw size={12} />}
                        Deshacer
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* New match form */}
              <div className="p-5 border-t border-border space-y-5">
                <h3 className="font-semibold text-foreground text-sm">Registrar partido</h3>

                {/* Mode toggle */}
                <div className="flex bg-muted rounded-xl p-1 gap-1">
                  {(["teams", "individual"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMatchMode(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        matchMode === m
                          ? "bg-card text-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "teams" ? "Equipos" : "Individual"}
                    </button>
                  ))}
                </div>

                {matchMode === "teams" ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Winners */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-success">
                          Ganadores ({selectedWinners.length}/{MAX_TEAM_SIZE})
                        </p>
                        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 max-h-64 overflow-y-auto">
                          {players.map((player) => {
                            const checked = selectedWinners.includes(player.id)
                            const disabled = !checked && selectedWinners.length >= MAX_TEAM_SIZE
                            return (
                              <label
                                key={player.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                  checked ? "bg-success/10 border border-success/30" : "bg-card hover:bg-card-elevated"
                                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => handleWinnerToggle(player.id)}
                                  className="hidden"
                                />
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                  checked ? "bg-success border-success" : "border-border"
                                }`}>
                                  {checked && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                                  <p className="text-xs text-muted-foreground">{player.record} · {player.phaseLabel}</p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      {/* Losers */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                          Perdedores ({selectedLosers.length}/{MAX_TEAM_SIZE})
                        </p>
                        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 max-h-64 overflow-y-auto">
                          {players.map((player) => {
                            const checked = selectedLosers.includes(player.id)
                            const disabled = !checked && selectedLosers.length >= MAX_TEAM_SIZE
                            return (
                              <label
                                key={player.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                                  checked ? "bg-destructive/10 border border-destructive/30" : "bg-card hover:bg-card-elevated"
                                } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => handleLoserToggle(player.id)}
                                  className="hidden"
                                />
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                  checked ? "bg-destructive border-destructive" : "border-border"
                                }`}>
                                  {checked && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                                  <p className="text-xs text-muted-foreground">{player.record} · {player.phaseLabel}</p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {selectedWinners.some((id) => selectedLosers.includes(id)) && (
                      <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                        Un jugador no puede estar en ambos equipos.
                      </p>
                    )}

                    <button
                      onClick={handleSubmitMatch}
                      disabled={!canSubmitMatch}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {submittingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Confirmar resultado
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div key={player.id} className="flex items-center justify-between gap-3 bg-muted/40 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.record} · {player.winPercentage.toFixed(0)}%</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleIndividualResult(player.id, true)}
                            disabled={submittingMatch}
                            className="px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success text-xs font-semibold hover:bg-success/20 transition-colors disabled:opacity-40"
                          >
                            + Victoria
                          </button>
                          <button
                            onClick={() => handleIndividualResult(player.id, false)}
                            disabled={submittingMatch}
                            className="px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors disabled:opacity-40"
                          >
                            + Derrota
                          </button>
                          {adminUnlocked && (
                            <>
                              <button onClick={() => handleManualAdjustment(player.id, true)} disabled={submittingMatch || player.wins <= 0} className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-30">−V</button>
                              <button onClick={() => handleManualAdjustment(player.id, false)} disabled={submittingMatch || player.losses <= 0} className="px-2 py-1.5 rounded-lg border border-border text-muted-foreground text-xs hover:text-foreground transition-colors disabled:opacity-30">−D</button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Lock size={16} className="text-primary" /> PIN de admin
              </h2>
              <button onClick={closePinModal} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <p className="text-sm text-muted-foreground">Ingresá el PIN para desbloquear el modo edición.</p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center text-2xl tracking-widest"
              placeholder="····"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUnlock() } }}
            />
            {pinModalError && <p className="text-sm text-destructive">{pinModalError}</p>}
            <div className="flex gap-3">
              <button onClick={handleUnlock} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all">
                Confirmar
              </button>
              <button onClick={closePinModal} className="flex-1 py-3 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-card-elevated transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial match number modal */}
      {showInitialMatchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h2 className="font-bold text-foreground">Configurar contador inicial</h2>
            <p className="text-sm text-muted-foreground">¿Cuántos partidos ya lleva el grupo? Esto define el punto de partida del contador.</p>
            <input
              type="number"
              value={initialMatchInput}
              onChange={(e) => setInitialMatchInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ej: 42"
              autoFocus
              min="0"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSetInitialMatchNumber() } }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              onClick={handleSetInitialMatchNumber}
              disabled={settingInitialMatch || !initialMatchInput.trim()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {settingInitialMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
