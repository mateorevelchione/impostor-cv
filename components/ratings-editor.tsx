"use client"

import { useEffect, useState } from "react"
import { Loader2, Check, Sliders } from "lucide-react"
import { ADMIN_PIN } from "@/lib/config"
import { getRatings, setRatings, RatingEntry } from "@/lib/team-tools"

export function RatingsEditor() {
  const [entries, setEntries] = useState<RatingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRatings(ADMIN_PIN)
      .then(({ players }) => setEntries(players))
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los puntajes."))
      .finally(() => setLoading(false))
  }, [])

  const setRating = (id: string, rating: number | null) => {
    setSaved(false)
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, rating } : e)))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await setRatings(ADMIN_PIN, entries.map((e) => ({ playerId: e.id, rating: e.rating })))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.")
    } finally {
      setSaving(false)
    }
  }

  const rated = entries.filter((e) => e.rating != null).length

  return (
    <section className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <Sliders size={16} className="text-primary" />
          Puntajes para armar equipos
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Nivel del 1 al 10 según tu criterio. El generador usa esto (80%) + el récord (20%). Nadie más lo ve.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="px-5 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {entries.length} jugadores
            </span>
            <span className="text-xs text-muted-foreground tabular">{rated} con puntaje</span>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border/30">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
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
          <div className="p-5 border-t border-border space-y-3">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              onClick={save}
              disabled={saving}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                saved ? "bg-success/15 text-success border border-success/40" : "bg-primary text-primary-foreground hover:brightness-110"
              }`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
              {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar puntajes"}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
