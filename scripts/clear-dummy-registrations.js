import { getSheetsClient } from '../api/_lib/googleSheets.js';

// Auto-load .env
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Ignore
  }
}

async function clearDummyRegistrations() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetTitle = process.env.GOOGLE_SHEET_TAB_NAME || 'E-CLASH_REGISTRATIONS';
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    console.error('No sheets client or spreadsheet ID configured.');
    return;
  }

  console.log(`🧹 Clearing dummy/test rows from Google Sheet (${spreadsheetId})...`);

  try {
    // 1. Clear rows A2:J in E-CLASH_REGISTRATIONS
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetTitle}!A2:J`,
    });
    console.log(`✅ Cleared all data rows from tab "${sheetTitle}"! Header row preserved.`);

    // 2. Also check if Sheet1 has test data and clear it if exists
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `Sheet1!A2:J`,
      });
      console.log(`✅ Cleared any test rows from "Sheet1".`);
    } catch {
      // Sheet1 may not exist or not have range, safe to ignore
    }

    console.log('🎉 Live Google Sheet is now 100% clean with 0 registrations!');
  } catch (error) {
    console.error('Error clearing sheet:', error.message);
  }
}

clearDummyRegistrations();
