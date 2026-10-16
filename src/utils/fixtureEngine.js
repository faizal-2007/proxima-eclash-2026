/**
 * fixtureEngine.js
 * Pure functions for PROXIMA E-CLASH 2026 fixture generation.
 * No Supabase calls, no React — importable anywhere.
 */

// ─── Game format configuration ────────────────────────────────────────────────
export const GAME_FORMAT = {
  'eFootball':   { format: 'knockout', label: 'eFootball',   lobbySize: null },
  'Carrom':      { format: 'knockout', label: 'Carrom',       lobbySize: null },
  'Free Fire':   { format: 'lobby',    label: 'Free Fire',    lobbySize: 12   },
  'BGMI':        { format: 'lobby',    label: 'BGMI',         lobbySize: 16   },
  'Mini Militia':{ format: 'lobby',    label: 'Mini Militia', lobbySize: 8    },
};

export const GAME_NAMES = Object.keys(GAME_FORMAT);

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
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Round name for single-elimination knockout.
 * @param {number} round  1 = final, 2 = semi, 3 = quarter, …
 * @param {number} totalRounds
 */
export function roundName(round, totalRounds) {
  const fromFinal = totalRounds - round; // 0 = final round
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi-final';
  if (fromFinal === 2) return 'Quarter-final';
  return `Round ${round}`;
}

// ─── Fixture generation ───────────────────────────────────────────────────────

/**
 * Build single-elimination knockout fixtures.
 * Players is an array of registrationId strings.
 * Returns flat array of match objects (to upsert into DB).
 */
export function generateKnockout(game, players) {
  const shuffled = shuffle(players);
  const size = nextPow2(shuffled.length);
  const totalRounds = Math.log2(size);

  // Pad with byes ('') spread across different matches
  const padded = [...shuffled];
  while (padded.length < size) padded.push('');

  const matches = [];

  // Round 1 — pair up
  for (let i = 0; i < size / 2; i++) {
    matches.push({
      game,
      format: 'knockout',
      round: 1,
      match_no: i + 1,
      players: [padded[i * 2], padded[i * 2 + 1]],
      winner: null,
      locked: false,
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
      });
    }
  }

  // Auto-advance byes in round 1
  const advancedMatches = autoAdvanceByes(matches, totalRounds);
  return advancedMatches;
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
      const slot = match.match_no % 2 === 1 ? 0 : 1; // odd → slot A (0), even → slot B (1)
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
  const numLobbies = Math.max(1, Math.ceil(shuffled.length / lobbySize));
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
  }));
}

/**
 * Top-level generator. Picks the right format from GAME_FORMAT config.
 */
export function generateFixtures(game, players) {
  const cfg = GAME_FORMAT[game];
  if (!cfg) throw new Error(`Unknown game: ${game}`);

  if (cfg.format === 'knockout') {
    return generateKnockout(game, players);
  }
  return generateLobbies(game, players, cfg.lobbySize);
}

/**
 * Re-shuffle an existing draw.
 * Locked matches survive unchanged. Their players are excluded from the new shuffle.
 * Returns the full new matches array.
 */
export function reshuffleFixtures(game, players, existingMatches) {
  const lockedMatches = existingMatches.filter((m) => m.locked);
  const lockedPlayerIds = new Set(lockedMatches.flatMap((m) => m.players.filter(Boolean)));

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
 * Advance winner of match (round, match_no) into the correct slot of the next round.
 * Returns the updated matches array.
 */
export function advanceWinner(matches, round, match_no, winner) {
  const updated = matches.map((m) => ({
    ...m,
    players: [...m.players],
  }));

  // Set winner on current match
  const cur = updated.find((m) => m.round === round && m.match_no === match_no);
  if (!cur) return updated;

  // If clearing winner, also clear next-round slot
  if (!winner && cur.winner) {
    const prevWinner = cur.winner;
    const nextMatchNo = Math.ceil(match_no / 2);
    const slot = match_no % 2 === 1 ? 0 : 1;
    const next = updated.find((m) => m.round === round + 1 && m.match_no === nextMatchNo);
    if (next && next.players[slot] === prevWinner) {
      next.players[slot] = '';
    }
  }

  cur.winner = winner || null;

  if (!winner) return updated;

  // Advance to next round
  const nextMatchNo = Math.ceil(match_no / 2);
  const slot = match_no % 2 === 1 ? 0 : 1;
  const next = updated.find((m) => m.round === round + 1 && m.match_no === nextMatchNo);
  if (next) {
    next.players[slot] = winner;
  }

  return updated;
}

/**
 * Swap two players across the entire draw for a game so nobody appears twice.
 * @param {object[]} matches
 * @param {string} playerId  — the player being placed
 * @param {string} targetGame — the game
 * @param {number} targetRound
 * @param {number} targetMatchNo
 * @param {number} targetSlot   — 0 or 1 (or index for lobbies)
 * @param {string} currentOccupant — reg ID currently in the target slot
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
 * Get total rounds in a knockout for a given player count.
 */
export function getTotalRounds(playerCount) {
  return Math.log2(nextPow2(playerCount));
}

/**
 * Get players registered for a specific game from the registrations list.
 * Handles comma-separated multi-game strings.
 */
export function getPlayersForGame(registrations, game) {
  return registrations
    .filter((r) => {
      const games = (r.game || '').split(',').map((g) => g.trim());
      return games.includes(game);
    })
    .map((r) => r.registrationId);
}
