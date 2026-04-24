import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://elfnxgojpdtoqhzreupk.supabase.co';
const supabaseKey = 'sb_publishable_gFYLI1a1EMw1FDReobAXLw_tn80NlKd';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // We can only query public.users if RLS allows it, but let's try
  const { data, error } = await supabase.from('users').select('*').limit(50);
  console.log("Users:", data);
  console.error("Error:", error);
}

check();
