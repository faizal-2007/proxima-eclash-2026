import bcrypt from 'bcryptjs';
import {
  getSheetsClient,
  ensureSheetInitialized,
  saveVolunteer,
  getVolunteers,
} from '../api/_lib/googleSheets.js';

// Auto-load .env
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // ignore
  }
}

const SEED_VOLUNTEERS = [
  {
    volunteerId: 'VOL-001',
    name: 'Alan Ray',
    username: '11111',
    passwordPlain: '11111',
    role: 'volunteer',
    station: 'All',
    active: true,
  },
  {
    volunteerId: 'VOL-002',
    name: 'Samir Khan',
    username: '22222',
    passwordPlain: '22222',
    role: 'volunteer',
    station: 'BGMI',
    active: true,
  },
  {
    volunteerId: 'VOL-003',
    name: 'Rohan Gupta (Deactivated Test)',
    username: '33333',
    passwordPlain: '33333',
    role: 'volunteer',
    station: 'Free Fire',
    active: false,
  },
];

async function seed() {
  console.log('=====================================================');
  console.log('🌱 PROXIMA E-CLASH 2026 — Volunteer Seeding Script');
  console.log('=====================================================\n');

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetsClient = getSheetsClient();

  if (!sheetsClient || !spreadsheetId) {
    console.warn('⚠️ Google Sheets API credentials or GOOGLE_SHEET_ID not detected in .env.');
    console.log('ℹ️ Generating bcrypt hashes for in-memory / local development use:');
    for (const v of SEED_VOLUNTEERS) {
      const hash = bcrypt.hashSync(v.passwordPlain, 10);
      console.log(`- Username: ${v.username} | Plain: ${v.passwordPlain} | Role: ${v.role} | Active: ${v.active}`);
      console.log(`  Bcrypt Hash: ${hash}`);
    }
    return;
  }

  try {
    console.log(`1. Connecting to Google Sheet ID: ${spreadsheetId.slice(0, 10)}...`);
    await ensureSheetInitialized(sheetsClient, spreadsheetId);

    console.log('\n2. Seeding Volunteer accounts into "Volunteers" tab:');
    for (const v of SEED_VOLUNTEERS) {
      const passwordHash = bcrypt.hashSync(v.passwordPlain, 10);
      await saveVolunteer(sheetsClient, spreadsheetId, {
        volunteerId: v.volunteerId,
        name: v.name,
        username: v.username,
        passwordHash,
        role: v.role,
        station: v.station,
        active: v.active,
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✅ [${v.role.toUpperCase()}] ${v.name} (${v.username}) — Station: ${v.station} — Active: ${v.active}`);
    }

    const all = await getVolunteers(sheetsClient, spreadsheetId, true);
    console.log(`\n🎉 SEEDING COMPLETE! Total volunteers registered in sheet: ${all.length}`);
    console.log('\nVolunteer Credentials (Username & Password are the Campus ID):');
    console.log('  1. Volunteer 1:   11111 / 11111  (Name: Alan Ray, Station: All)');
    console.log('  2. Volunteer 2:   22222 / 22222  (Name: Samir Khan, Station: BGMI)');
    console.log('  3. Inactive Test: 33333 / 33333  (Name: Rohan Gupta, Deactivated)');
  } catch (err) {
    console.error('\n❌ Seeding failed with error:', err.message);
    process.exit(1);
  }
}

seed();
