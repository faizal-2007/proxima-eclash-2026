/**
 * MatchResultEntry.jsx
 * Admin Post-Match Result Entry screen for Free Fire Custom Room BR (31 players, 3 matches).
 *
 * Capabilities:
 * - Match 1, 2, 3 tabs with status: Not started / In progress / Finalized
 * - Overall Leaderboard tab showing live standings & Top 8 qualification
 * - Step A, Top 8: Searchable dropdowns for 1st to 8th place, no duplicates, move up/down reorder
 * - Step B, Kills: Stepper +/- and numeric input for all 31 players (placed or unplaced), search, filter toggle
 * - Step C: Live preview table sorted by match total
 * - Validation: 8 slots filled, no duplicates, warn if total kills > 30 (with override checkbox)
 * - Auto-save drafts (localStorage + backend draft)
 * - Finalize (locks match) & Unlock / Edit (behind confirmation prompt)
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Flame,
  Swords,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  X,
  Plus,
  Minus,
  Sparkles,
  Users,
  ChevronRight,
  Download,
  AlertCircle,
  Eye,
  Check,
} from 'lucide-react';

import {
  DEFAULT_SCORING_SETTINGS,
  getPlacementPoints,
  deriveMatchScores,
  deriveOverallLeaderboard,
  validateMatchResult,
} from '../../utils/scoringEngine.js';

// Local storage key prefix for auto-save drafts
const DRAFT_STORAGE_PREFIX = 'proxima_ff_draft_match_';

export function MatchResultEntry({ token, registrations = [] }) {
  // Free Fire registered players (31 players)
  const ffPlayers = useMemo(() => {
    return registrations
      .filter((r) => (r.game || '').toLowerCase().includes('free fire'))
      .map((r) => ({
        id: r.registration_id || r.registrationId,
        name: r.full_name || r.fullName,
        campusId: r.campus_id || r.campusId,
        game: r.game,
      }));
  }, [registrations]);

  const [activeTab, setActiveTab] = useState(1); // 1, 2, 3, or 'leaderboard'
  const [scoringSettings, setScoringSettings] = useState(DEFAULT_SCORING_SETTINGS);

  // Raw matches data: { [matchNo]: { placements: string[], kills: Record<string, number>, status: string, settings: any, completed_at: string } }
  const [matchesData, setMatchesData] = useState({
    1: { placements: Array(8).fill(''), kills: {}, status: 'not_started', completed_at: null },
    2: { placements: Array(8).fill(''), kills: {}, status: 'not_started', completed_at: null },
    3: { placements: Array(8).fill(''), kills: {}, status: 'not_started', completed_at: null },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(''); // 'saved', 'saving', 'error'
  const [lastAutoSave, setLastAutoSave] = useState(null);

  // UI state for Step A & B
  const [killsSearch, setKillsSearch] = useState('');
  const [showOnlyKills, setShowOnlyKills] = useState(false);
  const [slotSearch, setSlotSearch] = useState({}); // { [slotIdx]: query }
  const [openDropdown, setOpenDropdown] = useState(null); // slotIdx
  const [killWarningOverride, setKillWarningOverride] = useState(false);
  const [unlockConfirmMatch, setUnlockConfirmMatch] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Manual overrides for tie-breakers in overall leaderboard: { [playerId]: rankAdjustment }
  const [manualOverrides, setManualOverrides] = useState({});

  // ── Load match results from backend & local drafts ─────────────────────────
  const fetchMatchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/match-results?game=Free Fire BR', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data?.matches) {
        setMatchesData((prev) => {
          const next = { ...prev };
          data.matches.forEach((m) => {
            const mNo = m.match_no;
            if (mNo >= 1 && mNo <= 3) {
              // Placements array padded to 8 slots
              const rawPlacements = Array.isArray(m.placements) ? m.placements : [];
              const paddedPlacements = Array(8)
                .fill('')
                .map((_, i) => rawPlacements[i] || '');

              next[mNo] = {
                placements: paddedPlacements,
                kills: m.kills || {},
                status: m.status || 'not_started',
                settings: m.settings || DEFAULT_SCORING_SETTINGS,
                completed_at: m.completed_at,
              };

              if (m.settings) setScoringSettings(m.settings);
              if (m.manual_overrides) setManualOverrides(m.manual_overrides);
            }
          });

          // Check if local drafts have newer in-progress edits
          [1, 2, 3].forEach((mNo) => {
            if (next[mNo].status !== 'finalized') {
              try {
                const draft = localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${mNo}`);
                if (draft) {
                  const parsed = JSON.parse(draft);
                  if (parsed && Array.isArray(parsed.placements)) {
                    next[mNo] = {
                      ...next[mNo],
                      placements: parsed.placements,
                      kills: parsed.kills || {},
                      status: 'in_progress',
                    };
                  }
                }
              } catch (e) {}
            }
          });

          return next;
        });
      }
    } catch (err) {
      console.error('Failed to load match results:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMatchResults();
  }, [fetchMatchResults]);

  // Current match data
  const currentMatch = useMemo(() => {
    if (activeTab === 'leaderboard') return null;
    return (
      matchesData[activeTab] || {
        placements: Array(8).fill(''),
        kills: {},
        status: 'not_started',
        completed_at: null,
      }
    );
  }, [matchesData, activeTab]);

  const isFinalized = currentMatch?.status === 'finalized';

  // ── Auto-save draft to localStorage & server ────────────────────────────────
  const saveDraft = useCallback(
    async (matchNo, placements, kills) => {
      if (matchesData[matchNo]?.status === 'finalized') return;

      // 1. LocalStorage auto-save
      try {
        localStorage.setItem(
          `${DRAFT_STORAGE_PREFIX}${matchNo}`,
          JSON.stringify({ placements, kills, updatedAt: Date.now() })
        );
      } catch (e) {}

      setLastAutoSave(new Date());

      // 2. Debounced save to Supabase
      try {
        setSaveStatus('saving');
        await fetch('/api/admin/match-results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            match_no: matchNo,
            placements,
            kills,
            status: 'in_progress',
            settings: scoringSettings,
            manual_overrides: manualOverrides,
          }),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(''), 2500);
      } catch (err) {
        setSaveStatus('error');
      }
    },
    [token, scoringSettings, manualOverrides, matchesData]
  );

  // ── Step A: Placements Handlers ─────────────────────────────────────────────
  const setPlacementSlot = (slotIdx, playerId) => {
    if (isFinalized) return;
    setMatchesData((prev) => {
      const match = prev[activeTab];
      const newPlacements = [...match.placements];
      newPlacements[slotIdx] = playerId || '';

      const updated = {
        ...prev,
        [activeTab]: {
          ...match,
          placements: newPlacements,
          status: 'in_progress',
        },
      };

      saveDraft(activeTab, newPlacements, match.kills);
      return updated;
    });
    setOpenDropdown(null);
  };

  const removePlacement = (slotIdx) => {
    if (isFinalized) return;
    setPlacementSlot(slotIdx, '');
  };

  const moveSlot = (fromIdx, direction) => {
    if (isFinalized) return;
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= 8) return;

    setMatchesData((prev) => {
      const match = prev[activeTab];
      const newPlacements = [...match.placements];
      const temp = newPlacements[fromIdx];
      newPlacements[fromIdx] = newPlacements[toIdx];
      newPlacements[toIdx] = temp;

      const updated = {
        ...prev,
        [activeTab]: {
          ...match,
          placements: newPlacements,
          status: 'in_progress',
        },
      };

      saveDraft(activeTab, newPlacements, match.kills);
      return updated;
    });
  };

  // Players currently selected in Top 8 (to hide from other dropdowns)
  const placedPlayerIds = useMemo(() => {
    if (!currentMatch) return new Set();
    return new Set(currentMatch.placements.filter(Boolean));
  }, [currentMatch]);

  // ── Step B: Kills Handlers ──────────────────────────────────────────────────
  const setPlayerKills = (playerId, count) => {
    if (isFinalized) return;
    const cleanCount = Math.max(0, parseInt(count, 10) || 0);

    setMatchesData((prev) => {
      const match = prev[activeTab];
      const newKills = { ...match.kills, [playerId]: cleanCount };
      if (cleanCount === 0) {
        delete newKills[playerId];
      }

      const updated = {
        ...prev,
        [activeTab]: {
          ...match,
          kills: newKills,
          status: 'in_progress',
        },
      };

      saveDraft(activeTab, match.placements, newKills);
      return updated;
    });
  };

  const adjustPlayerKills = (playerId, delta) => {
    if (isFinalized) return;
    const current = currentMatch?.kills[playerId] || 0;
    setPlayerKills(playerId, current + delta);
  };

  // ── Derived Scores for Current Match ────────────────────────────────────────
  const currentMatchScores = useMemo(() => {
    if (!currentMatch) return [];
    return deriveMatchScores(
      currentMatch.placements,
      currentMatch.kills,
      ffPlayers,
      scoringSettings
    );
  }, [currentMatch, ffPlayers, scoringSettings]);

  // Validation
  const validation = useMemo(() => {
    if (!currentMatch) return { valid: false, errors: [], warnings: [], totalKills: 0 };
    return validateMatchResult(
      currentMatch.placements,
      currentMatch.kills,
      scoringSettings.maxEliminationsPerMatch
    );
  }, [currentMatch, scoringSettings]);

  // ── Finalize Match ──────────────────────────────────────────────────────────
  const handleFinalizeMatch = async () => {
    if (!validation.valid) {
      setErrorMessage(validation.errors.join(' '));
      return;
    }

    if (validation.exceedsKillLimit && !killWarningOverride) {
      setErrorMessage(
        `Total kills (${validation.totalKills}) exceeds 30. Check the "Override Kill Limit Warning" box below to confirm and finalize.`
      );
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/match-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          match_no: activeTab,
          placements: currentMatch.placements,
          kills: currentMatch.kills,
          status: 'finalized',
          settings: scoringSettings,
          manual_overrides: manualOverrides,
          completed_at: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to finalize match');

      // Clear local draft for this match
      try {
        localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${activeTab}`);
      } catch (e) {}

      setMatchesData((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          status: 'finalized',
          completed_at: new Date().toISOString(),
        },
      }));

      setSuccessMessage(`Match ${activeTab} finalized successfully! Leaderboard updated.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Unlock / Edit Match ─────────────────────────────────────────────────────
  const handleUnlockMatch = async (matchNo) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/admin/match-results', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          match_no: matchNo,
          status: 'in_progress',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unlock match');

      setMatchesData((prev) => ({
        ...prev,
        [matchNo]: {
          ...prev[matchNo],
          status: 'in_progress',
        },
      }));

      setUnlockConfirmMatch(null);
      setSuccessMessage(`Match ${matchNo} unlocked for editing.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Overall Leaderboard Derivation ──────────────────────────────────────────
  const overallLeaderboard = useMemo(() => {
    return deriveOverallLeaderboard(matchesData, ffPlayers, scoringSettings, manualOverrides);
  }, [matchesData, ffPlayers, scoringSettings, manualOverrides]);

  // Export Leaderboard CSV
  const handleExportLeaderboard = () => {
    const headers = [
      'Rank',
      'Player Name',
      'Campus ID',
      'Match 1 Total',
      'Match 2 Total',
      'Match 3 Total',
      'Booyahs',
      'Total Kills',
      'Best Rank',
      'Overall Points',
      'Qualified',
    ];

    const rows = overallLeaderboard.map((r) => [
      r.overallRank,
      r.name,
      r.campusId,
      r.matchBreakdowns[1]?.total ?? 0,
      r.matchBreakdowns[2]?.total ?? 0,
      r.matchBreakdowns[3]?.total ?? 0,
      r.booyahs,
      r.totalKills,
      r.bestPlacement ? `${r.bestPlacement}th` : 'N/A',
      r.totalPoints,
      r.qualified ? 'QUALIFIED (TOP 8)' : 'ELIMINATED',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PROXIMA_2026_FreeFire_BR_Leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to find player object by id
  const getPlayer = useCallback(
    (id) => ffPlayers.find((p) => p.id === id) || { id, name: id || 'TBD', campusId: '' },
    [ffPlayers]
  );

  return (
    <div className="space-y-6">
      {/* ── HEADER & TABS ──────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#0b132b]/80 via-[#070d1e]/90 to-[#030611] border border-cyan-500/20 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Flame className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-orbitron text-white tracking-wide">
                Free Fire Post-Match Result Entry
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              31 Players • 3 Custom Room Matches • Top 8 Qualify for Stage 2 Knockout
            </p>
          </div>

          {/* Auto-save & Status indicator */}
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 animate-pulse">
                <Save className="w-3.5 h-3.5" /> Auto-saving draft...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Draft saved
              </span>
            )}
            {lastAutoSave && !saveStatus && (
              <span className="text-[11px] font-mono text-slate-500">
                Draft auto-saved {lastAutoSave.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Match 1, 2, 3 and Overall Leaderboard Tabs */}
        <div className="flex items-center gap-2 pt-6 overflow-x-auto">
          {[1, 2, 3].map((mNo) => {
            const m = matchesData[mNo];
            const isMatchFinalized = m?.status === 'finalized';
            const isMatchInProgress = m?.status === 'in_progress';
            const isActive = activeTab === mNo;

            return (
              <button
                key={mNo}
                type="button"
                onClick={() => {
                  setActiveTab(mNo);
                  setErrorMessage('');
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold font-orbitron text-xs transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 text-white border-orange-400/50 shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'
                }`}
              >
                <span>Match {mNo}</span>
                {isMatchFinalized ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Finalized
                  </span>
                ) : isMatchInProgress ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> In Progress
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-700/50 text-slate-400">
                    Not Started
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold font-orbitron text-xs transition-all cursor-pointer whitespace-nowrap border ${
              activeTab === 'leaderboard'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black border-cyan-400/50 shadow-neon-blue'
                : 'bg-white/5 text-cyan-300 hover:bg-white/10 border-cyan-500/30'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Overall Leaderboard &amp; Qualifiers</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-3 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button type="button" onClick={() => setErrorMessage('')} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      {/* ── VIEW A: SINGLE MATCH RESULT ENTRY (TABS 1, 2, 3) ────────────────── */}
      {activeTab !== 'leaderboard' && (
        <div className="space-y-6">
          {/* Match Banner & Status Bar */}
          <div className="p-4 rounded-2xl bg-[#070d1e]/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold font-orbitron text-white">
                Match {activeTab} of 3
              </span>
              {isFinalized ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Lock className="w-3.5 h-3.5" /> MATCH FINALIZED &amp; LOCKED
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> ENTRY IN PROGRESS
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isFinalized ? (
                <button
                  type="button"
                  onClick={() => setUnlockConfirmMatch(activeTab)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold font-orbitron text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock / Edit Match</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalizeMatch}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black font-orbitron text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Finalize Match {activeTab}</span>
                </button>
              )}
            </div>
          </div>

          {/* Unlock Confirmation Modal */}
          {unlockConfirmMatch && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0b132b] border border-amber-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center gap-3 text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
                  <h3 className="font-orbitron font-bold text-lg text-white">Unlock Match {unlockConfirmMatch}?</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Unlocking this match will allow editing placements and kills. The match will return to "In Progress" status until re-finalized.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUnlockConfirmMatch(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnlockMatch(unlockConfirmMatch)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold font-orbitron shadow-md"
                  >
                    Confirm Unlock
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TWO COLUMN LAYOUT: STEP A (TOP 8) & STEP B (KILLS) ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* STEP A: TOP 8 SURVIVORS (5 COLS) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-5 rounded-3xl bg-[#070d1e]/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-black font-orbitron text-white flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>Step A: Top 8 Survivors</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Order 1st to 8th. Earns placement points.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {currentMatch.placements.filter(Boolean).length} / 8 Placed
                  </span>
                </div>

                {/* 8 Placement Slots */}
                <div className="space-y-2.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((slotIdx) => {
                    const rank = slotIdx + 1;
                    const pts = getPlacementPoints(rank, scoringSettings);
                    const playerId = currentMatch.placements[slotIdx];
                    const player = playerId ? getPlayer(playerId) : null;
                    const isDropdownOpen = openDropdown === slotIdx && !isFinalized;
                    const filterText = (slotSearch[slotIdx] || '').toLowerCase();

                    // Available players for this slot: not already placed in another slot
                    const availablePlayers = ffPlayers.filter((p) => {
                      if (p.id === playerId) return true;
                      if (placedPlayerIds.has(p.id)) return false;
                      if (!filterText) return true;
                      return (
                        p.name.toLowerCase().includes(filterText) ||
                        (p.campusId && p.campusId.toLowerCase().includes(filterText)) ||
                        p.id.toLowerCase().includes(filterText)
                      );
                    });

                    return (
                      <div
                        key={slotIdx}
                        className={`p-3 rounded-2xl border transition-all ${
                          rank === 1
                            ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                            : rank <= 3
                            ? 'bg-white/5 border-white/15'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {/* Rank badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-black font-orbitron text-xs ${
                                rank === 1
                                  ? 'bg-amber-400 text-black shadow-md'
                                  : rank === 2
                                  ? 'bg-slate-300 text-black'
                                  : rank === 3
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {rank}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-200">
                                {rank === 1 ? '1st (Booyah!)' : `${rank}th Place`}
                              </span>
                              <span className="text-[10px] font-mono text-cyan-400">+{pts} pts</span>
                            </div>
                          </div>

                          {/* Selected Player or Select Button */}
                          <div className="flex-1 min-w-0">
                            {player ? (
                              <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/15">
                                <span className="text-xs font-semibold text-white truncate">
                                  {player.name}
                                </span>
                                {!isFinalized && (
                                  <button
                                    type="button"
                                    onClick={() => removePlacement(slotIdx)}
                                    className="p-1 rounded-md hover:bg-white/20 text-slate-400 hover:text-red-400 transition-colors"
                                    title="Remove player"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={isFinalized}
                                onClick={() => setOpenDropdown(isDropdownOpen ? null : slotIdx)}
                                className="w-full text-left px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 text-xs text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between"
                              >
                                <span>Choose player...</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                            )}
                          </div>

                          {/* Move up / down controls */}
                          {!isFinalized && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={slotIdx === 0}
                                onClick={() => moveSlot(slotIdx, -1)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 transition-colors"
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={slotIdx === 7}
                                onClick={() => moveSlot(slotIdx, 1)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 transition-colors"
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Searchable Dropdown Modal/Popout for this slot */}
                        {isDropdownOpen && (
                          <div className="mt-3 p-3 rounded-xl bg-[#0b132b] border border-cyan-500/40 shadow-2xl space-y-2 animate-in fade-in duration-150">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                autoFocus
                                value={slotSearch[slotIdx] || ''}
                                onChange={(e) =>
                                  setSlotSearch((prev) => ({ ...prev, [slotIdx]: e.target.value }))
                                }
                                placeholder="Search player by name or ID..."
                                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                              />
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1">
                              {availablePlayers.length === 0 ? (
                                <p className="text-[11px] text-slate-400 text-center py-3">No matching players</p>
                              ) : (
                                availablePlayers.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setPlacementSlot(slotIdx, p.id)}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-xs text-slate-200 hover:text-cyan-300 transition-colors flex items-center justify-between"
                                  >
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{p.campusId}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP B: KILLS ENTRY FOR ALL 31 PLAYERS (7 COLS) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-5 rounded-3xl bg-[#070d1e]/90 border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-black font-orbitron text-white flex items-center gap-2">
                      <Swords className="w-4 h-4 text-rose-400" />
                      <span>Step B: Kills Recording</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      All 31 players earn +{scoringSettings.killPoints} pt per kill (placed or unplaced).
                    </p>
                  </div>

                  {/* Total Kills Counter */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border ${
                      validation.exceedsKillLimit
                        ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    <span>Total Kills:</span>
                    <span className="text-white text-sm">{validation.totalKills}</span>
                    <span className="text-slate-400">/ 30 max</span>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={killsSearch}
                      onChange={(e) => setKillsSearch(e.target.value)}
                      placeholder="Search player name or campus ID..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOnlyKills}
                      onChange={(e) => setShowOnlyKills(e.target.checked)}
                      className="rounded bg-white/5 border-white/20 text-cyan-500 focus:ring-0"
                    />
                    <span>Show only players with kills</span>
                  </label>
                </div>

                {/* Kill limit warning banner with override checkbox */}
                {validation.exceedsKillLimit && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 space-y-2">
                    <div className="flex items-start gap-2.5 text-amber-300 text-xs">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <strong className="block font-bold">Warning: Total kills ({validation.totalKills}) exceeds 30</strong>
                        In a 31-player battle royale match, at most 30 players are eliminated.
                      </div>
                    </div>
                    {!isFinalized && (
                      <label className="inline-flex items-center gap-2 text-[11px] text-amber-200 font-semibold cursor-pointer select-none pl-6">
                        <input
                          type="checkbox"
                          checked={killWarningOverride}
                          onChange={(e) => setKillWarningOverride(e.target.checked)}
                          className="rounded bg-white/10 border-amber-400/50 text-amber-500"
                        />
                        <span>Override warning (I have verified the kill counts)</span>
                      </label>
                    )}
                  </div>
                )}

                {/* 31 Players Kills List */}
                <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
                  {ffPlayers
                    .filter((p) => {
                      const killVal = currentMatch.kills[p.id] || 0;
                      if (showOnlyKills && killVal === 0) return false;
                      if (!killsSearch) return true;
                      const q = killsSearch.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(q) ||
                        (p.campusId && p.campusId.toLowerCase().includes(q)) ||
                        p.id.toLowerCase().includes(q)
                      );
                    })
                    .map((p) => {
                      const rankIdx = currentMatch.placements.indexOf(p.id);
                      const rank = rankIdx !== -1 ? rankIdx + 1 : null;
                      const killCount = currentMatch.kills[p.id] || 0;

                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                            killCount > 0
                              ? 'bg-rose-500/10 border-rose-500/30'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Placement indicator badge */}
                            {rank ? (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-orbitron shrink-0 ${
                                  rank === 1
                                    ? 'bg-amber-400 text-black'
                                    : rank <= 3
                                    ? 'bg-slate-300 text-black'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {rank === 1 ? '🥇 Booyah' : `${rank}th Place`}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-500 bg-white/5 shrink-0">
                                9th+
                              </span>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{p.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">{p.campusId}</p>
                            </div>
                          </div>

                          {/* Stepper controls */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={isFinalized || killCount <= 0}
                              onClick={() => adjustPlayerKills(p.id, -1)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-200 flex items-center justify-center font-bold text-xs"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              min="0"
                              disabled={isFinalized}
                              value={killCount}
                              onChange={(e) => setPlayerKills(p.id, e.target.value)}
                              className="w-12 text-center py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-400"
                            />

                            <button
                              type="button"
                              disabled={isFinalized}
                              onClick={() => adjustPlayerKills(p.id, 1)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-200 flex items-center justify-center font-bold text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>

          {/* ── STEP C: LIVE MATCH PREVIEW TABLE ──────────────────────────────── */}
          <div className="p-6 rounded-3xl bg-[#070d1e]/90 border border-white/10 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-black font-orbitron text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Match {activeTab} Live Standings Preview</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Derived dynamically: Placement Points + (Kills × {scoringSettings.killPoints}).
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400">
                Sorted by Match Total Descending
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Campus ID</th>
                    <th className="py-2.5 px-3 text-center">Placement</th>
                    <th className="py-2.5 px-3 text-center">Placement Pts</th>
                    <th className="py-2.5 px-3 text-center">Kills</th>
                    <th className="py-2.5 px-3 text-center">Kill Pts</th>
                    <th className="py-2.5 px-3 text-right">Match Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentMatchScores.map((row, idx) => {
                    const isTop8Rank = idx < 8;
                    const hasPoints = row.matchTotal > 0;

                    return (
                      <tr
                        key={row.playerId}
                        className={`transition-colors ${
                          row.isBooyah
                            ? 'bg-amber-500/10 font-semibold'
                            : isTop8Rank && hasPoints
                            ? 'bg-cyan-500/5'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <span className={`font-semibold ${row.isBooyah ? 'text-amber-300' : 'text-white'}`}>
                            {row.name}
                          </span>
                          {row.isBooyah && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-orbitron bg-amber-400 text-black font-black">
                              BOOYAH
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400">{row.campusId}</td>
                        <td className="py-2 px-3 text-center">
                          {row.rank ? (
                            <span className="font-semibold text-slate-200">{row.rank}th</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-cyan-300">
                          {row.placementPts > 0 ? `+${row.placementPts}` : '0'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-rose-300">
                          {row.kills}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-rose-400">
                          {row.killPts > 0 ? `+${row.killPts}` : '0'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-sm text-cyan-400">
                          {row.matchTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW B: OVERALL LEADERBOARD & QUALIFIERS TAB ──────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#070d1e]/90 border border-white/10 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black font-orbitron text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Free Fire Battle Royale — Overall Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Sum of Matches 1, 2, 3 • Official Tie-breakers: Points ➔ Booyahs ➔ Kills ➔ Best Rank
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportLeaderboard}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-orbitron text-xs flex items-center gap-2 shadow-neon-blue transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Leaderboard CSV</span>
              </button>
            </div>

            {/* Tie-breaker Rules Reference Pill */}
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-xs flex flex-wrap items-center gap-3 font-mono">
              <span className="font-bold text-white uppercase">Tie-Breaker Hierarchy:</span>
              <span>1. Total Points</span>
              <span>➔ 2. Total Booyahs</span>
              <span>➔ 3. Total Kills</span>
              <span>➔ 4. Best Placement Rank</span>
              <span>➔ 5. Manual Override</span>
            </div>

            {/* Overall Standings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-3">Player</th>
                    <th className="py-3 px-3">Campus ID</th>
                    <th className="py-3 px-2 text-center">Match 1</th>
                    <th className="py-3 px-2 text-center">Match 2</th>
                    <th className="py-3 px-2 text-center">Match 3</th>
                    <th className="py-3 px-2 text-center">Booyahs</th>
                    <th className="py-3 px-2 text-center">Kills</th>
                    <th className="py-3 px-2 text-center">Best Rank</th>
                    <th className="py-3 px-3 text-right">Overall Points</th>
                    <th className="py-3 px-3 text-center">Stage 2 Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {overallLeaderboard.map((row) => {
                    const isQualified = row.qualified;

                    return (
                      <tr
                        key={row.playerId}
                        className={`transition-colors ${
                          row.overallRank === 1
                            ? 'bg-amber-500/15 font-bold'
                            : isQualified
                            ? 'bg-emerald-500/5'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono">
                          <span
                            className={`w-6 h-6 rounded-lg inline-flex items-center justify-center font-bold text-xs ${
                              row.overallRank === 1
                                ? 'bg-amber-400 text-black shadow-md'
                                : row.overallRank <= 3
                                ? 'bg-slate-300 text-black'
                                : row.overallRank <= 8
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.overallRank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`font-semibold ${row.overallRank === 1 ? 'text-amber-300' : 'text-white'}`}>
                            {row.name}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400">{row.campusId}</td>

                        {/* Match 1, 2, 3 Breakdown */}
                        {[1, 2, 3].map((mNo) => {
                          const mb = row.matchBreakdowns[mNo];
                          return (
                            <td key={mNo} className="py-3 px-2 text-center font-mono text-slate-300">
                              {mb?.status === 'not_started' ? (
                                <span className="text-slate-600">—</span>
                              ) : (
                                <span>{mb?.total ?? 0}</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-2 text-center font-mono font-bold text-amber-300">
                          {row.booyahs > 0 ? `🥇 ${row.booyahs}` : '0'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-bold text-rose-300">
                          {row.totalKills}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-300">
                          {row.bestPlacement ? `${row.bestPlacement}th` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-base text-cyan-400">
                          {row.totalPoints}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isQualified ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-orbitron bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                              <Check className="w-3 h-3" /> QUALIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-500 bg-white/5">
                              Eliminated
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
