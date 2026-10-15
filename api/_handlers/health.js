import { getSupabaseClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

  let supabaseStatus = 'unconfigured';

  if (hasUrl && hasKey) {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('registrations').select('registration_id', { count: 'exact', head: true });
      supabaseStatus = error ? `error: ${error.message}` : 'connected';
    } catch (err) {
      supabaseStatus = `error: ${err.message}`;
    }
  }

  return res.status(200).json({
    status: 'healthy',
    event: 'PROXIMA E-CLASH 2026',
    institution: 'Yenepoya School of Engineering and Technology',
    database: {
      provider: 'Supabase (PostgreSQL)',
      hasUrl,
      hasKey,
      connectionStatus: supabaseStatus,
    },
    timestamp: new Date().toISOString(),
  });
}
