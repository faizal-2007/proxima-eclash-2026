import { verifyVolunteerJwt } from '../_lib/auth.js';
import { getSheetsClient, getTournamentStats } from '../_lib/googleSheets.js';

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

  const volunteer = authVerification.payload;

  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetsClient = getSheetsClient();
    const sheetTitle = process.env.GOOGLE_SHEET_TAB_NAME || 'E-Clash';

    if (sheetsClient && spreadsheetId) {
      const stats = await getTournamentStats(
        sheetsClient,
        spreadsheetId,
        sheetTitle,
        volunteer.volunteerId || volunteer.username
      );

      return res.status(200).json({
        success: true,
        stats,
        station: volunteer.station || 'All',
        timestamp: new Date().toISOString(),
      });
    }

    // Mock fallback if sheets not configured
    return res.status(200).json({
      success: true,
      stats: {
        total: 2,
        checkedIn: 1,
        pending: 1,
        byGame: {
          'Free Fire': { total: 1, checkedIn: 0, pending: 1 },
          'BGMI': { total: 1, checkedIn: 1, pending: 0 },
          'Mini Militia': { total: 0, checkedIn: 0, pending: 0 },
          'Valorant': { total: 0, checkedIn: 0, pending: 0 },
        },
        volunteerScanCount: 1,
      },
      station: volunteer.station || 'All',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Volunteer Stats API] Error fetching stats:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred while fetching stats.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
