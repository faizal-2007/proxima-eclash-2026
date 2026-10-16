/**
 * Vercel Serverless Function: /api/admin/fixtures
 * GET  — list all fixtures for a game (optionally include archived)
 * POST — upsert (insert or replace) an array of fixture rows
 *        (archives old rows before deleting via RPC)
 * PATCH — update a single fixture row (winner, venue, scheduled_at, locked, players, player_names, winner_name, status, completed_at)
 * DELETE — delete all fixtures for a game (archives first)
 *
 * Auth: every mutating method requires the admin Bearer token
 * (same verifyAdminAuth used by all other admin handlers).
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
    return res.status(503).json({ error: 'Database unavailable. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const { game, include_archive } = req.query;

  // ── GET ─────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    if (!game) {
      return res.status(400).json({ error: 'Query param ?game= is required.' });
    }
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('game', game)
      .order('round', { ascending: true })
      .order('match_no', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const result = { success: true, fixtures: data || [] };

    // Optionally include archived fixtures (for export with "Include previous draws")
    if (include_archive === 'true') {
      // Require admin auth for archive access
      const auth = verifyAdminAuth(req);
      if (!auth.valid) return res.status(401).json({ error: auth.error || 'Unauthorized.' });

      const { data: archiveData, error: archiveErr } = await supabase
        .from('fixtures_archive')
        .select('*')
        .eq('game', game)
        .order('archived_at', { ascending: true })
        .order('round', { ascending: true })
        .order('match_no', { ascending: true });

      if (archiveErr) return res.status(500).json({ error: archiveErr.message });
      result.archived = archiveData || [];
    }

    return res.status(200).json(result);
  }

  // All mutating methods require admin auth
  const auth = verifyAdminAuth(req);
  if (!auth.valid) return res.status(401).json({ error: auth.error || 'Unauthorized.' });

  // ── POST — upsert full draw ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { fixtures } = req.body || {};
    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      return res.status(400).json({ error: '`fixtures` array is required.' });
    }

    const targetGame = fixtures[0].game;

    // Archive existing non-locked rows before deleting (via RPC, single transaction)
    try {
      // Check if there are any existing rows to archive
      const { data: existingRows } = await supabase
        .from('fixtures')
        .select('id')
        .eq('game', targetGame)
        .eq('locked', false)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const { error: rpcErr } = await supabase
          .rpc('archive_and_delete_fixtures', {
            p_game: targetGame,
            p_delete_locked: false,
          });

        if (rpcErr) {
          console.error('Archive RPC error:', rpcErr);
          // Fallback: direct delete if RPC fails (table may not exist yet)
          const { error: delErr } = await supabase
            .from('fixtures')
            .delete()
            .eq('game', targetGame)
            .eq('locked', false);
          if (delErr) return res.status(500).json({ error: delErr.message });
        }
      }
    } catch (rpcCatchErr) {
      console.error('Archive RPC catch:', rpcCatchErr);
      // Fallback: direct delete
      const { error: delErr } = await supabase
        .from('fixtures')
        .delete()
        .eq('game', targetGame)
        .eq('locked', false);
      if (delErr) return res.status(500).json({ error: delErr.message });
    }

    const rows = fixtures.map((f) => ({
      game: f.game,
      format: f.format,
      round: f.round,
      match_no: f.match_no,
      players: f.players ?? [],
      player_names: f.player_names ?? [],
      winner: f.winner || null,
      winner_name: f.winner_name || null,
      status: f.status || 'scheduled',
      completed_at: f.completed_at || null,
      locked: Boolean(f.locked),
    }));

    const { data, error } = await supabase
      .from('fixtures')
      .upsert(rows, { onConflict: 'game,round,match_no' })
      .select();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, fixtures: data });
  }

  // ── PATCH — update one row ──────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: '`id` (uuid) is required.' });

    const allowed = [
      'winner', 'players', 'player_names', 'winner_name',
      'status', 'completed_at', 'locked',
    ];
    const patch = {};
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key] ?? null;
    }

    const { data, error } = await supabase
      .from('fixtures')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, fixture: data });
  }

  // ── DELETE — wipe all fixtures for a game ───────────────────────────────────
  if (req.method === 'DELETE') {
    if (!game) return res.status(400).json({ error: 'Query param ?game= is required.' });

    // Archive all rows before deleting
    try {
      const { data: existingRows } = await supabase
        .from('fixtures')
        .select('id')
        .eq('game', game)
        .limit(1);

      if (existingRows && existingRows.length > 0) {
        const { error: rpcErr } = await supabase
          .rpc('archive_and_delete_fixtures', {
            p_game: game,
            p_delete_locked: true, // DELETE removes everything including locked
          });

        if (rpcErr) {
          console.error('Archive RPC error on delete:', rpcErr);
          const { error: delErr } = await supabase.from('fixtures').delete().eq('game', game);
          if (delErr) return res.status(500).json({ error: delErr.message });
        }
      }
    } catch (rpcCatchErr) {
      console.error('Archive RPC catch on delete:', rpcCatchErr);
      const { error: delErr } = await supabase.from('fixtures').delete().eq('game', game);
      if (delErr) return res.status(500).json({ error: delErr.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
