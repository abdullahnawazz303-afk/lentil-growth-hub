-- Run this script in the Supabase Dashboard -> SQL Editor
-- This will automatically create the 'product-images' bucket and give it the correct permissions so your Admin portal can upload images successfully.

-- 1. Create the bucket and make it public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop any potentially conflicting policies (to ensure a clean slate)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Manage" ON storage.objects;
DROP POLICY IF EXISTS "Public read product_images" ON storage.objects;
DROP POLICY IF EXISTS "Auth manage product_images" ON storage.objects;

-- 3. Allow anybody on the internet to view the images on the Shop page
CREATE POLICY "Public read product_images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

-- 4. Allow only logged-in Admin to upload, update, and delete the images
CREATE POLICY "Auth manage product_images" 
ON storage.objects FOR ALL 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
