-- Columna JSON de devoluciones al proveedor en órdenes de compra.
-- Formato esperado (array de eventos):
-- [{
--   "fc": 123 | null,
--   "rt": 456 | null,
--   "fecha_devolucion": "2026-07-20",
--   "fact_path": "42/devolucion-1.pdf",
--   "items": [{ "articulo_id": "...", "cantidad_devuelta": 2 }]
-- }]
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS devoluciones JSONB DEFAULT '[]'::jsonb;

UPDATE ordenes_compra
SET devoluciones = '[]'::jsonb
WHERE devoluciones IS NULL;
