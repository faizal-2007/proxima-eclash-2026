/**
 * Automated logic test for fixtureEngine.js
 * Run: node scripts/test-fixture-engine.mjs
 */
import {
  generateKnockout,
  generateLobbies,
  reshuffleFixtures,
  advanceWinner,
  swapPlayers,
  roundName,
  getTotalRounds,
} from '../src/utils/fixtureEngine.js';

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

// ── 1. Knockout with ODD number of players (3) ─────────────────────────────
console.log('\n1. Knockout — 3 players (odd → 1 bye expected)');
const ko3 = generateKnockout('eFootball', ['P1', 'P2', 'P3']);
const r1matches = ko3.filter(m => m.round === 1);
const byes = r1matches.filter(m => m.players.includes(''));
assert('Padded to 4 slots (2 round-1 matches)', r1matches.length === 2);
assert('Exactly one bye slot in round 1', byes.length === 1);

// ── 2. Bye auto-advances to round 2 ────────────────────────────────────────
console.log('\n2. Bye auto-advances to round 2');
const byeMatch = byes[0];
const byeWinner = byeMatch.players.find(p => p !== '');
const r2 = ko3.filter(m => m.round === 2);
const r2hasAdvanced = r2.some(m => m.players.includes(byeWinner));
assert('Bye winner appears in round 2', r2hasAdvanced, `byeWinner=${byeWinner}, r2players=${JSON.stringify(r2.map(m=>m.players))}`);
assert('Bye match has winner set automatically', byeMatch.winner === byeWinner);

// ── 3. Round names ──────────────────────────────────────────────────────────
console.log('\n3. Round names (4-player bracket → 2 rounds)');
assert('Round 1 of 2 = Semi-final', roundName(1, 2) === 'Semi-final');
assert('Round 2 of 2 = Final',      roundName(2, 2) === 'Final');
assert('Round 1 of 4 = Round 1',    roundName(1, 4) === 'Round 1');
assert('Round 3 of 4 = Semi-final', roundName(3, 4) === 'Semi-final');
assert('Round 4 of 4 = Final',      roundName(4, 4) === 'Final');

// ── 4. advanceWinner ────────────────────────────────────────────────────────
console.log('\n4. advanceWinner');
const ko4 = generateKnockout('Carrom', ['A', 'B', 'C', 'D']);
const after = advanceWinner(ko4, 1, 1, 'A');
const final = after.find(m => m.round === 2 && m.match_no === 1);
assert('Winner A advanced to Final slot A (odd match)', final?.players[0] === 'A');

const after2 = advanceWinner(after, 1, 2, 'C');
const final2 = after2.find(m => m.round === 2 && m.match_no === 1);
assert('Winner C advanced to Final slot B (even match)', final2?.players[1] === 'C');

// Un-mark winner
const cleared = advanceWinner(after2, 1, 1, null);
const finalCleared = cleared.find(m => m.round === 2 && m.match_no === 1);
assert('Clearing winner empties the next-round slot', finalCleared?.players[0] === '');

// ── 5. Swap ─────────────────────────────────────────────────────────────────
console.log('\n5. swapPlayers');
const ko4b = generateKnockout('Carrom', ['A', 'B', 'C', 'D']);
const targetMatch = ko4b.find(m => m.round === 1 && m.match_no === 1);
const otherMatch = ko4b.find(m => m.round === 1 && m.match_no === 2);
const occupant = targetMatch.players[0];
const incoming = otherMatch.players[0];
const swapped = swapPlayers(ko4b, incoming, 1, 1, 0, occupant);
const m1 = swapped.find(m => m.round === 1 && m.match_no === 1);
const m2 = swapped.find(m => m.round === 1 && m.match_no === 2);
assert('Target slot now has incoming player', m1?.players[0] === incoming);
assert('Source slot now has displaced occupant', m2?.players.includes(occupant));

// ── 6. Re-shuffle with locked match ────────────────────────────────────────
console.log('\n6. reshuffleFixtures with one locked match');
const base = generateKnockout('Carrom', ['A', 'B', 'C', 'D']);
// Lock match 1
base[0].locked = true;
const lockedPlayers = [...base[0].players];
const reshuffled = reshuffleFixtures('Carrom', ['A', 'B', 'C', 'D'], base);
const lockedAfter = reshuffled.find(m => m.round === 1 && m.match_no === 1);
assert('Locked match survived re-shuffle', lockedAfter?.locked === true);
assert('Locked match players unchanged', JSON.stringify(lockedAfter?.players) === JSON.stringify(lockedPlayers));

// ── 7. Lobby generation ─────────────────────────────────────────────────────
console.log('\n7. Lobby generation (Mini Militia, lobbySize=4, 7 players)');
const lobbies = generateLobbies('Mini Militia', ['P1','P2','P3','P4','P5','P6','P7'], 4);
assert('2 lobbies created for 7 players with lobbySize=4', lobbies.length === 2);
const allLobbyPlayers = lobbies.flatMap(m => m.players);
assert('No player appears twice', new Set(allLobbyPlayers).size === allLobbyPlayers.length);
const maxLobbySize = Math.max(...lobbies.map(m => m.players.length));
const minLobbySize = Math.min(...lobbies.map(m => m.players.length));
assert('Lobbies are balanced (no lobby nearly empty)', maxLobbySize - minLobbySize <= 1,
  `sizes: ${lobbies.map(m=>m.players.length).join(', ')}`);

// ── 8. Knockout generation for Carrom ───────────────────────────────────────
console.log('\n8. Knockout generation for Carrom (8 players)');
const carromKo = generateKnockout('Carrom', ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']);
const carromR1 = carromKo.filter(m => m.round === 1);
assert('Carrom knockout generated 4 round-1 matches for 8 players', carromR1.length === 4);
assert('Total 3 rounds generated for 8 players', Math.max(...carromKo.map(m => m.round)) === 3);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
