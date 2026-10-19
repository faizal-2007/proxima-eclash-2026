import { verifyVolunteerJwt } from '../../_lib/auth.js';
import { verifyQrToken } from '../../_lib/crypto.js';
import {
  getSupabaseClient,
  findRegistrationById,
  performParticipantCheckIn,
  appendCheckInLog,
} from '../../_lib/supabase.js';

/**
 * Vercel Serverless Function: POST /api/volunteer/scan
 * Verifies QR cryptographic token, inspects station matching, and checks participant registration using Supabase.
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
    const { qrToken = '', station = 'All', autoCheckIn = false } = req.body || {};

    if (!qrToken) {
      return res.status(400).json({ error: 'qrToken is required.' });
    }

    const supabase = getSupabaseClient();

    // 2. Cryptographic Token Verification
    const tokenVerification = verifyQrToken(qrToken);

    if (!tokenVerification.valid && !tokenVerification.isLegacy) {
      if (supabase) {
        await appendCheckInLog(supabase, {
          timestamp: new Date().toISOString(),
          registrationId: tokenVerification.registrationId || 'UNKNOWN',
          game: 'UNKNOWN',
          result: 'INVALID',
          volunteerId: volunteer.volunteerId || volunteer.username,
          volunteerName: volunteer.name || volunteer.username,
          station,
          note: `Signature verification failed. Scanned token: ${String(qrToken).slice(0, 30)}...`,
        }).catch(() => {});
      }

      return res.status(200).json({
        success: false,
        status: 'invalid',
        error: 'Invalid ticket: Cryptographic signature mismatch or tampered code.',
      });
    }

    const registrationId = tokenVerification.registrationId;

    // 3. Lookup participant in Supabase
    let participant = null;

    if (supabase) {
      participant = await findRegistrationById(supabase, registrationId);
    }

    if (!participant) {
      return res.status(200).json({
        success: false,
        status: 'notFound',
        error: `Registration credential '${registrationId}' was not found in the championship records.`,
      });
    }

    // 4. Check if already checked in
    if (participant.checkedIn) {
      return res.status(200).json({
        success: false,
        status: 'alreadyCheckedIn',
        participant,
        message: `Already checked in by ${participant.checkedInBy || 'Staff'}${
          participant.checkedInAt
            ? ` at ${new Date(participant.checkedInAt).toLocaleTimeString('en-IN')}`
            : ''
        }.`,
      });
    }

    // 5. Station Matching Verification
    const cleanStation = String(station).trim();
    const isStationDesk =
      cleanStation === 'All' ||
      cleanStation === 'All / Registration Desk' ||
      cleanStation === '';

    const games = (participant.game || '').split(',').map((g) => g.trim().toLowerCase());
    const isWrongStation = !isStationDesk && !games.includes(cleanStation.toLowerCase());

    if (isWrongStation) {
      return res.status(200).json({
        success: true,
        status: 'wrongStation',
        participant,
        message: `Registered for ${participant.game}, not ${cleanStation}.`,
      });
    }

    // 6. Valid scan at correct station
    if (autoCheckIn) {
      if (supabase) {
        const checkInResult = await performParticipantCheckIn(
          supabase,
          {
            registrationId: participant.registrationId,
            station: cleanStation,
            volunteer,
            override: false,
          }
        );

        return res.status(200).json({
          success: true,
          status: 'checkedIn',
          participant: checkInResult.participant || {
            ...participant,
            checkedIn: true,
            checkedInAt: checkInResult.checkedInAt,
            checkedInBy: checkInResult.checkedInBy,
          },
          message: 'Player verified and checked in successfully.',
        });
      } else {
        return res.status(503).json({
          success: false,
          error: 'Supabase database connection unavailable. Check-in cannot be recorded.',
        });
      }
    }

    // Ready for manual Check In confirmation
    return res.status(200).json({
      success: true,
      status: 'valid',
      participant,
      message: 'Valid tournament credential.',
      isLegacy: Boolean(tokenVerification.isLegacy),
    });
  } catch (error) {
    console.error('[Volunteer Scan API] Error processing scan:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred while processing scan.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
