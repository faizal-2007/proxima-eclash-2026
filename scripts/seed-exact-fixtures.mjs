import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env manually
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
} catch (e) {
  // ignore
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch all registrations so we can map names to registration_ids
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

  // First try exact match in the same game
  let match = registrations.find(
    (r) => r.game?.toLowerCase() === game.toLowerCase() && normalize(r.full_name) === norm
  );
  if (match) return match;

  // Then try inclusion match in same game
  match = registrations.find(
    (r) =>
      r.game?.toLowerCase() === game.toLowerCase() &&
      (normalize(r.full_name).includes(norm) || norm.includes(normalize(r.full_name)))
  );
  if (match) return match;

  // Then try across all games
  match = registrations.find((r) => normalize(r.full_name) === norm);
  if (match) return match;

  match = registrations.find(
    (r) => normalize(r.full_name).includes(norm) || norm.includes(normalize(r.full_name))
  );
  return match || null;
}

function getSlot(name, game) {
  if (!name || name === 'TBD' || name === 'W1' || name === 'W2' || name === 'W3' || name === 'W4' || name === 'W5' || name === 'W6') {
    return { id: '', name: '' };
  }
  const reg = findRegistration(name, game);
  if (reg) {
    return { id: reg.registration_id, name: reg.full_name };
  }
  return { id: name, name: name };
}

console.log('\n--- Building eFootball fixtures ---');

const eFootballR0Pairs = [
  ['Mohammad razan', 'Muhammed Azim Anees'],
  ['Mohammad Faizal', 'shinan ahamed rafiq'],
  ['Shahad P A', 'Fezin'],
  ['Mohammed Hashim', 'Rayyan B M'],
  ['Abdul Rameez', 'Muhaz abbas'],
  ['Mohammed muheez', 'Muhammed kp'],
];

const eFootballR1Pairs = [
  ['Mazinkp', 'TBD'], // W1
  ['Mohammed mashooq', 'Mohammed rishan'],
  ['MOMIN MOHAMMED AERAF', 'Muhammed Sinan B!'],
  ['azwin omer', 'ummer faraz ali'],
  ['Sharan', 'Sharfuddhin'],
  ['TBD', 'Mahammed Ashim'], // W2
  ['Anas karani', 'mohamed zidan'],
  ['TBD', 'Umarul Hayyan'], // W3
  ['Ahmed mohammed ali', 'Rumais Hussain'],
  ['TBD', 'Thousif'], // W4
  ['MUHAMMAD JASHVEEN TH', 'Harshith pk'],
  ['TBD', 'Seyyed asfar'], // W5
  ['ZIAN SALIM', 'DHANISH'],
  ['Gulshan', 'Muhammad raief'],
  ['Mahammad ashraf', 'A Mohammed Hazim'],
  ['TBD', 'Abdul Hafeez Ahmed'], // W6
];

const eFootballFixtures = [];

