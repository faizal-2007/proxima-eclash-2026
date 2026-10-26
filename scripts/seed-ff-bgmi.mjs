import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

try {
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
} catch (e) {}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: registrations, error: regErr } = await supabase
  .from('registrations')
  .select('registration_id, full_name, game');

if (regErr) {
  console.error('Error fetching registrations:', regErr);
  process.exit(1);
}

console.log(`Loaded ${registrations.length} registrations from Supabase.`);

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function findRegistration(name, game) {
  const norm = normalize(name);
  if (!norm) return null;

  let match = registrations.find(
    (r) => r.game?.toLowerCase() === game.toLowerCase() && normalize(r.full_name) === norm
  );
  if (match) return match;

  match = registrations.find(
    (r) =>
      r.game?.toLowerCase() === game.toLowerCase() &&
      (normalize(r.full_name).includes(norm) || norm.includes(normalize(r.full_name)))
  );
  if (match) return match;

  match = registrations.find((r) => normalize(r.full_name) === norm);
  if (match) return match;

  match = registrations.find(
    (r) => normalize(r.full_name).includes(norm) || norm.includes(normalize(r.full_name))
  );
  return match || null;
}

function getSlot(name, game) {
  if (!name || name === 'TBD') {
    return { id: '', name: '' };
  }
  const reg = findRegistration(name, game);
  if (reg) {
    return { id: reg.registration_id, name: reg.full_name };
  }
  return { id: name, name: name };
}

// ── 1. FREE FIRE (1v1 Knockout - 31 players -> 30 matches) ──────────────────
console.log('\n--- Building Free Fire 1v1 fixtures ---');

const ffR1Pairs = [
  ['Hahmad nusair', 'Mohammed Rihan'],
  ['Ashikravikumar', 'Mohammed muheez'],
  ['Nowheed', 'ummer faraz ali'],
  ['Mohammed hashir huss', 'Mohammad razan'],
  ['Mohammed Shazil', 'Sheik Mohammed ovez'],
  ['Muhammad Ashin', 'Rayyan B M'],
  ['Abdul Rameez', 'Mohammed Raheesh Bas'],
  ['Naadir Mansoor', 'MUHAMMAD JASHVEEN TH'],
  ['mohamed zidan', 'Mahammad rifad'],
  ['Sharan', 'Muhammed kp'],
  ['Muhaz abbas', 'Mohammed murshid'],
  ['Mohammed mashooq', 'Nihad Ahmad P'],
  ['Abdul Thabish', 'MOHAMMED MINHAL'],
  ['Hishad Ahmed', 'Abdul Nafih'],
  ['Sharfuddhin', 'Muhammed iqbal cs'],
];

const ffByePlayer = getSlot('Rakshya .k', 'Free Fire');

const freeFireFixtures = [];

