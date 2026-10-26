/**
 * scoringEngine.js
 * Core scoring and leaderboard derivation engine for PROXIMA E-CLASH 2026 Free Fire BR.
 *
 * Rules:
 * - 31 players, 3 matches, same custom room.
 * - Only placements 1st to 8th earn placement points; 9th or lower earns 0.
 * - Every player earns kill points per kill in every match, whatever their placement.
 * - Match total = placement points + (kills x kill points). Overall total = sum of all matches.
 * - Placement points & kill points come from settings (defaults: 12, 9, 8, 7, 6, 5, 4, 3 and 1 per kill).
 * - Never store computed totals. Derive match totals and leaderboard from raw data.
 * - Tie-breakers:
 *   1. Most Total Points
 *   2. Most Booyahs (1st place finishes)
 *   3. Most Total Kills
 *   4. Best Single-Match Placement (1 is better than 2, etc.)
 *   5. Manual override
 */

export const DEFAULT_SCORING_SETTINGS = {
  // Placement points for 1st through 8th place (9th+ gets 0)
  placementPoints: [12, 9, 8, 7, 6, 5, 4, 3],
  killPoints: 1, // Points per kill
  maxEliminationsPerMatch: 30, // 31 players in room -> max 30 eliminations
};

/**
 * Get placement points for a given finish rank (1-indexed).
 * Ranks 1 to 8 receive points from settings; 9+ receives 0.
 */
export function getPlacementPoints(rank, settings = DEFAULT_SCORING_SETTINGS) {
  if (!rank || rank < 1 || rank > 8) return 0;
  const pts = settings?.placementPoints || DEFAULT_SCORING_SETTINGS.placementPoints;
  return pts[rank - 1] ?? 0;
}

/**
 * Derive single match scores for all players from raw data.
 *
 * @param {string[]} placements - Ordered array of up to 8 player IDs (index 0 is 1st, index 7 is 8th)
 * @param {Record<string, number>} kills - Map of playerId -> kill count
 * @param {Array<{ id: string, name?: string }>} allPlayers - Array of all 31 players
 * @param {typeof DEFAULT_SCORING_SETTINGS} [settings]
 */
