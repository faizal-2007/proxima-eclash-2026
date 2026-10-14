import bcrypt from 'bcryptjs';
import { verifyAdminAuth } from '../../_lib/auth.js';
import {
  getSheetsClient,
  getVolunteers,
  saveVolunteer,
  deleteVolunteer,
} from '../../_lib/googleSheets.js';

/**
 * Vercel Serverless Function: /api/admin/volunteers
 * Admin-only CRUD operations for tournament volunteers:
 * - GET: List all volunteers
 * - POST: Create new volunteer with admin-assigned password
 * - PUT: Edit volunteer details or reset password
 * - DELETE: Delete volunteer account
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Admin Authentication Check
  const authCheck = verifyAdminAuth(req);
  if (!authCheck.valid) {
    return res.status(401).json({ error: authCheck.error || 'Unauthorized: Admin access required.' });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const sheetsClient = getSheetsClient();

  try {
    // ==========================================
    // GET: List all volunteers
    // ==========================================
    if (req.method === 'GET') {
      if (sheetsClient && spreadsheetId) {
        const volunteers = await getVolunteers(sheetsClient, spreadsheetId, true);
        if (volunteers && volunteers.length > 0) {
          // Sanitize: do not send passwordHash to client
          const sanitized = volunteers.map((v) => ({
            volunteerId: v.volunteerId,
            name: v.name,
            username: v.username,
            campusId: v.username,
            role: v.role || 'volunteer',
            station: v.station || 'All',
            active: Boolean(v.active),
            createdAt: v.createdAt || '',
          }));

          return res.status(200).json({
            success: true,
            count: sanitized.length,
            volunteers: sanitized,
          });
        }
      }

      // Mock fallback
      return res.status(200).json({
        success: true,
        count: 2,
        volunteers: [
          {
            volunteerId: 'VOL-001',
            name: 'Alan Ray',
            username: '11111',
            campusId: '11111',
            role: 'volunteer',
            station: 'All',
            active: true,
            createdAt: '2026-10-14T00:00:00.000Z',
          },
          {
            volunteerId: 'VOL-002',
            name: 'Samir Khan',
            username: '22222',
            campusId: '22222',
            role: 'volunteer',
            station: 'Free Fire',
            active: true,
            createdAt: '2026-10-14T00:00:00.000Z',
          },
        ],
      });
    }

    // ==========================================
    // POST: Create a new volunteer
    // ==========================================
    if (req.method === 'POST') {
      const {
        name = '',
        campusId = '',
        password = '',
        station = 'All',
        active = true,
      } = req.body || {};

      if (!name.trim()) {
        return res.status(400).json({ error: 'Volunteer name is required.' });
      }
      if (!campusId.trim()) {
        return res.status(400).json({ error: 'Campus ID / username is required.' });
      }
      if (!password || String(password).length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters.' });
      }

      const cleanCampusId = campusId.trim().toLowerCase();

      if (sheetsClient && spreadsheetId) {
        const existing = await getVolunteers(sheetsClient, spreadsheetId, true);
        const duplicate = existing.find((v) => v.username === cleanCampusId);
        if (duplicate) {
          return res.status(409).json({
            error: `A volunteer with Campus ID '${campusId}' already exists.`,
          });
        }

        const passwordHash = await bcrypt.hash(String(password).trim(), 10);
        const volunteerId = `VOL-${String(existing.length + 1).padStart(3, '0')}`;

        await saveVolunteer(sheetsClient, spreadsheetId, {
          volunteerId,
          name: name.trim(),
          username: cleanCampusId,
          passwordHash,
          role: 'volunteer',
          station: station || 'All',
          active: Boolean(active),
          createdAt: new Date().toISOString(),
        });

        return res.status(201).json({
          success: true,
          message: `Volunteer '${name}' created successfully.`,
          volunteer: {
            volunteerId,
            name: name.trim(),
            username: cleanCampusId,
            campusId: cleanCampusId,
            role: 'volunteer',
            station: station || 'All',
            active: Boolean(active),
          },
        });
      }

      // Mock creation
      return res.status(201).json({
        success: true,
        message: `Volunteer '${name}' created (simulated).`,
        volunteer: {
          volunteerId: `VOL-MOCK-${Date.now().toString().slice(-4)}`,
          name: name.trim(),
          username: cleanCampusId,
          campusId: cleanCampusId,
          role: 'volunteer',
          station,
          active,
        },
      });
    }

    // ==========================================
    // PUT: Update an existing volunteer
    // ==========================================
    if (req.method === 'PUT') {
      const {
        volunteerId = '',
        name = '',
        campusId = '',
        password = '',
        station = 'All',
        active = true,
      } = req.body || {};

      if (!volunteerId && !campusId) {
        return res.status(400).json({ error: 'volunteerId or campusId is required for update.' });
      }

      const cleanCampusId = (campusId || '').trim().toLowerCase();

      if (sheetsClient && spreadsheetId) {
        const existing = await getVolunteers(sheetsClient, spreadsheetId, true);
        const volunteer = existing.find(
          (v) =>
            (volunteerId && v.volunteerId.toLowerCase() === volunteerId.toLowerCase()) ||
            (cleanCampusId && v.username === cleanCampusId)
        );

        if (!volunteer) {
          return res.status(404).json({ error: 'Volunteer not found.' });
        }

        let passwordHash = volunteer.passwordHash;
        if (password && String(password).trim().length >= 4) {
          passwordHash = await bcrypt.hash(String(password).trim(), 10);
        }

        await saveVolunteer(sheetsClient, spreadsheetId, {
          volunteerId: volunteer.volunteerId,
          name: name.trim() || volunteer.name,
          username: volunteer.username,
          passwordHash,
          role: volunteer.role || 'volunteer',
          station: station || volunteer.station || 'All',
          active: typeof active === 'boolean' ? active : volunteer.active,
          createdAt: volunteer.createdAt,
        });

        return res.status(200).json({
          success: true,
          message: `Volunteer '${volunteer.volunteerId}' updated successfully.`,
          volunteer: {
            volunteerId: volunteer.volunteerId,
            name: name.trim() || volunteer.name,
            username: volunteer.username,
            campusId: volunteer.username,
            role: volunteer.role || 'volunteer',
            station: station || volunteer.station || 'All',
            active: typeof active === 'boolean' ? active : volunteer.active,
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Volunteer updated successfully (simulated).',
      });
    }

    // ==========================================
    // DELETE: Delete a volunteer
    // ==========================================
    if (req.method === 'DELETE') {
      const volunteerId = req.query?.volunteerId || req.body?.volunteerId || req.query?.campusId || req.body?.campusId;

      if (!volunteerId) {
        return res.status(400).json({ error: 'volunteerId is required to delete volunteer.' });
      }

      if (sheetsClient && spreadsheetId) {
        const result = await deleteVolunteer(sheetsClient, spreadsheetId, volunteerId);
        if (!result.success) {
          return res.status(404).json({ error: result.error || 'Volunteer not found.' });
        }

        return res.status(200).json({
          success: true,
          message: `Volunteer '${volunteerId}' removed from tournament system.`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Volunteer '${volunteerId}' deleted (simulated).`,
      });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (error) {
    console.error('[Admin Volunteers API] Error:', error);
    return res.status(500).json({
      error: 'An unexpected internal error occurred managing volunteers.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
