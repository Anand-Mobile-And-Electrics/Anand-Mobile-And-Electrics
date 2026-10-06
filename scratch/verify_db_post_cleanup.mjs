import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aepceztinwxcxaewtfld.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_csyySkatWaZG0EEnIedP0g_Ivc8lNQS';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verify() {
  console.log('--- VERIFICATION ---');
  
  // Try to access profiles
  const profilesRes = await supabase.from('profiles').select('id').limit(1);
  console.log('profiles table response:', profilesRes.error ? profilesRes.error.message : 'Accessible (RLS applied)');
  
  // Try to access legacy table
  const staffRes = await supabase.from('staff').select('id').limit(1);
  console.log('staff table response (expected missing):', staffRes.error ? staffRes.error.message : 'Exists');
}

verify();
