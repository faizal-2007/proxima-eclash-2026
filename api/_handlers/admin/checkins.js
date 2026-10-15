import { getSupabaseClient, getCheckInLogs } from '../../_lib/supabase.js';

/**
 * GET /api/admin/checkins
 * Returns check-in audit logs for the Admin Dashboard.
 * Uses the admin Bearer token for auth (not volunteer JWT).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  // Admin auth: check Authorization header or x-admin-key
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'yennex2026';
  const authHeader = req.headers.authorization || '';
  const adminKey = req.headers['x-admin-key'] || '';

  const providedToken = authHeader.replace(/^Bearer\s+/i, '').trim() || adminKey;

  // Accept static admin token, preview token, or the raw admin password
  const validTokens = [adminPassword, 'preview-session-token', 'admin-authenticated'];
  const isAuthorized =
    validTokens.includes(providedToken) || providedToken === adminPassword;

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized. Admin access required.' });
  }

  try {
    const limit = parseInt(req.query?.limit || '500', 10);
    const volunteerFilter = req.query?.volunteer || null;

    const supabase = getSupabaseClient();

    if (!supabase) {
      return res.status(200).json({
        success: true,
        count: 0,
        logs: [],
        error: 'Supabase not configured.',
      });
    }

    const logs = await getCheckInLogs(supabase, limit, volunteerFilter);

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('[Admin CheckIns API] Error fetching logs:', error);
    return res.status(500).json({
      error: 'Internal error fetching check-in logs.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
