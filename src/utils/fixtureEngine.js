/**
 * fixtureEngine.js
 * Pure functions for PROXIMA E-CLASH 2026 fixture generation.
 * Supports:
 * - 1v1 Single Elimination Knockout
 * - 1v1 Knockout with Play-In Stage (eFootball, Carrom)
 * - 2v2 Knockout with Trio Rotating Substitutes (Mini Militia, BGMI TDM)
 * - Free Fire Hybrid: Solo Battle Royale Qualifier (31 players -> Top 8) -> 1v1 Knockout
 * - Dynamic power-of-2 play-in sizing and automatic advancement
 * No Supabase calls, no React — importable anywhere.
 */

// ─── Game format configuration ────────────────────────────────────────────────
export const GAME_FORMAT = {
  'eFootball': {
    format: 'knockout_playin',
    label: 'eFootball',
    sideSize: 1,
    teamMode: false,
    hasPlayIn: true,
    lobbySize: null,
  },
  'Carrom': {
    format: 'knockout_playin',
    label: 'Carrom',
    sideSize: 1,
    teamMode: false,
    hasPlayIn: true,
    lobbySize: null,
  },
  'Free Fire': {
    format: 'br_to_knockout',
    label: 'Free Fire',
    sideSize: 1,
    teamMode: false,
    qualifierCount: 8,
    lobbySize: null,
  },
  'BGMI': {
    format: 'team_knockout_playin',
    label: 'BGMI (TDM)',
    sideSize: 2,
    teamMode: true,
    hasPlayIn: true,
    lobbySize: null,
  },
  'BGMI (TDM)': {
    format: 'team_knockout_playin',
    label: 'BGMI (TDM)',
    sideSize: 2,
    teamMode: true,
    hasPlayIn: true,
    lobbySize: null,
  },
  'Mini Militia': {
    format: 'team_knockout',
    label: 'Mini Militia',
    sideSize: 2,
    teamMode: true,
    hasPlayIn: false,
    lobbySize: null,
  },
};

export const GAME_NAMES = ['Free Fire', 'BGMI', 'Mini Militia', 'eFootball', 'Carrom'];

