-- Agregar columna clasificacion_compra a ordenes_compra
-- Ejecutar en Supabase SQL Editor: Database → SQL Editor → New query
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS clasificacion_compra VARCHAR;

-- Refrescar caché de PostgREST para que reconozca la columna
NOTIFY pgrst, 'reload schema';
