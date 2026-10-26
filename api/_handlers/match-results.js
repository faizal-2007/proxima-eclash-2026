/**
 * Public Vercel Serverless Function: /api/match-results
 * Returns Free Fire BR match results & status for public view.
 */
import { getSupabaseClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(503).json({ error: 'Database unavailable.' });
  }

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
      match_no: row.match_no,
      placements: rawData.placements || row.players || [],
      kills: rawData.kills || {},
      status: rawData.status || row.status || 'not_started',
      settings: rawData.settings || null,
      manual_overrides: rawData.manual_overrides || {},
      completed_at: row.completed_at || rawData.completed_at || null,
    };
  });

  return res.status(200).json({ success: true, matches });
}
