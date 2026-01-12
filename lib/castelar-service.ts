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

  // Update player stats
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

  const { error: playersError } = await supabase.from("castelar_players").upsert(payload, { onConflict: "id" })

  if (playersError) {
    throw playersError
  }

  // Record the match with date (only if we have teams)
  if (winningTeam.length > 0 || losingTeam.length > 0) {
    const matchDate = new Date().toISOString()
    const matchYear = new Date().getFullYear()
    const matchNumber = await incrementMatchCount()

    const winningTeamIds = winningTeam.map((p) => p.id)
    const losingTeamIds = losingTeam.map((p) => p.id)

    const { error: matchError } = await supabase.from("castelar_matches").insert({
      match_date: matchDate,
      match_number: matchNumber,
      year: matchYear,
      winning_team: winningTeamIds.length > 0 ? winningTeamIds : [],
      losing_team: losingTeamIds.length > 0 ? losingTeamIds : [],
    })

    if (matchError) {
      console.error("[castelar] Error recording match:", matchError)
      console.error("[castelar] Match data:", {
        match_date: matchDate,
        match_number: matchNumber,
        year: matchYear,
        winning_team: winningTeamIds,
        losing_team: losingTeamIds,
      })
      // Don't throw - player stats are already updated, match recording is secondary
    } else {
      console.log("[castelar] Match recorded successfully:", matchNumber)
    }
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

// Match recording functions
export interface CastelarMatch {
  id: string
  match_date: string
  match_number: number
  year: number
  winning_team: string[]
  losing_team: string[]
}

export interface CastelarConfig {
  id: string
  total_matches: number
  initial_match_number: number | null
}

export async function getMatchCount(): Promise<number> {
  const supabase = ensureSupabase()
  
  // Try to get config
  const { data: configData, error: configError } = await supabase
    .from("castelar_config")
    .select("total_matches")
    .limit(1)
    .single()

  if (configError || !configData) {
    // If no config exists, count matches from matches table
    const { count, error } = await supabase
      .from("castelar_matches")
      .select("*", { count: "exact", head: true })
    
    if (error) {
      console.error("[castelar] Error counting matches:", error)
      return 0
    }
    
    return count ?? 0
  }

  return configData.total_matches ?? 0
}

export async function getMatchCountByYear(year: number | null): Promise<number> {
  const supabase = ensureSupabase()
  
  if (year === null) {
    // Historical: return total count
    return getMatchCount()
  }

  const { count, error } = await supabase
    .from("castelar_matches")
    .select("*", { count: "exact", head: true })
    .eq("year", year)

  if (error) {
    console.error("[castelar] Error counting matches by year:", error)
    return 0
  }

  const matchCount = count ?? 0
  
  // If no matches registered for this year, return the total match count (assuming they're from this year)
  if (matchCount === 0) {
    return getMatchCount()
  }

  return matchCount
}

export async function setInitialMatchNumber(initialNumber: number): Promise<void> {
  const supabase = ensureSupabase()
  
  // Check if config exists
  const { data: existing } = await supabase
    .from("castelar_config")
    .select("id")
    .limit(1)
    .single()

  if (existing) {
    // Update existing config
    const { error } = await supabase
      .from("castelar_config")
      .update({
        total_matches: initialNumber,
        initial_match_number: initialNumber,
      })
      .eq("id", existing.id)

    if (error) {
      throw error
    }
  } else {
    // Create new config
    const { error } = await supabase
      .from("castelar_config")
      .insert({
        total_matches: initialNumber,
        initial_match_number: initialNumber,
      })

    if (error) {
      throw error
    }
  }
}

export async function getInitialMatchNumber(): Promise<number | null> {
  const supabase = ensureSupabase()
  
  const { data, error } = await supabase
    .from("castelar_config")
    .select("initial_match_number")
    .limit(1)
    .single()

  if (error || !data) {
    return null
  }

  return data.initial_match_number
}

async function incrementMatchCount(): Promise<number> {
  const supabase = ensureSupabase()
  
  // Get current count
  const currentCount = await getMatchCount()
  const newCount = currentCount + 1

  // Update or create config
  const { data: existing } = await supabase
    .from("castelar_config")
    .select("id")
    .limit(1)
    .single()

  if (existing) {
    const { error } = await supabase
      .from("castelar_config")
      .update({ total_matches: newCount })
      .eq("id", existing.id)

    if (error) {
      throw error
    }
  } else {
    const { error } = await supabase
      .from("castelar_config")
      .insert({ total_matches: newCount })

    if (error) {
      throw error
    }
  }

  return newCount
}

export async function fetchMatchesByYear(year: number | null): Promise<CastelarMatch[]> {
  const supabase = ensureSupabase()
  
  let query = supabase
    .from("castelar_matches")
    .select("*")
    .order("match_date", { ascending: false })

  if (year !== null) {
    query = query.eq("year", year)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as CastelarMatch[]
}

export async function fetchAllMatches(): Promise<CastelarMatch[]> {
  const supabase = ensureSupabase()
  
  const { data, error } = await supabase
    .from("castelar_matches")
    .select("*")
    .order("match_date", { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as CastelarMatch[]
}

export async function undoMatch(matchId: string): Promise<void> {
  const supabase = ensureSupabase()
  
  // Get the match to undo
  const { data: matchData, error: matchFetchError } = await supabase
    .from("castelar_matches")
    .select("*")
    .eq("id", matchId)
    .single()

  if (matchFetchError || !matchData) {
    throw new Error("Match not found")
  }

  const match = matchData as CastelarMatch
  
  // Get all current players
  const { data: playersData, error: playersError } = await supabase
    .from("castelar_players")
    .select("id, name, wins, losses, championships, stage_index, group_wins, group_losses")

  if (playersError) {
    throw playersError
  }

  // IMPORTANT: Instead of recalculating from zero, we'll just reverse this specific match
  // by manually subtracting wins/losses from the players involved
  const updates: any[] = []

  for (const row of playersData ?? []) {
    const player = toCastelarPlayer(row)
    let updated = false
    const updatedPlayer = { ...player }

    // If player was in winning team, subtract a win
    if (match.winning_team.includes(player.id)) {
      if (updatedPlayer.wins > 0) {
        updatedPlayer.wins -= 1
        updated = true
      }
      
      // Adjust stage if needed - if was in groups, subtract group win
      if (updatedPlayer.stageIndex === 0 && updatedPlayer.groupWins > 0) {
        updatedPlayer.groupWins -= 1
      }
      
      // If advanced to next stage, revert to previous
      // This is complex but we'll handle basic cases
      if (updatedPlayer.stageIndex > 0 && match.winning_team.includes(player.id)) {
        // Check if this win caused advancement - if so, revert
        // For simplicity, if stageIndex > 0, try to revert one stage
        if (updatedPlayer.stageIndex > 0) {
          updatedPlayer.stageIndex -= 1
          // If reverted to groups, reset group progress
          if (updatedPlayer.stageIndex === 0) {
            updatedPlayer.groupWins = Math.max(0, updatedPlayer.groupWins - 1)
          }
        }
      }
      
      // If won championship (was in final), subtract championship
      if (updatedPlayer.championships > 0 && match.winning_team.includes(player.id)) {
        // Only subtract if this was likely the match that caused it
        // For safety, we'll be conservative and not auto-subtract championships
        // unless we're sure
      }
    }
    
    // If player was in losing team, subtract a loss
    if (match.losing_team.includes(player.id)) {
      if (updatedPlayer.losses > 0) {
        updatedPlayer.losses -= 1
        updated = true
      }
      
      // Adjust stage if needed - if was in groups, subtract group loss
      if (updatedPlayer.stageIndex === 0 && updatedPlayer.groupLosses > 0) {
        updatedPlayer.groupLosses -= 1
      }
    }

    // Only update if this player was involved in the match
    if (match.winning_team.includes(player.id) || match.losing_team.includes(player.id)) {
      // Ensure stats don't go negative
      updatedPlayer.wins = Math.max(0, updatedPlayer.wins)
      updatedPlayer.losses = Math.max(0, updatedPlayer.losses)
      updatedPlayer.groupWins = Math.max(0, updatedPlayer.groupWins)
      updatedPlayer.groupLosses = Math.max(0, updatedPlayer.groupLosses)
      updatedPlayer.stageIndex = Math.max(0, updatedPlayer.stageIndex)

      updates.push(
        toDatabasePayload({
          id: updatedPlayer.id,
          name: updatedPlayer.name,
          wins: updatedPlayer.wins,
          losses: updatedPlayer.losses,
          championships: updatedPlayer.championships,
          stageIndex: updatedPlayer.stageIndex,
          groupWins: updatedPlayer.groupWins,
          groupLosses: updatedPlayer.groupLosses,
        })
      )
    }
  }

  // Update affected players
  if (updates.length > 0) {
    const { error: updateError } = await supabase
      .from("castelar_players")
      .upsert(updates, { onConflict: "id" })

    if (updateError) {
      throw updateError
    }
  }

  // Delete the match record
  const { error: deleteError } = await supabase
    .from("castelar_matches")
    .delete()
    .eq("id", matchId)

  if (deleteError) {
    throw deleteError
  }

  // Decrement match count in config
  const currentCount = await getMatchCount()
  if (currentCount > 0) {
    const newCount = currentCount - 1
    
    const { data: configData } = await supabase
      .from("castelar_config")
      .select("id")
      .limit(1)
      .single()

    if (configData) {
      await supabase
        .from("castelar_config")
        .update({ total_matches: newCount })
        .eq("id", configData.id)
    }
  }
}

export async function fetchCastelarPlayersByYear(year: number | null): Promise<CastelarPlayerRow[]> {
  const supabase = ensureSupabase()
  
  // Get all players
  const { data: playersData, error: playersError } = await supabase
    .from("castelar_players")
    .select("id, name, wins, losses, championships, stage_index, group_wins, group_losses")
    .order("name")

  if (playersError) {
    throw playersError
  }

  if (year === null) {
    // Historical: return all players with their current stats
    return (playersData ?? []).map((row) => {
      const player = toCastelarPlayer(row)
      return {
        ...player,
        phaseLabel: formatPhaseLabel(player),
        winPercentage: computeWinPercentage(player),
        record: `${player.wins}-${player.losses}`,
      }
    })
  }

  // For a specific year, recalculate stats based on matches from that year
  const matches = await fetchMatchesByYear(year)
  
  // If no matches registered for this year, assume current stats are from this year
  if (matches.length === 0) {
    return (playersData ?? []).map((row) => {
      const player = toCastelarPlayer(row)
      return {
        ...player,
        phaseLabel: formatPhaseLabel(player),
        winPercentage: computeWinPercentage(player),
        record: `${player.wins}-${player.losses}`,
      }
    })
  }
  
  // Create a map to track player stats
  const playerStatsMap = new Map<string, CastelarPlayer>()
  
  // Initialize all players with zero stats
  for (const row of playersData ?? []) {
    const basePlayer = toCastelarPlayer(row)
    playerStatsMap.set(basePlayer.id, {
      ...basePlayer,
      wins: 0,
      losses: 0,
      championships: 0,
      stageIndex: 0,
      groupWins: 0,
      groupLosses: 0,
    })
  }

  // Process matches in chronological order
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )

  for (const match of sortedMatches) {
    // Process winning team
    for (const playerId of match.winning_team) {
      const player = playerStatsMap.get(playerId)
      if (player) {
        const updated = applyMatchResult(player, true)
        playerStatsMap.set(playerId, updated)
      }
    }
    
    // Process losing team
    for (const playerId of match.losing_team) {
      const player = playerStatsMap.get(playerId)
      if (player) {
        const updated = applyMatchResult(player, false)
        playerStatsMap.set(playerId, updated)
      }
    }
  }

  // Convert to CastelarPlayerRow format
  return Array.from(playerStatsMap.values()).map((player) => ({
    ...player,
    phaseLabel: formatPhaseLabel(player),
    winPercentage: computeWinPercentage(player),
    record: `${player.wins}-${player.losses}`,
  }))
}

export async function getMatchCountByYearAndMonth(year: number | null, month: number | null): Promise<number> {
  const supabase = ensureSupabase()
  
  let query = supabase
    .from("castelar_matches")
    .select("*", { count: "exact", head: true })

  if (year !== null) {
    query = query.eq("year", year)
  }

  if (month !== null) {
    // Filter by month (1-12) using match_date
    const yearToUse = year || new Date().getFullYear()
    const startDate = `${yearToUse}-${String(month).padStart(2, "0")}-01T00:00:00Z`
    const endDate = month === 12 
      ? `${yearToUse + 1}-01-01T00:00:00Z`
      : `${yearToUse}-${String(month + 1).padStart(2, "0")}-01T00:00:00Z`
    
    query = query
      .gte("match_date", startDate)
      .lt("match_date", endDate)
  }

  const { count, error } = await query

  if (error) {
    console.error("[castelar] Error counting matches by year and month:", error)
    return 0
  }

  return count ?? 0
}

export async function fetchMatchesByYearAndMonth(year: number | null, month: number | null): Promise<CastelarMatch[]> {
  const supabase = ensureSupabase()
  
  let query = supabase
    .from("castelar_matches")
    .select("*")
    .order("match_date", { ascending: false })

  if (year !== null) {
    query = query.eq("year", year)
  }

  if (month !== null) {
    const yearToUse = year || new Date().getFullYear()
    const startDate = `${yearToUse}-${String(month).padStart(2, "0")}-01T00:00:00Z`
    const endDate = month === 12 
      ? `${yearToUse + 1}-01-01T00:00:00Z`
      : `${yearToUse}-${String(month + 1).padStart(2, "0")}-01T00:00:00Z`
    
    query = query
      .gte("match_date", startDate)
      .lt("match_date", endDate)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as CastelarMatch[]
}

export async function fetchCastelarPlayersByYearAndMonth(year: number | null, month: number | null): Promise<CastelarPlayerRow[]> {
  const supabase = ensureSupabase()
  
  // Get all players
  const { data: playersData, error: playersError } = await supabase
    .from("castelar_players")
    .select("id, name, wins, losses, championships, stage_index, group_wins, group_losses")
    .order("name")

  if (playersError) {
    throw playersError
  }

  if (year === null && month === null) {
    // No filters: return all players with their current stats
    return (playersData ?? []).map((row) => {
      const player = toCastelarPlayer(row)
      return {
        ...player,
        phaseLabel: formatPhaseLabel(player),
        winPercentage: computeWinPercentage(player),
        record: `${player.wins}-${player.losses}`,
      }
    })
  }

  // For filtered view, recalculate stats based on matches from that period
  const matches = await fetchMatchesByYearAndMonth(year, month)
  
  // If no matches registered for this period, assume current stats are from this period
  if (matches.length === 0) {
    return (playersData ?? []).map((row) => {
      const player = toCastelarPlayer(row)
      return {
        ...player,
        phaseLabel: formatPhaseLabel(player),
        winPercentage: computeWinPercentage(player),
        record: `${player.wins}-${player.losses}`,
      }
    })
  }
  
  // Create a map to track player stats
  const playerStatsMap = new Map<string, CastelarPlayer>()
  
  // Initialize all players with zero stats
  for (const row of playersData ?? []) {
    const basePlayer = toCastelarPlayer(row)
    playerStatsMap.set(basePlayer.id, {
      ...basePlayer,
      wins: 0,
      losses: 0,
      championships: 0,
      stageIndex: 0,
      groupWins: 0,
      groupLosses: 0,
    })
  }

  // Process matches in chronological order
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  )

  for (const match of sortedMatches) {
    // Process winning team
    for (const playerId of match.winning_team) {
      const player = playerStatsMap.get(playerId)
      if (player) {
        const updated = applyMatchResult(player, true)
        playerStatsMap.set(playerId, updated)
      }
    }
    
    // Process losing team
    for (const playerId of match.losing_team) {
      const player = playerStatsMap.get(playerId)
      if (player) {
        const updated = applyMatchResult(player, false)
        playerStatsMap.set(playerId, updated)
      }
    }
  }

  // Convert to CastelarPlayerRow format
  return Array.from(playerStatsMap.values()).map((player) => ({
    ...player,
    phaseLabel: formatPhaseLabel(player),
    winPercentage: computeWinPercentage(player),
    record: `${player.wins}-${player.losses}`,
  }))
}

export async function updatePlayerStage(playerId: string, stageIndex: number): Promise<void> {
  const supabase = ensureSupabase()
  
  const { error } = await supabase
    .from("castelar_players")
    .update({ stage_index: stageIndex })
    .eq("id", playerId)

  if (error) {
    throw error
  }
}
