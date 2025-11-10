"use client"

export const CASTELAR_PHASES = ["Grupos", "Octavos", "Cuartos", "Semifinal", "Final"] as const

export type CastelarPhase = (typeof CASTELAR_PHASES)[number]

export interface CastelarPlayer {
  id: string
  name: string
  wins: number
  losses: number
  championships: number
  stageIndex: number
  groupWins: number
  groupLosses: number
}

export interface CastelarPlayerStats {
  wins: number
  losses: number
  championships: number
  stageIndex: number
  groupWins: number
  groupLosses: number
}

export interface CastelarPlayerUpdate extends CastelarPlayerStats {
  id: string
  name: string
}

function resetGroupProgress(player: CastelarPlayerStats) {
  player.stageIndex = 0
  player.groupWins = 0
  player.groupLosses = 0
}

export function applyMatchResult(player: CastelarPlayer, didWin: boolean): CastelarPlayer {
  const updated: CastelarPlayer = { ...player }

  if (didWin) {
    updated.wins += 1

    if (updated.stageIndex === 0) {
      updated.groupWins += 1
      const totalGroupMatches = updated.groupWins + updated.groupLosses

      if (totalGroupMatches >= 3) {
        if (updated.groupWins >= 2) {
          updated.stageIndex = 1
        } else {
          resetGroupProgress(updated)
        }
      }
    } else if (updated.stageIndex === CASTELAR_PHASES.length - 1) {
      updated.championships += 1
      resetGroupProgress(updated)
    } else {
      updated.stageIndex += 1
    }
  } else {
    updated.losses += 1

    if (updated.stageIndex === 0) {
      updated.groupLosses += 1
      const totalGroupMatches = updated.groupWins + updated.groupLosses

      if (totalGroupMatches >= 3) {
        if (updated.groupWins >= 2) {
          updated.stageIndex = 1
        } else {
          resetGroupProgress(updated)
        }
      } else if (updated.groupLosses >= 2) {
        resetGroupProgress(updated)
      }
    } else {
      resetGroupProgress(updated)
    }
  }

  return updated
}

export function formatPhaseLabel(player: CastelarPlayer): string {
  if (player.stageIndex <= 0) {
    if (player.groupWins === 0 && player.groupLosses === 0) {
      return CASTELAR_PHASES[0]
    }
    return `${CASTELAR_PHASES[0]} (${player.groupWins}-${player.groupLosses})`
  }

  return CASTELAR_PHASES[Math.min(player.stageIndex, CASTELAR_PHASES.length - 1)]
}

export function computeWinPercentage(player: CastelarPlayer): number {
  const total = player.wins + player.losses
  if (total === 0) {
    return 0
  }

  return (player.wins / total) * 100
}

export function toCastelarPlayer(data: any): CastelarPlayer {
  return {
    id: data.id,
    name: data.name,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    championships: data.championships ?? 0,
    stageIndex: data.stage_index ?? 0,
    groupWins: data.group_wins ?? 0,
    groupLosses: data.group_losses ?? 0,
  }
}

export function toDatabasePayload(player: CastelarPlayerUpdate) {
  return {
    id: player.id,
    name: player.name,
    wins: player.wins,
    losses: player.losses,
    championships: player.championships,
    stage_index: player.stageIndex,
    group_wins: player.groupWins,
    group_losses: player.groupLosses,
  }
}
