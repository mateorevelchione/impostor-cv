"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ChevronLeft, Trophy } from "lucide-react"
import {
  fetchPlayerById,
  fetchMatchesForPlayer,
  fetchCastelarPlayers,
  CastelarPlayerRow,
  CastelarMatch,
} from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"

const STAGE_LABELS = ["Grupos", "Octavos", "Cuartos", "Semifinal", "Final"]

function computeForm(matches: CastelarMatch[], playerId: string): ("W" | "L")[] {
  return matches.slice(0, 5).map((m) =>
    m.winning_team.includes(playerId) ? "W" : "L"
  )
}

function computeCompanions(
  matches: CastelarMatch[],
  playerId: string,
  allPlayers: CastelarPlayerRow[]
) {
  const map = new Map<string, { total: number; wins: number }>()

  for (const match of matches) {
    const inWinners = match.winning_team.includes(playerId)
    const inLosers = match.losing_team.includes(playerId)
    const teammates = inWinners
      ? match.winning_team
      : inLosers
      ? match.losing_team
      : []

    for (const id of teammates) {
      if (id === playerId) continue
      const curr = map.get(id) ?? { total: 0, wins: 0 }
      map.set(id, { total: curr.total + 1, wins: curr.wins + (inWinners ? 1 : 0) })
    }
  }

  return Array.from(map.entries())
    .map(([id, s]) => ({
      id,
      name: allPlayers.find((p) => p.id === id)?.name ?? "?",
      total: s.total,
      wins: s.wins,
      winPct: s.total > 0 ? (s.wins / s.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

function computeCurrentStreak(matches: CastelarMatch[], playerId: string): { count: number; type: "W" | "L" | null } {
  if (matches.length === 0) return { count: 0, type: null }
  const first = matches[0].winning_team.includes(playerId) ? "W" : "L"
  let count = 0
  for (const m of matches) {
    const result = m.winning_team.includes(playerId) ? "W" : "L"
    if (result === first) count++
    else break
  }
  return { count, type: first }
}

export default function PlayerProfilePage() {
  const { id } = useParams() as { id: string }
  const [player, setPlayer] = useState<CastelarPlayerRow | null>(null)
  const [matches, setMatches] = useState<CastelarMatch[]>([])
  const [allPlayers, setAllPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseReady() || !id) { setLoading(false); return }
    Promise.all([
      fetchPlayerById(id),
      fetchMatchesForPlayer(id, 40),
      fetchCastelarPlayers(),
    ])
      .then(([p, m, all]) => {
        setPlayer(p)
        setMatches(m)
        setAllPlayers(all)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Jugador no encontrado.</p>
        <Link href="/jugadores" className="text-primary text-sm mt-4 inline-block">← Volver a jugadores</Link>
      </div>
    )
  }

  const form = computeForm(matches, id)
  const companions = computeCompanions(matches, id, allPlayers)
  const streak = computeCurrentStreak(matches, id)
  const pj = player.wins + player.losses
  const smallSample = pj < 5

  const getName = (pid: string) => allPlayers.find((p) => p.id === pid)?.name ?? "?"

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* Back */}
      <Link href="/jugadores" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft size={15} /> Jugadores
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{player.name}</h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {STAGE_LABELS[player.stageIndex] ?? "Grupos"}
            </span>
            {player.championships > 0 && (
              <span className="text-xs text-warning font-semibold flex items-center gap-1">
                <Trophy size={12} /> {player.championships} {player.championships === 1 ? "campeonato" : "campeonatos"}
              </span>
            )}
          </div>
        </div>
        {smallSample && (
          <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-1 rounded-lg">
            Muestra chica (&lt;5 partidos)
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "PJ", value: pj, color: "text-foreground" },
          { label: "PG", value: player.wins, color: "text-success" },
          { label: "PP", value: player.losses, color: "text-destructive" },
          {
            label: "% V",
            value: `${player.winPercentage.toFixed(0)}%`,
            color: player.winPercentage >= 60 ? "text-success" : player.winPercentage >= 40 ? "text-warning" : "text-destructive",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={`text-3xl font-bold tabular ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Form + streak */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Forma reciente</h2>
        <div className="flex items-center gap-2">
          {form.length === 0 ? (
            <span className="text-sm text-muted-foreground">Sin partidos</span>
          ) : form.map((r, i) => (
            <span
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                r === "W" ? "bg-success/20 text-success border border-success/30" : "bg-destructive/20 text-destructive border border-destructive/30"
              }`}
            >
              {r}
            </span>
          ))}
          {form.length < 5 && Array.from({ length: 5 - form.length }).map((_, i) => (
            <span key={`empty-${i}`} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-xs text-muted-foreground">—</span>
          ))}
          <span className="ml-2 text-xs text-muted-foreground">últimos {Math.min(5, matches.length)}</span>
        </div>
        {streak.count >= 2 && streak.type && (
          <p className="text-sm">
            <span className={streak.type === "W" ? "text-success font-semibold" : "text-destructive font-semibold"}>
              Racha de {streak.count} {streak.type === "W" ? "victorias" : "derrotas"} consecutivas
            </span>
          </p>
        )}
      </div>

      {/* Companions */}
      {companions.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Compañeros frecuentes</h2>
          <div className="space-y-2">
            {companions.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4">
                <Link href={`/jugadores/${c.id}`} className="text-sm text-foreground hover:text-primary transition-colors font-medium">
                  {c.name}
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="tabular">{c.total} juntos</span>
                  <span className={`tabular font-semibold ${c.winPct >= 60 ? "text-success" : c.winPct >= 40 ? "text-warning" : "text-destructive"}`}>
                    {c.winPct.toFixed(0)}% victorias
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Match history */}
      <div className="space-y-3">
        <h2 className="font-bold text-foreground">Historial de partidos</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {matches.length === 0 ? (
            <p className="px-4 py-10 text-center text-muted-foreground text-sm">Sin partidos registrados.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {matches.map((match) => {
                const isWinner = match.winning_team.includes(id)
                const teammates = (isWinner ? match.winning_team : match.losing_team).filter((pid) => pid !== id)
                const rivals = (isWinner ? match.losing_team : match.winning_team)
                const date = new Date(match.match_date)
                return (
                  <Link
                    key={match.id}
                    href={`/partidos/${match.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        isWinner
                          ? "bg-success/10 border border-success/30 text-success"
                          : "bg-destructive/10 border border-destructive/30 text-destructive"
                      }`}>
                        {isWinner ? "V" : "D"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">#{match.match_number}</span>
                        <span>·</span>
                        <span>{date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="text-foreground">Con: </span>{teammates.map(getName).join(", ") || "—"}
                        <span className="mx-2">·</span>
                        <span className="text-foreground">vs: </span>{rivals.map(getName).join(", ") || "—"}
                      </p>
                    </div>
                    <ChevronLeft size={14} className="flex-shrink-0 text-muted-foreground rotate-180" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
