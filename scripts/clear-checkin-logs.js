import { getSheetsClient, CHECKIN_LOG_TAB_NAME } from '../api/_lib/googleSheets.js';

// Auto-load .env
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Ignore
  }
}

async function clearCheckInLogs() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheets = getSheetsClient();

  if (!sheets || !spreadsheetId) {
    console.error('No sheets client or spreadsheet ID configured in .env.');
    return;
  }

  console.log(`🧹 Clearing test rows from CheckInLog tab in Google Sheet (${spreadsheetId})...`);

  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${CHECKIN_LOG_TAB_NAME}!A2:H`,
    });
    console.log(`✅ Cleared all log rows from "${CHECKIN_LOG_TAB_NAME}"! Headers (row 1) preserved.`);
  } catch (error) {
    console.error('Error clearing CheckInLog:', error.message);
  }
}

clearCheckInLogs();
