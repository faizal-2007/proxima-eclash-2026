import {
  getSupabaseClient,
  getVolunteerByUsername,
} from '../../_lib/supabase.js';
import { verifyVolunteerJwt } from '../../_lib/auth.js';

/**
 * Vercel Serverless Function: GET /api/volunteer/me
 * Returns current volunteer session info and validates server-side active status via Supabase.
 */
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

  const authHeader = req.headers.authorization || '';
  const verification = verifyVolunteerJwt(authHeader);

  if (!verification.valid || !verification.payload) {
    return res.status(401).json({ error: verification.error || 'Unauthorized' });
  }

  const { username } = verification.payload;

  // Server-side active check
  const supabase = getSupabaseClient();
  let volunteer = null;

  if (supabase) {
    volunteer = await getVolunteerByUsername(supabase, username);
  }

  if (volunteer && !volunteer.active) {
    return res.status(403).json({
      error: 'Your volunteer account has been deactivated. Access revoked.',
      deactivated: true,
    });
  }

  return res.status(200).json({
    success: true,
    volunteer: {
      volunteerId: volunteer?.volunteerId || verification.payload.volunteerId,
      name: volunteer?.name || verification.payload.name,
      username: volunteer?.username || verification.payload.username,
      role: volunteer?.role || verification.payload.role,
      station: volunteer?.station || verification.payload.station,
    },
  });
}
