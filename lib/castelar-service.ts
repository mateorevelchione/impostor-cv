import { ensureSupabase } from "./supabase-client"
import {
  applyMatchResult,
  CastelarPlayer,
  computeWinPercentage,
  formatPhaseLabel,
  toCastelarPlayer,
  toDatabasePayload,
} from "./castelar-logic"

export interface CastelarPlayerRow extends CastelarPlayer {
  phaseLabel: string
  winPercentage: number
  record: string
}

export async function fetchCastelarPlayers(): Promise<CastelarPlayerRow[]> {
  const supabase = ensureSupabase()
  const { data, error } = await supabase
    .from("castelar_players")
    .select("id, name, wins, losses, championships, stage_index, group_wins, group_losses")
    .order("name")

  if (error) {
    throw error
  }

  const players = (data ?? []).map((row) => {
    const player = toCastelarPlayer(row)
    return {
      ...player,
      phaseLabel: formatPhaseLabel(player),
      winPercentage: computeWinPercentage(player),
      record: `${player.wins}-${player.losses}`,
    }
  })

  return players
}

export async function addCastelarPlayer(name: string): Promise<CastelarPlayerRow> {
  const supabase = ensureSupabase()
  const { data, error } = await supabase
    .from("castelar_players")
    .insert({
      name,
      wins: 0,
      losses: 0,
      championships: 0,
      stage_index: 0,
      group_wins: 0,
      group_losses: 0,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  const player = toCastelarPlayer(data)
  return {
    ...player,
    phaseLabel: formatPhaseLabel(player),
    winPercentage: 0,
    record: "0-0",
  }
}

export async function deleteCastelarPlayer(id: string) {
  const supabase = ensureSupabase()
  const { error } = await supabase.from("castelar_players").delete().eq("id", id)

  if (error) {
    throw error
  }
}

export async function submitCastelarMatch({
  winningTeam,
  losingTeam,
}: {
  winningTeam: CastelarPlayer[]
  losingTeam: CastelarPlayer[]
}) {
  const supabase = ensureSupabase()

  const updatedWinningTeam = winningTeam.map((player) => applyMatchResult(player, true))
  const updatedLosingTeam = losingTeam.map((player) => applyMatchResult(player, false))

  // nothing to persist if we didn't update anyone
  if (updatedWinningTeam.length === 0 && updatedLosingTeam.length === 0) {
    return { winners: [], losers: [] }
  }

  const payload = [...updatedWinningTeam, ...updatedLosingTeam].map((player) =>
    toDatabasePayload({
      id: player.id,
      name: player.name,
      wins: player.wins,
      losses: player.losses,
      championships: player.championships,
      stageIndex: player.stageIndex,
      groupWins: player.groupWins,
      groupLosses: player.groupLosses,
    }),
  )

  const { error } = await supabase.from("castelar_players").upsert(payload, { onConflict: "id" })

  if (error) {
    throw error
  }

  return {
    winners: updatedWinningTeam,
    losers: updatedLosingTeam,
  }
}

export async function saveCastelarPlayer(player: CastelarPlayer) {
  const supabase = ensureSupabase()
  const payload = toDatabasePayload({
    id: player.id,
    name: player.name,
    wins: player.wins,
    losses: player.losses,
    championships: player.championships,
    stageIndex: player.stageIndex,
    groupWins: player.groupWins,
    groupLosses: player.groupLosses,
  })

  const { error } = await supabase.from("castelar_players").upsert([payload], { onConflict: "id" })

  if (error) {
    throw error
  }
}
