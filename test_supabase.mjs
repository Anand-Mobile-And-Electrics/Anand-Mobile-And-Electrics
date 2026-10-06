import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://aepceztinwxcxaewtfld.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_csyySkatWaZG0EEnIedP0g_Ivc8lNQS';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase Connection...');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching profiles:', error.message);
  } else {
    console.log('Successfully connected and queried profiles table.');
    console.log('Data:', data);
  }
}

testConnection();
