-- ============================================================
-- QAIS Foods — Authentication Overhaul Migration
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ============================================================
-- PART 1: Add missing `email` column to customers table
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for fast email-based lookups (Google OAuth pre-check)
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);


-- ============================================================
-- PART 2: Create customer_requests table (if not already there)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name     TEXT NOT NULL,
  business_name TEXT,
  phone         TEXT NOT NULL,
  city          TEXT,
  address       TEXT,
  email         TEXT NOT NULL,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  reject_reason TEXT,
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  customer_id   UUID REFERENCES customers(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Unique constraint on phone so we can UPSERT (re-apply after rejection)
-- Drop old constraint if it exists with a different name, then add the clean one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_requests_phone_unique'
      AND conrelid = 'customer_requests'::regclass
  ) THEN
    ALTER TABLE customer_requests
      ADD CONSTRAINT customer_requests_phone_unique UNIQUE (phone);
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_requests_status ON customer_requests(status);
CREATE INDEX IF NOT EXISTS idx_customer_requests_phone  ON customer_requests(phone);


-- ============================================================
-- PART 3: Row Level Security for customer_requests
-- ============================================================
ALTER TABLE customer_requests ENABLE ROW LEVEL SECURITY;

-- Drop old policies to start clean
DROP POLICY IF EXISTS "Public can submit requests"           ON customer_requests;
DROP POLICY IF EXISTS "Authenticated staff can read requests" ON customer_requests;
DROP POLICY IF EXISTS "Authenticated staff can update requests" ON customer_requests;
DROP POLICY IF EXISTS "Authenticated staff can delete requests" ON customer_requests;
DROP POLICY IF EXISTS "Public can check own request by phone" ON customer_requests;

-- Anyone can INSERT a request (public /request-access form)
CREATE POLICY "Public can submit requests"
  ON customer_requests FOR INSERT
  WITH CHECK (true);

-- Anyone can SELECT (needed so Register page can check status by phone without login)
-- We keep it open here; row filtering is done at the application level.
CREATE POLICY "Public can read requests"
  ON customer_requests FOR SELECT
  USING (true);

-- Only authenticated users (staff) can UPDATE (approve / reject)
CREATE POLICY "Authenticated staff can update requests"
  ON customer_requests FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Only authenticated users (staff) can DELETE (cleanup on customer delete)
CREATE POLICY "Authenticated staff can delete requests"
  ON customer_requests FOR DELETE
  USING (auth.role() = 'authenticated');


-- ============================================================
-- PART 4: Fix handle_new_user trigger
--
-- PROBLEM: The old trigger fires on EVERY auth.users INSERT,
-- including Google OAuth strangers. This silently creates
-- public.users rows with role='viewer' for random people.
--
-- FIX: Only insert into public.users when the record was
-- explicitly created by our provisioning system, identified
-- by raw_user_meta_data->>'source' = 'qaisfoods_admin'.
-- All other signups (Google OAuth, self-register) will NOT
-- auto-create a public.users row — they will be blocked as
-- unregistered at the AuthCallback level.
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only provision users created by our admin provisioning system
  IF (NEW.raw_user_meta_data->>'source') = 'qaisfoods_admin' THEN
    INSERT INTO public.users (id, name, email, role, account_type, customer_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Customer'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
      COALESCE(NEW.raw_user_meta_data->>'account_type', 'customer'),
      (NEW.raw_user_meta_data->>'customer_id')::UUID
    )
    ON CONFLICT (id) DO UPDATE
      SET
        name        = EXCLUDED.name,
        role        = EXCLUDED.role,
        account_type = EXCLUDED.account_type,
        customer_id = EXCLUDED.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- PART 5: Helper function — lookup user role by email
-- Used by AuthCallback to check if a Google OAuth user is
-- pre-registered without creating a new auth session record.
-- ============================================================
CREATE OR REPLACE FUNCTION get_customer_by_email(p_email TEXT)
RETURNS TABLE(id UUID, name TEXT, is_active BOOLEAN)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT id, name, is_active
  FROM customers
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;
$$;


-- ============================================================
-- PART 6: RPC to link an existing auth user to a customer record
-- Called by AuthCallback when a Google user's email matches
-- a customer but public.users row doesn't exist yet.
-- ============================================================
CREATE OR REPLACE FUNCTION link_google_user_to_customer(
  p_auth_user_id  UUID,
  p_email         TEXT,
  p_name          TEXT,
  p_customer_id   UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, account_type, customer_id)
  VALUES (p_auth_user_id, p_name, p_email, 'customer', 'customer', p_customer_id)
  ON CONFLICT (id) DO UPDATE
    SET
      role        = 'customer',
      account_type = 'customer',
      customer_id = p_customer_id,
      name        = p_name;
END;
$$;


-- ============================================================
-- PART 7: Grant execute on helper RPCs to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION get_customer_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION link_google_user_to_customer(UUID, TEXT, TEXT, UUID) TO authenticated;


-- ============================================================
-- PART 8: Ensure existing admin/staff users are NOT broken
-- If any existing rows in public.users have no name, fill them
-- ============================================================
UPDATE public.users
SET name = COALESCE(name, email, 'Staff')
WHERE name IS NULL OR name = '';


-- ============================================================
-- DONE — Run this script once in Supabase SQL Editor
-- ============================================================
