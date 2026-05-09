"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ChevronRight } from "lucide-react"
import { fetchAllMatches, fetchCastelarPlayers, CastelarMatch, CastelarPlayerRow } from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"

export default function PartidosPage() {
  const [matches, setMatches] = useState<CastelarMatch[]>([])
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    Promise.all([fetchAllMatches(), fetchCastelarPlayers()])
      .then(([m, p]) => { setMatches(m); setPlayers(p) })
      .finally(() => setLoading(false))
  }, [])

  const getName = (id: string) => players.find((p) => p.id === id)?.name ?? "?"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partidos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{matches.length} partidos registrados</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {matches.length === 0 ? (
          <p className="px-4 py-12 text-center text-muted-foreground text-sm">Sin partidos todavía.</p>
        ) : (
          <div className="divide-y divide-border/50">
            {matches.map((match) => {
              const date = new Date(match.match_date)
              const winners = match.winning_team.map(getName)
              const losers = match.losing_team.map(getName)
              return (
                <Link
                  key={match.id}
                  href={`/partidos/${match.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    {/* Number + date */}
                    <div className="flex-shrink-0 text-right w-12">
                      <p className="text-xs font-mono text-primary font-bold">#{match.match_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </p>
                    </div>

                    {/* Teams */}
                    <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-success mb-1">Ganadores</p>
                        <p className="text-sm text-foreground truncate">{winners.join(", ") || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">Perdedores</p>
                        <p className="text-sm text-foreground truncate">{losers.join(", ") || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
