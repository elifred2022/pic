-- Migración: Agregar columna excel_path a ordenes_produccion
-- Almacena adjuntos Excel importados (JSON array con url, name y path)

ALTER TABLE ordenes_produccion
ADD COLUMN IF NOT EXISTS excel_path jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ordenes_produccion.excel_path IS 'Adjuntos Excel importados (JSON array con url, name y path en bucket ordenes)';
