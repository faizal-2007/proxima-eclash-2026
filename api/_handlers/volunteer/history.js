import { verifyVolunteerJwt } from '../../_lib/auth.js';
import { getSheetsClient, getCheckInLogs } from '../../_lib/googleSheets.js';

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
    const limit = parseInt(req.query?.limit || '50', 10);
    const filter = (req.query?.filter || 'all').toLowerCase();
    const volunteerIdFilter = filter === 'my' ? (volunteer.volunteerId || volunteer.username) : null;

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetsClient = getSheetsClient();

    if (sheetsClient && spreadsheetId) {
      const logs = await getCheckInLogs(sheetsClient, spreadsheetId, limit, volunteerIdFilter);
      return res.status(200).json({
        success: true,
        count: logs.length,
        logs,
      });
    }

    // Mock logs fallback
    return res.status(200).json({
      success: true,
      count: 1,
      logs: [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          registrationId: 'ECL-2026-0001',
          game: 'BGMI',
          result: 'CHECKED_IN',
          volunteerId: volunteer.volunteerId || volunteer.username,
          volunteerName: volunteer.name || volunteer.username,
          station: 'All',
          note: 'Verified in simulated mode',
        },
      ],
    });
  } catch (error) {
    console.error('[Volunteer History API] Error fetching logs:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred while fetching scan history.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
