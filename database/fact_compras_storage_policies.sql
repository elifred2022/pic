-- Políticas RLS para bucket fact_compras (error 403: new row violates row-level security policy)
-- Ejecutar completo en Supabase → SQL Editor

-- Bucket público (lectura por URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fact_compras', 'fact_compras', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Quitar políticas anteriores si existen
DROP POLICY IF EXISTS "fact_compras_authenticated_all" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras_public_read" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras insert authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras update authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras select authenticated" ON storage.objects;
DROP POLICY IF EXISTS "fact_compras public read" ON storage.objects;

-- Subir, actualizar (upsert) y borrar: usuarios logueados
CREATE POLICY "fact_compras_authenticated_all"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (bucket_id = 'fact_compras')
WITH CHECK (bucket_id = 'fact_compras');

-- Ver imágenes sin login (bucket público + getPublicUrl)
CREATE POLICY "fact_compras_public_read"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'fact_compras');
