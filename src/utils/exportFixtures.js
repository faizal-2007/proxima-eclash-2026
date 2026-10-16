/**
 * exportFixtures.js
 * Pure functions that transform fixture rows + a name lookup into
 * exportable tables, and file builders (CSV + XLSX).
 *
 * No React, no DOM, no Supabase — keep this testable.
 */
import * as XLSX from 'xlsx';
import { GAME_FORMAT, GAME_NAMES, roundName, getTotalRounds } from './fixtureEngine.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a timestamp as readable local time (en-IN, IST) */
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

/** Escape a value for CSV (handles commas, quotes, newlines) */
export function csvEscape(val) {
  const s = val == null ? '' : String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV string from an array of header strings + rows (arrays of values) */
export function buildCsvString(headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\r\n');
}

/** Resolve a player name: use snapshot first, then lookup map, then reg ID */
function resolveName(regId, snapshotNames, snapshotPlayers, nameLookup) {
  if (!regId) return '';
  // Try snapshot (parallel array)
  if (snapshotPlayers && snapshotNames) {
    const idx = snapshotPlayers.indexOf(regId);
    if (idx !== -1 && snapshotNames[idx]) return snapshotNames[idx];
  }
  // Try name lookup (from registrations)
  if (nameLookup[regId]) return nameLookup[regId];
  return regId;
}

/** Get round display name for a fixture row */
function getRoundLabel(fixture, totalRounds) {
  if (fixture.format === 'lobby') return 'Lobby';
  return roundName(fixture.round, totalRounds);
}

/**
 * Determine total rounds per game from the fixture set.
 * For knockout, use the max round value in the data set.
 * For lobby, it's always 1.
 */
function computeTotalRounds(fixtures) {
  if (fixtures.length === 0) return 1;
  if (fixtures[0].format === 'lobby') return 1;
  return Math.max(...fixtures.map((f) => f.round));
}

// ─── Table builders ───────────────────────────────────────────────────────────

/**
 * Build the "Match Results" table.
 * One row per match with columns:
 * Game, Round, Match No, Player A (name), Player A Reg ID,
 * Player B (name), Player B Reg ID, Winner (name), Winner Reg ID,
 * Status, Scheduled time, Venue/Room ID
 *
 * For lobby games, all lobby players go in Player A (comma-separated),
 * and Player A Reg ID gets all reg IDs comma-separated.
 */
export function buildMatchResultsTable(fixtures, nameLookup) {
  const headers = [
    'Game', 'Round', 'Match No',
    'Player A', 'Player A Reg ID',
    'Player B', 'Player B Reg ID',
    'Winner', 'Winner Reg ID',
    'Status',
  ];

  const rows = [];

  for (const f of fixtures) {
    const totalRounds = computeTotalRounds(fixtures.filter((x) => x.game === f.game));
    const roundLabel = getRoundLabel(f, totalRounds);
    const isLobby = f.format === 'lobby';
    const players = f.players || [];
    const playerNames = f.player_names || [];

    // Determine status display
    let statusDisplay = f.status || 'scheduled';
    if (statusDisplay === 'bye') statusDisplay = 'BYE';
    else if (statusDisplay === 'completed') statusDisplay = 'Completed';
    else if (statusDisplay === 'superseded') statusDisplay = 'Superseded';
    else statusDisplay = 'Scheduled';

    // Winner info
    const winnerName = f.winner
      ? (f.winner_name || resolveName(f.winner, playerNames, players, nameLookup))
      : '';
    const winnerRegId = f.winner || '';

    if (isLobby) {
      // All players comma-separated in Player A columns
      const allNames = players
        .filter(Boolean)
        .map((pid) => resolveName(pid, playerNames, players, nameLookup))
        .join(', ');
      const allRegIds = players.filter(Boolean).join(', ');

      rows.push([
        f.game, roundLabel, f.match_no,
        allNames, allRegIds,
        '', '', // Player B empty for lobbies
        winnerName, winnerRegId,
        statusDisplay,
      ]);
    } else {
      // Knockout: 2 players
      const [aId, bId] = [players[0] || '', players[1] || ''];
      const aName = aId ? resolveName(aId, playerNames, players, nameLookup) : (bId ? 'BYE' : '');
      const bName = bId ? resolveName(bId, playerNames, players, nameLookup) : (aId ? 'BYE' : '');

      rows.push([
        f.game, roundLabel, f.match_no,
        aName, aId,
        bName, bId,
        winnerName, winnerRegId,
        statusDisplay,
      ]);
    }
  }

  return { headers, rows };
}

/**
 * Build the "Player Summary" table.
 * One row per player per game with:
 * Name, Reg ID, Game, Matches Played, Wins, Losses,
 * Opponents Faced (comma-separated), Final Placement
 */
export function buildPlayerSummaryTable(fixtures, nameLookup) {
  const headers = [
    'Name', 'Reg ID', 'Game',
    'Matches Played', 'Wins', 'Losses',
    'Opponents Faced', 'Final Placement',
  ];

  // Group by game
  const byGame = {};
  for (const f of fixtures) {
    if (!byGame[f.game]) byGame[f.game] = [];
    byGame[f.game].push(f);
  }

  const rows = [];

  for (const [game, gameFixtures] of Object.entries(byGame)) {
    const isLobby = gameFixtures[0]?.format === 'lobby';
    const totalRounds = computeTotalRounds(gameFixtures);

    // Collect per-player stats
    const playerStats = {}; // regId -> { name, matches, wins, losses, opponents: Set, placement }

    const ensurePlayer = (regId, playerNames, players) => {
      if (!regId) return;
      if (!playerStats[regId]) {
        playerStats[regId] = {
          name: resolveName(regId, playerNames, players, nameLookup),
          matches: 0,
          wins: 0,
          losses: 0,
          opponents: new Set(),
          placement: '',
        };
      }
    };

    for (const f of gameFixtures) {
      const players = (f.players || []).filter(Boolean);
      const playerNames = f.player_names || [];
      const isBye = f.status === 'bye' || (players.length === 1 && f.format === 'knockout');

      if (isBye) {
        // Bye matches don't count as a "match played"
        for (const pid of players) ensurePlayer(pid, playerNames, f.players);
        continue;
      }

      for (const pid of players) {
        ensurePlayer(pid, playerNames, f.players);
        playerStats[pid].matches += 1;

        // Add opponents (everyone else in this match/lobby)
        for (const other of players) {
          if (other !== pid) playerStats[pid].opponents.add(other);
        }
      }

      // Wins / losses
      if (f.winner && playerStats[f.winner]) {
        playerStats[f.winner].wins += 1;
      }
      if (f.winner && f.format === 'knockout') {
        // The non-winner in a knockout loses
        for (const pid of players) {
          if (pid !== f.winner && playerStats[pid]) {
            playerStats[pid].losses += 1;
          }
        }
      }
    }

    // Derive placements for knockout games
    if (!isLobby) {
      // Champion = winner of the final round
      const finalRound = totalRounds;
      const finalMatch = gameFixtures.find((f) => f.round === finalRound);
      if (finalMatch?.winner) {
        const champId = finalMatch.winner;
        if (playerStats[champId]) playerStats[champId].placement = 'Champion';

        // Runner-up = the other player in the final
        const finalPlayers = (finalMatch.players || []).filter(Boolean);
        for (const pid of finalPlayers) {
          if (pid !== champId && playerStats[pid]) {
            playerStats[pid].placement = 'Runner-up';
          }
        }
      }

      // Semi-finalists = losers in semi-final round
      if (totalRounds >= 2) {
        const semiRound = totalRounds - 1;
        const semiMatches = gameFixtures.filter((f) => f.round === semiRound);
        for (const sm of semiMatches) {
          if (sm.winner) {
            const semiPlayers = (sm.players || []).filter(Boolean);
            for (const pid of semiPlayers) {
              if (pid !== sm.winner && playerStats[pid] && !playerStats[pid].placement) {
                playerStats[pid].placement = 'Semi-finalist';
              }
            }
          }
        }
      }

      // Quarter-finalists
      if (totalRounds >= 3) {
        const qfRound = totalRounds - 2;
        const qfMatches = gameFixtures.filter((f) => f.round === qfRound);
        for (const qm of qfMatches) {
          if (qm.winner) {
            const qfPlayers = (qm.players || []).filter(Boolean);
            for (const pid of qfPlayers) {
              if (pid !== qm.winner && playerStats[pid] && !playerStats[pid].placement) {
                playerStats[pid].placement = 'Quarter-finalist';
              }
            }
          }
        }
      }
    } else {
      // For lobby games, winner of each lobby can be noted
      for (const f of gameFixtures) {
        if (f.winner && playerStats[f.winner]) {
          if (!playerStats[f.winner].placement) {
            playerStats[f.winner].placement = `Lobby ${f.match_no} Winner`;
          }
        }
      }
    }

    // Build rows
    for (const [regId, stats] of Object.entries(playerStats)) {
      const opponentNames = [...stats.opponents]
        .map((oid) => {
          // Try to resolve opponent name
          if (playerStats[oid]) return playerStats[oid].name;
          if (nameLookup[oid]) return nameLookup[oid];
          return oid;
        })
        .join(', ');

      rows.push([
        stats.name, regId, game,
        stats.matches, stats.wins, stats.losses,
        opponentNames, stats.placement,
      ]);
    }
  }

  return { headers, rows };
}

/**
 * Build the "Champions" table.
 * One row per game with: Game, Champion (name), Champion Reg ID,
 * Runner-up (name), Runner-up Reg ID, Status
 */
export function buildChampionsTable(fixtures, nameLookup) {
  const headers = [
    'Game', 'Champion', 'Champion Reg ID',
    'Runner-up', 'Runner-up Reg ID', 'Status',
  ];

  const rows = [];
  const games = [...new Set(fixtures.map((f) => f.game))];

  for (const game of games) {
    const gameFixtures = fixtures.filter((f) => f.game === game);
    const isLobby = gameFixtures[0]?.format === 'lobby';

    if (isLobby) {
      // For lobby games, there's no definitive champion from bracket.
      // If all lobbies have winners, we can still report them.
      const winners = gameFixtures.filter((f) => f.winner);
      if (winners.length === 0) {
        rows.push([game, '', '', '', '', 'In progress']);
      } else if (winners.length === gameFixtures.length) {
        // All lobbies completed
        const firstWinner = winners[0];
        const winnerName = firstWinner.winner_name ||
          resolveName(firstWinner.winner, firstWinner.player_names, firstWinner.players, nameLookup);
        rows.push([game, winnerName, firstWinner.winner, '', '', 'Lobby format — see match results']);
      } else {
        rows.push([game, '', '', '', '', 'In progress']);
      }
    } else {
      // Knockout — find the final match
      const totalRounds = computeTotalRounds(gameFixtures);
      const finalMatch = gameFixtures.find((f) => f.round === totalRounds);

      if (!finalMatch || !finalMatch.winner) {
        rows.push([game, '', '', '', '', 'In progress']);
      } else {
        const champName = finalMatch.winner_name ||
          resolveName(finalMatch.winner, finalMatch.player_names, finalMatch.players, nameLookup);
        const finalPlayers = (finalMatch.players || []).filter(Boolean);
        const runnerUpId = finalPlayers.find((p) => p !== finalMatch.winner) || '';
        const runnerUpName = runnerUpId
          ? resolveName(runnerUpId, finalMatch.player_names, finalMatch.players, nameLookup)
          : '';

        rows.push([game, champName, finalMatch.winner, runnerUpName, runnerUpId, 'Completed']);
      }
    }
  }

  return { headers, rows };
}

// ─── File builders ────────────────────────────────────────────────────────────

/** Generate a timestamped filename */
export function makeFilename(prefix, ext, gameName) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = gameName ? `-${gameName.replace(/\s+/g, '-').toLowerCase()}` : '';
  return `${prefix}${safeName}-${date}.${ext}`;
}

