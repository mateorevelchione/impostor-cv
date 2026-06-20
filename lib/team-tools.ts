import { ensureSupabase } from "./supabase-client"

export type GeneratedPlayer = { id: string; name: string }
export type GenerateResult = { teamA: GeneratedPlayer[]; teamB: GeneratedPlayer[]; diff: number }
export type RatingEntry = { id: string; name: string; rating: number | null }

const FN = "team-tools"

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = ensureSupabase()
  const { data, error } = await supabase.functions.invoke(FN, { body })
  if (error) {
    // Try to surface the function's JSON error message
    let msg = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx) {
        const parsed = await ctx.json()
        if (parsed?.error) msg = parsed.error
      }
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data as T
}

/** Public: balance teams using the secret server-side ratings. Returns only the teams. */
export function generateTeams(playerIds: string[]): Promise<GenerateResult> {
  return invoke<GenerateResult>({ action: "generate", playerIds })
}

/** Admin: read current ratings (PIN-checked server-side). */
export function getRatings(pin: string): Promise<{ players: RatingEntry[] }> {
  return invoke<{ players: RatingEntry[] }>({ action: "getRatings", pin })
}

/** Admin: save ratings (PIN-checked server-side). rating null clears it. */
export function setRatings(
  pin: string,
  ratings: { playerId: string; rating: number | null }[],
): Promise<{ ok: boolean }> {
  return invoke<{ ok: boolean }>({ action: "setRatings", pin, ratings })
}
