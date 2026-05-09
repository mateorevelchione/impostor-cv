"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, ChevronUp, ChevronDown } from "lucide-react"
import { fetchCastelarPlayers, CastelarPlayerRow } from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"

type SortKey = "wins" | "winPercentage" | "losses" | "championships"

const STAGE_LABELS = ["Grupos", "Octavos", "Cuartos", "Semifinal", "Final"]

function WinPctBar({ pct }: { pct: number }) {
  return (
    <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
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

export default function JugadoresPage() {
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>("wins")
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    fetchCastelarPlayers()
      .then(setPlayers)
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(() => {
    return [...players].sort((a, b) => {
      const dir = sortAsc ? 1 : -1
      return (a[sortKey] - b[sortKey]) * dir
    })
  }, [players, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="w-3" />
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const thClass = (col: SortKey) =>
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jugadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{players.length} jugadores registrados</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jugador</th>
                <th
                  className={thClass("wins")}
                  onClick={() => handleSort("wins")}
                >
                  <span className="flex items-center gap-1">PG <SortIcon col="wins" /></span>
                </th>
                <th
                  className={thClass("losses")}
                  onClick={() => handleSort("losses")}
                >
                  <span className="flex items-center gap-1">PP <SortIcon col="losses" /></span>
                </th>
                <th
                  className={thClass("winPercentage")}
                  onClick={() => handleSort("winPercentage")}
                >
                  <span className="flex items-center gap-1">% V <SortIcon col="winPercentage" /></span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fase</th>
                <th
                  className={thClass("championships")}
                  onClick={() => handleSort("championships")}
                >
                  <span className="flex items-center gap-1">Copas <SortIcon col="championships" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Sin jugadores todavía.
                  </td>
                </tr>
              ) : sorted.map((player, i) => (
                <tr
                  key={player.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3.5">
                    <Link href={`/jugadores/${player.id}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                      {player.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 tabular text-success font-medium">{player.wins}</td>
                  <td className="px-4 py-3.5 tabular text-destructive font-medium">{player.losses}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <WinPctBar pct={player.winPercentage} />
                      <span className={`tabular font-bold text-xs ${
                        player.winPercentage >= 60 ? "text-success"
                        : player.winPercentage >= 40 ? "text-warning"
                        : "text-destructive"
                      }`}>
                        {player.winPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {STAGE_LABELS[player.stageIndex] ?? "Grupos"}
                  </td>
                  <td className="px-4 py-3.5 tabular font-semibold text-warning">
                    {player.championships > 0 ? player.championships : <span className="text-muted-foreground font-normal">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
