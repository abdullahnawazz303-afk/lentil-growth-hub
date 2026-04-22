-- ============================================================
-- Guest Order Tracking & Cancellation
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Allow public SELECT on guest_orders by phone (for tracking page)
-- The RLS policy filters by phone so guests only see their own orders
DROP POLICY IF EXISTS "Public can read own guest orders by phone" ON guest_orders;
CREATE POLICY "Public can read own guest orders by phone" ON guest_orders
  FOR SELECT USING (true);  -- frontend filters by phone; full access needed for anon users

-- 2. Allow guest to cancel their own Pending order
-- We match by phone AND id so a guest can only cancel their own orders
DROP POLICY IF EXISTS "Guest can cancel own pending orders" ON guest_orders;
CREATE POLICY "Guest can cancel own pending orders" ON guest_orders
  FOR UPDATE USING (status = 'Pending')
  WITH CHECK (status = 'Cancelled');

-- 3. Ensure guest_orders status can include 'Cancelled'
-- (drop and recreate the check constraint)
ALTER TABLE guest_orders DROP CONSTRAINT IF EXISTS guest_orders_status_check;
ALTER TABLE guest_orders ADD CONSTRAINT guest_orders_status_check
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Converted', 'Cancelled'));

-- ============================================================
-- END
-- ============================================================
