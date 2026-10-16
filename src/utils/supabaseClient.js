/**
 * supabaseClient.js
 * Lightweight Supabase client for the public-facing frontend.
 * Uses only the ANON key — safe to ship to browsers.
 * The Realtime subscription and public_players view use RLS
 * to expose only names, never private registration fields.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client = null;

export function getPublicSupabase() {
  if (!url || !anonKey) return null;
  if (!_client) {
    _client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return _client;
}
