-- ============================================================
-- QAIS Foods Shop Overhaul Migration
-- Run this entire script in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add new columns to item_names (existing table)
ALTER TABLE item_names 
  ADD COLUMN IF NOT EXISTS english_name TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'others',
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Update English names and categories for the 24 products
UPDATE item_names SET english_name = 'Dal Chana Barik',       category = 'dal'     WHERE name = 'دال چنا باریک';
UPDATE item_names SET english_name = 'Dal Chana Moti',        category = 'dal'     WHERE name = 'دال چنا موٹی';
UPDATE item_names SET english_name = 'Surkh Lobiya',          category = 'lobiya'  WHERE name = 'سرخ لوبیا';
UPDATE item_names SET english_name = 'Dal Masoor',            category = 'dal'     WHERE name = 'دال مسور';
UPDATE item_names SET english_name = 'Dal Masoor B',          category = 'dal'     WHERE name = 'دال مسور (B)';
UPDATE item_names SET english_name = 'Chawal 386',            category = 'chawal'  WHERE name = 'چاول 386';
UPDATE item_names SET english_name = 'Baash Chawal Chin',     category = 'chawal'  WHERE name = 'باش چاول چین';
UPDATE item_names SET english_name = 'Baash Salachi',         category = 'chawal'  WHERE name = 'باش سلاچی';
UPDATE item_names SET english_name = 'Sui Chana',             category = 'channe'  WHERE name = 'سوی چنا';
UPDATE item_names SET english_name = 'Sui Maas',              category = 'dal'     WHERE name = 'سوی ماس';
UPDATE item_names SET english_name = 'Surajmukhi Dal M',      category = 'others'  WHERE name = 'سورج مکھی دال (M)';
UPDATE item_names SET english_name = 'Surajmukhi B',          category = 'others'  WHERE name = 'سورج مکھی (B)';
UPDATE item_names SET english_name = 'Kala Chana Mota',       category = 'channe'  WHERE name = 'کالا چنا موٹا';
UPDATE item_names SET english_name = 'Kala Chana Barik',      category = 'channe'  WHERE name = 'کالا چنا باریک';
UPDATE item_names SET english_name = 'Safaid Chana Chakna B90', category = 'channe' WHERE name = 'سفید چنا چکنا (B90)';
UPDATE item_names SET english_name = 'Safaid Chana Mota 10mm', category = 'channe' WHERE name = 'سفید چنا موٹا (10mm)';
UPDATE item_names SET english_name = 'Safaid Lobiya',         category = 'lobiya'  WHERE name = 'سفید لوبیا';
UPDATE item_names SET english_name = 'Surkh Lobiya Chakol',   category = 'lobiya'  WHERE name = 'سرخ لوبیا چکول';
UPDATE item_names SET english_name = 'Bajra Kala',            category = 'bajra'   WHERE name = 'باجرہ کالا';
UPDATE item_names SET english_name = 'Tees Khaas',            category = 'others'  WHERE name = 'تیس خاص';
UPDATE item_names SET english_name = 'Radi Kam',              category = 'others'  WHERE name = 'ردی کم';
UPDATE item_names SET english_name = 'Radi Mota',             category = 'others'  WHERE name = 'ردی موٹا';
UPDATE item_names SET english_name = 'Khoki',                 category = 'others'  WHERE name = 'کھوکی';
UPDATE item_names SET english_name = 'Chhatki',               category = 'others'  WHERE name = 'چھٹکی';

-- 3. Hero Slides table
CREATE TABLE IF NOT EXISTS hero_slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT DEFAULT '/shop',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for hero_slides (public read, admin write)
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read active slides" ON hero_slides
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Authenticated can manage slides" ON hero_slides
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Guest Orders tables
CREATE TABLE IF NOT EXISTS guest_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_ref TEXT NOT NULL UNIQUE DEFAULT (
    'GO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM()*9999)::TEXT, 4, '0')
  ),
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  guest_address TEXT,
  guest_location_url TEXT,
  guest_lat NUMERIC(10,7),
  guest_lng NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Converted')),
  notes TEXT,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guest_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES guest_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  urdu_name TEXT,
  grade TEXT CHECK (grade IN ('A+', 'A', 'B', 'C')),
  packing TEXT,
  quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0)
);

-- Allow public inserts for guest orders (no auth required)
ALTER TABLE guest_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place guest orders" ON guest_orders
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Authenticated can read guest orders" ON guest_orders
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can update guest orders" ON guest_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can insert guest order items" ON guest_order_items
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Authenticated can read guest order items" ON guest_order_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. Allow public read on item_names (for the shop page)
-- (Add this only if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'item_names' AND policyname = 'Public read item_names'
  ) THEN
    ALTER TABLE item_names ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public read item_names" ON item_names
      FOR SELECT USING (is_active = TRUE);
    CREATE POLICY "Authenticated manage item_names" ON item_names
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END
$$;

-- ============================================================
-- STORAGE BUCKET SETUP (Manual step in Supabase Dashboard)
-- Go to Storage → New bucket → Name: product-images → Public: ON
-- This cannot be done via SQL.
-- ============================================================
