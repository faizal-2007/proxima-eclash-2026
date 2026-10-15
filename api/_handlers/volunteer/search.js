import { verifyVolunteerJwt } from '../../_lib/auth.js';
import { getSheetsClient, getAllRegistrations } from '../../_lib/googleSheets.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  // 1. Volunteer Authentication
  const authHeader = req.headers.authorization || '';
  const authVerification = verifyVolunteerJwt(authHeader);

  if (!authVerification.valid || !authVerification.payload) {
    return res.status(401).json({
      error: authVerification.error || 'Unauthorized: Volunteer session expired or invalid.',
    });
  }

  try {
    const q = (req.query?.q || '').trim().toLowerCase();

    if (!q) {
      return res.status(200).json({ success: true, results: [] });
    }

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetsClient = getSheetsClient();
    const sheetTitle = process.env.GOOGLE_SHEET_TAB_NAME || 'E-Clash';

    let list = [];
    if (sheetsClient && spreadsheetId) {
      list = await getAllRegistrations(sheetsClient, spreadsheetId, sheetTitle);
    }

    // Filter results matching query against name, campus ID, phone, email, or registration ID
    const results = list
      .filter((p) => {
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.campusId.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.campusEmail.toLowerCase().includes(q) ||
          p.registrationId.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);

    return res.status(200).json({
      success: true,
      query: q,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('[Volunteer Search API] Error searching participants:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred during search.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
