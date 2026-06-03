-- Políticas RLS para bucket presupuestos (comparativa de proveedores)
-- Lectura: cualquier usuario autenticado (compras/admin y aprobEmails vía sesión Supabase)
-- Ejecutar completo en Supabase → SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('presupuestos', 'presupuestos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "presupuestos_authenticated_all" ON storage.objects;
DROP POLICY IF EXISTS "presupuestos_public_read" ON storage.objects;

CREATE POLICY "presupuestos_authenticated_all"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (bucket_id = 'presupuestos')
WITH CHECK (bucket_id = 'presupuestos');

CREATE POLICY "presupuestos_public_read"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'presupuestos');
