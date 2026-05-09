"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react"
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

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

      <div className="flex items-center gap-3">
        <Link href="/castelar" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={15} /> Inicio
        </Link>
        <span className="text-border">|</span>
        <div>
          <h1 className="font-bold text-foreground">Partidos</h1>
        </div>
        <span className="ml-auto text-sm text-muted-foreground tabular">{matches.length} registrados</span>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {matches.length === 0 ? (
          <p className="px-5 py-12 text-center text-muted-foreground text-sm">Sin partidos todavía.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {matches.map((match) => {
              const date = new Date(match.match_date)
              const winners = match.winning_team.map(getName)
              const losers = match.losing_team.map(getName)
              return (
                <Link
                  key={match.id}
                  href={`/castelar/partidos/${match.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group"
                >
                  {/* Date */}
                  <div className="flex-shrink-0 w-14 text-right">
                    <p className="text-xs font-semibold text-foreground">
                      {date.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {date.getFullYear()}
                    </p>
                  </div>

                  {/* Teams */}
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-success mb-0.5">Ganadores</p>
                      <p className="text-sm text-foreground truncate">{winners.join(", ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-0.5">Perdedores</p>
                      <p className="text-sm text-foreground truncate">{losers.join(", ") || "—"}</p>
                    </div>
                  </div>

                  <ChevronRight size={15} className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