export function deriveMatchScores(placements = [], kills = {}, allPlayers = [], settings = DEFAULT_SCORING_SETTINGS) {
  const killPtsMultiplier = settings?.killPoints ?? DEFAULT_SCORING_SETTINGS.killPoints;

  // Build map of placement ranks (1-indexed)
  const rankMap = new Map();
  placements.forEach((pid, idx) => {
    if (pid) rankMap.set(pid, idx + 1);
  });

  const playerRows = allPlayers.map((player) => {
    const pid = typeof player === 'string' ? player : player.registrationId || player.id;
    const name = typeof player === 'string' ? player : player.fullName || player.name || pid;
    const campusId = typeof player === 'object' ? player.campusId || player.campus_id : '';

    const rank = rankMap.get(pid) || null;
    const placementPts = getPlacementPoints(rank, settings);
    const killCount = Math.max(0, parseInt(kills[pid] || 0, 10));
    const killPts = killCount * killPtsMultiplier;
    const matchTotal = placementPts + killPts;
    const isBooyah = rank === 1;

    return {
      playerId: pid,
      name,
      campusId,
      rank,
      placementPts,
      kills: killCount,
      killPts,
      matchTotal,
      isBooyah,
    };
  });

  // Sort by matchTotal desc, then placement rank asc (1 before 2; unplaced nulls last), then kills desc
  return playerRows.sort((a, b) => {
    if (b.matchTotal !== a.matchTotal) return b.matchTotal - a.matchTotal;
    if (a.isBooyah !== b.isBooyah) return a.isBooyah ? -1 : 1;
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    if (b.kills !== a.kills) return b.kills - a.kills;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Derive tournament overall leaderboard across all 3 matches from raw match results.
 *
 * @param {Record<number, { placements: string[], kills: Record<string, number>, status: string }>} matchesData
 * @param {Array<{ id: string, name?: string }>} allPlayers
 * @param {typeof DEFAULT_SCORING_SETTINGS} [settings]
 * @param {Record<string, number>} [manualOverrides] - Map of playerId -> override adjustment rank
 */
export function deriveOverallLeaderboard(
  matchesData = {},
  allPlayers = [],
  settings = DEFAULT_SCORING_SETTINGS,
  manualOverrides = {}
) {
  const killPtsMultiplier = settings?.killPoints ?? DEFAULT_SCORING_SETTINGS.killPoints;

  const leaderboard = allPlayers.map((player) => {
    const pid = typeof player === 'string' ? player : player.registrationId || player.id;
    const name = typeof player === 'string' ? player : player.fullName || player.name || pid;
    const campusId = typeof player === 'object' ? player.campusId || player.campus_id : '';

    let totalPoints = 0;
    let totalKills = 0;
    let totalPlacementPoints = 0;
    let booyahs = 0;
    let bestPlacement = null;
    let matchesCount = 0;

    const matchBreakdowns = {};

    [1, 2, 3].forEach((mNo) => {
      const match = matchesData[mNo];
      if (!match) {
        matchBreakdowns[mNo] = { rank: null, placementPts: 0, kills: 0, killPts: 0, total: 0, status: 'not_started' };
        return;
      }

      const placements = match.placements || [];
      const kills = match.kills || {};
      const rankIdx = placements.indexOf(pid);
      const rank = rankIdx !== -1 ? rankIdx + 1 : null;
      const placementPts = getPlacementPoints(rank, settings);
      const killCount = Math.max(0, parseInt(kills[pid] || 0, 10));
      const killPts = killCount * killPtsMultiplier;
      const total = placementPts + killPts;

      if (match.status === 'finalized' || match.status === 'in_progress') {
        matchesCount++;
        totalPoints += total;
        totalKills += killCount;
        totalPlacementPoints += placementPts;
        if (rank === 1) booyahs++;
        if (rank !== null) {
          if (bestPlacement === null || rank < bestPlacement) {
            bestPlacement = rank;
          }
        }
      }

      matchBreakdowns[mNo] = {
        rank,
        placementPts,
        kills: killCount,
        killPts,
        total,
        status: match.status || 'not_started',
      };
    });

    return {
      playerId: pid,
      name,
      campusId,
      totalPoints,
      totalPlacementPoints,
      totalKills,
      booyahs,
      bestPlacement,
      matchesCount,
      matchBreakdowns,
      manualOverride: manualOverrides[pid] ?? 0,
    };
  });

  // Sort with official tie-breakers:
  // 1. Total Points (descending)
  // 2. Most Booyahs (descending)
  // 3. Most Total Kills (descending)
  // 4. Best Single-Match Placement (ascending, 1 is best, null last)
  // 5. Manual override
  // 6. Alphabetical name
  leaderboard.sort((a, b) => {
    // Manual override if set
    if (a.manualOverride !== b.manualOverride) {
      return a.manualOverride - b.manualOverride;
    }

    // 1. Total Points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }

    // 2. Tie-breaker: Most Booyahs
    if (b.booyahs !== a.booyahs) {
      return b.booyahs - a.booyahs;
    }

    // 3. Tie-breaker: Most Total Kills
    if (b.totalKills !== a.totalKills) {
      return b.totalKills - a.totalKills;
    }

    // 4. Tie-breaker: Best Single-Match Placement
    if (a.bestPlacement !== null && b.bestPlacement !== null) {
      if (a.bestPlacement !== b.bestPlacement) {
        return a.bestPlacement - b.bestPlacement;
      }
    } else if (a.bestPlacement !== null) {
      return -1;
    } else if (b.bestPlacement !== null) {
      return 1;
    }

    // 5. Total Placement Points
    if (b.totalPlacementPoints !== a.totalPlacementPoints) {
      return b.totalPlacementPoints - a.totalPlacementPoints;
    }

    return a.name.localeCompare(b.name);
  });

  // Mark overall ranks and qualification (Top 8 qualify for Stage 2)
  return leaderboard.map((row, idx) => ({
    ...row,
    overallRank: idx + 1,
    qualified: idx < 8,
    isTop8: idx < 8,
  }));
}

/**
 * Validate match input before finalizing.
 *
 * @param {string[]} placements - Up to 8 player IDs
 * @param {Record<string, number>} kills - Map of player IDs to kills
 * @param {number} [maxKills=30]
 */
export function validateMatchResult(placements = [], kills = {}, maxKills = 30) {
  const errors = [];
  const warnings = [];

  // 1. Check all 8 slots are filled
  const filledSlots = placements.filter(Boolean);
  if (filledSlots.length < 8) {
    errors.push(`All 8 placement slots must be filled before finalizing (currently ${filledSlots.length} / 8).`);
  }

  // 2. Check for duplicate players in top 8
  const seen = new Set();
  const duplicates = new Set();
  placements.forEach((pid) => {
    if (pid) {
      if (seen.has(pid)) duplicates.add(pid);
      seen.add(pid);
    }
  });
  if (duplicates.size > 0) {
    errors.push(`Duplicate player selected in Top 8 placements. Each slot must be a unique player.`);
  }

  // 3. Total kills calculation
  let totalKills = 0;
  Object.values(kills).forEach((val) => {
    const k = parseInt(val, 10);
    if (!isNaN(k) && k > 0) totalKills += k;
  });

  if (totalKills > maxKills) {
    warnings.push(
      `Total kills recorded (${totalKills}) exceeds ${maxKills} (the maximum possible eliminations in a 31-player lobby). Verify player kill counts before finalizing.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalKills,
    exceedsKillLimit: totalKills > maxKills,
  };
}
