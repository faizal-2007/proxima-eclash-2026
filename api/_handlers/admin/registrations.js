import { getSupabaseClient, getAllRegistrations, deleteRegistration, updateRegistrationPayment } from '../../_lib/supabase.js';
import { verifyAdminAuth } from '../../_lib/auth.js';

/**
 * Vercel Serverless Function: /api/admin/registrations
 * - GET: Returns all registered players with summary counts from Supabase.
 * - PATCH: Updates paymentMode (CASH / UPI) or paymentStatus (PAID / PENDING).
 * - DELETE: Permanently deletes a player registration row from Supabase.
 */
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verify admin authorization
  const authCheck = verifyAdminAuth(req);
  if (!authCheck.valid) {
    return res.status(401).json({ error: authCheck.error || 'Unauthorized: Admin authentication token required.' });
  }

  const supabase = getSupabaseClient();

  // ==========================================
  // PATCH: Update payment mode or payment status
  // ==========================================
  if (req.method === 'PATCH') {
    const { registrationId, paymentMode, paymentStatus, note } = req.body || {};
    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId is required to update payment.' });
    }

    try {
      if (supabase) {
        const updated = await updateRegistrationPayment(supabase, registrationId, {
          paymentMode,
          paymentStatus,
          note,
        });
        return res.status(200).json({
          success: true,
          message: `Payment updated for registration ${registrationId}.`,
          registration: updated,
        });
      }

      return res.status(503).json({
        error: 'Supabase database client unavailable.',
      });
    } catch (error) {
      console.error('[Admin API] Error updating payment:', error);
      return res.status(500).json({
        error: 'Failed to update payment.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // ==========================================
  // DELETE: Delete a player registration
  // ==========================================
  if (req.method === 'DELETE') {
    const registrationId = req.query?.registrationId || req.body?.registrationId;
    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId is required to delete registration.' });
    }

    try {
      if (supabase) {
        const result = await deleteRegistration(supabase, registrationId);
        return res.status(200).json({
          success: true,
          message: `Registration '${registrationId}' successfully deleted.`,
          deleted: result.deleted,
        });
      }

      return res.status(503).json({
        error: 'Supabase database client unavailable.',
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
    return res.status(405).json({ error: 'Method not allowed. Use GET, PATCH or DELETE.' });
  }

  try {
    let registrations = [];

    if (supabase) {
      registrations = await getAllRegistrations(supabase);
    }

    const countPlayersForGame = (gameName) =>
      registrations.filter((r) => {
        const games = (r.game || '').split(',').map((g) => g.trim().toLowerCase());
        return games.includes(gameName.toLowerCase());
      }).length;

    // Compute aggregate statistics
    const stats = {
      total: registrations.length,
      byGame: {
        'Free Fire': countPlayersForGame('Free Fire'),
        BGMI: countPlayersForGame('BGMI'),
        'Mini Militia': countPlayersForGame('Mini Militia'),
        eFootball: countPlayersForGame('eFootball'),
        Carrom: countPlayersForGame('Carrom'),
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
      isMock: false,
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
