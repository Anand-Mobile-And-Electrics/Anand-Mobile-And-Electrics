import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aepceztinwxcxaewtfld.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_csyySkatWaZG0EEnIedP0g_Ivc8lNQS';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
  const res = await supabase.from('staff').select('*').limit(1);
  console.log('staff response:', res);
}

check();
