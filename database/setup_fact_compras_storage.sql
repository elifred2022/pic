-- Bucket, columna fact_path y políticas de storage
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS fact_path TEXT;

-- Ver fact_compras_storage_policies.sql si solo necesitás corregir el error 403

INSERT INTO storage.buckets (id, name, public)
VALUES ('fact_compras', 'fact_compras', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "fact_compras_authenticated_all" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras_public_read" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras insert authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras select authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras public read" ON storage.objects;

CREATE POLICY "fact_compras_authenticated_all"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (bucket_id = 'fact_compras')
WITH CHECK (bucket_id = 'fact_compras');

CREATE POLICY "fact_compras_public_read"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'fact_compras');
