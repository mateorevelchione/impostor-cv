"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Copy, Check, Shuffle, Users } from "lucide-react"
import { Loader2 } from "lucide-react"
import { fetchCastelarPlayers, CastelarPlayerRow } from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"

/* ─── Algorithm ─── */

function effectiveRating(p: CastelarPlayerRow): number {
  const games = p.wins + p.losses
  // Small sample (<5 games) → use 50% to avoid noise
  return games >= 5 ? p.winPercentage : 50
}

function balanceTeams(selected: CastelarPlayerRow[], randomize = false) {
  // Add optional jitter to break ties and produce different valid splits on regenerate
  const arr = [...selected]
    .map((p) => ({ player: p, r: effectiveRating(p) + (randomize ? (Math.random() - 0.5) * 12 : 0) }))
    .sort((a, b) => b.r - a.r)

  const teamA: CastelarPlayerRow[] = []
  const teamB: CastelarPlayerRow[] = []
  let sumA = 0
  let sumB = 0

  for (const { player, r } of arr) {
    if (sumA <= sumB) { teamA.push(player); sumA += r }
    else              { teamB.push(player); sumB += r }
  }

  // Recalculate avgs with real (non-jittered) ratings for display
  const avgA = teamA.reduce((s, p) => s + effectiveRating(p), 0) / (teamA.length || 1)
  const avgB = teamB.reduce((s, p) => s + effectiveRating(p), 0) / (teamB.length || 1)

  return { teamA, teamB, avgA, avgB }
}

function buildWhatsAppText(
  teamA: CastelarPlayerRow[],
  teamB: CastelarPlayerRow[],
): string {
  const listA = teamA.map((p) => `  • ${p.name}`).join("\n")
  const listB = teamB.map((p) => `  • ${p.name}`).join("\n")
  return `⚽ Equipos de hoy\n\n🟢 Equipo A\n${listA}\n\n🔴 Equipo B\n${listB}`
}

/* ─── Component ─── */

export default function EquiposPage() {
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<ReturnType<typeof balanceTeams> | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    fetchCastelarPlayers()
      .then((ps) => setPlayers(ps.sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setResult(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getSelected = () => players.filter((p) => selected.has(p.id))

  const generate = () => setResult(balanceTeams(getSelected(), false))
  const regenerate = () => setResult(balanceTeams(getSelected(), true))

  const copy = async () => {
    if (!result) return
    const text = buildWhatsAppText(result.teamA, result.teamB)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setSelected(new Set())
    setResult(null)
  }

  const count = selected.size
  const canGenerate = count >= 4 && count % 2 === 0

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

      <Link href="/castelar" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ChevronLeft size={15} /> Inicio
      </Link>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Generador de equipos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Seleccioná los jugadores de hoy y armamos equipos equilibrados.
        </p>
      </div>

      {/* Player selector */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jugadores disponibles
          </p>
          <div className="flex items-center gap-3">
            {count > 0 && (
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Limpiar
              </button>
            )}
            <span className={`text-xs font-bold tabular ${
              count === 0 ? "text-muted-foreground"
              : canGenerate ? "text-primary"
              : "text-warning"
            }`}>
              {count} seleccionados
            </span>
          </div>
        </div>
        <div className="divide-y divide-border/30">
          {players.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sin jugadores.</p>
          ) : players.map((p) => {
            const active = selected.has(p.id)
            const rating = effectiveRating(p)
            const games = p.wins + p.losses
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors ${
                  active ? "bg-primary/8 hover:bg-primary/12" : "hover:bg-muted/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    active ? "bg-primary border-primary" : "border-border"
                  }`}>
                    {active && <Check size={11} strokeWidth={3} className="text-background" />}
                  </span>
                  <span className={`text-sm font-semibold transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {p.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="tabular">{games} PJ</span>
                  <span className={`tabular font-bold ${
                    rating >= 60 ? "text-success" : rating >= 40 ? "text-warning" : "text-destructive"
                  }`}>{rating.toFixed(0)}%</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hint */}
      {!canGenerate && count > 0 && (
        <p className="text-xs text-warning text-center">
          {count % 2 !== 0
            ? "Necesitás un número par de jugadores"
            : "Seleccioná al menos 4 jugadores"}
        </p>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={!canGenerate}
        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-background hover:brightness-110"
      >
        <Shuffle size={16} />
        Generar equipos equilibrados
      </button>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Team A */}
            <div className="bg-card border border-success/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success flex-shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-success">Equipo A</h2>
                <span className="ml-auto text-xs text-muted-foreground tabular">{result.avgA.toFixed(0)}% prom.</span>
              </div>
              <div className="space-y-2">
                {result.teamA.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className={`text-xs tabular font-semibold ${
                      effectiveRating(p) >= 60 ? "text-success"
                      : effectiveRating(p) >= 40 ? "text-warning"
                      : "text-destructive"
                    }`}>{effectiveRating(p).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-card border border-destructive/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive flex-shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-destructive">Equipo B</h2>
                <span className="ml-auto text-xs text-muted-foreground tabular">{result.avgB.toFixed(0)}% prom.</span>
              </div>
              <div className="space-y-2">
                {result.teamB.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className={`text-xs tabular font-semibold ${
                      effectiveRating(p) >= 60 ? "text-success"
                      : effectiveRating(p) >= 40 ? "text-warning"
                      : "text-destructive"
                    }`}>{effectiveRating(p).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Balance indicator */}
          <div className="bg-card border border-border rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users size={14} />
              <span>Diferencia de nivel:</span>
              <span className={`font-bold tabular ${
                Math.abs(result.avgA - result.avgB) <= 5 ? "text-success"
                : Math.abs(result.avgA - result.avgB) <= 12 ? "text-warning"
                : "text-destructive"
              }`}>
                {Math.abs(result.avgA - result.avgB).toFixed(1)}%
              </span>
              {Math.abs(result.avgA - result.avgB) <= 5 && (
                <span className="text-xs text-success">muy equilibrado ✓</span>
              )}
            </div>
            <button
              onClick={regenerate}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Shuffle size={12} /> Regenerar
            </button>
          </div>

          {/* Copy for WhatsApp */}
          <button
            onClick={copy}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all border ${
              copied
                ? "bg-success/10 border-success/40 text-success"
                : "bg-card border-border text-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "¡Copiado!" : "Copiar para WhatsApp"}
          </button>
        </div>
      )}
    </div>
  )
}
