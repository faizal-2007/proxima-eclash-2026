/**
 * PublicFixtures.jsx
 * Public read-only Fixtures section for the PROXIMA E-CLASH 2026 landing page.
 * - Matches the existing dark-navy + cyan aesthetic of LandingSections.jsx
 * - Shows knockout brackets (scroll horizontally on mobile) or lobby cards
 * - Resolves player names via the public_players view — no private fields exposed
 * - Live via Supabase Realtime; falls back to 30-second polling
 */
import React, { useState, useMemo } from 'react';
import {
  Swords,
  Trophy,
  WifiOff,
  Loader2,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { useLiveFixtures } from '../utils/useLiveFixtures.js';
import { GAME_FORMAT, GAME_NAMES, roundName } from '../utils/fixtureEngine.js';

// ── Connection status indicator ───────────────────────────────────────────────
function LiveIndicator({ status }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-[10px] font-mono text-amber-300">
        <WifiOff className="w-3 h-3" />
        Polling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
      <Loader2 className="w-3 h-3 animate-spin" />
      Connecting
    </span>
  );
}

// ── Player name chip ──────────────────────────────────────────────────────────
function PlayerChip({ regId, nameMap, isWinner, isFlash, emptyLabel = 'Bye' }) {
  if (!regId) {
    return <span className="text-slate-600 italic text-xs">{emptyLabel}</span>;
  }
  const name = nameMap[regId];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors duration-300 ${
        isFlash ? 'text-cyan-300' : isWinner ? 'text-amber-300' : 'text-white'
      }`}
    >
      {isWinner && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
      {name || <span className="text-slate-500 font-normal">TBD</span>}
    </span>
  );
}

// ── Team Pill (Matches the reference image's blue-gradient rounded pills) ────
function TeamPill({ regId, nameMap, isWinner, isFlash, emptyLabel = 'TBD' }) {
  const isBye = !regId;
  const rawName = isBye ? emptyLabel : (nameMap?.[regId] || regId);
  const displayName = isBye ? emptyLabel : rawName;

  return (
    <div
      title={displayName}
      className={`group/pill relative w-36 sm:w-44 md:w-48 h-8 sm:h-9 rounded-full flex items-center justify-between px-3 sm:px-4 transition-all duration-300 select-none shadow-md ${
        isBye
          ? 'bg-[#080d22]/90 border border-white/10 text-slate-500 shadow-inner'
          : isWinner
            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold ring-2 ring-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.65)] scale-[1.02]'
            : isFlash
              ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-black shadow-[0_0_20px_rgba(0,229,255,0.7)] animate-pulse'
              : 'bg-gradient-to-r from-[#00b4d8] via-[#0096c7] to-[#0077b6] text-white font-bold hover:brightness-110 border border-cyan-300/40 shadow-[0_2px_12px_rgba(0,180,216,0.4)]'
      }`}
    >
      <span className="truncate text-[11px] sm:text-xs font-orbitron tracking-wider text-center w-full uppercase">
        {displayName}
      </span>
      {isWinner && (
        <Trophy className="w-3.5 h-3.5 text-black shrink-0 ml-1 drop-shadow-sm" />
      )}
    </div>
  );
}

// ── Match Pair Node (Stacked pair of Team Pills) ─────────────────────────────
function MatchPairNode({ match, nameMap, flashIds, isFinal = false }) {
  const [a, b] = match?.players ?? ['', ''];
  const winnerA = match?.winner === a && Boolean(a);
  const winnerB = match?.winner === b && Boolean(b);
  const isFlash = match?.id && flashIds?.has?.(match.id);

  return (
    <div
      className={`flex flex-col gap-1.5 sm:gap-2 relative py-1.5 transition-all ${
        isFinal ? 'scale-105' : ''
      }`}
    >
      <TeamPill
        regId={a}
        nameMap={nameMap}
        isWinner={winnerA}
        isFlash={isFlash}
        emptyLabel={match?.round === 1 ? 'BYE' : 'TBD'}
      />
      <TeamPill
        regId={b}
        nameMap={nameMap}
        isWinner={winnerB}
        isFlash={isFlash}
        emptyLabel={match?.round === 1 ? 'BYE' : 'TBD'}
      />
    </div>
  );
}

// ── Bracket SVG Connector Lines ──────────────────────────────────────────────
function BracketConnector({ side }) {
  if (side === 'left') {
    return (
      <svg
        className="w-6 sm:w-10 md:w-14 h-full shrink-0 self-stretch"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M 0,25 L 50,25 L 50,75 L 0,75 M 50,50 L 100,50"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-6 sm:w-10 md:w-14 h-full shrink-0 self-stretch"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M 100,25 L 50,25 L 50,75 L 100,75 M 50,50 L 0,50"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Recursive Left Tree (Left to Right) ──────────────────────────────────────
function LeftBracketBranch({ round, matchNo, fixturesMap, nameMap, flashIds }) {
  const match = fixturesMap[`${round}-${matchNo}`];

  if (round === 1) {
    return (
      <div className="flex items-center my-auto">
        <MatchPairNode match={match} nameMap={nameMap} flashIds={flashIds} />
      </div>
    );
  }

  const child1MatchNo = (matchNo - 1) * 2 + 1;
  const child2MatchNo = (matchNo - 1) * 2 + 2;

  return (
    <div className="flex items-center h-full">
      {/* 2 Child matches stacked */}
      <div className="flex flex-col justify-around h-full gap-3 sm:gap-5">
        <LeftBracketBranch
          round={round - 1}
          matchNo={child1MatchNo}
          fixturesMap={fixturesMap}
          nameMap={nameMap}
          flashIds={flashIds}
        />
        <LeftBracketBranch
          round={round - 1}
          matchNo={child2MatchNo}
          fixturesMap={fixturesMap}
          nameMap={nameMap}
          flashIds={flashIds}
        />
      </div>

      {/* Bracket connector */}
      <BracketConnector side="left" />

      {/* Parent match */}
      <div className="flex items-center my-auto">
        <MatchPairNode match={match} nameMap={nameMap} flashIds={flashIds} />
      </div>
    </div>
  );
}

// ── Recursive Right Tree (Right to Left) ─────────────────────────────────────
function RightBracketBranch({ round, matchNo, fixturesMap, nameMap, flashIds }) {
  const match = fixturesMap[`${round}-${matchNo}`];

  if (round === 1) {
    return (
      <div className="flex items-center my-auto">
        <MatchPairNode match={match} nameMap={nameMap} flashIds={flashIds} />
      </div>
    );
  }

  const child1MatchNo = (matchNo - 1) * 2 + 1;
  const child2MatchNo = (matchNo - 1) * 2 + 2;

  return (
    <div className="flex items-center h-full">
      {/* Parent match */}
      <div className="flex items-center my-auto">
        <MatchPairNode match={match} nameMap={nameMap} flashIds={flashIds} />
      </div>

      {/* Bracket connector */}
      <BracketConnector side="right" />

      {/* 2 Child matches stacked */}
      <div className="flex flex-col justify-around h-full gap-3 sm:gap-5">
        <RightBracketBranch
          round={round - 1}
          matchNo={child1MatchNo}
          fixturesMap={fixturesMap}
          nameMap={nameMap}
          flashIds={flashIds}
        />
        <RightBracketBranch
          round={round - 1}
          matchNo={child2MatchNo}
          fixturesMap={fixturesMap}
          nameMap={nameMap}
          flashIds={flashIds}
        />
      </div>
    </div>
  );
}

// ── Bilateral Tournament Bracket (Exact layout of reference image) ────────────
export function KnockoutBracket({ fixtures, nameMap, flashIds, totalRounds, selectedGame }) {
  const fixturesMap = useMemo(() => {
    const map = {};
    for (const f of fixtures) {
      map[`${f.round}-${f.match_no}`] = f;
    }
    return map;
  }, [fixtures]);

  const finalMatch = fixturesMap[`${totalRounds}-1`];
  const grandChampionId = finalMatch?.winner;
  const grandChampionName = grandChampionId ? (nameMap?.[grandChampionId] || grandChampionId) : null;

  if (totalRounds <= 1) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-[#030614] border border-cyan-500/20 p-6 sm:p-12 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="px-6 sm:px-10 py-2.5 rounded-2xl bg-gradient-to-r from-[#00d2ff] via-[#0088ff] to-[#0055ff] shadow-[0_0_30px_rgba(0,180,255,0.45)] border border-cyan-300/40">
            <h3 className="text-sm sm:text-lg font-black font-orbitron tracking-widest text-white uppercase text-center">
              TOURNAMENT BRACKET
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3">
          <Trophy className="w-16 h-16 text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]" />
          <MatchPairNode match={finalMatch} nameMap={nameMap} flashIds={flashIds} isFinal />
        </div>
      </div>
    );
  }

  const semiFinalRound = totalRounds - 1;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#030614] border border-cyan-500/20 p-4 sm:p-8 shadow-[0_0_50px_rgba(0,180,216,0.15)]">
      {/* Background Esports Facets (Geometric Polygonal Backdrop matching reference) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="facet-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#030614" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="facet-blue" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0077b6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#030614" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="0,0 450,0 180,600 0,350" fill="url(#facet-cyan)" />
        <polygon points="800,0 1200,0 1000,500 700,200" fill="url(#facet-blue)" />
        <polygon points="0,650 350,750 150,1000 0,1000" fill="url(#facet-cyan)" />
        <polygon points="1200,350 950,700 1200,900" fill="url(#facet-blue)" />
      </svg>

      {/* Ambient Esports Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,229,255,0.03)_0%,transparent_50%,rgba(43,75,255,0.03)_100%)] pointer-events-none" />

      {/* Top Pill Banner — Identical to user reference image */}
      <div className="flex justify-center mb-6 sm:mb-8 relative z-10">
        <div className="px-6 sm:px-12 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-[#00d2ff] via-[#0088ff] to-[#0055ff] shadow-[0_0_35px_rgba(0,180,255,0.5)] border border-cyan-300/40 flex items-center gap-2.5">
          <h3 className="text-sm sm:text-lg md:text-xl font-black font-orbitron tracking-widest text-white uppercase text-center drop-shadow-md">
            TOURNAMENT BRACKET
          </h3>
          {selectedGame && (
            <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/40 text-cyan-200 border border-cyan-400/30">
              {selectedGame}
            </span>
          )}
        </div>
      </div>

      {/* Mobile Scroll Hint */}
      <div className="block lg:hidden text-center text-[11px] font-mono text-cyan-400/80 mb-3">
        ⇄ Scroll horizontally to view full bracket
      </div>

      {/* Bilateral Split Bracket Container */}
      <div
        className="overflow-x-auto pb-4 pt-2 -mx-2 px-2"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#00b4d8 #050a1f' }}
      >
        <div className="min-w-fit mx-auto flex items-center justify-center px-2 py-4">
          {/* Left Bracket Branch (advances Left to Right) */}
          <LeftBracketBranch
            round={semiFinalRound}
            matchNo={1}
            fixturesMap={fixturesMap}
            nameMap={nameMap}
            flashIds={flashIds}
          />

          {/* Left Connector Line to Grand Final */}
          <div className="w-6 sm:w-10 md:w-14 h-[2.5px] bg-white shrink-0 self-center" />

          {/* Center Stage: Trophy & Grand Finals Match */}
          <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0 self-center relative z-20">
            {/* Golden Championship Trophy */}
            <div className="flex flex-col items-center mb-2">
              <div className="relative group">
                <div className="absolute -inset-3 bg-amber-500/25 rounded-full blur-xl animate-pulse" />
                <div className="relative p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-amber-400/20 to-yellow-600/10 border border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                  <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-amber-300 drop-shadow-[0_2px_12px_rgba(251,191,36,0.9)]" />
                </div>
              </div>
              <span className="text-[10px] font-orbitron font-extrabold tracking-widest text-amber-300 uppercase block mt-1.5">
                GRAND FINALS
              </span>
              {grandChampionName && (
                <div className="mt-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[10px] font-mono font-bold animate-bounce">
                  🏆 Champion: {grandChampionName}
                </div>
              )}
            </div>

            {/* Grand Finals Match Node */}
            <MatchPairNode
              match={finalMatch}
              nameMap={nameMap}
              flashIds={flashIds}
              isFinal
            />
          </div>

          {/* Right Connector Line to Grand Final */}
          <div className="w-6 sm:w-10 md:w-14 h-[2.5px] bg-white shrink-0 self-center" />

          {/* Right Bracket Branch (advances Right to Left) */}
          <RightBracketBranch
            round={semiFinalRound}
            matchNo={2}
            fixturesMap={fixturesMap}
            nameMap={nameMap}
            flashIds={flashIds}
          />
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-slate-500">
        PROXIMA E-CLASH 2026 • OFFICIAL TOURNAMENT BRACKET
      </div>
    </div>
  );
}

// ── Lobby card ────────────────────────────────────────────────────────────────
function LobbyCard({ match, nameMap, isFlash }) {
  const players = (match.players ?? []).filter(Boolean);

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${
        isFlash
          ? 'border-cyan-400/80 bg-cyan-950/40 shadow-[0_0_16px_rgba(0,229,255,0.35)]'
          : 'border-cyan-500/20 bg-[#080d32]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
          Lobby {match.match_no}
        </span>
        <span className="text-[10px] font-mono text-slate-500">{players.length} players</span>
      </div>

      {/* Player list */}
      <div className="space-y-1.5">
        {players.length === 0 ? (
          <span className="text-xs text-slate-500 italic">No players assigned</span>
        ) : (
          players.map((regId, idx) => {
            const isWinner = match.winner === regId;
            return (
              <div
                key={regId}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                  isWinner
                    ? 'bg-amber-500/15 border border-amber-500/30'
                    : 'bg-black/30 border border-white/5'
                }`}
              >
                <span className="text-[9px] font-mono text-slate-500 w-4 text-center">{idx + 1}</span>
                <PlayerChip regId={regId} nameMap={nameMap} isWinner={isWinner} isFlash={isFlash} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main public fixtures section ──────────────────────────────────────────────
