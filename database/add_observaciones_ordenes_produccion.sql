-- Migración: Agregar columna observaciones a ordenes_produccion
-- Texto libre de observaciones por obra

ALTER TABLE ordenes_produccion
ADD COLUMN IF NOT EXISTS observaciones TEXT;

COMMENT ON COLUMN ordenes_produccion.observaciones IS 'Observaciones generales de la obra';
