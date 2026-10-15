import { getSupabaseClient } from '../api/_lib/supabase.js';

// Auto-load .env
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Ignore
  }
}

async function clearCheckInLogs() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error('No Supabase credentials configured in .env.');
    return;
  }

  console.log(`🧹 Clearing all check-in logs from Supabase "checkin_logs" table...`);

  try {
    const { error } = await supabase.from('checkin_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error('Error clearing checkin_logs:', error.message);
    } else {
      console.log('✅ Cleared all log rows from "checkin_logs" table!');
    }
  } catch (error) {
    console.error('Error clearing checkin_logs:', error.message);
  }
}

clearCheckInLogs();
