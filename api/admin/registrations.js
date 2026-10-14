import { getSheetsClient, deleteRegistration, quoteSheetRange } from '../_lib/googleSheets.js';
import { verifyAdminAuth } from '../_lib/auth.js';

const DEFAULT_SHEET_TITLE = 'E-Clash';

// No dummy registrations. Only live rows from Google Sheets are returned.

/**
 * Vercel Serverless Function: /api/admin/registrations
 * - GET: Returns all registered players with summary counts.
 * - DELETE: Permanently deletes a player registration row.
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify admin authorization
  const authCheck = verifyAdminAuth(req);
  if (!authCheck.valid) {
    return res.status(401).json({ error: authCheck.error || 'Unauthorized: Admin authentication token required.' });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetsClient = getSheetsClient();
  const sheetTitle = process.env.GOOGLE_SHEET_TAB_NAME || DEFAULT_SHEET_TITLE;

  // ==========================================
  // DELETE: Delete a player registration
  // ==========================================
  if (req.method === 'DELETE') {
    const registrationId = req.query?.registrationId || req.body?.registrationId;
    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId is required to delete registration.' });
    }

    try {
      if (sheetsClient && spreadsheetId) {
        const result = await deleteRegistration(sheetsClient, spreadsheetId, sheetTitle, registrationId);
        if (!result.success) {
          return res.status(404).json({ error: result.error || 'Registration not found.' });
        }

        return res.status(200).json({
          success: true,
          message: `Registration '${registrationId}' successfully deleted.`,
          deleted: result.deleted,
        });
      }

      // Simulated deletion when Google Sheets not configured
      return res.status(200).json({
        success: true,
        message: `Registration '${registrationId}' deleted (simulated).`,
      });
    } catch (error) {
      console.error('[Admin API] Error deleting registration:', error);
      return res.status(500).json({
        error: 'Failed to delete registration.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or DELETE.' });
  }

  try {
    let registrations = [];
    let isMock = false;

    if (sheetsClient && spreadsheetId) {
      // Read all rows from sheet (skipping row 1 headers)
      const sheetRes = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: quoteSheetRange(sheetTitle, 'A2:M'),
      });

      const rows = sheetRes.data.values || [];
      registrations = rows.map((row) => ({
        registrationId: row[0] || '',
        registeredAt: row[1] || '',
        registeredAtIST: row[2] || '',
        fullName: row[3] || '',
        phone: row[4] || '',
        campusId: row[5] || '',
        campusEmail: row[6] || '',
        year: row[7] || '',
        game: row[8] || '',
        status: row[9] || 'CONFIRMED',
        checkedIn: String(row[10] || '').toUpperCase() === 'TRUE',
        checkedInAt: row[11] || '',
        checkedInBy: row[12] || '',
        paymentUtr: row[13] || '',
        paymentScreenshot: row[14] || '',
        paymentStatus: row[15] || 'PENDING',
        paidAt: row[16] || '',
      }));
    } else {
      registrations = [];
      isMock = false;
    }

    // Compute aggregate statistics
    const stats = {
      total: registrations.length,
      byGame: {
        'Free Fire': registrations.filter((r) => r.game === 'Free Fire').length,
        BGMI: registrations.filter((r) => r.game === 'BGMI').length,
        'Mini Militia': registrations.filter((r) => r.game === 'Mini Militia').length,
        eFootball: registrations.filter((r) => r.game === 'eFootball').length,
        Ludo: registrations.filter((r) => r.game === 'Ludo').length,
        Carrom: registrations.filter((r) => r.game === 'Carrom').length,
      },
      byYear: {
        '1st Year': registrations.filter((r) => r.year === '1st Year').length,
        '2nd Year': registrations.filter((r) => r.year === '2nd Year').length,
      },
    };

    return res.status(200).json({
      success: true,
      stats,
      registrations,
      isMock,
      spreadsheetId: spreadsheetId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Admin API] Error fetching registrations:', error);
    return res.status(500).json({
      error: 'Failed to fetch registrations.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
