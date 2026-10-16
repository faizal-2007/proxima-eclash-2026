/**
 * FixturesTab.jsx
 * Admin Fixtures tab for PROXIMA E-CLASH 2026.
 * Receives: { token, registrations }
 * Follows the exact same prop/styling pattern as VolunteersManager.jsx
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Shuffle,
  Lock,
  Unlock,
  Trophy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Swords,
  Users,
  Layers,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileText,
  Archive,
} from 'lucide-react';

import {
  GAME_FORMAT,
  GAME_NAMES,
  generateFixtures,
  reshuffleFixtures,
  advanceWinner,
  swapPlayers,
  getPlayersForGame,
  roundName,
  getTotalRounds,
} from '../../utils/fixtureEngine.js';

import {
  buildMatchResultsTable,
  buildPlayerSummaryTable,
  buildChampionsTable,
  downloadCsv,
  downloadXlsx,
} from '../../utils/exportFixtures.js';

import { KnockoutBracket } from '../PublicFixtures.jsx';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Resolve player name from registrations array */
function resolvePlayerName(registrations, regId) {
  if (!regId) return '';
  const r = registrations.find((x) => x.registrationId === regId);
  return r ? r.fullName : '';
}

/** Build player_names parallel array from current registrations */
function buildPlayerNames(registrations, players) {
  return (players || []).map((regId) => resolvePlayerName(registrations, regId));
}

function playerLabel(registrations, regId) {
  if (!regId) return <span className="text-slate-600 italic">—bye—</span>;
  const r = registrations.find((x) => x.registrationId === regId);
  if (!r) return <span className="text-slate-400 font-mono text-xs">{regId}</span>;
  return (
    <span className="font-mono text-xs">
      <span className="text-white font-semibold">{r.fullName}</span>
      <span className="text-slate-400 ml-1">({r.campusId})</span>
    </span>
  );
}

