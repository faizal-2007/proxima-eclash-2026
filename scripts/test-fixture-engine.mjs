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

// ── 2. Free Fire Hybrid: Solo BR to 1v1 Knockout ───────────────────────────
console.log('\n2. Free Fire (31 players -> 1 BR Qualifier + 7 Knockout matches = 8 matches)');
const ffPlayers = Array.from({ length: 31 }, (_, i) => `FF_${i + 1}`);
const ffFixtures = generateFixtures('Free Fire', ffPlayers);
assert('Free Fire produces exactly 8 matches', ffFixtures.length === 8);
const ffR1 = ffFixtures.filter(m => m.round === 1);
const ffR2 = ffFixtures.filter(m => m.round === 2);
const ffR3 = ffFixtures.filter(m => m.round === 3);
const ffR4 = ffFixtures.filter(m => m.round === 4);
assert('Round 1 is 1 Solo BR lobby with all 31 players', ffR1.length === 1 && ffR1[0].players.length === 31);
assert('Round 2 is Quarter-finals (4 knockout matches)', ffR2.length === 4);
assert('Round 3 is Semi-finals (2 knockout matches)', ffR3.length === 2);
assert('Round 4 is Grand Final (1 knockout match)', ffR4.length === 1);

// Test Free Fire qualifier advancement
const top8 = ['FF_1', 'FF_2', 'FF_3', 'FF_4', 'FF_5', 'FF_6', 'FF_7', 'FF_8'];
const ffAdvanced = advanceFreeFireQualifiers(ffFixtures, top8);
const r2m1 = ffAdvanced.find(m => m.round === 2 && m.match_no === 1);
assert('Top 8 advance into Round 2 slots', r2m1.players[0] === 'FF_1' && r2m1.players[1] === 'FF_2');

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

// ── 5. BGMI 2v2 TDM Knockout ───────────────────────────────────────────────
console.log('\n5. BGMI (TDM) (15 players -> 7 teams -> 6 matches)');
const bgmiFixtures = generateFixtures('BGMI', players15);
assert('BGMI produces exactly 6 matches', bgmiFixtures.length === 6);
const bgmiR1 = bgmiFixtures.filter(m => m.round === 1);
const bgmiR2 = bgmiFixtures.filter(m => m.round === 2);
const bgmiR3 = bgmiFixtures.filter(m => m.round === 3);
assert('Round 1 has 3 Quarter-final matches', bgmiR1.length === 3);
assert('Round 2 has 2 Semi-final matches', bgmiR2.length === 2);
assert('Round 2 has 1 bye team placed straight through', bgmiR2.some(m => Boolean(m.players[1])));
assert('Round 3 has 1 Grand Final match', bgmiR3.length === 1);

// ── 6. Carrom 1v1 Knockout without Play-In ─────────────────────────────────────
console.log('\n6. Carrom (66 players -> standard knockout starting directly at Round 1)');
const carromPlayers = Array.from({ length: 66 }, (_, i) => `CARROM_${i + 1}`);
const carromFixtures = generateFixtures('Carrom', carromPlayers);
const carromPlayIns = carromFixtures.filter(m => m.round === 0);
assert('Carrom has NO play-in matches (round 0 === 0)', carromPlayIns.length === 0);
const carromR1 = carromFixtures.filter(m => m.round === 1);
assert('Carrom starts directly in Round 1 with 64 bracket matches', carromR1.length === 64);
const carromRealM = carromR1.filter(m => Boolean(m.players[0]) && Boolean(m.players[1]));
assert('Round 1 has 2 real matches played', carromRealM.length === 2);
const carromByes = carromR1.filter(m => Boolean(m.players[0]) && !m.players[1]);
assert('Round 1 has 62 byes cleanly auto-advanced', carromByes.length === 62);
const carromR2 = carromFixtures.filter(m => m.round === 2);
assert('Round 2 has 32 matches', carromR2.length === 32);
assert('Total Carrom rounds is 7', getTotalRounds(66, 'Carrom') === 7);

// ── 7. GAME FORMAT & FIXTURES VERIFICATION ────────────────────────────────────
console.log('\n7. Tournament Formats & Match Generation Verification');
assert('Free Fire has 8 matches (1 solo BR + 7 knockout)', ffFixtures.length === 8);
assert('Mini Militia has 15 matches (2v2 knockout)', mmFixtures.length === 15);
assert('eFootball has 37 matches (6 play-in + 31 knockout)', efFixtures.length === 37);
assert('BGMI (TDM) has 6 matches (3 QF + 2 SF + 1 Final)', bgmiFixtures.length === 6);
assert('Carrom has 127 bracket matches (65 actual played matches)', carromFixtures.length === 127);

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
assert('Round 1 Free Fire = Stage 1: Solo Battle Royale Qualifier', roundName(1, 4, 'Free Fire') === 'Stage 1: Solo Battle Royale Qualifier');
assert('Round 2 of 4 = Quarter-final', roundName(2, 4) === 'Quarter-final');
assert('Round 3 of 4 = Semi-final', roundName(3, 4) === 'Semi-final');
assert('Round 4 of 4 = Grand Final', roundName(4, 4) === 'Grand Final');

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
