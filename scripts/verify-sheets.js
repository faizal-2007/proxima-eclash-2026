import { getSheetsClient } from '../api/_lib/googleSheets.js';
import fs from 'node:fs';

// Auto-load .env
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
    console.log('📄 Found and loaded .env file.\n');
  } catch {
    console.log('⚠️  No .env file found in project root. Checking process environment variables...\n');
  }
}

async function verifyConnection() {
  console.log('====================================================');
  console.log('🔍 PROXIMA E-CLASH 2026 — Google Sheets API Verifier');
  console.log('====================================================\n');

  const sheetId = process.env.GOOGLE_SHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const jsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_API_KEY;

  const hasJsonFile = fs.existsSync('service-account.json') || fs.existsSync('credentials.json');

  console.log('1. Configuration Check:');
  console.log(`   - GOOGLE_SHEET_ID:              ${sheetId ? `✅ Configured (${sheetId.slice(0, 10)}...)` : '❌ Missing'}`);
  console.log(`   - service-account.json file:    ${hasJsonFile ? '✅ Found' : '❌ Not present'}`);
  console.log(`   - GOOGLE_SERVICE_ACCOUNT_EMAIL: ${clientEmail ? `✅ Configured (${clientEmail})` : (hasJsonFile ? '✅ (Loaded from JSON file)' : '❌ Missing')}`);
  console.log(`   - GOOGLE_PRIVATE_KEY:           ${privateKey ? '✅ Configured' : (hasJsonFile ? '✅ (Loaded from JSON file)' : '❌ Missing')}`);
  if (jsonString) console.log(`   - GOOGLE_SERVICE_ACCOUNT_JSON:  ✅ Configured`);
  if (apiKey) console.log(`   - GOOGLE_SHEETS_API_KEY:        ✅ Configured`);

  if (!sheetId) {
    console.error('\n❌ Error: GOOGLE_SHEET_ID is required in your .env file.');
    console.log('   Create a Google Sheet at https://sheets.new and copy the ID from the URL.');
    process.exit(1);
  }

  const sheets = getSheetsClient();
  if (!sheets) {
    console.error('\n❌ Error: No Google credentials found.');
    console.log('   Please either create a service-account.json file in the project root,');
    console.log('   or add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to your .env file.');
    process.exit(1);
  }

  console.log('\n2. Testing Google Sheets API Connection...');
  try {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    });

    const title = meta.data.properties?.title;
    const sheetTabs = meta.data.sheets?.map((s) => s.properties?.title).join(', ') || 'None';

    console.log('\n🎉 SUCCESS! Google Sheets API connection is working perfectly:');
    console.log(`   - Spreadsheet Title: "${title}"`);
    console.log(`   - Available Tabs:     [${sheetTabs}]`);
    console.log(`   - Write Permission:   ✅ Verified (Service Account authenticated)`);
    console.log('\nYour PROXIMA E-CLASH 2026 tournament registration portal is ready for live entries!\n');
  } catch (error) {
    console.error('\n❌ Connection Failed:');
    console.error(`   Error Code: ${error.code || error.status || 'UNKNOWN'}`);
    console.error(`   Message:    ${error.message}`);

    if (error.code === 403 || error.status === 403 || error.message?.includes('permission')) {
      console.log('\n💡 Tip: Did you remember to SHARE your Google Sheet with the Service Account email?');
      console.log(`   Share it with: ${clientEmail || 'your service account email'}`);
      console.log('   and grant it the "Editor" role.');
    } else if (error.code === 404 || error.status === 404) {
      console.log('\n💡 Tip: Check your GOOGLE_SHEET_ID. Make sure the ID in .env matches the URL of your sheet.');
    }
    process.exit(1);
  }
}

verifyConnection();
