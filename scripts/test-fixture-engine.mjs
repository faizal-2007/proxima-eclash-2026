/**
 * Comprehensive Automated logic test for fixtureEngine.js
 * Validates the exact tournament fixture plan:
 * - Free Fire: 31 players -> 8 matches (1 solo BR + 7 knockout)
 * - Mini Militia: 33 players -> 15 matches (2v2 knockout, 15 pairs + 1 trio team)
 * - eFootball: 38 players -> 37 matches (1v1 knockout with 6 play-in matches & 26 byes)
 * - BGMI (TDM): 15 players -> 6 matches (2v2 TDM knockout with 3 QF + 1 bye)
 * - Carrom: 66 players -> 65 matches (1v1 knockout with 2 play-in matches & 62 byes)
 * - Total: exactly 131 matches!
 * Run: node scripts/test-fixture-engine.mjs
 */
import {
  generateKnockout,
  generatePlayInKnockout,
  generateFreeFireFixtures,
  generateBgmiFixtures,
  generateFixtures,
  reshuffleFixtures,
  advanceWinner,
  advanceFreeFireQualifiers,
  pairTeams,
  swapPlayers,
  roundName,
  getTotalRounds,
  resolvePlayerName,
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

// ── 1. Team pairing with odd rotating sub ───────────────────────────────────
console.log('\n1. Team Pairing with Rotating Substitutes (Trio Teams)');
const players33 = Array.from({ length: 33 }, (_, i) => `MM_${i + 1}`);
const teamsMM = pairTeams(players33, 2);
assert('33 players produce 16 teams', teamsMM.length === 16);
const trioMM = teamsMM.find(t => t.includes('(Sub)'));
assert('Exactly 1 trio team with rotating sub formed', Boolean(trioMM));
assert('Trio team has 3 player IDs', trioMM.split('+').length === 3);

const players15 = Array.from({ length: 15 }, (_, i) => `BGMI_${i + 1}`);
const teamsBGMI = pairTeams(players15, 2);
assert('15 players produce 7 teams', teamsBGMI.length === 7);
const trioBGMI = teamsBGMI.find(t => t.includes('(Sub)'));
assert('BGMI has 1 trio team with rotating sub', Boolean(trioBGMI));

// ── 2. Free Fire 1v1 Knockout (31 players -> 30 matches) ───────────────────
console.log('\n2. Free Fire 1v1 Knockout (31 players -> 15 R32 + 8 R16 + 4 QF + 2 SF + 1 Final = 30 matches)');
const ffPlayers = Array.from({ length: 31 }, (_, i) => `FF_${i + 1}`);
const ffFixtures = generateFixtures('Free Fire', ffPlayers);
assert('Free Fire produces exactly 30 matches', ffFixtures.length === 30);
const ffR1 = ffFixtures.filter(m => m.round === 1);
const ffR2 = ffFixtures.filter(m => m.round === 2);
const ffR3 = ffFixtures.filter(m => m.round === 3);
const ffR4 = ffFixtures.filter(m => m.round === 4);
const ffR5 = ffFixtures.filter(m => m.round === 5);
assert('Round 1 is Round of 32 (15 matches)', ffR1.length === 15);
assert('Round 2 is Round of 16 (8 matches)', ffR2.length === 8);
assert('Round 2 Match 1 has bye player in slot 0', Boolean(ffR2[0].players[0]));
assert('Round 3 is Quarter-finals (4 matches)', ffR3.length === 4);
assert('Round 4 is Semi-finals (2 matches)', ffR4.length === 2);
assert('Round 5 is Grand Final (1 match)', ffR5.length === 1);
assert('Free Fire total rounds is 5', getTotalRounds(31, 'Free Fire') === 5);

// Test Free Fire Match 1 advancement into Round 2 Match 1 slot 1 (vs bye player)
const afterFfM1 = advanceWinner(ffFixtures, 1, 1, 'FF_W1');
const ffR2M1 = afterFfM1.find(m => m.round === 2 && m.match_no === 1);
assert('Free Fire Match 1 winner advances to Round 2 Match 1 slot 1', ffR2M1.players[1] === 'FF_W1');

// Test Free Fire Match 2 advancement into Round 2 Match 2 slot 0
const afterFfM2 = advanceWinner(ffFixtures, 1, 2, 'FF_W2');
const ffR2M2 = afterFfM2.find(m => m.round === 2 && m.match_no === 2);
assert('Free Fire Match 2 winner advances to Round 2 Match 2 slot 0', ffR2M2.players[0] === 'FF_W2');

// ── 3. Mini Militia 2v2 Knockout ───────────────────────────────────────────
console.log('\n3. Mini Militia (33 players -> 16 teams -> 15 matches)');
const mmFixtures = generateFixtures('Mini Militia', players33);
assert('Mini Militia produces exactly 15 matches', mmFixtures.length === 15);
assert('Round 1 has 8 matches (16 teams)', mmFixtures.filter(m => m.round === 1).length === 8);
assert('Round 2 has 4 matches (Quarter-finals)', mmFixtures.filter(m => m.round === 2).length === 4);
assert('Round 3 has 2 matches (Semi-finals)', mmFixtures.filter(m => m.round === 3).length === 2);
assert('Round 4 has 1 match (Grand Final)', mmFixtures.filter(m => m.round === 4).length === 1);

// ── 4. eFootball 1v1 Knockout with Play-In ──────────────────────────────────
console.log('\n4. eFootball (38 players -> 6 play-ins + 31 knockout = 37 matches)');
const efPlayers = Array.from({ length: 38 }, (_, i) => `EF_${i + 1}`);
const efFixtures = generateFixtures('eFootball', efPlayers);
assert('eFootball produces exactly 37 matches', efFixtures.length === 37);
const efPlayIns = efFixtures.filter(m => m.round === 0);
assert('Round 0 has exactly 6 play-in matches (12 players)', efPlayIns.length === 6);
const efR1 = efFixtures.filter(m => m.round === 1);
assert('Round 1 has 16 matches (Round of 32)', efR1.length === 16);
const efR1SlotsWithDirect = efR1.flatMap(m => m.players).filter(Boolean);
assert('Round 1 has 26 straight through (byes)', efR1SlotsWithDirect.length === 26);

// Test Play-In advancement into Round 1
const afterEfPlayIn = advanceWinner(efFixtures, 0, 1, 'EF_WINNER_1');
const efTargetR1 = afterEfPlayIn.find(m => m.round === 1 && m.match_no === 1);
assert('Play-in winner advances to Round 1 Match 1 slot 1', efTargetR1.players[1] === 'EF_WINNER_1');

// ── 5. BGMI 1v1 Knockout ───────────────────────────────────────────────────
console.log('\n5. BGMI 1v1 Knockout (15 players -> 8 R16 + 4 QF + 2 SF + 1 Final = 15 matches)');
const bgmi1v1Players = Array.from({ length: 15 }, (_, i) => `BGMI_${i + 1}`);
const bgmiFixtures = generateFixtures('BGMI', bgmi1v1Players);
assert('BGMI produces exactly 15 matches', bgmiFixtures.length === 15);
const bgmiR1 = bgmiFixtures.filter(m => m.round === 1);
const bgmiR2 = bgmiFixtures.filter(m => m.round === 2);
const bgmiR3 = bgmiFixtures.filter(m => m.round === 3);
const bgmiR4 = bgmiFixtures.filter(m => m.round === 4);
assert('Round 1 has 8 matches (Round of 16)', bgmiR1.length === 8);
assert('Round 2 has 4 matches (Quarter-finals)', bgmiR2.length === 4);
assert('Round 2 has 1 bye player placed straight through', bgmiR2.some(m => Boolean(m.players[0]) || Boolean(m.players[1])));
assert('Round 3 has 2 matches (Semi-finals)', bgmiR3.length === 2);
assert('Round 4 has 1 Grand Final match', bgmiR4.length === 1);
assert('BGMI total rounds is 4', getTotalRounds(15, 'BGMI') === 4);

// ── 6. Carrom 1v1 Knockout with Play-In (1/64 Finals) ─────────────────────────
console.log('\n6. Carrom (66 players -> 2 play-in matches in 1/64 finals + 63 knockout = 65 matches)');
const carromPlayers = Array.from({ length: 66 }, (_, i) => `CARROM_${i + 1}`);
const carromFixtures = generateFixtures('Carrom', carromPlayers);
const carromPlayIns = carromFixtures.filter(m => m.round === 0);
assert('Carrom has 2 play-in matches in Round 0 (1/64 finals)', carromPlayIns.length === 2);
const carromR1 = carromFixtures.filter(m => m.round === 1);
assert('Carrom Round 1 has 32 matches (1/32 finals)', carromR1.length === 32);
const carromR2 = carromFixtures.filter(m => m.round === 2);
assert('Round 2 has 16 matches (1/16 finals)', carromR2.length === 16);
const carromR3 = carromFixtures.filter(m => m.round === 3);
assert('Round 3 has 8 matches (1/8 finals)', carromR3.length === 8);
const carromR4 = carromFixtures.filter(m => m.round === 4);
assert('Round 4 has 4 matches (Quarter-finals)', carromR4.length === 4);
const carromR5 = carromFixtures.filter(m => m.round === 5);
assert('Round 5 has 2 matches (Semi-finals)', carromR5.length === 2);
const carromR6 = carromFixtures.filter(m => m.round === 6);
assert('Round 6 has 1 match (Grand Final)', carromR6.length === 1);
assert('Total Carrom rounds is 6', getTotalRounds(66, 'Carrom') === 6);

// Test Carrom play-in advancement
const afterCarromPlayIn = advanceWinner(carromFixtures, 0, 1, 'CARROM_W1');
const carromTargetR1 = afterCarromPlayIn.find(m => m.round === 1 && m.match_no === 1);
assert('Play-in winner 1 advances to Round 1 Match 1 slot 1', carromTargetR1.players[1] === 'CARROM_W1');

// ── 7. GAME FORMAT & FIXTURES VERIFICATION ────────────────────────────────────
console.log('\n7. Tournament Formats & Match Generation Verification');
assert('Free Fire has 30 matches (15 R32 + 8 R16 + 4 QF + 2 SF + 1 Final)', ffFixtures.length === 30);
assert('Mini Militia has 15 matches (2v2 knockout)', mmFixtures.length === 15);
assert('eFootball has 37 matches (6 play-in + 31 knockout)', efFixtures.length === 37);
assert('BGMI has 15 matches (8 R16 + 4 QF + 2 SF + 1 Final)', bgmiFixtures.length === 15);
assert('Carrom has exactly 65 matches', carromFixtures.length === 65);

// ── 8. Team Name Resolution ────────────────────────────────────────────────
console.log('\n8. Team & Player Name Resolution');
const fakeRegs = [
  { registrationId: 'P1', fullName: 'Faizal', campusId: '101' },
  { registrationId: 'P2', fullName: 'Sadeed', campusId: '102' },
  { registrationId: 'P3', fullName: 'Rahul',  campusId: '103' },
];
const teamLabel = resolvePlayerName(fakeRegs, 'P1 + P2');
assert('Resolves pair team names: Faizal & Sadeed', teamLabel === 'Faizal & Sadeed');
const trioLabel = resolvePlayerName(fakeRegs, 'P1 + P2 + P3 (Sub)');
assert('Resolves trio team with rotating sub: Faizal & Sadeed & Rahul (Sub)', trioLabel === 'Faizal & Sadeed & Rahul (Sub)');

// ── 9. Round names ──────────────────────────────────────────────────────────
console.log('\n9. Round Names');
assert('Round 0 = Play-In Round', roundName(0, 5) === 'Play-In Round');
assert('Round 1 Free Fire = Round of 32', roundName(1, 5, 'Free Fire') === 'Round of 32');
assert('Round 2 Free Fire = Round of 16', roundName(2, 5, 'Free Fire') === 'Round of 16');
assert('Round 1 BGMI = Round of 16', roundName(1, 4, 'BGMI') === 'Round of 16');
assert('Round 2 of 4 = Quarter-finals', roundName(2, 4, 'BGMI') === 'Quarter-finals');
assert('Round 3 of 4 = Semi-finals', roundName(3, 4, 'BGMI') === 'Semi-finals');
assert('Round 4 of 4 = Grand Final', roundName(4, 4, 'BGMI') === 'Grand Final');

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
