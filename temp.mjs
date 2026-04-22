import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://elfnxgojpdtoqhzreupk.supabase.co', 'sb_publishable_gFYLI1a1EMw1FDReobAXLw_tn80NlKd')

async function run() {
  const { data: batches } = await supabase.from('inventory_batches').select('id, batch_ref, item_name, grade, remaining_qty_kg');
  console.log('--- Batches with باجرہ ---');
  console.log(batches.filter(b => b.item_name.includes('باجرہ')));

  const { data: guestOrders } = await supabase.from('guest_orders').select('id, status').eq('status', 'Approved');
  for (const go of guestOrders || []) {
     const { data: items } = await supabase.from('guest_order_items').select('*').eq('guest_order_id', go.id);
     console.log('Guest Order Approved ID:', go.id);
     console.dir(items, {depth: null});
  }
}
run();