// Round 0
eFootballR0Pairs.forEach((pair, idx) => {
  const p1 = getSlot(pair[0], 'eFootball');
  const p2 = getSlot(pair[1], 'eFootball');
  eFootballFixtures.push({
    game: 'eFootball',
    format: 'knockout',
    round: 0,
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

// Round 1
eFootballR1Pairs.forEach((pair, idx) => {
  const p1 = getSlot(pair[0], 'eFootball');
  const p2 = getSlot(pair[1], 'eFootball');
  eFootballFixtures.push({
    game: 'eFootball',
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
for (let m = 1; m <= 8; m++) {
  eFootballFixtures.push({
    game: 'eFootball',
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
  eFootballFixtures.push({
    game: 'eFootball',
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
  eFootballFixtures.push({
    game: 'eFootball',
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

// Round 5 (Grand Final - 1 match)
eFootballFixtures.push({
  game: 'eFootball',
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

console.log(`Generated ${eFootballFixtures.length} eFootball fixtures.`);

console.log('\n--- Building Carrom fixtures ---');

const carromR0Pairs = [
  ['Mahammad Nihal', 'Mohammed hashir hussain'],
  ['Fathima Rihaf', 'Ahmed shairaz'],
];

const carromR1Pairs = [
  ['Amira Shahla', 'TBD'], // W1
  ['Khatija mifra shabeer', 'Salma simra'],
  ['Farhan k', 'Mohammed murshid'],
  ['A Mohammed Hazim', 'Sameeksha'],
  ['Ayan Abdul Latheef', 'Mohammad Sadeed Hasan'],
  ['Apseena E R', 'Abdul Thabish'],
  ['Esha Rajeev', 'Aboobakkar Siddiq'],
  ['Mohammed Sufail', 'Mohammed sihad'],
  ['Naadir Mansoor', 'Rumais Hussain'],
  ['Khatheeja Haifa', 'Mohammed REHAN'],
  ['Mohammed Shazil', 'Ayesha Alfeeza'],
  ['Nihad Ahmad P', 'Mohammad Hafeez'],
  ['Mohammed Raheesh Basheer', 'Fathima beevi ca'],
  ['Rimsha Fathima', 'Insha Najeeb'],
  ['Hishad Ahmed', 'MOHAMMED MINHAL'],
  ['Diya Iram', 'Fathimathul Zahra KP'],
  ['Mohammad fazal', 'TBD'], // W2
  ['Muhammed Shanis A.K', 'ASHMIK RISHAB'],
  ['Mahammad ashraf', 'Mohammed sabith hussain'],
  ['Mahammad irshad', 'TUFAIL AHMED'],
  ['DHANISH', 'Mohammed Hashim'],
  ['Muhamed raief', 'Muhammad Ashin'],
  ['Muhammed Azim Anees', 'Muaad'],
  ['Muhammad Dilkash', 'Mahammad Inaaz'],
  ['Mohammed Mahroof', 'Fathima Afra'],
  ['Seyyed asfar', 'Aleemath Shaima'],
  ['Gulshan', 'Rakshya .k'],
  ['Aysha Rimsha', 'Abdul Hafeez Ahmed'],
  ['Hazara rila', 'Firas Abdul Khadar Hejmadi'],
  ['Fathima Minha K', 'Fathima Raneem'],
  ['Francisca Surjith M', 'ayesha fameeza'],
  ['Faheem Abubaker', 'Mahammad rifad'],
];

const carromFixtures = [];

// Round 0 (1/64 finals - 2 matches)
carromR0Pairs.forEach((pair, idx) => {
  const p1 = getSlot(pair[0], 'Carrom');
  const p2 = getSlot(pair[1], 'Carrom');
  carromFixtures.push({
    game: 'Carrom',
    format: 'knockout',
    round: 0,
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

// Round 1 (1/32 finals - 32 matches)
carromR1Pairs.forEach((pair, idx) => {
  const p1 = getSlot(pair[0], 'Carrom');
  const p2 = getSlot(pair[1], 'Carrom');
  carromFixtures.push({
    game: 'Carrom',
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

// Round 2 (1/16 finals - 16 matches)
for (let m = 1; m <= 16; m++) {
  carromFixtures.push({
    game: 'Carrom',
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

// Round 3 (1/8 finals - 8 matches)
for (let m = 1; m <= 8; m++) {
  carromFixtures.push({
    game: 'Carrom',
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

// Round 4 (Quarter-finals - 4 matches)
for (let m = 1; m <= 4; m++) {
  carromFixtures.push({
    game: 'Carrom',
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

// Round 5 (Semi-finals - 2 matches)
for (let m = 1; m <= 2; m++) {
  carromFixtures.push({
    game: 'Carrom',
    format: 'knockout',
    round: 5,
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

// Round 6 (Grand Final - 1 match)
carromFixtures.push({
  game: 'Carrom',
  format: 'knockout',
  round: 6,
  match_no: 1,
  players: ['', ''],
  player_names: ['', ''],
  winner: null,
  winner_name: null,
  status: 'scheduled',
  completed_at: null,
  locked: false,
});

console.log(`Generated ${carromFixtures.length} Carrom fixtures.`);

// Now delete and insert in Supabase
console.log('\nUpdating eFootball fixtures in Supabase...');
const { error: delEfootballErr } = await supabase
  .from('fixtures')
  .delete()
  .eq('game', 'eFootball');

if (delEfootballErr) {
  console.error('Error deleting eFootball fixtures:', delEfootballErr);
} else {
  const { error: insEfootballErr } = await supabase
    .from('fixtures')
    .insert(eFootballFixtures);
  if (insEfootballErr) {
    console.error('Error inserting eFootball fixtures:', insEfootballErr);
  } else {
    console.log('✅ Successfully seeded eFootball fixtures!');
  }
}

console.log('\nUpdating Carrom fixtures in Supabase...');
const { error: delCarromErr } = await supabase
  .from('fixtures')
  .delete()
  .eq('game', 'Carrom');

if (delCarromErr) {
  console.error('Error deleting Carrom fixtures:', delCarromErr);
} else {
  const { error: insCarromErr } = await supabase
    .from('fixtures')
    .insert(carromFixtures);
  if (insCarromErr) {
    console.error('Error inserting Carrom fixtures:', insCarromErr);
  } else {
    console.log('✅ Successfully seeded Carrom fixtures!');
  }
}

console.log('\nAll done!');
