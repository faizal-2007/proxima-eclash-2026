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
  Flame,
  Search,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import {
  GAME_FORMAT,
  GAME_NAMES,
  generateFixtures,
  reshuffleFixtures,
  advanceWinner,
  advanceFreeFireQualifiers,
  swapPlayers,
  getPlayersForGame,
  roundName,
  getTotalRounds,
  isKnockoutFormat,
} from '../../utils/fixtureEngine.js';

import {
  buildMatchResultsTable,
  buildPlayerSummaryTable,
  buildChampionsTable,
  downloadCsv,
  downloadXlsx,
} from '../../utils/exportFixtures.js';

import { KnockoutBracket } from '../PublicFixtures.jsx';
import { MatchResultEntry } from './MatchResultEntry.jsx';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Resolve player or composite team name from registrations array */
function resolvePlayerName(registrations, regId) {
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

/** Build player_names parallel array from current registrations */
function buildPlayerNames(registrations, players) {
  return (players || []).map((regId) => resolvePlayerName(registrations, regId));
}

function playerLabel(registrations, regId) {
  if (!regId) return <span className="text-slate-600 italic">—bye—</span>;
  if (regId.includes('+')) {
    const parts = regId.split('+').map((part) => {
      const isSub = part.toLowerCase().includes('(sub)');
      const cleanId = part.replace(/\s*\(Sub\)/i, '').trim();
      const r = registrations.find((x) => x.registrationId === cleanId);
      return {
        id: cleanId,
        name: r ? r.fullName : cleanId,
        campusId: r?.campusId || '',
        isSub,
      };
    });

    return (
      <span className="font-mono text-xs flex flex-wrap items-center gap-1">
        {parts.map((p, idx) => (
          <React.Fragment key={p.id || idx}>
            {idx > 0 && <span className="text-cyan-400 font-bold">&amp;</span>}
            <span className="text-white font-semibold">{p.name}</span>
            {p.campusId && <span className="text-slate-400">({p.campusId})</span>}
            {p.isSub && (
              <span className="text-amber-300 font-bold text-[10px] bg-amber-500/20 px-1 py-0.5 rounded border border-amber-500/30">
                Sub
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }

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

// ── FreeFireRound1Card ────────────────────────────────────────────────────────
function FreeFireRound1Card({ match, allMatches, registrations, onOpenModal, isLocked, onToggleLock, saving }) {
  const qfMatches = allMatches.filter((m) => m.round === 2);
  const currentQualifiers = qfMatches.flatMap((m) => m.players).filter(Boolean);
  const isCompleted = match.status === 'completed' || currentQualifiers.length === 8;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 space-y-4 transition-all col-span-1 md:col-span-2 xl:col-span-3 ${
        isCompleted
          ? 'border-emerald-500/40 bg-[#061426] shadow-[0_0_30px_rgba(16,185,129,0.15)]'
          : 'border-amber-500/40 bg-[#120e26] shadow-[0_0_30px_rgba(245,158,11,0.15)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-orbitron text-white">
              Stage 1: Solo Battle Royale Qualifier
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              31 Players in Lobby • Top 8 Tacticians Advance to 1v1 Knockout Quarter-Finals
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              isCompleted
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
            }`}
          >
            {isCompleted ? 'Completed • Top 8 Qualified' : 'In Progress • Awaiting Top 8'}
          </span>
          <button
            type="button"
            onClick={onToggleLock}
            className={`p-1.5 rounded-lg text-xs border transition-all ${
              isLocked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={isLocked ? 'Unlock match' : 'Lock match'}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* If completed, display the 8 seeded survivors */}
      {currentQualifiers.length === 8 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-orbitron font-bold text-cyan-300 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Qualified Top 8 Survivors (Seeded into Quarter-Finals)
            </span>
            <span className="text-[10px] font-mono text-emerald-400">8 / 8 Active</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {currentQualifiers.map((pid, idx) => {
              const r = registrations.find((x) => x.registrationId === pid);
              const qfNum = Math.floor(idx / 2) + 1;
              const slotLetter = idx % 2 === 0 ? 'A' : 'B';
              return (
                <div
                  key={pid}
                  className="p-2 rounded-xl bg-white/5 border border-cyan-500/30 flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-md bg-amber-500 text-black font-black font-orbitron text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {r ? r.fullName : pid}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      QF{qfNum}-{slotLetter} • {r?.campusId || pid}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              All 31 players are loaded in the Battle Royale lobby. Once the match finishes, select the Top 8 survivors to populate the Quarter-Finals.
            </span>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="pt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenModal}
          disabled={isLocked || saving}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-orbitron font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all disabled:opacity-50"
        >
          <Trophy className="w-4 h-4" />
          {currentQualifiers.length === 8 ? 'Change / Re-select Top 8 Survivors' : 'Select Top 8 Survivors to Continue Matches'}
        </button>
      </div>
    </div>
  );
}

// ── FreeFireTop8Modal ─────────────────────────────────────────────────────────
function FreeFireTop8Modal({
  isOpen,
  onClose,
  r1Match,
  allMatches,
  registrations,
  onUpdate,
  showToast,
  token,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // When modal opens, inspect Round 2 matches to see if Top 8 are already slotted
  useEffect(() => {
    if (!isOpen) return;
    const qfMatches = allMatches.filter((m) => m.round === 2).sort((a, b) => a.match_no - b.match_no);
    const existing = [];
    for (const m of qfMatches) {
      if (m.players[0]) existing.push(m.players[0]);
      if (m.players[1]) existing.push(m.players[1]);
    }
    setSelectedIds(existing);
    setSearch('');
  }, [isOpen, allMatches]);

  if (!isOpen) return null;

  const lobbyPlayers = (r1Match?.players || []).filter(Boolean);

  const filteredPlayers = lobbyPlayers.filter((pid) => {
    if (!search.trim()) return true;
    const r = registrations.find((x) => x.registrationId === pid);
    const q = search.toLowerCase();
    return (
      pid.toLowerCase().includes(q) ||
      (r?.fullName && r.fullName.toLowerCase().includes(q)) ||
      (r?.campusId && String(r.campusId).toLowerCase().includes(q))
    );
  });

  const handleToggleSelect = (pid) => {
    if (selectedIds.includes(pid)) {
      setSelectedIds(selectedIds.filter((id) => id !== pid));
    } else {
      if (selectedIds.length >= 8) {
        alert('All 8 survivor slots are filled. Remove a player first before adding another.');
        return;
      }
      setSelectedIds([...selectedIds, pid]);
    }
  };

  const handleRemoveIndex = (idx) => {
    setSelectedIds(selectedIds.filter((_, i) => i !== idx));
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const copy = [...selectedIds];
    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
    setSelectedIds(copy);
  };

  const handleMoveDown = (idx) => {
    if (idx >= selectedIds.length - 1) return;
    const copy = [...selectedIds];
    [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
    setSelectedIds(copy);
  };

  const handleAutoPick8 = () => {
    const first8 = lobbyPlayers.slice(0, 8);
    setSelectedIds(first8);
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleConfirm = async () => {
    if (selectedIds.length !== 8) {
      alert(`Please select exactly 8 survivors (currently selected: ${selectedIds.length}).`);
      return;
    }

    setIsSaving(true);
    try {
      // 1. Advance qualifiers client-side
      const updated = advanceFreeFireQualifiers(allMatches, selectedIds);

      // 2. Mark Round 1 as completed
      const updatedR1 = updated.find((m) => m.round === 1 && m.match_no === 1);
      const nowIso = new Date().toISOString();
      if (updatedR1) {
        updatedR1.status = 'completed';
        updatedR1.completed_at = nowIso;
      }

      // 3. Immediately update UI state
      onUpdate(null, updated);

      // 4. Persist Round 1 to backend
      const origR1 = allMatches.find((m) => m.round === 1 && m.match_no === 1);
      if (origR1?.id) {
        await fetch('/api/admin/fixtures', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            id: origR1.id,
            status: 'completed',
            completed_at: nowIso,
          }),
        });
      }

      // 5. Persist the 4 Quarter-final matches to backend
      for (let mNo = 1; mNo <= 4; mNo++) {
        const qfMatch = updated.find((m) => m.round === 2 && m.match_no === mNo);
        const origQf = allMatches.find((m) => m.round === 2 && m.match_no === mNo);
        if (origQf?.id && qfMatch) {
          const playerNames = buildPlayerNames(registrations, qfMatch.players);
          await fetch('/api/admin/fixtures', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              id: origQf.id,
              players: qfMatch.players,
              player_names: playerNames,
              status: 'scheduled',
            }),
          });
        }
      }

      if (showToast) {
        showToast('Top 8 Free Fire survivors confirmed! Quarter-Finals seeded.');
      }
      onClose();
    } catch (e) {
      alert(`Failed to save qualifiers: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#060a24] border border-cyan-500/40 rounded-3xl shadow-[0_0_60px_rgba(0,180,255,0.25)] flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-950/40 via-transparent to-cyan-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-neon-amber">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black font-orbitron text-white">
                Free Fire — Select Top 8 Survivors
              </h3>
              <p className="text-xs text-slate-400">
                Pick the 8 players surviving Stage 1 Solo Battle Royale to advance to the 1v1 Quarter-Finals.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Quarter-Finals Seed Preview (8 Slots) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold font-orbitron uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-cyan-400" />
                Quarter-Finals Bracket Seeds (1st to 8th)
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedIds.length === 8
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                {selectedIds.length} / 8 Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[0, 1, 2, 3].map((qfIdx) => {
                const p1Id = selectedIds[qfIdx * 2];
                const p2Id = selectedIds[qfIdx * 2 + 1];
                const r1 = p1Id ? registrations.find((x) => x.registrationId === p1Id) : null;
                const r2 = p2Id ? registrations.find((x) => x.registrationId === p2Id) : null;

                return (
                  <div
                    key={qfIdx}
                    className="p-3 rounded-2xl bg-[#030617] border border-cyan-500/20 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
                      <span>QF Match {qfIdx + 1}</span>
                      <span className="text-cyan-400">1v1 Clash</span>
                    </div>

                    {/* Slot A */}
                    <div
                      className={`p-2 rounded-xl text-xs flex items-center justify-between gap-1.5 border transition-all ${
                        p1Id
                          ? 'bg-amber-500/15 border-amber-400/40 text-white'
                          : 'bg-white/5 border-dashed border-white/10 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded bg-amber-500 text-black font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
                          #{qfIdx * 2 + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold truncate text-[11px]">
                            {r1 ? r1.fullName : p1Id || 'Empty (Seed ' + (qfIdx * 2 + 1) + ')'}
                          </p>
                          {r1?.campusId && (
                            <p className="text-[9px] font-mono text-slate-400 truncate">
                              ID: {r1.campusId}
                            </p>
                          )}
                        </div>
                      </div>
                      {p1Id && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(qfIdx * 2)}
                            disabled={qfIdx * 2 === 0}
                            title="Move Up"
                            className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(qfIdx * 2)}
                            disabled={qfIdx * 2 >= selectedIds.length - 1}
                            title="Move Down"
                            className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveIndex(qfIdx * 2)}
                            title="Remove"
                            className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[9px] font-bold text-slate-600">VS</div>

                    {/* Slot B */}
                    <div
                      className={`p-2 rounded-xl text-xs flex items-center justify-between gap-1.5 border transition-all ${
                        p2Id
                          ? 'bg-amber-500/15 border-amber-400/40 text-white'
                          : 'bg-white/5 border-dashed border-white/10 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-4 h-4 rounded bg-amber-500 text-black font-bold font-mono text-[9px] flex items-center justify-center shrink-0">
                          #{qfIdx * 2 + 2}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold truncate text-[11px]">
                            {r2 ? r2.fullName : p2Id || 'Empty (Seed ' + (qfIdx * 2 + 2) + ')'}
                          </p>
                          {r2?.campusId && (
                            <p className="text-[9px] font-mono text-slate-400 truncate">
                              ID: {r2.campusId}
                            </p>
                          )}
                        </div>
                      </div>
                      {p2Id && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(qfIdx * 2 + 1)}
                            disabled={qfIdx * 2 + 1 === 0}
                            title="Move Up"
                            className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(qfIdx * 2 + 1)}
                            disabled={qfIdx * 2 + 1 >= selectedIds.length - 1}
                            title="Move Down"
                            className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveIndex(qfIdx * 2 + 1)}
                            title="Remove"
                            className="p-0.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search & Actions Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search participant name, campus ID, or reg ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoPick8}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/20 transition-all"
              >
                Auto-pick First 8
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-950 transition-all"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Participant Selection Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Lobby Participants ({filteredPlayers.length} of {lobbyPlayers.length})</span>
              <span className="text-[11px] text-slate-500 italic">Click card to select / deselect survivor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredPlayers.map((pid) => {
                const isSelected = selectedIds.includes(pid);
                const rankIdx = selectedIds.indexOf(pid);
                const r = registrations.find((x) => x.registrationId === pid);

                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleToggleSelect(pid)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-white/5 border-white/10 hover:border-cyan-500/40 hover:bg-white/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {r ? r.fullName : pid}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate">
                        {pid} {r?.campusId ? `• Campus ID: ${r.campusId}` : ''}
                      </p>
                    </div>

                    {isSelected ? (
                      <span className="px-2 py-1 rounded-lg bg-amber-500 text-black font-black font-orbitron text-[10px] shrink-0 shadow-sm">
                        Survivor #{rankIdx + 1}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-lg border border-white/20 flex items-center justify-center text-slate-500 shrink-0 text-xs">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between gap-3 bg-[#040718]">
          <span className="text-xs font-mono text-slate-400">
            {selectedIds.length === 8 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" /> Ready to seed Quarter-Finals
              </span>
            ) : (
              <span>Select {8 - selectedIds.length} more player{8 - selectedIds.length !== 1 ? 's' : ''} to proceed</span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.length !== 8 || isSaving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-orbitron font-bold text-xs flex items-center gap-2 shadow-neon-blue transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving &amp; Seeding…
                </>
              ) : (
                <>
                  <Trophy className="w-4 h-4" />
                  Confirm Top 8 &amp; Seed Quarter-Finals
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MatchCard — one row per match ─────────────────────────────────────────────

function MatchCard({ match, allMatches, registrations, gamePlayers, onUpdate, totalRounds, token, onOpenTop8 }) {
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

  const handleToggleLock = async () => {
    await save({ locked: !isLocked });
  };

  // Special card layout for Free Fire Round 1 Battle Royale Lobby
  if (match.game === 'Free Fire' && match.round === 1) {
    return (
      <FreeFireRound1Card
        match={match}
        allMatches={allMatches}
        registrations={registrations}
        onOpenModal={onOpenTop8}
        isLocked={isLocked}
        onToggleLock={handleToggleLock}
        saving={saving}
      />
    );
  }

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
      const affectedNext = updated.filter((m) => {
        if (m.id === match.id) return false;
        const orig = allMatches.find((o) => o.id === m.id);
        return orig && JSON.stringify(orig.players) !== JSON.stringify(m.players);
      });
      for (const nextMatch of affectedNext) {
        if (nextMatch?.id) {
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

function RoundSection({
  round,
  matches,
  allMatches,
  registrations,
  gamePlayers,
  onUpdate,
  totalRounds,
  token,
  showToast,
}) {
  const [isTop8ModalOpen, setIsTop8ModalOpen] = useState(false);
  const roundMatches = matches.filter((m) => m.round === round);
  const currentGame = matches[0]?.game;
  const label = roundName(round, totalRounds, currentGame);
  const isFreeFireR1 = currentGame === 'Free Fire' && round === 1;
  const r1Match = matches.find((m) => m.round === 1 && m.match_no === 1);

  // Check how many survivors are currently slotted into Quarter-finals
  const qfMatches = allMatches.filter((m) => m.round === 2);
  const currentQualifiersCount = qfMatches.flatMap((m) => m.players).filter(Boolean).length;
  const isTop8Done = currentQualifiersCount === 8;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold font-orbitron uppercase tracking-widest text-cyan-400">
          {label}
        </span>
        <div className="flex-1 h-px bg-cyan-500/20 min-w-[20px]" />
        {isFreeFireR1 && (
          <button
            type="button"
            onClick={() => setIsTop8ModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-orbitron font-bold text-[10px] flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all"
            title="Open interactive modal to select the top 8 survivor tacticians to advance to Quarter-Finals"
          >
            <Trophy className="w-3 h-3" />
            {isTop8Done ? 'Change Top 8 Survivors' : 'Select Top 8 Survivors'}
          </button>
        )}
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
            onOpenTop8={() => setIsTop8ModalOpen(true)}
          />
        ))}
      </div>

      {/* Free Fire Top 8 Interactive Modal */}
      {isFreeFireR1 && (
        <FreeFireTop8Modal
          isOpen={isTop8ModalOpen}
          onClose={() => setIsTop8ModalOpen(false)}
          r1Match={r1Match}
          allMatches={allMatches}
          registrations={registrations}
          onUpdate={onUpdate}
          showToast={showToast}
          token={token}
        />
      )}
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
    return getTotalRounds(gamePlayers.length, selectedGame);
  }, [gamePlayers.length, selectedGame]);

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
            {isKnockoutFormat(cfg.format) ? (
              <Swords className="w-3.5 h-3.5 text-violet-400" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className={isKnockoutFormat(cfg.format) ? 'text-violet-300' : 'text-emerald-300'}>
              {cfg.format === 'team_knockout'
                ? '2v2 Knockout (Teams with Rotating Subs)'
                : cfg.format === 'team_knockout_playin'
                ? '2v2 TDM Knockout with Play-in'
                : cfg.format === 'br_to_knockout'
                ? 'Solo BR Qualifier → 1v1 Knockout'
                : cfg.hasPlayIn
                ? '1v1 Knockout with Play-In'
                : 'Single-Elimination Knockout'}
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
        {hasExisting && isKnockoutFormat(cfg.format) && (
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
            {selectedGame === 'Free Fire' && (
              <button
                type="button"
                onClick={() => setViewMode('results')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-orbitron transition-all flex items-center gap-1 ${
                  viewMode === 'results'
                    ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md'
                    : 'text-orange-400 hover:text-orange-300'
                }`}
              >
                <Flame className="w-3 h-3 text-orange-400" />
                BR Results
              </button>
            )}
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
                {isKnockoutFormat(cfg.format) ? 'knockout brackets' : `lobbies of ${cfg.lobbySize || 8}`}.
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

      {/* ── Rounds / Lobbies or Bracket View or Match Results View ── */}
      {!isLoading && hasExisting && (
        viewMode === 'results' && selectedGame === 'Free Fire' ? (
          <MatchResultEntry token={token} registrations={registrations} />
        ) : viewMode === 'bracket' && isKnockoutFormat(cfg.format) ? (
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
                showToast={showToast}
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
