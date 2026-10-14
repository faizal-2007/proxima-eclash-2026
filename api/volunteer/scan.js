import { verifyVolunteerJwt } from '../_lib/auth.js';
import { verifyQrToken } from '../_lib/crypto.js';
import {
  getSheetsClient,
  findRegistrationById,
  performParticipantCheckIn,
  appendCheckInLog,
} from '../_lib/googleSheets.js';

// In-memory fallback dev participants if Google Sheets is not configured
const MOCK_DEV_PARTICIPANTS = [
  {
    registrationId: 'ECL-2026-0001',
    fullName: 'Rahul Sharma',
    phone: '9876543210',
    campusId: '11111',
    campusEmail: '11111@yenepoya.edu.in',
    year: '1st Year',
    game: 'Free Fire',
    status: 'CONFIRMED',
    checkedIn: false,
    checkedInAt: '',
    checkedInBy: '',
  },
  {
    registrationId: 'ECL-2026-0002',
    fullName: 'Aarav Patel',
    phone: '9876543211',
    campusId: '22222',
    campusEmail: '22222@yenepoya.edu.in',
    year: '1st Year',
    game: 'BGMI',
    status: 'CONFIRMED',
    checkedIn: true,
    checkedInAt: '2026-10-14T08:30:00.000Z',
    checkedInBy: 'Alan Ray (11111)',
  },
];

/**
 * Vercel Serverless Function: POST /api/volunteer/scan
 * Verifies QR cryptographic token, inspects station matching, and checks participant registration.
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

    // 2. Cryptographic Token Verification
    const tokenVerification = verifyQrToken(qrToken);

    if (!tokenVerification.valid && !tokenVerification.isLegacy) {
      // Record invalid scan in CheckInLog audit table if possible
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const sheetsClient = getSheetsClient();
      if (sheetsClient && spreadsheetId) {
        await appendCheckInLog(sheetsClient, spreadsheetId, {
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

    // 3. Lookup participant in Google Sheet
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetsClient = getSheetsClient();
    const sheetTitle = process.env.GOOGLE_SHEET_TAB_NAME || 'E-Clash';

    let participant = null;

    if (sheetsClient && spreadsheetId) {
      participant = await findRegistrationById(sheetsClient, spreadsheetId, sheetTitle, registrationId);
    } else {
      participant = MOCK_DEV_PARTICIPANTS.find((p) => p.registrationId === registrationId) || null;
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

    const isWrongStation = !isStationDesk && cleanStation !== participant.game;

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
      // Auto check-in mode: Check in immediately
      if (sheetsClient && spreadsheetId) {
        const checkInResult = await performParticipantCheckIn(
          sheetsClient,
          spreadsheetId,
          sheetTitle,
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
        // Dev mock fallback
        participant.checkedIn = true;
        participant.checkedInAt = new Date().toISOString();
        participant.checkedInBy = `${volunteer.name} (${volunteer.username})`;

        return res.status(200).json({
          success: true,
          status: 'checkedIn',
          participant,
          message: 'Player verified and checked in successfully (dev mock).',
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
