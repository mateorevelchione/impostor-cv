"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Copy, Check, Shuffle, Loader2 } from "lucide-react"
import { fetchCastelarPlayers, CastelarPlayerRow } from "@/lib/castelar-service"
import { isSupabaseReady } from "@/lib/supabase-client"
import { generateTeams, GenerateResult, GeneratedPlayer } from "@/lib/team-tools"

function buildWhatsAppText(teamA: GeneratedPlayer[], teamB: GeneratedPlayer[]): string {
  const listA = teamA.map((p) => `  • ${p.name}`).join("\n")
  const listB = teamB.map((p) => `  • ${p.name}`).join("\n")
  return `⚽ Equipos de hoy\n\n🟢 Equipo A\n${listA}\n\n🔴 Equipo B\n${listB}`
}

function balanceLabel(diff: number): { text: string; color: string } {
  if (diff <= 0.5) return { text: "Muy parejo ✓", color: "text-success" }
  if (diff <= 1.5) return { text: "Parejo", color: "text-success" }
  if (diff <= 3) return { text: "Aceptable", color: "text-warning" }
  return { text: "Lo más parejo posible con estos jugadores", color: "text-warning" }
}

export default function EquiposPage() {
  const [players, setPlayers] = useState<CastelarPlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isSupabaseReady()) { setLoading(false); return }
    fetchCastelarPlayers()
      .then((ps) => setPlayers(ps.sort((a, b) => a.name.localeCompare(b.name))))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setResult(null)
    setError(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await generateTeams([...selected])
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar.")
    } finally {
      setGenerating(false)
    }
  }

  const copy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(buildWhatsAppText(result.teamA, result.teamB))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setSelected(new Set())
    setResult(null)
    setError(null)
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
          Seleccioná los jugadores de hoy y armamos los equipos más parejos posible.
        </p>
      </div>

      {/* Player selector */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jugadores de hoy
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
              {count} elegidos
            </span>
          </div>
        </div>
        <div className="divide-y divide-border/30">
          {players.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sin jugadores.</p>
          ) : players.map((p) => {
            const active = selected.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                  active ? "bg-primary/8 hover:bg-primary/12" : "hover:bg-muted/20"
                }`}
              >
                <span className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  active ? "bg-primary border-primary" : "border-border"
                }`}>
                  {active && <Check size={11} strokeWidth={3} className="text-background" />}
                </span>
                <span className={`text-sm font-semibold transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {p.name}
                </span>
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
        disabled={!canGenerate || generating}
        className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-background hover:brightness-110"
      >
        {generating ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
        {generating ? "Armando..." : "Generar equipos parejos"}
      </button>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Team A */}
            <div className="bg-card border border-success/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success flex-shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-success">Equipo A</h2>
              </div>
              <div className="space-y-2">
                {result.teamA.map((p) => (
                  <p key={p.id} className="text-sm font-medium text-foreground">{p.name}</p>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className="bg-card border border-destructive/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive flex-shrink-0" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-destructive">Equipo B</h2>
              </div>
              <div className="space-y-2">
                {result.teamB.map((p) => (
                  <p key={p.id} className="text-sm font-medium text-foreground">{p.name}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Balance indicator */}
          <div className="bg-card border border-border rounded-2xl px-5 py-3 text-center">
            <span className={`text-sm font-semibold ${balanceLabel(result.diff).color}`}>
              {balanceLabel(result.diff).text}
            </span>
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
