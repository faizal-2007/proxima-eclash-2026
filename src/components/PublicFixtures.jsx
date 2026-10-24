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
  Flame,
} from 'lucide-react';
import { useLiveFixtures } from '../utils/useLiveFixtures.js';
import { GAME_FORMAT, GAME_NAMES, roundName, isKnockoutFormat } from '../utils/fixtureEngine.js';

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
  let displayName = regId;
  if (regId.includes('+')) {
    displayName = regId
      .split('+')
      .map((part) => {
        const isSub = part.toLowerCase().includes('(sub)');
        const id = part.replace(/\s*\(Sub\)/i, '').trim();
        const name = nameMap?.[id] || id;
        return isSub ? `${name} (Sub)` : name;
      })
      .join(' & ');
  } else {
    displayName = nameMap?.[regId] || regId;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors duration-300 ${
        isFlash ? 'text-cyan-300' : isWinner ? 'text-amber-300' : 'text-white'
      }`}
    >
      {isWinner && <Trophy className="w-3 h-3 text-amber-400 shrink-0" />}
      {displayName || <span className="text-slate-500 font-normal">TBD</span>}
    </span>
  );
}

// ── Bracket Pill (Two separate rounded pills per match, matching reference image) ─
function BracketPill({ regId, nameMap, isWinner, isFlash, emptyLabel = 'BYE' }) {
  const isBye = !regId;
  let displayName = emptyLabel;
  if (!isBye) {
    if (regId.includes('+')) {
      displayName = regId
        .split('+')
        .map((part) => {
          const isSub = part.toLowerCase().includes('(sub)');
          const id = part.replace(/\s*\(Sub\)/i, '').trim();
          const name = nameMap?.[id] || id;
          return isSub ? `${name} (Sub)` : name;
        })
        .join(' & ');
    } else {
      displayName = nameMap?.[regId] || regId;
    }
  }

  return (
    <div
      title={displayName}
      className={`group/pill relative w-36 sm:w-44 md:w-48 h-7 sm:h-8 rounded-lg flex items-center justify-between px-2.5 sm:px-3 transition-all duration-200 select-none ${
        isBye
          ? 'bg-[#06091e]/75 border border-white/10 text-slate-500 shadow-inner'
          : isWinner
            ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/25 border border-amber-400/90 text-amber-200 font-bold shadow-[0_0_15px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/50'
            : isFlash
              ? 'bg-cyan-950/70 border border-cyan-400 text-cyan-200 font-bold shadow-[0_0_15px_rgba(0,229,255,0.5)] animate-pulse'
              : 'bg-[#080d28]/90 hover:bg-[#0e1642] border border-cyan-500/30 hover:border-cyan-400 text-slate-200 font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.4)]'
      }`}
    >
      <span className="truncate text-[10px] sm:text-[11px] font-orbitron tracking-wide uppercase flex-1 text-center">
        {displayName}
      </span>
      {isWinner && (
        <Trophy className="w-3 h-3 text-amber-400 shrink-0 ml-1 drop-shadow-sm" />
      )}
    </div>
  );
}

// ── Match Pair Node (Stacked pair of distinct pills matching reference) ─────
function MatchPairNode({ match, nameMap, flashIds, isFinal = false }) {
  const [a, b] = match?.players ?? ['', ''];
  const winnerA = match?.winner === a && Boolean(a);
  const winnerB = match?.winner === b && Boolean(b);
  const isFlash = match?.id && flashIds?.has?.(match.id);

  return (
    <div
      className={`flex flex-col gap-1 sm:gap-1.5 relative py-1 transition-all ${
        isFinal ? 'scale-105' : ''
      }`}
    >
      <BracketPill
        regId={a}
        nameMap={nameMap}
        isWinner={winnerA}
        isFlash={isFlash}
        emptyLabel={match?.round === 1 || match?.round === 0 ? 'BYE' : 'TBD'}
      />
      <BracketPill
        regId={b}
        nameMap={nameMap}
        isWinner={winnerB}
        isFlash={isFlash}
        emptyLabel={match?.round === 1 || match?.round === 0 ? 'BYE' : 'TBD'}
      />
    </div>
  );
}

// ── Champion Node (Single Pill at bottom of Grand Final, matching reference) ─
function ChampionNode({ championId, championName }) {
  const isCrowned = Boolean(championId);

  return (
    <div className="flex flex-col items-center">
      {/* Vertical connector line from Grand Final */}
      <div className="w-[2px] h-5 sm:h-7 bg-cyan-400/70 shadow-[0_0_8px_rgba(0,229,255,0.6)]" />

      {/* Single Champion Capsule */}
      <div
        className={`w-40 sm:w-48 md:w-52 h-8 sm:h-9 rounded-lg flex items-center justify-center px-3 transition-all duration-300 select-none ${
          isCrowned
            ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 border border-yellow-300 text-black font-extrabold font-orbitron text-xs sm:text-sm tracking-wider shadow-[0_0_25px_rgba(251,191,36,0.7)] ring-2 ring-yellow-300/80 scale-105 animate-pulse'
            : 'bg-[#060a22]/85 border border-cyan-500/30 text-cyan-300/50 font-orbitron font-bold text-[10px] sm:text-xs tracking-widest uppercase shadow-inner'
        }`}
        title={championName ? `Champion: ${championName}` : 'Champion TBD'}
      >
        {isCrowned ? (
          <span className="truncate flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-black fill-black shrink-0" />
            <span className="truncate">{championName}</span>
          </span>
        ) : (
          <span>CHAMPION</span>
        )}
      </div>
    </div>
  );
}

// ── Laurel Trophy Emblem (Exact visual centerpiece matching reference) ──────
function LaurelTrophyEmblem() {
  return (
    <div className="relative flex items-center justify-center my-2 select-none">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-violet-600/30 rounded-full blur-2xl animate-pulse" />

      <svg
        className="w-20 h-20 sm:w-24 sm:h-24 relative z-10 drop-shadow-[0_0_15px_rgba(124,58,237,0.7)]"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="emblem-trophy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="wreath-grad-left" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="wreath-grad-right" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Central Trophy Cup */}
        {/* Base */}
        <path d="M 46 88 L 74 88 L 70 94 L 50 94 Z" fill="url(#emblem-trophy-grad)" />
        <rect x="42" y="94" width="36" height="4" rx="2" fill="url(#emblem-trophy-grad)" opacity="0.9" />

        {/* Stem */}
        <path d="M 57 74 L 63 74 L 62 88 L 58 88 Z" fill="url(#emblem-trophy-grad)" />

        {/* Cup Body */}
        <path
          d="M 45 42 L 75 42 C 75 62 67 74 60 74 C 53 74 45 62 45 42 Z"
          fill="url(#emblem-trophy-grad)"
        />

        {/* Cup Rim */}
        <ellipse cx="60" cy="42" rx="16" ry="3.5" fill="#c084fc" opacity="0.8" />
        <ellipse cx="60" cy="42" rx="14" ry="2.5" fill="#1e1b4b" />

        {/* Cup Handles */}
        <path
          d="M 45 46 C 36 46 36 60 47 62 M 45 50 C 40 50 40 57 47 58"
          stroke="url(#emblem-trophy-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 75 46 C 84 46 84 60 73 62 M 75 50 C 80 50 80 57 73 58"
          stroke="url(#emblem-trophy-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Star in Center of Cup */}
        <path
          d="M 60 51 L 61.5 55.5 L 66 55.5 L 62.5 58 L 64 62.5 L 60 60 L 56 62.5 L 57.5 58 L 54 55.5 L 58.5 55.5 Z"
          fill="#ffffff"
          opacity="0.9"
        />

        {/* Left Laurel Wreath Branch */}
        <path
          d="M 56 96 C 36 94 22 80 22 58 C 22 45 28 34 36 26"
          stroke="url(#wreath-grad-left)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Left Laurel Leaves */}
        <path d="M 50 93 C 44 93 42 88 47 87 C 50 88 51 91 50 93 Z" fill="url(#wreath-grad-left)" />
        <path d="M 45 96 C 39 94 40 89 44 90 C 46 92 46 95 45 96 Z" fill="url(#wreath-grad-left)" />
        <path d="M 37 87 C 31 85 30 80 35 80 C 38 81 39 85 37 87 Z" fill="url(#wreath-grad-left)" />
        <path d="M 32 89 C 27 85 29 81 33 83 C 35 85 34 88 32 89 Z" fill="url(#wreath-grad-left)" />
        <path d="M 28 76 C 22 72 23 67 28 68 C 30 70 30 74 28 76 Z" fill="url(#wreath-grad-left)" />
        <path d="M 23 75 C 18 70 21 66 25 69 C 26 71 25 74 23 75 Z" fill="url(#wreath-grad-left)" />
        <path d="M 23 62 C 18 57 20 52 25 54 C 27 56 26 60 23 62 Z" fill="url(#wreath-grad-left)" />
        <path d="M 20 58 C 15 52 19 48 23 52 C 24 54 22 57 20 58 Z" fill="url(#wreath-grad-left)" />
        <path d="M 23 46 C 19 40 23 36 27 39 C 28 41 26 45 23 46 Z" fill="url(#wreath-grad-left)" />
        <path d="M 22 41 C 18 35 23 32 26 36 C 27 38 25 41 22 41 Z" fill="url(#wreath-grad-left)" />
        <path d="M 28 32 C 25 26 30 23 33 27 C 34 29 31 32 28 32 Z" fill="url(#wreath-grad-left)" />
        <path d="M 29 27 C 27 21 33 19 35 24 C 36 26 32 28 29 27 Z" fill="url(#wreath-grad-left)" />
        <path d="M 36 23 C 35 17 41 17 42 22 C 41 24 38 25 36 23 Z" fill="url(#wreath-grad-left)" />

        {/* Right Laurel Wreath Branch */}
        <path
          d="M 64 96 C 84 94 98 80 98 58 C 98 45 92 34 84 26"
          stroke="url(#wreath-grad-right)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right Laurel Leaves */}
        <path d="M 70 93 C 76 93 78 88 73 87 C 70 88 69 91 70 93 Z" fill="url(#wreath-grad-right)" />
        <path d="M 75 96 C 81 94 80 89 76 90 C 74 92 74 95 75 96 Z" fill="url(#wreath-grad-right)" />
        <path d="M 83 87 C 89 85 90 80 85 80 C 82 81 81 85 83 87 Z" fill="url(#wreath-grad-right)" />
        <path d="M 88 89 C 93 85 91 81 87 83 C 85 85 86 88 88 89 Z" fill="url(#wreath-grad-right)" />
        <path d="M 92 76 C 98 72 97 67 92 68 C 90 70 90 74 92 76 Z" fill="url(#wreath-grad-right)" />
        <path d="M 97 75 C 102 70 99 66 95 69 C 94 71 95 74 97 75 Z" fill="url(#wreath-grad-right)" />
        <path d="M 97 62 C 102 57 100 52 95 54 C 93 56 94 60 97 62 Z" fill="url(#wreath-grad-right)" />
        <path d="M 100 58 C 105 52 101 48 97 52 C 96 54 98 57 100 58 Z" fill="url(#wreath-grad-right)" />
        <path d="M 97 46 C 101 40 97 36 93 39 C 92 41 94 45 97 46 Z" fill="url(#wreath-grad-right)" />
        <path d="M 98 41 C 102 35 97 32 94 36 C 93 38 95 41 98 41 Z" fill="url(#wreath-grad-right)" />
        <path d="M 92 32 C 95 26 90 23 87 27 C 86 29 89 32 92 32 Z" fill="url(#wreath-grad-right)" />
        <path d="M 91 27 C 93 21 87 19 85 24 C 84 26 88 28 91 27 Z" fill="url(#wreath-grad-right)" />
        <path d="M 84 23 C 85 17 79 17 78 22 C 79 24 82 25 84 23 Z" fill="url(#wreath-grad-right)" />
      </svg>
    </div>
  );
}

// ── Bracket SVG Connector Lines (Crisp orthogonal tree lines) ───────────────
function BracketConnector({ side }) {
  if (side === 'left') {
    return (
      <svg
        className="w-6 sm:w-10 md:w-12 h-full shrink-0 self-stretch"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M 0,25 L 50,25 L 50,75 L 0,75 M 50,50 L 100,50"
          fill="none"
          stroke="rgba(56, 189, 248, 0.75)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-6 sm:w-10 md:w-12 h-full shrink-0 self-stretch"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M 100,25 L 50,25 L 50,75 L 100,75 M 50,50 L 0,50"
        fill="none"
        stroke="rgba(56, 189, 248, 0.75)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Semi-Final to Grand Final Bridge Connector (Drop-down orthogonal line) ──
function SemiFinalBridgeConnector({ side }) {
  if (side === 'left') {
    return (
      <svg
        className="w-8 sm:w-12 md:w-16 h-28 sm:h-36 md:h-40 shrink-0 self-center"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M 0,25 L 50,25 L 50,75 L 100,75"
          fill="none"
          stroke="rgba(56, 189, 248, 0.75)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  return (
    <svg
      className="w-8 sm:w-12 md:w-16 h-28 sm:h-36 md:h-40 shrink-0 self-center"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M 100,25 L 50,25 L 50,75 L 0,75"
        fill="none"
        stroke="rgba(56, 189, 248, 0.75)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Recursive Left Tree (Left to Right) ──────────────────────────────────────
function LeftBracketBranch({ round, matchNo, fixturesMap, nameMap, flashIds, baseRound = 1 }) {
  const match = fixturesMap[`${round}-${matchNo}`];

  if (round <= baseRound) {
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
          baseRound={baseRound}
        />
        <LeftBracketBranch
          round={round - 1}
          matchNo={child2MatchNo}
          fixturesMap={fixturesMap}
          nameMap={nameMap}
          flashIds={flashIds}
          baseRound={baseRound}
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
function RightBracketBranch({ round, matchNo, fixturesMap, nameMap, flashIds, baseRound = 1 }) {
  const match = fixturesMap[`${round}-${matchNo}`];

  if (round <= baseRound) {
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
          baseRound={baseRound}
        />
        <RightBracketBranch
          round={round - 1}
          matchNo={child2MatchNo}
          fixturesMap={fixturesMap}
          nameMap={nameMap}
          flashIds={flashIds}
          baseRound={baseRound}
        />
      </div>
    </div>
  );
}

// ── Bilateral Tournament Bracket (Exact layout of reference image) ────────────
export function KnockoutBracket({ fixtures, nameMap, flashIds, totalRounds, selectedGame }) {
  const isFreeFire = selectedGame === 'Free Fire';
  const baseRound = isFreeFire ? 2 : 1;
  const effectiveTotalRounds = isFreeFire ? 4 : totalRounds;

  const fixturesMap = useMemo(() => {
    const map = {};
    for (const f of fixtures) {
      map[`${f.round}-${f.match_no}`] = f;
    }
    return map;
  }, [fixtures]);

  const finalMatch = fixturesMap[`${effectiveTotalRounds}-1`];
  const grandChampionId = finalMatch?.winner;
  const grandChampionName = grandChampionId ? (nameMap?.[grandChampionId] || grandChampionId) : null;

  // Round 0 Play-In matches if any (eFootball, Carrom)
  const playInMatches = useMemo(
    () => fixtures.filter((f) => f.round === 0).sort((a, b) => a.match_no - b.match_no),
    [fixtures]
  );

  // Free Fire Round 1 Lobby Qualifier
  const freeFireLobby = useMemo(
    () => (isFreeFire ? fixtures.find((f) => f.round === 1) : null),
    [fixtures, isFreeFire]
  );

  if (effectiveTotalRounds <= baseRound && !freeFireLobby) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-[#030614] border border-cyan-500/20 p-6 sm:p-12 shadow-2xl">
        <div className="flex flex-col items-center justify-center gap-4">
          <h3 className="text-sm sm:text-base md:text-lg font-black font-orbitron tracking-[0.25em] text-white uppercase text-center drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">
            TOURNAMENT BRACKET
          </h3>
          <LaurelTrophyEmblem />
          <MatchPairNode match={finalMatch} nameMap={nameMap} flashIds={flashIds} isFinal />
          <ChampionNode championId={grandChampionId} championName={grandChampionName} />
        </div>
      </div>
    );
  }

  const semiFinalRound = effectiveTotalRounds - 1;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#030614] border border-cyan-500/25 p-4 sm:p-8 shadow-[0_0_60px_rgba(0,180,216,0.15)]">
      {/* Ambient Red/Orange glow in top-left (matching reference image) */}
      <div className="absolute -top-32 -left-32 w-[450px] h-[450px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Ambient Electric Blue/Cyan glow in bottom-right (matching reference image) */}
      <div className="absolute -bottom-32 -right-32 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Ambient Violet glow in center behind trophy */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Subtle geometric dot grid in background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Free Fire Stage 1 Solo Battle Royale Qualifier Lobby if present */}
      {freeFireLobby && (
        <div className="mb-8 relative z-10 p-4 sm:p-5 rounded-2xl bg-[#080d32]/90 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Stage 1: Solo Battle Royale Qualifier ({freeFireLobby.players?.length || 0} Players • Top 8 Advance)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Custom Bermuda Room
            </span>
          </div>
          <LobbyCard match={freeFireLobby} nameMap={nameMap} isFlash={flashIds?.has?.(freeFireLobby.id)} />
          <div className="mt-3 text-center text-[11px] font-mono text-cyan-400">
            ↓ Top 8 survivors advance to the 1v1 Single-Elimination Knockout Bracket below ↓
          </div>
        </div>
      )}

      {/* Play-In matches if present (eFootball) */}
      {playInMatches.length > 0 && (
        <div className="mb-8 relative z-10 p-4 sm:p-5 rounded-2xl bg-[#080d32]/90 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-cyan-400" />
              Play-In Round ({playInMatches.length} Matches • Winners advance to Round 1)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Field Trim to Power of 2
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playInMatches.map((m) => (
              <div
                key={m.id || `0-${m.match_no}`}
                className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center gap-2"
              >
                <div className="w-full flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 border-b border-white/5 pb-1">
                  <span>PLAY-IN #{m.match_no}</span>
                  {m.winner && <span className="text-amber-400 font-bold">COMPLETED</span>}
                </div>
                <MatchPairNode match={m} nameMap={nameMap} flashIds={flashIds} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Scroll Hint */}
      <div className="block lg:hidden text-center text-[11px] font-mono text-cyan-400/80 mb-3">
        ⇄ Scroll horizontally to view full bracket
      </div>

      {/* Bilateral Split Bracket Container matching reference image */}
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
            baseRound={baseRound}
          />

          {/* Left Bridge Connector (drops down into Grand Final) */}
          <SemiFinalBridgeConnector side="left" />

          {/* Center Stage: Title + Emblem + Grand Finals Match + Champion (Identical to image) */}
          <div className="flex flex-col items-center justify-center px-2 sm:px-4 shrink-0 z-20">
            {/* Centered Bracket Title */}
            <div className="flex flex-col items-center mb-1 text-center">
              <h3 className="text-sm sm:text-base md:text-lg font-black font-orbitron tracking-[0.25em] text-white uppercase drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">
                TOURNAMENT BRACKET
              </h3>
              {selectedGame && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 mt-0.5">
                  {selectedGame}
                </span>
              )}
            </div>

            {/* Laurel Wreath & Trophy Emblem */}
            <LaurelTrophyEmblem />

            {/* Grand Finals Match Node (Stacked Pair of Pills) */}
            <MatchPairNode
              match={finalMatch}
              nameMap={nameMap}
              flashIds={flashIds}
              isFinal
            />

            {/* Champion Node (Single Pill at Bottom) */}
            <ChampionNode
              championId={grandChampionId}
              championName={grandChampionName}
            />
          </div>

          {/* Right Bridge Connector (drops down into Grand Final) */}
          <SemiFinalBridgeConnector side="right" />

          {/* Right Bracket Branch (advances Right to Left) */}
          <RightBracketBranch
            round={semiFinalRound}
            matchNo={2}
            fixturesMap={fixturesMap}
            nameMap={nameMap}
            flashIds={flashIds}
            baseRound={baseRound}
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
  const isKnockout = isKnockoutFormat(cfg?.format);
  const totalRounds = isKnockout
    ? (hasFixtures ? Math.max(...fixtures.map((f) => f.round)) : 1)
    : 1;

  const getFormatBadge = () => {
    if (selectedGame === 'Free Fire') {
      return (
        <span className="flex items-center gap-1 text-amber-400">
          <Flame className="w-3 h-3" /> Solo BR → 1v1 Knockout
        </span>
      );
    }
    if (selectedGame === 'BGMI') {
      return (
        <span className="flex items-center gap-1 text-cyan-400">
          <Swords className="w-3 h-3" /> TDM 2v2 Knockout
        </span>
      );
    }
    if (selectedGame === 'Mini Militia') {
      return (
        <span className="flex items-center gap-1 text-emerald-400">
          <Swords className="w-3 h-3" /> 2v2 Knockout
        </span>
      );
    }
    if (cfg?.hasPlayIn) {
      return (
        <span className="flex items-center gap-1 text-violet-400">
          <Swords className="w-3 h-3" /> 1v1 Knockout (Play-In)
        </span>
      );
    }
    if (isKnockout) {
      return (
        <span className="flex items-center gap-1 text-violet-400">
          <Swords className="w-3 h-3" /> Single Knockout
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-emerald-400">
        <Layers className="w-3 h-3" /> Lobbies of {cfg?.lobbySize || 8}
      </span>
    );
  };

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
            {getFormatBadge()}
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

        {/* Knockout bracket (including Free Fire, BGMI, Mini Militia, eFootball, Carrom) */}
        {!isLoading && hasFixtures && isKnockout && (
          <KnockoutBracket
            fixtures={fixtures}
            nameMap={nameMap}
            flashIds={flashIds}
            totalRounds={totalRounds}
            selectedGame={selectedGame}
          />
        )}

        {/* Lobby grid */}
        {!isLoading && hasFixtures && !isKnockout && (
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
