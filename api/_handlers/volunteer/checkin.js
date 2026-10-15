import { verifyVolunteerJwt } from '../../_lib/auth.js';
import {
  getSupabaseClient,
  performParticipantCheckIn,
} from '../../_lib/supabase.js';

/**
 * Vercel Serverless Function: POST /api/volunteer/checkin
 * Marks a participant as checked in with race condition protection and audit logging using Supabase.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
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
    const {
      registrationId = '',
      station = 'All',
      override = false,
      note = '',
    } = req.body || {};

    if (!registrationId) {
      return res.status(400).json({ error: 'registrationId is required.' });
    }

    const supabase = getSupabaseClient();

    if (supabase) {
      const result = await performParticipantCheckIn(
        supabase,
        {
          registrationId,
          station,
          volunteer,
          override: Boolean(override),
          note,
        }
      );

      if (!result.success) {
        return res.status(200).json(result);
      }

      return res.status(200).json({
        success: true,
        status: 'checkedIn',
        participant: result.participant,
        message: result.message,
      });
    }

    return res.status(503).json({
      success: false,
      error: 'Supabase database connection unavailable. Check-in cannot be recorded.',
    });
  } catch (error) {
    console.error('[Volunteer Checkin API] Error checking in:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred during check-in.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
