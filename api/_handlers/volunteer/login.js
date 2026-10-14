import bcrypt from 'bcryptjs';
import {
  getSheetsClient,
  getVolunteerByUsername,
} from '../../_lib/googleSheets.js';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
  signVolunteerToken,
} from '../../_lib/auth.js';

/**
 * In-memory fallback dev volunteers when Google Sheets is not configured or in offline dev testing.
 * Fallback dev volunteers (Campus ID is both username and password, equal authority):
 * - 11111: "11111"
 * - 22222: "22222"
 * - 33333: "33333" (inactive)
 */
const MOCK_DEV_VOLUNTEERS = [
  {
    volunteerId: 'VOL-001',
    name: 'Alan Ray',
    username: '11111',
    passwordHash: '$2b$10$35JKrSRlGms0kS8Qa1Sd4uMojKFxMLq3qpH830OeztvHq4xdlFErW', // 11111
    role: 'volunteer',
    station: 'All',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    volunteerId: 'VOL-002',
    name: 'Samir Khan',
    username: '22222',
    passwordHash: '$2b$10$QtBa455abpVslyb2thsgWeMjkMEmo8DBk5hvd3bjKQVUkwPwdZ17K', // 22222
    role: 'volunteer',
    station: 'BGMI',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    volunteerId: 'VOL-003',
    name: 'Rohan Gupta',
    username: '33333',
    passwordHash: '$2b$10$kpJHjf5AE4/1nhsuY4IrQOz7U.XZFpqoSWiQpSU1wpEvhGvocZtES', // 33333
    role: 'volunteer',
    station: 'Free Fire',
    active: false,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Vercel Serverless Function: POST /api/volunteer/login
 * Authenticates volunteers against the Volunteers Google Sheet tab.
 */
export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { username = '', password = '' } = req.body || {};
    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password);

    if (!cleanUsername || !cleanPassword) {
      return res.status(400).json({
        error: 'Username and password are required.',
      });
    }

    // Determine client identifier for rate limiting
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    const rateLimitKey = `${ip}:${cleanUsername}`;

    // 1. Check rate limit
    const rateLimit = checkLoginRateLimit(rateLimitKey);
    if (rateLimit.isBlocked) {
      const waitMins = Math.ceil((rateLimit.retryAfterSeconds || 600) / 60);
      return res.status(429).json({
        error: `Too many failed login attempts. Please wait ${waitMins} minute(s) before trying again.`,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
    }

    // 2. Fetch volunteer record
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetsClient = getSheetsClient();
    let volunteer = null;

    if (sheetsClient && spreadsheetId) {
      volunteer = await getVolunteerByUsername(sheetsClient, spreadsheetId, cleanUsername);
    }
    
    if (!volunteer) {
      // Development / default roster fallback
      volunteer = MOCK_DEV_VOLUNTEERS.find((v) => v.username === cleanUsername) || null;
    }

    // 3. Verify user existence and password hash
    let passwordMatches = false;
    if (volunteer && volunteer.passwordHash) {
      passwordMatches = await bcrypt.compare(cleanPassword, volunteer.passwordHash);
    }

    if (!volunteer || !passwordMatches) {
      const attemptsCount = recordFailedLogin(rateLimitKey);
      const remaining = Math.max(0, 5 - attemptsCount);
      console.warn(`[Volunteer Auth] Failed login attempt for user '${cleanUsername}' from IP ${ip}. Remaining attempts: ${remaining}`);

      return res.status(401).json({
        error: 'Invalid username or password.',
        remainingAttempts: remaining,
      });
    }

    // 4. Check if volunteer is active
    if (!volunteer.active) {
      return res.status(403).json({
        error: 'Your volunteer account is currently deactivated. Please contact the tournament administrator or esports lead.',
      });
    }

    // 5. Successful login: Clear rate limiter & generate JWT
    clearLoginRateLimit(rateLimitKey);

    const token = signVolunteerToken({
      volunteerId: volunteer.volunteerId,
      name: volunteer.name,
      username: volunteer.username,
      role: volunteer.role,
      station: volunteer.station,
    });

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${volunteer.name}!`,
      token,
      volunteer: {
        volunteerId: volunteer.volunteerId,
        name: volunteer.name,
        username: volunteer.username,
        role: volunteer.role,
        station: volunteer.station,
      },
      expiresIn: 43200, // 12 hours in seconds
    });
  } catch (error) {
    console.error('[Volunteer Auth API] Login error:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred during authentication.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