/**
 * Build and download a CSV file.
 * @param {object} matchResults - { headers, rows } from buildMatchResultsTable
 * @param {string|null} gameName - optional game filter for the filename
 */
export function downloadCsv(matchResults, gameName) {
  const csv = buildCsvString(matchResults.headers, matchResults.rows);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compat
  const filename = makeFilename('proxima-fixtures-2026', 'csv', gameName);
  triggerDownload(blob, filename);
  return filename;
}

/**
 * Build and download an XLSX file with three sheets.
 */
export function downloadXlsx(matchResults, playerSummary, champions, gameName) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Match Results
  const ws1 = XLSX.utils.aoa_to_sheet([matchResults.headers, ...matchResults.rows]);
  autoWidth(ws1, matchResults.headers, matchResults.rows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Match Results');

  // Sheet 2: Player Summary
  const ws2 = XLSX.utils.aoa_to_sheet([playerSummary.headers, ...playerSummary.rows]);
  autoWidth(ws2, playerSummary.headers, playerSummary.rows);
  XLSX.utils.book_append_sheet(wb, ws2, 'Player Summary');

  // Sheet 3: Champions
  const ws3 = XLSX.utils.aoa_to_sheet([champions.headers, ...champions.rows]);
  autoWidth(ws3, champions.headers, champions.rows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Champions');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = makeFilename('proxima-fixtures-2026', 'xlsx', gameName);
  triggerDownload(blob, filename);
  return filename;
}

/** Auto-width columns based on content */
function autoWidth(ws, headers, rows) {
  const colWidths = headers.map((h, i) => {
    let max = String(h).length;
    for (const row of rows) {
      const len = String(row[i] ?? '').length;
      if (len > max) max = len;
    }
    return { wch: Math.min(max + 2, 50) };
  });
  ws['!cols'] = colWidths;
}

/** Trigger a browser file download */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
