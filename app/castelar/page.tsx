"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import {
  fetchCastelarPlayers,
  fetchAllMatches,
  getActualMatchCount,
  CastelarPlayerRow,
  CastelarMatch,
} from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"

type Tab = "mundial" | "ranking"
type SortKey = "wins" | "losses" | "winPercentage" | "championships"

const STAGE_LABELS = ["Grupos", "Octavos", "Cuartos", "Semifinal", "Final"]
const STAGE_COLORS: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-blue-400",
  2: "text-purple-400",
  3: "text-warning",
  4: "text-primary",
}

/* ─── Helpers ─── */

function sortWorldCup(players: CastelarPlayerRow[]) {
  return [...players].sort((a, b) => {
    if (b.stageIndex !== a.stageIndex) return b.stageIndex - a.stageIndex
    if (a.stageIndex === 0) {
      if (b.groupWins !== a.groupWins) return b.groupWins - a.groupWins
      if (a.groupLosses !== b.groupLosses) return a.groupLosses - b.groupLosses
    }
    if (b.championships !== a.championships) return b.championships - a.championships
    return b.wins - a.wins
  })
}

function playerStreak(playerId: string, matches: CastelarMatch[]) {
  const pm = matches
    .filter((m) => m.winning_team.includes(playerId) || m.losing_team.includes(playerId))
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
  if (!pm.length) return { count: 0, type: "W" as "W" | "L" }
  const first: "W" | "L" = pm[0].winning_team.includes(playerId) ? "W" : "L"
  let count = 0
  for (const m of pm) {
    const r: "W" | "L" = m.winning_team.includes(playerId) ? "W" : "L"
    if (r === first) count++
    else break
  }
  return { count, type: first }
}

function form5(playerId: string, matches: CastelarMatch[]) {
  const pm = matches
    .filter((m) => m.winning_team.includes(playerId) || m.losing_team.includes(playerId))
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    .slice(0, 5)
  if (pm.length < 3) return null
  return { wins: pm.filter((m) => m.winning_team.includes(playerId)).length, total: pm.length }
}

function bestDuo(matches: CastelarMatch[], players: CastelarPlayerRow[]) {
  const map = new Map<string, { wins: number; total: number }>()
  for (const match of matches) {
    const update = (team: string[], isWin: boolean) => {
      for (let i = 0; i < team.length; i++)
        for (let j = i + 1; j < team.length; j++) {
          const key = [team[i], team[j]].sort().join("|")
          const c = map.get(key) ?? { wins: 0, total: 0 }
          map.set(key, { wins: c.wins + (isWin ? 1 : 0), total: c.total + 1 })
        }
    }
    update(match.winning_team, true)
    update(match.losing_team, false)
  }
  let bestKey = "", bestWins = 0
  for (const [key, s] of map) {
    if (s.total >= 3 && s.wins > bestWins) { bestWins = s.wins; bestKey = key }
  }
  if (!bestKey) return null
  const [id1, id2] = bestKey.split("|")
  const s = map.get(bestKey)!
  return {
    name1: players.find((p) => p.id === id1)?.name ?? "?",
    name2: players.find((p) => p.id === id2)?.name ?? "?",
    wins: s.wins,
    total: s.total,
  }
}

function computeInsights(players: CastelarPlayerRow[], matches: CastelarMatch[]): string[] {
  const list: string[] = []

  // Best win streak
  let bestWin = { name: "", count: 0 }
  let bestLoss = { name: "", count: 0 }
  for (const p of players) {
    const s = playerStreak(p.id, matches)
    if (s.type === "W" && s.count >= 2 && s.count > bestWin.count)
      bestWin = { name: p.name, count: s.count }
    if (s.type === "L" && s.count >= 2 && s.count > bestLoss.count)
      bestLoss = { name: p.name, count: s.count }
  }
  if (bestWin.count >= 2) list.push(`🔥 ${bestWin.name} en racha: ${bestWin.count} victorias seguidas`)
  if (bestLoss.count >= 2) list.push(`📉 ${bestLoss.name}: ${bestLoss.count} derrotas seguidas`)

  // Best form last 5
  let bestForm = { name: "", wins: 0, total: 0 }
  for (const p of players) {
    const f = form5(p.id, matches)
    if (f && f.wins > bestForm.wins) bestForm = { name: p.name, ...f }
  }
  if (bestForm.wins >= 3) list.push(`📈 Mejor forma reciente: ${bestForm.name} (${bestForm.wins}/${bestForm.total})`)

  // Best duo
  const duo = bestDuo(matches, players)
  if (duo) list.push(`🤝 Dúo más ganador: ${duo.name1} + ${duo.name2} (${duo.wins}/${duo.total})`)

  return list
}

