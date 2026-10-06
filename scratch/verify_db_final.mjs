import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aepceztinwxcxaewtfld.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_csyySkatWaZG0EEnIedP0g_Ivc8lNQS';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const legacyTables = [
  'staff', 'customers', 'devices', 'repairs', 'repair_history', 'repair_photos',
  'service_categories', 'services', 'product_categories', 'products',
  'inventory_movements', 'announcements', 'business_settings', 'enquiries',
  'gov_services', 'audit_logs', 'inventory_stock'
];

async function verify() {
  console.log('--- VERIFICATION ---');
  
  // Try to access profiles
  const profilesRes = await supabase.from('profiles').select('id').limit(1);
  console.log('profiles table response:', profilesRes.error ? profilesRes.error : 'Accessible (RLS applied or rows returned)');
  
  let allGone = true;
  for(let table of legacyTables) {
      const res = await supabase.from(table).select('id').limit(1);
      if (!res.error || (res.error.code !== 'PGRST106' && res.error.code !== '42P01')) {
          console.log(`${table} might still exist. Error:`, res.error);
          allGone = false;
      }
  }
  
  if (allGone) {
      console.log('All legacy tables are confirmed GONE via API.');
  }
}

verify();
