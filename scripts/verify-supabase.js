import { getSupabaseClient } from '../api/_lib/supabase.js';

// Auto-load .env
if (typeof process !== 'undefined' && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
    console.log('📄 Found and loaded .env file.\n');
  } catch {
    console.log('⚠️  No .env file found in project root. Checking process environment variables...\n');
  }
}

async function verifySupabaseConnection() {
  console.log('====================================================');
  console.log('⚡ PROXIMA E-CLASH 2026 — Supabase Connection Verifier');
  console.log('====================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  console.log('1. Configuration Check:');
  console.log(`   - SUPABASE_URL:              ${supabaseUrl ? `✅ Configured (${supabaseUrl})` : '❌ Missing'}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? '✅ Configured (Backend Access)' : '⚠️ Missing (Required for Admin & Backend functions)'}`);
  console.log(`   - SUPABASE_ANON_KEY:         ${anonKey ? '✅ Configured' : '⚠️ Missing'}`);

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    console.error('\n❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in your .env file.');
    console.log('👉 Create a free Supabase project at https://supabase.com/dashboard and copy Project Settings -> API keys.');
    process.exit(1);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('\n❌ Error: Failed to initialize Supabase client.');
    process.exit(1);
  }

  console.log('\n2. Testing Database Tables Connection...');

  const tables = ['registrations', 'volunteers', 'checkin_logs', 'payment_audit_logs'];
  let allOk = true;

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.error(`   - Table "${table}": ❌ Error: ${error.message}`);
        allOk = false;
      } else {
        console.log(`   - Table "${table}": ✅ Connected (${count ?? 0} rows found)`);
      }
    } catch (err) {
      console.error(`   - Table "${table}": ❌ Exception: ${err.message}`);
      allOk = false;
    }
  }

  if (allOk) {
    console.log('\n🎉 SUCCESS! Supabase PostgreSQL connection is working flawlessly!');
    console.log('Your PROXIMA E-CLASH 2026 tournament registration portal is ready for live entries.\n');
  } else {
    console.log('\n⚠️ Some tables could not be queried.');
    console.log('👉 Make sure you ran the SQL schema in your Supabase SQL Editor:');
    console.log('   File location: supabase/schema.sql\n');
  }
}

verifySupabaseConnection();
