-- Migración: Agregar columna url_medicion a ordenes_produccion
-- Almacena las URLs de archivos de medición (PDF/JPG, JSON array con url y name)

ALTER TABLE ordenes_produccion
ADD COLUMN IF NOT EXISTS url_medicion text;

COMMENT ON COLUMN ordenes_produccion.url_medicion IS 'URLs de archivos de medición en bucket mediciones (JSON array con url y name)';