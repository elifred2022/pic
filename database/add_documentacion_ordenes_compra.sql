-- Referencias de la documentación cargada en cada orden de compra.
-- El archivo vive en el bucket presupuestos. Este JSON guarda fecha, tipo,
-- número y la ruta del archivo.
--
-- Ejecutar una vez en el SQL Editor de Supabase.

ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS documentacion JSONB DEFAULT '[]'::jsonb;
