/**
 * Vercel Serverless Function: /api/admin/match-results
 * Handles post-match result entry for Free Fire BR (31 players, 3 matches).
 *
 * GET  — list all 3 matches' raw data (placements, kills, status)
 * POST — upsert match result (placements array, kills map, status, settings)
 * PATCH — unlock or toggle match status
 * DELETE — clear match data
 */
import { getSupabaseClient } from '../../_lib/supabase.js';
import { verifyAdminAuth } from '../../_lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Database unavailable. Check SUPABASE credentials.' });
  }

  // GET: Allowed for both admin and viewer (or read-only)
  if (req.method === 'GET') {
    const { game = 'Free Fire BR' } = req.query;

    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('game', game)
      .order('match_no', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const matches = (data || []).map((row) => {
      let rawData = {};
      try {
        if (row.venue) rawData = JSON.parse(row.venue);
      } catch (e) {
        rawData = {};
      }

      return {
        id: row.id,
        game: row.game,
        match_no: row.match_no,
        placements: rawData.placements || row.players || [],
        kills: rawData.kills || {},
        status: rawData.status || row.status || 'not_started',
        settings: rawData.settings || null,
        manual_overrides: rawData.manual_overrides || {},
        completed_at: row.completed_at || rawData.completed_at || null,
        updated_at: row.updated_at || null,
        winner: row.winner,
      };
    });

    return res.status(200).json({ success: true, matches });
  }

  // All mutating methods require admin auth
  const auth = verifyAdminAuth(req);
  if (!auth.valid) return res.status(401).json({ error: auth.error || 'Unauthorized.' });
  if (auth.role === 'viewer') return res.status(403).json({ error: 'Forbidden: Read-only access cannot modify results.' });

  // POST: Upsert match result
  if (req.method === 'POST') {
    const {
      match_no,
      placements = [],
      kills = {},
      status = 'in_progress',
      settings = null,
      manual_overrides = {},
      completed_at = null,
      game = 'Free Fire BR',
    } = req.body || {};

    if (!match_no || match_no < 1 || match_no > 3) {
      return res.status(400).json({ error: '`match_no` must be 1, 2, or 3.' });
    }

    const winnerId = placements[0] || null;

    const rawPayload = {
      placements,
      kills,
      status,
      settings,
      manual_overrides,
      completed_at: status === 'finalized' ? completed_at || new Date().toISOString() : null,
    };

    const row = {
      game,
      format: 'lobby',
      round: 1,
      match_no: parseInt(match_no, 10),
      players: placements,
      venue: JSON.stringify(rawPayload),
      winner: winnerId,
      status,
      locked: status === 'finalized',
      completed_at: rawPayload.completed_at,
    };

    const { data, error } = await supabase
      .from('fixtures')
      .upsert(row, { onConflict: 'game,round,match_no' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      match: {
        id: data.id,
        match_no: data.match_no,
        placements,
        kills,
        status,
        settings,
        manual_overrides,
        completed_at: rawPayload.completed_at,
      },
    });
  }

  // PATCH: Quick status change (e.g. unlock from finalized -> in_progress)
  if (req.method === 'PATCH') {
    const { match_no, status, game = 'Free Fire BR' } = req.body || {};
    if (!match_no) return res.status(400).json({ error: '`match_no` is required.' });

    // Fetch existing
    const { data: existing, error: getErr } = await supabase
      .from('fixtures')
      .select('*')
      .eq('game', game)
      .eq('match_no', match_no)
      .single();

    if (getErr || !existing) {
      return res.status(404).json({ error: 'Match record not found.' });
    }

    let rawData = {};
    try {
      if (existing.venue) rawData = JSON.parse(existing.venue);
    } catch (e) {}

    rawData.status = status;
    if (status === 'in_progress') {
      rawData.completed_at = null;
    }

    const { data, error } = await supabase
      .from('fixtures')
      .update({
        status,
        locked: status === 'finalized',
        completed_at: rawData.completed_at,
        venue: JSON.stringify(rawData),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, match: data });
  }

  // DELETE: Reset match data
  if (req.method === 'DELETE') {
    const { match_no, game = 'Free Fire BR' } = req.query;
    if (!match_no) return res.status(400).json({ error: '`match_no` query param is required.' });

    const { error } = await supabase
      .from('fixtures')
      .delete()
      .eq('game', game)
      .eq('match_no', parseInt(match_no, 10));

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, message: `Match ${match_no} reset.` });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
