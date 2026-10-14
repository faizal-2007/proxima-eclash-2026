import { getSheetsClient } from '../_lib/googleSheets.js';

export default async function handler(req, res) {
  const hasClientEmail = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const hasPrivateKey = Boolean(process.env.GOOGLE_PRIVATE_KEY);
  const sheetId = process.env.GOOGLE_SHEET_ID;

  let sheetConnectionStatus = 'unconfigured';
  let sheetTitle = null;

  if (hasClientEmail && hasPrivateKey && sheetId) {
    try {
      const sheets = getSheetsClient();
      const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
      sheetConnectionStatus = 'connected';
      sheetTitle = meta.data.properties?.title;
    } catch (err) {
      sheetConnectionStatus = `error: ${err.message}`;
    }
  }

  return res.status(200).json({
    status: 'healthy',
    event: 'PROXIMA E-CLASH 2026',
    institution: 'Yenepoya School of Engineering and Technology',
    googleSheets: {
      hasServiceAccountEmail: hasClientEmail,
      hasPrivateKey: hasPrivateKey,
      sheetIdConfigured: Boolean(sheetId),
      connectionStatus: sheetConnectionStatus,
      sheetTitle,
    },
    timestamp: new Date().toISOString(),
  });
}
