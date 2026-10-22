import bcrypt from 'bcryptjs';
import { verifyAdminAuth } from '../../_lib/auth.js';
import {
  getSupabaseClient,
  getVolunteers,
  saveVolunteer,
  deleteVolunteer,
} from '../../_lib/supabase.js';

/**
 * Vercel Serverless Function: /api/admin/volunteers
 * Admin-only CRUD operations for tournament volunteers using Supabase:
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

  if (authCheck.role === 'viewer' && req.method !== 'GET') {
    return res.status(403).json({ error: 'Forbidden: Read-only access cannot modify volunteers.' });
  }

  const supabase = getSupabaseClient();

  try {
    // ==========================================
    // GET: List all volunteers
    // ==========================================
    if (req.method === 'GET') {
      if (supabase) {
        const volunteers = await getVolunteers(supabase);
        const sanitized = (volunteers || []).map((v) => ({
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

      return res.status(200).json({
        success: true,
        count: 0,
        volunteers: [],
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

      if (supabase) {
        const existing = await getVolunteers(supabase);
        const duplicate = existing.find((v) => v.username === cleanCampusId);
        if (duplicate) {
          return res.status(409).json({
            error: `A volunteer with Campus ID '${campusId}' already exists.`,
          });
        }

        const passwordHash = await bcrypt.hash(String(password).trim(), 10);
        const maxVolNum = existing.reduce((max, v) => Math.max(max, parseInt((v.volunteerId || '').replace(/\D+/g, ''), 10) || 0), 0);
        const volunteerId = `VOL-${String(maxVolNum + 1).padStart(3, '0')}`;

        await saveVolunteer(supabase, {
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

      return res.status(503).json({
        error: 'Supabase database connection unavailable. Volunteer cannot be created.',
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

      if (supabase) {
        const existing = await getVolunteers(supabase);
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

        await saveVolunteer(supabase, {
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

      return res.status(503).json({
        error: 'Supabase database connection unavailable. Volunteer cannot be updated.',
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

      if (supabase) {
        const result = await deleteVolunteer(supabase, volunteerId);
        if (!result.success) {
          return res.status(404).json({ error: result.error || 'Volunteer not found.' });
        }

        return res.status(200).json({
          success: true,
          message: `Volunteer '${volunteerId}' removed from tournament system.`,
        });
      }

      return res.status(503).json({
        error: 'Supabase database connection unavailable. Volunteer cannot be deleted.',
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