function WinBar({ pct }: { pct: number }) {
  return (
    <div className="w-14 h-1 bg-border rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{
        width: `${Math.min(pct, 100)}%`,
        background: pct >= 60 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444",
      }} />
    </div>
  )
}

/* ─── Component ─── */

export default function CastelarHome() {
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [allMatches, setAllMatches] = useState<CastelarMatch[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("ranking")
  const [sortKey, setSortKey] = useState<SortKey>("wins")
  const [sortAsc, setSortAsc] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [allInsights, setAllInsights] = useState<string[]>([])

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    Promise.all([
      fetchCastelarPlayers(),
      fetchAllMatches(),
      getActualMatchCount(),
    ]).then(([ps, matches, count]) => {
      setPlayers(ps)
      setAllMatches(matches)
      setMatchCount(count)
      const computed = computeInsights(ps, matches)
      setAllInsights(computed)
      if (computed.length > 0)
        setInsight(computed[Math.floor(Math.random() * computed.length)])
    }).finally(() => setLoading(false))
  }, [])

  const refreshInsight = () => {
    if (allInsights.length <= 1) return
    let next: string
    do { next = allInsights[Math.floor(Math.random() * allInsights.length)] }
    while (next === insight)
    setInsight(next)
  }

  const worldCup = useMemo(() => sortWorldCup(players), [players])
  const ranking = useMemo(() => [...players].sort((a, b) => {
    const dir = sortAsc ? 1 : -1
    return (a[sortKey] - b[sortKey]) * dir
  }), [players, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? null : sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />

  const thCls = (col: SortKey) =>
    `text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors whitespace-nowrap ${
      sortKey === col ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">

      {/* ─── Insight / stats bar ─── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Partidos registrados</p>
          <p className="text-3xl font-bold tabular text-primary leading-none mt-0.5">{matchCount}</p>
        </div>
        {insight && (
          <div className="flex items-start gap-2 sm:justify-end">
            <p className="text-sm text-foreground sm:text-right sm:max-w-xs leading-snug">{insight}</p>
            {allInsights.length > 1 && (
              <button
                onClick={refreshInsight}
                className="flex-shrink-0 mt-0.5 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Otro dato"
              >
                <RefreshCw size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Tab switcher ─── */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 w-fit">
        {(["ranking", "mundial"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "mundial" ? "Mundial" : "Ranking"}
          </button>
        ))}
      </div>

      {/* ─── Mundial tab ─── */}
      {tab === "mundial" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fase</th>
                  <th className="text-right px-5 py-3 text-sm">🏆</th>
                </tr>
              </thead>
              <tbody>
                {worldCup.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground text-sm">Sin jugadores.</td></tr>
                ) : worldCup.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{p.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold ${STAGE_COLORS[p.stageIndex] ?? "text-muted-foreground"}`}>
                        {STAGE_LABELS[p.stageIndex] ?? "Grupos"}
                        {p.stageIndex === 0 && (
                          <span className="text-muted-foreground font-normal ml-1">({p.groupWins}-{p.groupLosses})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.championships > 0
                        ? <span className="text-warning font-bold tabular">{p.championships}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Ranking tab ─── */}
      {tab === "ranking" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                  <th className={thCls("wins")} onClick={() => handleSort("wins")}>
                    <span className="flex items-center gap-1">G-P <SortIcon col="wins" /></span>
                  </th>
                  <th className={thCls("winPercentage")} onClick={() => handleSort("winPercentage")}>
                    <span className="flex items-center gap-1">% V <SortIcon col="winPercentage" /></span>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">Sin jugadores.</td></tr>
                ) : ranking.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">{p.name}</td>
                    <td className="px-4 py-3.5 text-xs tabular font-semibold whitespace-nowrap">
                      <span className="text-success">{p.wins}</span>
                      <span className="text-muted-foreground mx-0.5">-</span>
                      <span className="text-destructive">{p.losses}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`tabular font-bold text-xs ${
                        p.winPercentage >= 60 ? "text-success"
                        : p.winPercentage >= 40 ? "text-warning"
                        : "text-destructive"
                      }`}>{p.winPercentage.toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/castelar/jugadores/${p.id}`}
                        className="text-xs font-semibold text-primary hover:underline whitespace-nowrap"
                      >
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
