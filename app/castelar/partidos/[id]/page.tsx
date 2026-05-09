"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ChevronLeft } from "lucide-react"
import { fetchMatchById, fetchCastelarPlayers, CastelarMatch, CastelarPlayerRow } from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"

export default function PartidoDetailPage() {
  const { id } = useParams() as { id: string }
  const [match, setMatch] = useState<CastelarMatch | null>(null)
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseReady() || !id) { setLoading(false); return }
    Promise.all([fetchMatchById(id), fetchCastelarPlayers()])
      .then(([m, p]) => { setMatch(m); setPlayers(p) })
      .finally(() => setLoading(false))
  }, [id])

  const getPlayer = (pid: string) => players.find((p) => p.id === pid)

  if (loading) return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  if (!match) return (
    <div className="max-w-5xl mx-auto px-4 py-16 text-center">
      <p className="text-muted-foreground">Partido no encontrado.</p>
      <Link href="/castelar/partidos" className="text-primary text-sm mt-4 inline-block">← Partidos</Link>
    </div>
  )

  const date = new Date(match.match_date)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      <Link href="/castelar/partidos" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft size={15} /> Partidos
      </Link>

      {/* Header — sin numeral */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Partido</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">
          {date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-success/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-success">Ganadores</h2>
          </div>
          <div className="space-y-3">
            {match.winning_team.length === 0
              ? <p className="text-sm text-muted-foreground">—</p>
              : match.winning_team.map((pid) => {
                const p = getPlayer(pid)
                return (
                  <div key={pid} className="flex items-center justify-between gap-2">
                    {p
                      ? <Link href={`/castelar/jugadores/${pid}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{p.name}</Link>
                      : <span className="text-sm text-muted-foreground">{pid.slice(0, 8)}…</span>}
                    {p && <span className="text-xs text-muted-foreground tabular">{p.record}</span>}
                  </div>
                )
              })}
          </div>
        </div>

        <div className="bg-card border border-destructive/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive" />
            <h2 className="text-xs font-semibold uppercase tracking-wide text-destructive">Perdedores</h2>
          </div>
          <div className="space-y-3">
            {match.losing_team.length === 0
              ? <p className="text-sm text-muted-foreground">—</p>
              : match.losing_team.map((pid) => {
                const p = getPlayer(pid)
                return (
                  <div key={pid} className="flex items-center justify-between gap-2">
                    {p
                      ? <Link href={`/castelar/jugadores/${pid}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{p.name}</Link>
                      : <span className="text-sm text-muted-foreground">{pid.slice(0, 8)}…</span>}
                    {p && <span className="text-xs text-muted-foreground tabular">{p.record}</span>}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}