export function isKnockoutFormat(format) {
  return (
    format === 'knockout' ||
    format === 'knockout_playin' ||
    format === 'team_knockout' ||
    format === 'team_knockout_playin' ||
    format === 'br_to_knockout'
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new array */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Next power of 2 >= n */
export function nextPow2(n) {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** Previous power of 2 <= n */
export function prevPow2(n) {
  if (n <= 1) return 1;
  let p = 1;
  while (p * 2 <= n) p <<= 1;
  return p;
}

/**
 * Pair registered individual players into teams of sideSize (default 2).
 * If the player count is odd, the extra player is added as a rotating substitute
 * to the last team (creating a trio team), as specified in the tournament rules:
 * "Teams of odd size: the extra player becomes a rotating sub (trio team)".
 *
 * Returns array of formatted team strings:
 * - "REG1 + REG2"
 * - "REG1 + REG2 + REG3 (Sub)" (for odd trio)
 */
export function pairTeams(players, sideSize = 2) {
  if (sideSize <= 1) return [...players];
  const shuffled = shuffle(players);
  const numTeams = Math.floor(shuffled.length / sideSize);
  if (numTeams === 0) return [...shuffled];

  const teams = [];
  for (let i = 0; i < numTeams; i++) {
    teams.push(shuffled.slice(i * sideSize, (i + 1) * sideSize));
  }

  // Any remaining players join the last team as rotating substitutes
  const remainder = shuffled.slice(numTeams * sideSize);
  if (remainder.length > 0 && teams.length > 0) {
    teams[teams.length - 1].push(...remainder);
  }

  return teams.map((team) => {
    if (team.length > sideSize) {
      const core = team.slice(0, sideSize);
      const subs = team.slice(sideSize);
      return `${core.join(' + ')} + ${subs.join(', ')} (Sub)`;
    }
    return team.join(' + ');
  });
}

/**
 * Round name for single-elimination knockout and tournament stages.
 * @param {number} round  0 = play-in, 1 = final/round 1, etc.
 * @param {number} totalRounds
 * @param {string} [game]
 */
export function roundName(round, totalRounds, game) {
  if (game === 'Free Fire') {
    if (round === 1) return 'Stage 1: Solo Battle Royale Qualifier';
    if (round === 2) return 'Quarter-final';
    if (round === 3) return 'Semi-final';
    if (round === 4) return 'Grand Final';
  }

  if (game === 'Carrom') {
    if (round === 0) return '1/64 finals';
    if (round === 1) return '1/32 finals';
    if (round === 2) return '1/16 finals';
    if (round === 3) return '1/8 finals';
    if (round === 4) return 'Quarter-finals';
    if (round === 5) return 'Semi-finals';
    if (round === 6) return 'Grand Final';
  }

  if (game === 'eFootball') {
    if (round === 0) return 'Preliminary Round';
    if (round === 1) return 'Round of 32';
    if (round === 2) return 'Round of 16';
    if (round === 3) return 'Quarter-finals';
    if (round === 4) return 'Semi-finals';
    if (round === 5) return 'Grand Final';
  }

  if (round === 0) return 'Play-In Round';

  const fromFinal = totalRounds - round; // 0 = final round
  if (fromFinal === 0) return 'Grand Final';
  if (fromFinal === 1) return 'Semi-final';
  if (fromFinal === 2) return 'Quarter-final';
  if (fromFinal === 3) return 'Round of 16';
  if (fromFinal === 4) return 'Round of 32';
  if (fromFinal === 5) return 'Round of 64';
  if (fromFinal === 6) return 'Round 1';
  return `Round ${round}`;
}

// ─── Fixture generation ───────────────────────────────────────────────────────

/**
 * Build standard single-elimination knockout fixtures.
 * Sides is an array of strings (player IDs or composite team strings).
 * If sides.length is not a power of 2, byes are cleanly paired with players (no empty matches).
 */
export function generateKnockout(game, sides) {
  const shuffled = shuffle(sides);
  const size = nextPow2(shuffled.length);
  const totalRounds = Math.log2(size);

  const numMatchesR1 = size / 2;
  const numRealMatches = shuffled.length - numMatchesR1;
  const numByeMatches = size - shuffled.length;

  const matches = [];

  // Round 1 — real matches (2 players) + bye matches (1 player + '')
  const realPlayers = shuffled.slice(0, numRealMatches * 2);
  const byePlayers = shuffled.slice(numRealMatches * 2);

  for (let i = 0; i < numRealMatches; i++) {
    matches.push({
      game,
      format: 'knockout',
      round: 1,
      match_no: i + 1,
      players: [realPlayers[i * 2], realPlayers[i * 2 + 1]],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  for (let i = 0; i < numByeMatches; i++) {
    const matchNo = numRealMatches + i + 1;
    matches.push({
      game,
      format: 'knockout',
      round: 1,
      match_no: matchNo,
      players: [byePlayers[i] || '', ''],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  // Subsequent rounds — empty slots
  for (let r = 2; r <= totalRounds; r++) {
    const matchesInRound = size / Math.pow(2, r);
    for (let m = 1; m <= matchesInRound; m++) {
      matches.push({
        game,
        format: 'knockout',
        round: r,
        match_no: m,
        players: ['', ''],
        winner: null,
        locked: false,
        status: 'scheduled',
      });
    }
  }

  // Auto-advance byes in round 1
  return autoAdvanceByes(matches, totalRounds);
}

/**
 * Build single-elimination knockout with play-in matches.
 * - Trims the field to the target power-of-2 bracket.
 * - Play-in matches are in Round 0.
 * - Byes (straight through) and play-in winners enter Round 1.
 *
 * Example (eFootball 38 players):
 * - Target field = 32
 * - Play-in matches = 38 - 32 = 6 (12 players in Round 0)
 * - Straight through byes = 38 - 12 = 26 players directly in Round 1
 * - Total matches = 6 (Round 0) + 16 (R32) + 8 (R16) + 4 (QF) + 2 (SF) + 1 (Final) = 37 matches.
 */
export function generatePlayInKnockout(game, sides, explicitTargetField = null) {
  const sidesCount = sides.length;
  const targetField = explicitTargetField || prevPow2(sidesCount);

  // If sides count is already a power of 2, use standard knockout
  if (sidesCount <= targetField) {
    return generateKnockout(game, sides);
  }

  const playInMatchesCount = sidesCount - targetField;
  const playInSidesCount = playInMatchesCount * 2;
  const byesCount = sidesCount - playInSidesCount;

  const shuffled = shuffle(sides);
  const playInSides = shuffled.slice(0, playInSidesCount);
  const directSides = shuffled.slice(playInSidesCount);

  const matches = [];

  // Round 0 — Play-In matches
  for (let i = 0; i < playInMatchesCount; i++) {
    matches.push({
      game,
      format: 'knockout',
      round: 0,
      match_no: i + 1,
      players: [playInSides[i * 2], playInSides[i * 2 + 1]],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  // Round 1 — Main Bracket (Round of targetField)
  const round1MatchesCount = targetField / 2;
  for (let i = 0; i < round1MatchesCount; i++) {
    let slotA = '';
    let slotB = '';

    if (i < playInMatchesCount) {
      // Slot 0 is a direct bye player; Slot 1 awaits Round 0 Match (i + 1) winner
      slotA = directSides[i] || '';
      slotB = '';
    } else {
      // Both slots come from the remaining direct bye sides
      const offset = playInMatchesCount + (i - playInMatchesCount) * 2;
      slotA = directSides[offset] || '';
      slotB = directSides[offset + 1] || '';
    }

    matches.push({
      game,
      format: 'knockout',
      round: 1,
      match_no: i + 1,
      players: [slotA, slotB],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  // Subsequent rounds (Round 2 to Final)
  const totalBracketRounds = Math.log2(targetField);
  for (let r = 2; r <= totalBracketRounds; r++) {
    const matchesInRound = targetField / Math.pow(2, r);
    for (let m = 1; m <= matchesInRound; m++) {
      matches.push({
        game,
        format: 'knockout',
        round: r,
        match_no: m,
        players: ['', ''],
        winner: null,
        locked: false,
        status: 'scheduled',
      });
    }
  }

  return matches;
}

/**
 * Free Fire hybrid generator:
 * - Round 1: 1 Solo Battle Royale Qualifier lobby with all registered players (e.g. 31 players).
 * - Stage 2: 8-player knockout bracket:
 *   - Round 2: Quarter-finals (4 matches)
 *   - Round 3: Semi-finals (2 matches)
 *   - Round 4: Grand Final (1 match)
 * Total: 1 BR match + 7 knockout matches = 8 matches.
 */
export function generateFreeFireFixtures(players) {
  const shuffled = shuffle(players);
  const matches = [];

  // Round 1: 1 Solo BR Qualifier Lobby
  matches.push({
    game: 'Free Fire',
    format: 'lobby',
    round: 1,
    match_no: 1,
    players: shuffled,
    winner: null,
    locked: false,
    status: 'scheduled',
  });

  // Round 2: Quarter-finals (4 matches, 8 slots)
  for (let m = 1; m <= 4; m++) {
    matches.push({
      game: 'Free Fire',
      format: 'knockout',
      round: 2,
      match_no: m,
      players: ['', ''],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  // Round 3: Semi-finals (2 matches, 4 slots)
  for (let m = 1; m <= 2; m++) {
    matches.push({
      game: 'Free Fire',
      format: 'knockout',
      round: 3,
      match_no: m,
      players: ['', ''],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  // Round 4: Grand Final (1 match, 2 slots)
  matches.push({
    game: 'Free Fire',
    format: 'knockout',
    round: 4,
    match_no: 1,
    players: ['', ''],
    winner: null,
    locked: false,
    status: 'scheduled',
  });

  return matches;
}

/**
 * BGMI TDM 2v2 knockout generator:
 * - Pairs 15 players into 7 teams (6 teams of 2 + 1 trio team with rotating sub).
 * - Field after play-in: 4 teams (Semi-finals).
 * - 3 Quarter-final matches + 1 Bye straight to semi-final.
 * - Round 1: 3 Quarter-final matches (6 teams)
 * - Round 2: 2 Semi-final matches (4 teams: 3 QF winners + 1 bye)
 * - Round 3: 1 Grand Final match
 * Total matches: 3 + 2 + 1 = 6 matches.
 */
export function generateBgmiFixtures(players) {
  const teams = pairTeams(players, 2);
  const shuffledTeams = shuffle(teams);

  // In BGMI: 7 teams -> 6 teams in 3 QF matches, 1 team gets bye to semi-finals
  const qfTeams = shuffledTeams.slice(0, 6);
  const byeTeam = shuffledTeams[6] || '';

  const matches = [];

  // Round 1 (Quarter-finals): 3 matches
  for (let m = 1; m <= 3; m++) {
    matches.push({
      game: 'BGMI',
      format: 'knockout',
      round: 1,
      match_no: m,
      players: [qfTeams[(m - 1) * 2] || '', qfTeams[(m - 1) * 2 + 1] || ''],
      winner: null,
      locked: false,
      status: 'scheduled',
    });
  }

  // Round 2 (Semi-finals): 2 matches
  // Semi-Final 1 awaits QF1 and QF2 winners
  // Semi-Final 2 awaits QF3 winner and byeTeam
  matches.push({
    game: 'BGMI',
    format: 'knockout',
    round: 2,
    match_no: 1,
    players: ['', ''],
    winner: null,
    locked: false,
    status: 'scheduled',
  });

  matches.push({
    game: 'BGMI',
    format: 'knockout',
    round: 2,
    match_no: 2,
    players: ['', byeTeam], // Slot 1 already has the bye team straight through
    winner: null,
    locked: false,
    status: 'scheduled',
  });

  // Round 3 (Grand Final): 1 match
  matches.push({
    game: 'BGMI',
    format: 'knockout',
    round: 3,
    match_no: 1,
    players: ['', ''],
    winner: null,
    locked: false,
    status: 'scheduled',
  });

  return matches;
}

/**
 * Auto-advance bye players in round 1 so they appear in round 2 immediately.
 */
export function autoAdvanceByes(matches, totalRounds) {
  const updated = matches.map((m) => ({ ...m, players: [...m.players] }));

  const round1 = updated.filter((m) => m.round === 1);
  for (const match of round1) {
    const [a, b] = match.players;
    const byeWinner = a && !b ? a : !a && b ? b : null;
    if (!byeWinner) continue;

    match.winner = byeWinner;

    // Slot in next round
    if (totalRounds >= 2) {
      const nextMatchNo = Math.ceil(match.match_no / 2);
      const slot = match.match_no % 2 === 1 ? 0 : 1;
      const nextMatch = updated.find((m) => m.round === 2 && m.match_no === nextMatchNo);
      if (nextMatch) {
        nextMatch.players[slot] = byeWinner;
      }
    }
  }

  return updated;
}

/**
 * Build lobby fixtures.
 * Splits players into lobbies of ~lobbySize using round-robin assignment.
 */
export function generateLobbies(game, players, lobbySize) {
  const shuffled = shuffle(players);
  const size = lobbySize || 12;
  const numLobbies = Math.max(1, Math.ceil(shuffled.length / size));
  const lobbies = Array.from({ length: numLobbies }, () => []);

  // Round-robin fill so no lobby is nearly empty
  shuffled.forEach((p, i) => lobbies[i % numLobbies].push(p));

  return lobbies.map((group, i) => ({
    game,
    format: 'lobby',
    round: 1,
    match_no: i + 1,
    players: group,
    winner: null,
    locked: false,
    status: 'scheduled',
  }));
}

/**
 * Top-level generator. Picks the right format from GAME_FORMAT config.
 */
export function generateFixtures(game, players) {
  const normalizedGame = game === 'BGMI (TDM)' ? 'BGMI' : game;
  const cfg = GAME_FORMAT[normalizedGame] || GAME_FORMAT[game];
  if (!cfg) throw new Error(`Unknown game: ${game}`);

  if (normalizedGame === 'Free Fire') {
    return generateFreeFireFixtures(players);
  }

  if (normalizedGame === 'BGMI') {
    return generateBgmiFixtures(players);
  }

  if (normalizedGame === 'Mini Militia') {
    const teams = pairTeams(players, 2);
    return generateKnockout(normalizedGame, teams);
  }

  if (normalizedGame === 'eFootball') {
    // 1v1 with play-in trimming to 32
    return generatePlayInKnockout(normalizedGame, players, 32);
  }

  if (normalizedGame === 'Carrom') {
    // 1v1 with play-in trimming to 64 (Round 0 has 1/64 finals, Round 1 has 1/32 finals)
    return generatePlayInKnockout(normalizedGame, players, 64);
  }

  if (cfg.format === 'knockout') {
    return generateKnockout(normalizedGame, players);
  }

  return generateLobbies(normalizedGame, players, cfg.lobbySize);
}

/**
 * Re-shuffle an existing draw.
 * Locked matches survive unchanged. Their players are excluded from the new shuffle.
 * Returns the full new matches array.
 */
export function reshuffleFixtures(game, players, existingMatches) {
  const lockedMatches = existingMatches.filter((m) => m.locked);
  const lockedPlayerIds = new Set(
    lockedMatches
      .flatMap((m) => m.players.filter(Boolean))
      .flatMap((p) => p.split(/\s*[\+\/]\s*/))
      .map((s) => s.replace(/\s*\(Sub\)/i, '').trim())
      .filter(Boolean)
  );

  const freePlayers = players.filter((p) => !lockedPlayerIds.has(p));
  const freshMatches = generateFixtures(game, freePlayers);

  // Merge: locked matches override fresh ones by (round, match_no)
  const merged = freshMatches.map((fm) => {
    const locked = lockedMatches.find(
      (lm) => lm.round === fm.round && lm.match_no === fm.match_no
    );
    return locked || fm;
  });

  return merged;
}

/**
 * Advance top 8 survivors from Free Fire Solo Battle Royale into Quarter-Finals.
 */
export function advanceFreeFireQualifiers(matches, top8Ids) {
  const updated = matches.map((m) => ({ ...m, players: [...m.players] }));

  // Quarter-finals are Round 2, matches 1 to 4
  for (let i = 0; i < 4; i++) {
    const match = updated.find((m) => m.round === 2 && m.match_no === i + 1);
    if (match) {
      match.players[0] = top8Ids[i * 2] || '';
      match.players[1] = top8Ids[i * 2 + 1] || '';
    }
  }

  return updated;
}

/**
 * Advance winner of match (round, match_no) into the correct slot of the next round.
 * Handles:
 * - Round 0 play-in matches advancing into Round 1
 * - BGMI Quarter-finals (3 matches) advancing into Semi-finals (2 matches)
 * - Standard knockout advancement across rounds
 * Returns the updated matches array.
 */
export function advanceWinner(matches, round, match_no, winner) {
  const updated = matches.map((m) => ({
    ...m,
    players: [...m.players],
  }));

  const cur = updated.find((m) => m.round === round && m.match_no === match_no);
  if (!cur) return updated;

  const prevWinner = cur.winner;
  cur.winner = winner || null;

  // Case 1: BGMI Round 1 (3 quarter-final matches feeding into 2 semi-finals in Round 2)
  if (cur.game === 'BGMI' && round === 1) {
    let nextMatchNo = 1;
    let slot = 0;
    if (match_no === 1) { nextMatchNo = 1; slot = 0; }
    else if (match_no === 2) { nextMatchNo = 1; slot = 1; }
    else if (match_no === 3) { nextMatchNo = 2; slot = 0; }

    const next = updated.find((m) => m.round === 2 && m.match_no === nextMatchNo);
    if (next) {
      if (!winner && prevWinner && next.players[slot] === prevWinner) {
        next.players[slot] = '';
      } else if (winner) {
        next.players[slot] = winner;
      }
    }
    return updated;
  }

  // Case 2: eFootball Round 0 Play-in matches advancing into Round 1
  if (cur.game === 'eFootball' && round === 0) {
    const efootballPrelimTargets = {
      1: { match_no: 1, slot: 1 },
      2: { match_no: 6, slot: 0 },
      3: { match_no: 8, slot: 0 },
      4: { match_no: 10, slot: 0 },
      5: { match_no: 12, slot: 0 },
      6: { match_no: 16, slot: 0 },
    };
    const target = efootballPrelimTargets[match_no];
    if (target) {
      const next = updated.find((m) => m.round === 1 && m.match_no === target.match_no);
      if (next) {
        if (!winner && prevWinner && next.players[target.slot] === prevWinner) {
          next.players[target.slot] = '';
        } else if (winner) {
          next.players[target.slot] = winner;
        }
      }
    }
    return updated;
  }

  // Case 3: Carrom Round 0 (1/64 finals) advancing into Round 1 (1/32 finals)
  if (cur.game === 'Carrom' && round === 0) {
    const carromPrelimTargets = {
      1: { match_no: 1, slot: 1 },
      2: { match_no: 17, slot: 1 },
    };
    const target = carromPrelimTargets[match_no];
    if (target) {
      const next = updated.find((m) => m.round === 1 && m.match_no === target.match_no);
      if (next) {
        if (!winner && prevWinner && next.players[target.slot] === prevWinner) {
          next.players[target.slot] = '';
        } else if (winner) {
          next.players[target.slot] = winner;
        }
      }
    }
    return updated;
  }

  // Case 4: Generic Round 0 Play-in fallback
  if (round === 0) {
    const next = updated.find((m) => m.round === 1 && m.match_no === match_no);
    if (next) {
      if (!winner && prevWinner && next.players[1] === prevWinner) {
        next.players[1] = '';
      } else if (winner) {
        next.players[1] = winner;
      }
    }
    return updated;
  }

  // Case 5: Free Fire Round 1 is the lobby qualifier
  if (cur.game === 'Free Fire' && round === 1) {
    return updated;
  }

  // Case 6: Standard knockout advancement (round -> round + 1)
  const nextMatchNo = Math.ceil(match_no / 2);
  const slot = match_no % 2 === 1 ? 0 : 1;
  const next = updated.find((m) => m.round === round + 1 && m.match_no === nextMatchNo);
  if (next) {
    if (!winner && prevWinner && next.players[slot] === prevWinner) {
      next.players[slot] = '';
    } else if (winner) {
      next.players[slot] = winner;
    }
  }

  return updated;
}

/**
 * Swap two players across the entire draw for a game so nobody appears twice.
 */
export function swapPlayers(matches, playerId, targetRound, targetMatchNo, targetSlot, currentOccupant) {
  const updated = matches.map((m) => ({ ...m, players: [...m.players] }));

  // Find where playerId currently lives
  let sourceMatch = null;
  let sourceSlot = -1;
  for (const m of updated) {
    const idx = m.players.indexOf(playerId);
    if (idx !== -1) {
      sourceMatch = m;
      sourceSlot = idx;
      break;
    }
  }

  // Place playerId into target
  const target = updated.find((m) => m.round === targetRound && m.match_no === targetMatchNo);
  if (!target) return updated;
  target.players[targetSlot] = playerId;

  // Put the displaced player into where playerId came from
  if (sourceMatch && sourceSlot !== -1) {
    sourceMatch.players[sourceSlot] = currentOccupant || '';
  }

  return updated;
}

/**
 * Get total rounds for a given game and player/side count.
 */
export function getTotalRounds(playerCount, game) {
  if (game === 'Free Fire') return 4; // Round 1 (BR) + Round 2 (QF) + Round 3 (SF) + Round 4 (Final)
  if (game === 'BGMI' || game === 'BGMI (TDM)') return 3; // Round 1 (QF) + Round 2 (SF) + Round 3 (Final)
  if (game === 'Mini Militia') {
    const teamsCount = Math.floor(playerCount / 2);
    return Math.log2(nextPow2(teamsCount));
  }
  if (game === 'eFootball') return 5; // Target 32 -> 5 knockout rounds (Round 1 to 5) + Round 0 Play-in
  if (game === 'Carrom') return 6; // Target 64 -> 6 knockout rounds (Round 1 to 6) + Round 0 Play-in

  return Math.log2(nextPow2(playerCount));
}

/**
 * Get players registered for a specific game from the registrations list.
 * Handles comma-separated multi-game strings and BGMI aliases.
 */
export function getPlayersForGame(registrations, game) {
  const targets = game === 'BGMI (TDM)' || game === 'BGMI'
    ? ['BGMI', 'BGMI (TDM)']
    : [game];

  return registrations
    .filter((r) => {
      const games = (r.game || '').split(',').map((g) => g.trim());
      return targets.some((t) => games.includes(t));
    })
    .map((r) => r.registrationId);
}

/**
 * Resolve human-readable player/team name.
 * Handles composite 2v2/3v3 team strings like "ECL-001 + ECL-002 + ECL-003 (Sub)".
 */
export function resolvePlayerName(registrations, regId) {
  if (!regId) return '';
  if (regId.includes('+')) {
    return regId
      .split('+')
      .map((part) => {
        const isSub = part.toLowerCase().includes('(sub)');
        const cleanId = part.replace(/\s*\(Sub\)/i, '').trim();
        const r = registrations.find((x) => x.registrationId === cleanId);
        const name = r ? r.fullName : cleanId;
        return isSub ? `${name} (Sub)` : name;
      })
      .join(' & ');
  }
  const r = registrations.find((x) => x.registrationId === regId);
  return r ? r.fullName : regId;
}