function Toast({ msg, isError, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  if (!msg) return null;
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl flex items-center gap-2 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200 ${
        isError
          ? 'bg-red-950 border border-red-500/60 text-red-200'
          : 'bg-cyan-950 border border-cyan-500/60 text-cyan-200'
      }`}
    >
      {isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

// ── MatchCard — one row per match ─────────────────────────────────────────────

function MatchCard({ match, allMatches, registrations, gamePlayers, onUpdate, totalRounds, token }) {
  const [saving, setSaving] = useState(false);

  const isKnockout = match.format === 'knockout';
  const isLocked = match.locked;
  const roundNum = match.round;
  const totalRds = totalRounds;

  const save = useCallback(async (patch) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/fixtures', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: match.id, ...patch }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      onUpdate(data.fixture);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }, [match.id, token, onUpdate]);

  const handleWinner = async (regId) => {
    const newWinner = match.winner === regId ? null : regId;
    // Optimistically compute next-round advancement client-side
    const updated = advanceWinner(allMatches, match.round, match.match_no, newWinner);
    onUpdate(null, updated); // full replace

    // Build name snapshots for the patch
    const winnerName = newWinner ? resolvePlayerName(registrations, newWinner) : null;
    const status = newWinner ? 'completed' : 'scheduled';
    const completed_at = newWinner ? new Date().toISOString() : null;

    // Persist winner on this match (with name snapshot + status)
    await save({
      winner: newWinner,
      winner_name: winnerName,
      status,
      completed_at,
    });

    // Persist next-round slot if knockout
    if (isKnockout && match.round < totalRds) {
      const nextMatchNo = Math.ceil(match.match_no / 2);
      const slot = match.match_no % 2 === 1 ? 0 : 1;
      const nextMatch = updated.find((m) => m.round === match.round + 1 && m.match_no === nextMatchNo);
      if (nextMatch?.id) {
        // Build player_names for the next match from current registrations
        const nextPlayerNames = buildPlayerNames(registrations, nextMatch.players);
        await fetch('/api/admin/fixtures', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: nextMatch.id,
            players: nextMatch.players,
            player_names: nextPlayerNames,
          }),
        });
      }
    }
  };

  const handlePlayerChange = async (slotIdx, newRegId) => {
    const currentOccupant = match.players[slotIdx];
    if (newRegId === currentOccupant) return;

    // Perform swap client-side
    const swapped = swapPlayers(allMatches, newRegId, match.round, match.match_no, slotIdx, currentOccupant);
    onUpdate(null, swapped);

    // Persist both affected rows (with name snapshots)
    const affectedMatches = swapped.filter((m) => {
      const orig = allMatches.find((o) => o.id === m.id);
      return orig && JSON.stringify(orig.players) !== JSON.stringify(m.players);
    });
    for (const m of affectedMatches) {
      if (m.id) {
        const playerNames = buildPlayerNames(registrations, m.players);
        await fetch('/api/admin/fixtures', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: m.id, players: m.players, player_names: playerNames }),
        });
      }
    }
  };

  const handleToggleLock = async () => {
    await save({ locked: !isLocked });
  };


  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 space-y-3 transition-all ${
        isLocked
          ? 'border-amber-500/50 bg-amber-950/20'
          : 'border-cyan-500/20 bg-[#080d32]'
      } ${saving ? 'opacity-70' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
          {isKnockout
            ? `${roundName(roundNum, totalRds)} — Match ${match.match_no}`
            : `Lobby ${match.match_no}`}
        </span>

        <div className="flex items-center gap-2">
          {saving && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
          {/* Lock toggle */}
          <button
            type="button"
            onClick={handleToggleLock}
            title={isLocked ? 'Unlock match' : 'Lock match'}
            className={`p-1.5 rounded-lg text-xs border transition-all ${
              isLocked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Players */}
      <div className="space-y-1.5">
        {match.players.map((regId, idx) => {
          const isBye = !regId;
          const isWinner = match.winner === regId && regId;
          return (
            <div key={idx} className="flex items-center gap-2">
              {/* Slot label */}
              <span className="text-[10px] font-mono text-slate-500 w-4 shrink-0">
                {isKnockout ? (idx === 0 ? 'A' : 'B') : `P${idx + 1}`}
              </span>

              {/* Dropdown to change player */}
              <div className="relative flex-1">
                <select
                  disabled={isLocked || isBye}
                  value={regId || ''}
                  onChange={(e) => handlePlayerChange(idx, e.target.value)}
                  className="w-full appearance-none pl-2 pr-6 py-1.5 rounded-lg bg-[#050918] border border-white/10 text-xs text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBye && <option value="">— bye —</option>}
                  {gamePlayers.map((pid) => {
                    const r = registrations.find((x) => x.registrationId === pid);
                    return (
                      <option key={pid} value={pid}>
                        {r ? `${r.fullName} (${r.campusId})` : pid}
                      </option>
                    );
                  })}
                </select>
                {!isLocked && !isBye && (
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                )}
              </div>

              {/* Winner button (knockout only, not byes) */}
              {isKnockout && !isBye && (
                <button
                  type="button"
                  onClick={() => handleWinner(regId)}
                  disabled={isLocked}
                  title={isWinner ? 'Unmark winner' : 'Mark as winner'}
                  className={`p-1.5 rounded-lg border text-xs transition-all shrink-0 ${
                    isWinner
                      ? 'bg-amber-500/30 border-amber-400/60 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:text-amber-300 hover:border-amber-400/40'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
}

// ── RoundSection ──────────────────────────────────────────────────────────────

function RoundSection({ round, matches, allMatches, registrations, gamePlayers, onUpdate, totalRounds, token }) {
  const roundMatches = matches.filter((m) => m.round === round);
  const label = matches[0]?.format === 'knockout'
    ? roundName(round, totalRounds)
    : `Lobbies`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold font-orbitron uppercase tracking-widest text-cyan-400">
          {label}
        </span>
        <div className="flex-1 h-px bg-cyan-500/20" />
        <span className="text-[10px] font-mono text-slate-500">{roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {roundMatches.map((m) => (
          <MatchCard
            key={m.id || `${m.round}-${m.match_no}`}
            match={m}
            allMatches={allMatches}
            registrations={registrations}
            gamePlayers={gamePlayers}
            onUpdate={onUpdate}
            totalRounds={totalRounds}
            token={token}
          />
        ))}
      </div>
    </div>
  );
}

// ── DownloadResultsButton ─────────────────────────────────────────────────────

function DownloadResultsButton({ token, matches, registrations, allFixturesByGame, showToast }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedExportGame, setSelectedExportGame] = useState('ALL');
  const [includeArchive, setIncludeArchive] = useState(false);
  const menuRef = useRef(null);

  const hasFixtures = Object.values(allFixturesByGame).some((arr) => arr.length > 0);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Build name lookup from registrations (fallback for when snapshot is missing)
  const nameLookup = useMemo(() => {
    const map = {};
    for (const r of registrations) {
      if (r.registrationId) map[r.registrationId] = r.fullName;
    }
    return map;
  }, [registrations]);

  const gamesWithFixtures = useMemo(
    () => GAME_NAMES.filter((g) => (allFixturesByGame[g] || []).length > 0),
    [allFixturesByGame]
  );

  const handleExport = async (format) => {
    setExporting(true);
    try {
      // Determine which games to export
      const gamesToExport = selectedExportGame === 'ALL'
        ? gamesWithFixtures
        : [selectedExportGame];

      // Collect all fixtures (+ optionally archived)
      let allFixtures = [];
      for (const game of gamesToExport) {
        const current = allFixturesByGame[game] || [];
        allFixtures.push(...current);

        if (includeArchive) {
          // Fetch archived fixtures from API
          try {
            const res = await fetch(
              `/api/admin/fixtures?game=${encodeURIComponent(game)}&include_archive=true`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json().catch(() => null);
            if (res.ok && data?.archived?.length) {
              // Mark archived rows with superseded status
              const archiveRows = data.archived.map((a) => ({
                ...a,
                status: 'superseded',
              }));
              allFixtures.push(...archiveRows);
            }
          } catch {
            // Ignore archive fetch errors, export what we have
          }
        }
      }

      if (allFixtures.length === 0) {
        showToast('No fixtures to export.', true);
        setExporting(false);
        setOpen(false);
        return;
      }

      const matchResults = buildMatchResultsTable(allFixtures, nameLookup);
      const gameName = selectedExportGame === 'ALL' ? null : selectedExportGame;

      if (format === 'csv') {
        const filename = downloadCsv(matchResults, gameName);
        showToast(`Downloaded ${filename}`);
      } else {
        const playerSummary = buildPlayerSummaryTable(allFixtures, nameLookup);
        const champions = buildChampionsTable(allFixtures, nameLookup);
        const filename = downloadXlsx(matchResults, playerSummary, champions, gameName);
        showToast(`Downloaded ${filename}`);
      }
    } catch (err) {
      console.error('Export error:', err);
      showToast(`Export failed: ${err.message}`, true);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={!hasFixtures || exporting}
        title={!hasFixtures ? 'No fixtures to export' : 'Download tournament results'}
        className={`px-3.5 py-2 rounded-xl font-bold font-orbitron text-xs transition-all flex items-center gap-1.5 ${
          !hasFixtures
            ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-50'
            : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-neon-blue'
        }`}
      >
        {exporting ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>Download Results</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-cyan-500/30 bg-[#070b2a] shadow-[0_0_30px_rgba(0,229,255,0.15)] backdrop-blur-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Game filter */}
          <div>
            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              Game
            </label>
            <select
              value={selectedExportGame}
              onChange={(e) => setSelectedExportGame(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#050918] border border-white/15 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All games</option>
              {gamesWithFixtures.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Include archive checkbox */}
          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeArchive}
              onChange={(e) => setIncludeArchive(e.target.checked)}
              className="mt-0.5 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-500/30"
            />
            <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors leading-tight">
              <span className="font-semibold">Include previous (re-shuffled) draws</span>
              <br />
              <span className="text-slate-500">Archived matches shown as "Superseded"</span>
            </span>
          </label>

          {/* Format buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-all disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main FixturesTab ──────────────────────────────────────────────────────────

export function FixturesTab({ token, registrations }) {
  const [selectedGame, setSelectedGame] = useState(GAME_NAMES[0]);
  const [matches, setMatches] = useState([]);
  const [allFixturesByGame, setAllFixturesByGame] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState({ msg: '', isError: false });
  const [confirmReshuffle, setConfirmReshuffle] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'bracket'

  const cfg = GAME_FORMAT[selectedGame];
  const gamePlayers = useMemo(
    () => getPlayersForGame(registrations, selectedGame),
    [registrations, selectedGame]
  );

  const nameMap = useMemo(() => {
    const map = {};
    for (const r of registrations) {
      if (r.registrationId) map[r.registrationId] = r.fullName;
    }
    return map;
  }, [registrations]);

  const showToast = useCallback((msg, isError = false) => {
    setToast({ msg, isError });
  }, []);

  const clearToast = useCallback(() => setToast({ msg: '', isError: false }), []);

  // ── Fetch fixtures for selected game ───────────────────────────────────────
  const fetchFixtures = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/fixtures?game=${encodeURIComponent(selectedGame)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const fixtures = data.fixtures || [];
        setMatches(fixtures);
        setAllFixturesByGame((prev) => ({ ...prev, [selectedGame]: fixtures }));
      } else {
        showToast(data?.error || 'Failed to load fixtures.', true);
      }
    } catch {
      showToast('Network error loading fixtures.', true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGame, token, showToast]);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  // ── Fetch all games' fixtures for export (lightweight) ────────────────────
  useEffect(() => {
    const fetchAllGames = async () => {
      for (const game of GAME_NAMES) {
        if (game === selectedGame) continue; // already fetched above
        try {
          const res = await fetch(`/api/admin/fixtures?game=${encodeURIComponent(game)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => null);
          if (res.ok) {
            setAllFixturesByGame((prev) => ({ ...prev, [game]: data.fixtures || [] }));
          }
        } catch {
          // Silent fail for background fetch
        }
      }
    };
    fetchAllGames();
  }, [token, selectedGame]);

  // ── Generate / re-shuffle ──────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (gamePlayers.length < 2) {
      showToast('Need at least 2 registered players to generate a draw.', true);
      return;
    }

    const hasExisting = matches.length > 0;
    if (hasExisting && !confirmReshuffle) {
      setConfirmReshuffle(true);
      return;
    }
    setConfirmReshuffle(false);
    setIsGenerating(true);

    try {
      const fresh = hasExisting
        ? reshuffleFixtures(selectedGame, gamePlayers, matches)
        : generateFixtures(selectedGame, gamePlayers);

      // Add player_names snapshots + bye status to each fixture
      const enriched = fresh.map((f) => {
        const playerNames = buildPlayerNames(registrations, f.players);
        const players = f.players || [];
        const activePlayers = players.filter(Boolean);

        // Detect bye matches (knockout with one real player)
        let status = 'scheduled';
        let winnerName = null;
        if (f.format === 'knockout' && activePlayers.length === 1 && players.length === 2) {
          status = 'bye';
          winnerName = resolvePlayerName(registrations, f.winner);
        } else if (f.winner) {
          status = 'completed';
          winnerName = resolvePlayerName(registrations, f.winner);
        }

        return {
          ...f,
          player_names: playerNames,
          winner_name: winnerName,
          status,
        };
      });

      const res = await fetch('/api/admin/fixtures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fixtures: enriched }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to save fixtures.');
      const fixtures = data.fixtures || [];
      setMatches(fixtures);
      setAllFixturesByGame((prev) => ({ ...prev, [selectedGame]: fixtures }));
      showToast(hasExisting ? 'Draw re-shuffled (old draw archived).' : 'Draw generated!');
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setIsGenerating(false);
    }
  }, [gamePlayers, matches, confirmReshuffle, selectedGame, token, showToast, registrations]);

  // ── Delete all fixtures for this game ─────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Delete all fixtures for ${selectedGame}? Old matches will be archived.`)) return;
    const res = await fetch(`/api/admin/fixtures?game=${encodeURIComponent(selectedGame)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setMatches([]);
      setAllFixturesByGame((prev) => ({ ...prev, [selectedGame]: [] }));
      showToast('All fixtures deleted (archived).');
    } else {
      showToast('Failed to delete fixtures.', true);
    }
  }, [selectedGame, token, showToast]);

  // ── onUpdate from child ────────────────────────────────────────────────────
  // Called either with a single patched row OR a full updated array from advanceWinner/swap
  const handleUpdate = useCallback((patchedRow, fullArray) => {
    const updateState = (newMatches) => {
      setMatches(newMatches);
      setAllFixturesByGame((prev) => ({ ...prev, [selectedGame]: newMatches }));
    };

    if (fullArray) {
      // Keep ids from existing matches (so further saves still work)
      setMatches((prev) => {
        const result = fullArray.map((fm) => {
          const existing = prev.find(
            (p) => p.round === fm.round && p.match_no === fm.match_no && p.game === fm.game
          );
          return existing ? { ...existing, ...fm } : fm;
        });
        setAllFixturesByGame((prevAll) => ({ ...prevAll, [selectedGame]: result }));
        return result;
      });
      return;
    }
    if (patchedRow) {
      setMatches((prev) => {
        const result = prev.map((m) => (m.id === patchedRow.id ? patchedRow : m));
        setAllFixturesByGame((prevAll) => ({ ...prevAll, [selectedGame]: result }));
        return result;
      });
    }
  }, [selectedGame]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const rounds = useMemo(() => [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b), [matches]);
  const totalRounds = useMemo(() => {
    if (cfg.format === 'knockout') return getTotalRounds(gamePlayers.length);
    return 1;
  }, [cfg, gamePlayers.length]);

  const hasExisting = matches.length > 0;
  const lockedCount = matches.filter((m) => m.locked).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Toast msg={toast.msg} isError={toast.isError} onDone={clearToast} />

      {/* ── Game selector + controls ── */}
      <div className="flex flex-wrap items-start gap-4">
        {/* Game tabs */}
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          {GAME_NAMES.map((g) => {
            const count = getPlayersForGame(registrations, g).length;
            const active = g === selectedGame;
            return (
              <button
                key={g}
                type="button"
                onClick={() => { setSelectedGame(g); setConfirmReshuffle(false); }}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-orbitron transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-neon-blue'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {g}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${active ? 'bg-black/20 text-black' : 'bg-white/10 text-cyan-400'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <DownloadResultsButton
            token={token}
            matches={matches}
            registrations={registrations}
            allFixturesByGame={allFixturesByGame}
            showToast={showToast}
          />
          {hasExisting && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 rounded-xl bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-950 transition-all"
            >
              Clear Draw
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || gamePlayers.length < 2}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-orbitron flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmReshuffle
                ? 'bg-amber-500 text-black animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-neon-blue hover:brightness-110'
            }`}
          >
            {isGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Shuffle className="w-3.5 h-3.5" />
            )}
            {confirmReshuffle
              ? 'Confirm Re-shuffle?'
              : hasExisting
              ? 'Re-shuffle'
              : 'Generate Draw'}
          </button>
          {confirmReshuffle && (
            <button
              type="button"
              onClick={() => setConfirmReshuffle(false)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-xs font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={fetchFixtures}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Info bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#080d32] border border-cyan-500/20 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-white font-bold">{gamePlayers.length}</span> registered
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            {cfg.format === 'knockout' ? (
              <Swords className="w-3.5 h-3.5 text-violet-400" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className={cfg.format === 'knockout' ? 'text-violet-300' : 'text-emerald-300'}>
              {cfg.format === 'knockout' ? 'Single-Elimination Knockout' : `Lobbies of ${cfg.lobbySize}`}
            </span>
          </span>
          {hasExisting && (
            <>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                <span className="text-amber-300 font-bold">{lockedCount}</span> locked
              </span>
            </>
          )}
        </div>

        {/* View mode toggle (Knockout only) */}
        {hasExisting && cfg.format === 'knockout' && (
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-orbitron transition-all ${
                viewMode === 'editor'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Match Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bracket')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-orbitron transition-all flex items-center gap-1 ${
                viewMode === 'bracket'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-neon-blue'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3" />
              Bracket View
            </button>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {!isLoading && !hasExisting && (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Swords className="w-8 h-8 text-cyan-500/60" />
          </div>
          {gamePlayers.length < 2 ? (
            <>
              <p className="text-slate-300 font-semibold">Not enough players</p>
              <p className="text-slate-500 text-sm max-w-xs">
                {gamePlayers.length === 0
                  ? `No one has registered for ${selectedGame} yet.`
                  : `Only ${gamePlayers.length} player registered — need at least 2 to generate a draw.`}
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-300 font-semibold">No draw generated yet</p>
              <p className="text-slate-500 text-sm max-w-xs">
                Click <span className="text-cyan-400 font-bold">Generate Draw</span> to randomly seed{' '}
                {gamePlayers.length} players into{' '}
                {cfg.format === 'knockout' ? 'knockout brackets' : `lobbies of ${cfg.lobbySize}`}.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
          <span className="text-sm">Loading fixtures…</span>
        </div>
      )}

      {/* ── Rounds / Lobbies or Bracket View ── */}
      {!isLoading && hasExisting && (
        viewMode === 'bracket' && cfg.format === 'knockout' ? (
          <KnockoutBracket
            fixtures={matches}
            nameMap={nameMap}
            totalRounds={totalRounds}
            selectedGame={selectedGame}
          />
        ) : (
          <div className="space-y-8">
            {rounds.map((r) => (
              <RoundSection
                key={r}
                round={r}
                matches={matches}
                allMatches={matches}
                registrations={registrations}
                gamePlayers={gamePlayers}
                onUpdate={handleUpdate}
                totalRounds={totalRounds}
                token={token}
              />
            ))}
          </div>
        )
      )}

      {/* ── RLS notice ── */}
      <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-200/70 text-[11px] font-mono flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
        <span>
          Fixtures use <strong>service-role key</strong> server-side (bypasses RLS safely). Public SELECT
          is allowed by policy; writes are gated by the admin Bearer token in all serverless functions.
          No Supabase Auth (anon/JWT) is used here — see <code>api/_handlers/admin/fixtures.js</code>.
        </span>
      </div>
    </div>
  );
}