export function PublicFixtures() {
  const [selectedGame, setSelectedGame] = useState(() => {
    const requestedGame = new URLSearchParams(window.location.search).get('game');
    return GAME_NAMES.includes(requestedGame) ? requestedGame : GAME_NAMES[0];
  });
  const cfg = GAME_FORMAT[selectedGame];

  const { fixtures, nameMap, isLoading, error, connectionStatus, flashIds } =
    useLiveFixtures(selectedGame);

  const selectGame = (game) => {
    setSelectedGame(game);
    const url = new URL(window.location.href);
    url.searchParams.set('game', game);
    window.history.replaceState(window.history.state, '', url);
  };

  const hasFixtures = fixtures.length > 0;
  const totalRounds = cfg.format === 'knockout'
    ? (hasFixtures ? Math.max(...fixtures.map((f) => f.round)) : 1)
    : 1;

  return (
    <section id="fixtures" className="py-10 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Section header */}
      <div className="text-center max-w-2xl mx-auto space-y-3 mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-xs font-semibold text-cyan-300">
          <Swords className="w-3.5 h-3.5" />
          Tournament Draw
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-orbitron text-white">
          Fixtures &amp; Brackets
        </h2>
        <p className="text-sm text-slate-300 font-rajdhani">
          Live match fixtures and bracket results for all five championship games.
        </p>
      </div>

      {/* Game selector + live indicator */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
          style={{ scrollbarWidth: 'none' }}
          role="group"
          aria-label="Select a game"
        >
          {GAME_NAMES.map((g) => {
            const active = g === selectedGame;
            return (
              <button
                key={g}
                type="button"
                aria-pressed={active}
                onClick={() => selectGame(g)}
                className={`shrink-0 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-orbitron transition-all whitespace-nowrap ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-neon-blue'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            {cfg.format === 'knockout' ? (
              <span className="flex items-center gap-1 text-violet-400"><Swords className="w-3 h-3" /> Knockout</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400"><Layers className="w-3 h-3" /> Lobbies of {cfg.lobbySize}</span>
            )}
          </span>
          <LiveIndicator status={connectionStatus} />
        </div>
      </div>

      {/* Content area */}
      <div className="min-h-[200px]" aria-live="polite">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            <span className="text-sm">Loading fixtures…</span>
          </div>
        )}

        {/* Error */}
        {!isLoading && error && fixtures.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && error && fixtures.length > 0 && (
          <div role="status" className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Some live fixture details could not be refreshed: {error}</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && !hasFixtures && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Swords className="w-8 h-8 text-cyan-500/50" />
            </div>
            <p className="text-slate-300 font-semibold font-orbitron text-sm">
              Fixtures for {selectedGame} will be announced soon.
            </p>
            <p className="text-slate-500 text-xs max-w-xs font-rajdhani">
              The tournament draw for this game hasn't been generated yet. Check back closer to the event date.
            </p>
          </div>
        )}

        {/* Knockout bracket */}
        {!isLoading && hasFixtures && cfg.format === 'knockout' && (
          <KnockoutBracket
            fixtures={fixtures}
            nameMap={nameMap}
            flashIds={flashIds}
            totalRounds={totalRounds}
            selectedGame={selectedGame}
          />
        )}

        {/* Lobby grid */}
        {!isLoading && hasFixtures && cfg.format === 'lobby' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixtures.map((m) => (
              <LobbyCard
                key={m.id}
                match={m}
                nameMap={nameMap}
                isFlash={flashIds.has(m.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
