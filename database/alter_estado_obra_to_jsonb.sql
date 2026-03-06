-- Migración: Cambiar estado_obra de text[] a JSONB para estructura jerárquica
-- Ejecutar en Supabase SQL Editor

-- Eliminar columna anterior y agregar como JSONB
ALTER TABLE ordenes_produccion DROP COLUMN IF EXISTS estado_obra;
ALTER TABLE ordenes_produccion ADD COLUMN estado_obra jsonb DEFAULT '{}';

COMMENT ON COLUMN ordenes_produccion.estado_obra IS 'Estado por proceso: CORTE, MECANIZADO, SOLDADURA, ARMADO, JUNQUILLOS con sus ítems';