// Round 1 (Round of 32 - 15 matches)
ffR1Pairs.forEach((pair, idx) => {
  const p1 = getSlot(pair[0], 'Free Fire');
  const p2 = getSlot(pair[1], 'Free Fire');
  freeFireFixtures.push({
    game: 'Free Fire',
    format: 'knockout',
    round: 1,
    match_no: idx + 1,
    players: [p1.id, p2.id],
    player_names: [p1.name, p2.name],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
});

// Round 2 (Round of 16 - 8 matches)
// Match 1 has Rakshya .k in slot 0 (bye)
freeFireFixtures.push({
  game: 'Free Fire',
  format: 'knockout',
  round: 2,
  match_no: 1,
  players: [ffByePlayer.id, ''],
  player_names: [ffByePlayer.name, ''],
  winner: null,
  winner_name: null,
  status: 'scheduled',
  completed_at: null,
  locked: false,
});

for (let m = 2; m <= 8; m++) {
  freeFireFixtures.push({
    game: 'Free Fire',
    format: 'knockout',
    round: 2,
    match_no: m,
    players: ['', ''],
    player_names: ['', ''],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
}

// Round 3 (Quarter-finals - 4 matches)
for (let m = 1; m <= 4; m++) {
  freeFireFixtures.push({
    game: 'Free Fire',
    format: 'knockout',
    round: 3,
    match_no: m,
    players: ['', ''],
    player_names: ['', ''],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
}

// Round 4 (Semi-finals - 2 matches)
for (let m = 1; m <= 2; m++) {
  freeFireFixtures.push({
    game: 'Free Fire',
    format: 'knockout',
    round: 4,
    match_no: m,
    players: ['', ''],
    player_names: ['', ''],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
}

// Round 5 (Final - 1 match)
freeFireFixtures.push({
  game: 'Free Fire',
  format: 'knockout',
  round: 5,
  match_no: 1,
  players: ['', ''],
  player_names: ['', ''],
  winner: null,
  winner_name: null,
  status: 'scheduled',
  completed_at: null,
  locked: false,
});

console.log(`Generated ${freeFireFixtures.length} Free Fire 1v1 fixtures.`);

// ── 2. BGMI (1v1 Knockout - 15 players -> 15 matches) ───────────────────────
console.log('\n--- Building BGMI 1v1 fixtures ---');

const bgmiPlayers = [
  'Mohammed sabith hussain',
  'Hahmad nusair',
  'MUHAMMED SAHAL',
  'Faheem Abubaker',
  'Adhil shan p',
  'Muaad',
  'Ahmed mohammed ali',
  'Yusuf Amaan',
  'ZIAN SALIM',
  'Vinayak C.A',
  'Ashmi Vinod',
  'Saurav sunil',
  'ASHMIK RISHAB',
  'Dakshin',
  'Muhammad Nawfal',
];

const bgmiFixtures = [];

// Round 1 (Round of 16 - 8 matches: 7 real matches + 1 bye)
for (let m = 1; m <= 7; m++) {
  const p1 = getSlot(bgmiPlayers[(m - 1) * 2], 'BGMI');
  const p2 = getSlot(bgmiPlayers[(m - 1) * 2 + 1], 'BGMI');
  bgmiFixtures.push({
    game: 'BGMI',
    format: 'knockout',
    round: 1,
    match_no: m,
    players: [p1.id, p2.id],
    player_names: [p1.name, p2.name],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
}

// Match 8: Bye for player 15 (Muhammad Nawfal)
const bgmiBye = getSlot(bgmiPlayers[14], 'BGMI');
bgmiFixtures.push({
  game: 'BGMI',
  format: 'knockout',
  round: 1,
  match_no: 8,
  players: [bgmiBye.id, ''],
  player_names: [bgmiBye.name, ''],
  winner: bgmiBye.id,
  winner_name: bgmiBye.name,
  status: 'completed',
  completed_at: new Date().toISOString(),
  locked: false,
});

// Round 2 (Quarter-finals - 4 matches)
// Matches 1, 2, 3 await R1 winners
for (let m = 1; m <= 3; m++) {
  bgmiFixtures.push({
    game: 'BGMI',
    format: 'knockout',
    round: 2,
    match_no: m,
    players: ['', ''],
    player_names: ['', ''],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
}
// Match 4: Slot 1 has the bye player auto-advanced from match 8
bgmiFixtures.push({
  game: 'BGMI',
  format: 'knockout',
  round: 2,
  match_no: 4,
  players: ['', bgmiBye.id],
  player_names: ['', bgmiBye.name],
  winner: null,
  winner_name: null,
  status: 'scheduled',
  completed_at: null,
  locked: false,
});

// Round 3 (Semi-finals - 2 matches)
for (let m = 1; m <= 2; m++) {
  bgmiFixtures.push({
    game: 'BGMI',
    format: 'knockout',
    round: 3,
    match_no: m,
    players: ['', ''],
    player_names: ['', ''],
    winner: null,
    winner_name: null,
    status: 'scheduled',
    completed_at: null,
    locked: false,
  });
}

// Round 4 (Grand Final - 1 match)
bgmiFixtures.push({
  game: 'BGMI',
  format: 'knockout',
  round: 4,
  match_no: 1,
  players: ['', ''],
  player_names: ['', ''],
  winner: null,
  winner_name: null,
  status: 'scheduled',
  completed_at: null,
  locked: false,
});

console.log(`Generated ${bgmiFixtures.length} BGMI 1v1 fixtures.`);

// ── 3. UPDATE SUPABASE ──────────────────────────────────────────────────────
console.log('\nUpdating Free Fire fixtures in Supabase...');
const { error: delFfErr } = await supabase
  .from('fixtures')
  .delete()
  .eq('game', 'Free Fire');

if (delFfErr) {
  console.error('Error deleting Free Fire fixtures:', delFfErr);
} else {
  const { error: insFfErr } = await supabase
    .from('fixtures')
    .insert(freeFireFixtures);
  if (insFfErr) {
    console.error('Error inserting Free Fire fixtures:', insFfErr);
  } else {
    console.log('✅ Successfully seeded Free Fire 1v1 fixtures!');
  }
}

console.log('\nUpdating BGMI fixtures in Supabase...');
const { error: delBgmiErr } = await supabase
  .from('fixtures')
  .delete()
  .eq('game', 'BGMI');

if (delBgmiErr) {
  console.error('Error deleting BGMI fixtures:', delBgmiErr);
} else {
  const { error: insBgmiErr } = await supabase
    .from('fixtures')
    .insert(bgmiFixtures);
  if (insBgmiErr) {
    console.error('Error inserting BGMI fixtures:', insBgmiErr);
  } else {
    console.log('✅ Successfully seeded BGMI 1v1 fixtures!');
  }
}

console.log('\nAll done!');
