import {
  DEFAULT_SCORING_SETTINGS,
  getPlacementPoints,
  deriveMatchScores,
  deriveOverallLeaderboard,
  validateMatchResult,
} from '../src/utils/scoringEngine.js';

let passed = 0;
let failed = 0;

function assert(label, cond, extra = '') {
  if (cond) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}${extra ? ' — ' + extra : ''}`);
    failed++;
  }
}

console.log('--- 1. Placement Points ---');
assert('1st place gives 12 pts', getPlacementPoints(1) === 12);
assert('2nd place gives 9 pts', getPlacementPoints(2) === 9);
assert('3rd place gives 8 pts', getPlacementPoints(3) === 8);
assert('4th place gives 7 pts', getPlacementPoints(4) === 7);
assert('5th place gives 6 pts', getPlacementPoints(5) === 6);
assert('6th place gives 5 pts', getPlacementPoints(6) === 5);
assert('7th place gives 4 pts', getPlacementPoints(7) === 4);
assert('8th place gives 3 pts', getPlacementPoints(8) === 3);
assert('9th place gives 0 pts', getPlacementPoints(9) === 0);
assert('null placement gives 0 pts', getPlacementPoints(null) === 0);

console.log('\n--- 2. Single Match Score Derivation ---');
const fakePlayers = Array.from({ length: 31 }, (_, i) => ({
  id: `P_${i + 1}`,
  name: `Player ${i + 1}`,
  campusId: `C_${i + 1}`,
}));

const placementsM1 = ['P_1', 'P_2', 'P_3', 'P_4', 'P_5', 'P_6', 'P_7', 'P_8'];
const killsM1 = {
  P_1: 3,  // 1st: 12 + 3 = 15
  P_2: 7,  // 2nd: 9 + 7 = 16
  P_9: 5,  // 9th+ (unplaced): 0 + 5 = 5 (earns kill points outside top 8!)
  P_10: 2, // 9th+ (unplaced): 0 + 2 = 2
};

const scoresM1 = deriveMatchScores(placementsM1, killsM1, fakePlayers);
const p1Score = scoresM1.find((s) => s.playerId === 'P_1');
const p2Score = scoresM1.find((s) => s.playerId === 'P_2');
const p9Score = scoresM1.find((s) => s.playerId === 'P_9');

assert('P_1 has 12 placement + 3 kills = 15 total', p1Score.matchTotal === 15 && p1Score.isBooyah);
assert('P_2 has 9 placement + 7 kills = 16 total', p2Score.matchTotal === 16);
assert('P_9 (unplaced) gets 0 placement + 5 kill pts = 5 total', p9Score.placementPts === 0 && p9Score.matchTotal === 5);
assert('P_2 is ranked #1 in match because of higher total (16 > 15)', scoresM1[0].playerId === 'P_2');

console.log('\n--- 3. Validation Rules ---');
const vIncomplete = validateMatchResult(['P_1', 'P_2']);
assert('Fails if less than 8 slots filled', !vIncomplete.valid);

const vDuplicate = validateMatchResult(['P_1', 'P_1', 'P_3', 'P_4', 'P_5', 'P_6', 'P_7', 'P_8']);
assert('Fails if duplicate player in top 8', !vDuplicate.valid);

const vOverKill = validateMatchResult(placementsM1, { P_1: 20, P_2: 15 }); // 35 kills > 30 max
assert('Warns if total kills exceed 30', vOverKill.exceedsKillLimit && vOverKill.warnings.length > 0);

const vClean = validateMatchResult(placementsM1, { P_1: 5, P_2: 4 }); // 9 kills <= 30
assert('Validates clean match', vClean.valid && !vClean.exceedsKillLimit);

console.log('\n--- 4. Overall Leaderboard & Tie-Breakers ---');
const matchesData = {
  1: {
    placements: ['P_1', 'P_2', 'P_3', 'P_4', 'P_5', 'P_6', 'P_7', 'P_8'],
    kills: { P_1: 2, P_2: 4, P_9: 3 },
    status: 'finalized',
  },
  2: {
    placements: ['P_2', 'P_1', 'P_3', 'P_4', 'P_5', 'P_6', 'P_7', 'P_8'],
    kills: { P_1: 3, P_2: 1, P_9: 4 },
    status: 'finalized',
  },
  3: {
    placements: ['P_3', 'P_4', 'P_1', 'P_2', 'P_5', 'P_6', 'P_7', 'P_8'],
    kills: { P_1: 1, P_2: 2, P_9: 5 },
    status: 'finalized',
  },
};

const leaderboard = deriveOverallLeaderboard(matchesData, fakePlayers);
assert('Leaderboard includes all 31 players', leaderboard.length === 31);
assert('Top 8 are marked as qualified', leaderboard.slice(0, 8).every((r) => r.qualified));
assert('9th to 31st are marked as not qualified', leaderboard.slice(8).every((r) => !r.qualified));

// Tie-breaker test: P_A vs P_B with same total points, P_A has more Booyahs
const tiePlayers = [
  { id: 'TIE_A', name: 'Tie A' },
  { id: 'TIE_B', name: 'Tie B' },
];
const tieMatches = {
  1: {
    placements: ['TIE_A', 'TIE_B'], // TIE_A: 12 pts (Booyah), TIE_B: 9 pts
    kills: { TIE_B: 3 },            // TIE_B: +3 pts = 12 pts total
    status: 'finalized',
  },
};
const tieBoard = deriveOverallLeaderboard(tieMatches, tiePlayers);
assert('Tie-breaker 1 prefers most Booyahs when points are equal', tieBoard[0].playerId === 'TIE_A');

console.log(`\n${'─'.repeat(40)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
