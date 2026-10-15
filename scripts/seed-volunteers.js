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

/**
 * Input your valid volunteer roster below.
 * You can also create and manage volunteers directly through the Admin Portal UI!
 *
 * Example Format:
 * {
 *   volunteerId: 'VOL-001',
 *   name: 'Student Full Name',
 *   username: '12345',         // Campus ID (used as login username)
 *   passwordPlain: '12345',    // Initial password (usually same as Campus ID)
 *   role: 'volunteer',         // 'volunteer' or 'lead'
 *   station: 'All',            // 'All', 'Free Fire', 'BGMI', 'Mini Militia', 'Valorant', etc.
 *   active: true,
 * }
 */
const SEED_VOLUNTEERS = [
  // Add your real volunteer accounts here:
];

async function seed() {
  console.log('=====================================================');
  console.log('🌱 PROXIMA E-CLASH 2026 — Volunteer Seeding Script');
  console.log('=====================================================\n');

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetsClient = getSheetsClient();

  if (!sheetsClient || !spreadsheetId) {
    console.error('❌ Google Sheets API credentials or GOOGLE_SHEET_ID not detected in .env.');
    process.exit(1);
  }

  if (SEED_VOLUNTEERS.length === 0) {
    console.log('ℹ️ SEED_VOLUNTEERS list is currently empty.');
    console.log('👉 To input volunteers:');
    console.log('   Option A: Add your volunteer objects to SEED_VOLUNTEERS in scripts/seed-volunteers.js and run this script.');
    console.log('   Option B (Recommended): Use the live web Admin Portal at /admin -> "Volunteers" tab to add and manage volunteers with a UI.\n');

    try {
      const all = await getVolunteers(sheetsClient, spreadsheetId, true);
      console.log(`Current active volunteers in Google Sheet: ${all.length}`);
    } catch {
      // ignore
    }
    return;
  }

  try {
    console.log(`1. Connecting to Google Sheet ID: ${spreadsheetId.slice(0, 10)}...`);
    await ensureSheetInitialized(sheetsClient, spreadsheetId);

    console.log(`\n2. Seeding ${SEED_VOLUNTEERS.length} Volunteer accounts into "Volunteers" tab:`);
    for (const v of SEED_VOLUNTEERS) {
      const passwordHash = bcrypt.hashSync(String(v.passwordPlain || v.username), 10);
      await saveVolunteer(sheetsClient, spreadsheetId, {
        volunteerId: v.volunteerId,
        name: v.name,
        username: String(v.username).trim().toLowerCase(),
        passwordHash,
        role: v.role || 'volunteer',
        station: v.station || 'All',
        active: v.active !== false,
        createdAt: new Date().toISOString(),
      });
      console.log(`  ✅ [${(v.role || 'volunteer').toUpperCase()}] ${v.name} (${v.username}) — Station: ${v.station || 'All'} — Active: ${v.active !== false}`);
    }

    const all = await getVolunteers(sheetsClient, spreadsheetId, true);
    console.log(`\n🎉 SEEDING COMPLETE! Total volunteers registered in sheet: ${all.length}`);
  } catch (err) {
    console.error('\n❌ Seeding failed with error:', err.message);
    process.exit(1);
  }
}

seed();
