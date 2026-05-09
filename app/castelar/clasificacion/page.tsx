"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { fetchCastelarPlayers, CastelarPlayerRow } from "@/lib/castelar-service"
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

function WinBar({ pct }: { pct: number }) {
  return (
    <div className="w-14 h-1 bg-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(pct, 100)}%`,
          background: pct >= 60 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444",
        }}
      />
    </div>
  )
}

export default function ClasificacionPage() {
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("mundial")
  const [sortKey, setSortKey] = useState<SortKey>("wins")
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    fetchCastelarPlayers().then(setPlayers).finally(() => setLoading(false))
  }, [])

  const worldCup = useMemo(() => sortWorldCup(players), [players])

  const ranking = useMemo(() => {
    return [...players].sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      return (a[sortKey] - b[sortKey]) * dir
    })
  }, [players, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? null : sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />

  const thCls = (col: SortKey) =>
    `text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors ${
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-foreground">Clasificación</h1>

      {/* Tab switcher */}
      <div className="flex bg-muted rounded-xl p-1 gap-1 w-fit">
        {(["mundial", "ranking"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "mundial" ? "Mundial" : "Ranking"}
          </button>
        ))}
      </div>

      {/* Mundial tab */}
      {tab === "mundial" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fase</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Record</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Copas</th>
                </tr>
              </thead>
              <tbody>
                {worldCup.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">Sin jugadores.</td></tr>
                ) : worldCup.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/castelar/jugadores/${p.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold ${STAGE_COLORS[p.stageIndex] ?? "text-muted-foreground"}`}>
                        {STAGE_LABELS[p.stageIndex] ?? "Grupos"}
                        {p.stageIndex === 0 && (
                          <span className="text-muted-foreground font-normal ml-1">({p.groupWins}G-{p.groupLosses}P)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground tabular">{p.record}</td>
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

      {/* Ranking tab */}
      {tab === "ranking" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                  <th className={thCls("wins")} onClick={() => handleSort("wins")}>
                    <span className="flex items-center gap-1">PG <SortIcon col="wins" /></span>
                  </th>
                  <th className={thCls("losses")} onClick={() => handleSort("losses")}>
                    <span className="flex items-center gap-1">PP <SortIcon col="losses" /></span>
                  </th>
                  <th className={thCls("winPercentage")} onClick={() => handleSort("winPercentage")}>
                    <span className="flex items-center gap-1">% V <SortIcon col="winPercentage" /></span>
                  </th>
                  <th className={thCls("championships")} onClick={() => handleSort("championships")}>
                    <span className="flex items-center gap-1">Copas <SortIcon col="championships" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground text-sm">Sin jugadores.</td></tr>
                ) : ranking.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/castelar/jugadores/${p.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 tabular text-success font-medium">{p.wins}</td>
                    <td className="px-4 py-3.5 tabular text-destructive font-medium">{p.losses}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <WinBar pct={p.winPercentage} />
                        <span className={`tabular font-bold text-xs ${
                          p.winPercentage >= 60 ? "text-success"
                          : p.winPercentage >= 40 ? "text-warning"
                          : "text-destructive"
                        }`}>{p.winPercentage.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 tabular font-semibold text-warning">
                      {p.championships > 0 ? p.championships : <span className="text-muted-foreground font-normal">—</span>}
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
