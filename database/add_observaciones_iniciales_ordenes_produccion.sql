-- Migración opcional: iniciales en columna dedicada.
-- La app guarda las iniciales en estado_obra.observacionesIniciales (jsonb),
-- que no requiere recargar el schema cache de PostgREST.
--
-- Si igual querés la columna separada, ejecutá esto y luego:
-- NOTIFY pgrst, 'reload schema';

ALTER TABLE ordenes_produccion
ADD COLUMN IF NOT EXISTS observaciones_iniciales TEXT;

COMMENT ON COLUMN ordenes_produccion.observaciones_iniciales IS 'Primeras 4 letras del nombre de quien guardó la observación';

NOTIFY pgrst, 'reload schema';
