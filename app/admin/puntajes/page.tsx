"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Check, Lock } from "lucide-react"
import { getRatings, setRatings, RatingEntry } from "@/lib/team-tools"

export default function PuntajesPage() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [entries, setEntries] = useState<RatingEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const unlock = async () => {
    setLoading(true)
    setError(null)
    try {
      const { players } = await getRatings(pin.trim())
      setEntries(players)
      setUnlocked(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo acceder.")
    } finally {
      setLoading(false)
    }
  }

  const setRating = (id: string, rating: number | null) => {
    setSaved(false)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, rating } : e)))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await setRatings(
        pin.trim(),
        entries.map((e) => ({ playerId: e.id, rating: e.rating })),
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.")
    } finally {
      setSaving(false)
    }
  }

  const rated = entries.filter((e) => e.rating != null).length

  /* ─── Lock screen ─── */
  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted">
            <Lock size={20} className="text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Puntajes de jugadores</h1>
          <p className="text-sm text-muted-foreground">
            Solo vos. Estos puntajes están ocultos para el resto.
          </p>
        </div>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") unlock() }}
          className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-center text-2xl tracking-widest focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="····"
          autoFocus
        />
        {error && <p className="text-xs text-destructive text-center">{error}</p>}
        <button
          onClick={unlock}
          disabled={loading || !pin.trim()}
          className="w-full py-3 rounded-xl bg-primary text-background font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all hover:brightness-110"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          Entrar
        </button>
        <button
          onClick={() => router.push("/admin")}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver al admin
        </button>
      </div>
    )
  }

  /* ─── Editor ─── */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <button
        onClick={() => router.push("/admin")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft size={15} /> Admin
      </button>

      <div>
        <h1 className="text-xl font-bold text-foreground">Puntajes para armar equipos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Nivel del 1 al 10 según tu criterio. El generador usa esto (80%) + el récord (20%).
          Nadie más lo ve.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {entries.length} jugadores
          </span>
          <span className="text-xs text-muted-foreground tabular">{rated} con puntaje</span>
        </div>
        <div className="divide-y divide-border/30">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-sm font-semibold text-foreground">{e.name}</span>
              <select
                value={e.rating ?? ""}
                onChange={(ev) => setRating(e.id, ev.target.value === "" ? null : Number(ev.target.value))}
                className={`px-3 py-1.5 rounded-lg bg-muted border text-sm font-bold tabular focus:outline-none focus:ring-1 focus:ring-primary ${
                  e.rating == null ? "border-border text-muted-foreground" : "border-primary/40 text-primary"
                }`}
              >
                <option value="">—</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
          saved ? "bg-success/15 text-success border border-success/40" : "bg-primary text-background hover:brightness-110"
        }`}
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
        {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar puntajes"}
      </button>
    </div>
  )
}
