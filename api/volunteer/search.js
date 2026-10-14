import { verifyVolunteerJwt } from '../_lib/auth.js';
import { getSheetsClient, getAllRegistrations } from '../_lib/googleSheets.js';

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
    } else {
      list = [
        {
          registrationId: 'ECL-2026-0001',
          fullName: 'Aarav Patel',
          phone: '9876543210',
          campusId: '22222',
          campusEmail: '22222@yenepoya.edu.in',
          year: '1st Year',
          game: 'BGMI',
          status: 'CONFIRMED',
          checkedIn: true,
          checkedInAt: '2026-10-14T05:04:20.178Z',
          checkedInBy: 'Alan Ray (VOL-001)',
        },
        {
          registrationId: 'ECL-2026-0003',
          fullName: 'Faizan Ahmed',
          phone: '9876543212',
          campusId: '44444',
          campusEmail: '44444@yenepoya.edu.in',
          year: '2nd Year',
          game: 'Free Fire',
          status: 'CONFIRMED',
          checkedIn: false,
          checkedInAt: '',
          checkedInBy: '',
        },
      ];
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
