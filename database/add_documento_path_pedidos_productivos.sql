-- Ruta del PDF o JPG adjunto al crear un pedido productivo.
-- El archivo vive en el bucket presupuestos.
--
-- Ejecutar una vez en el SQL Editor de Supabase.

ALTER TABLE pedidos_productivos
  ADD COLUMN IF NOT EXISTS documento_path TEXT;

COMMENT ON COLUMN pedidos_productivos.documento_path IS
  'Ruta en el bucket presupuestos del documento PDF o JPG cargado con el pedido';
