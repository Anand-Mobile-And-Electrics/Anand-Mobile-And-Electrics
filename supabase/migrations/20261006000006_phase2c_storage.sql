-- Phase 2C: Product Image Storage

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  2097152, -- 2MB max size
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Enable RLS (Should already be enabled by default in Supabase, but good practice)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow re-runs
DROP POLICY IF EXISTS "Public Read Access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Owner/Manager Insert Access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Owner/Manager Update Access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Owner/Manager Delete Access for product images" ON storage.objects;

-- 1. Public Read Access
CREATE POLICY "Public Read Access for product images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 2. Owner/Manager Write Access
CREATE POLICY "Owner/Manager Insert Access for product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  public.get_auth_role() IN ('owner', 'manager')
);

CREATE POLICY "Owner/Manager Update Access for product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  public.get_auth_role() IN ('owner', 'manager')
);

CREATE POLICY "Owner/Manager Delete Access for product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  public.get_auth_role() IN ('owner', 'manager')
);
