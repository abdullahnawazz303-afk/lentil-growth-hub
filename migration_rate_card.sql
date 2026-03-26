-- Run this in your Supabase SQL Editor to create the Rate Card table

CREATE TABLE IF NOT EXISTS rate_card (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name text NOT NULL,
  grade text NOT NULL,
  price_per_kg numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(item_name, grade)
);

-- Turn on Row Level Security (RLS)
ALTER TABLE rate_card ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the rates (customers need to see them)
CREATE POLICY "Public read access to rate_card"
  ON rate_card FOR SELECT
  USING (true);

-- Allow authenticated users (Admins) to modify the rates
CREATE POLICY "Authenticated users can modify rate_card"
  ON rate_card FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
