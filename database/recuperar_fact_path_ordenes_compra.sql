-- Recuperar facturas cuyo fact_path quedó vacío tras la migración a JSONB
-- Ejecutar en Supabase → SQL Editor
--
-- 1) Identificar órdenes afectadas (tienen FC pero fact_path vacío)
SELECT
  id,
  noc,
  fc,
  fact_path,
  rt,
  fecha_entrega
FROM ordenes_compra
WHERE (
    fact_path IS NULL
    OR fact_path = '[]'::jsonb
    OR (jsonb_typeof(fact_path) = 'array' AND jsonb_array_length(fact_path) = 0)
  )
  AND fc IS NOT NULL
  AND fc <> '[]'::jsonb
ORDER BY id DESC;

-- 2) En Storage → bucket fact_compras, buscá la carpeta {id} de cada orden
--    (ej. 42/factura.jpg o 42/factura.pdf)
--
-- 3) Restaurar manualmente cada orden (reemplazá ID, FC y ruta real):
--
-- UPDATE ordenes_compra
-- SET
--   fc = '[12345]'::jsonb,
--   fact_path = '["42/factura.jpg"]'::jsonb
-- WHERE id = 42;
--
-- Para varias facturas en la misma orden:
--   fc        = '[111, 222]'::jsonb
--   fact_path = '["42/factura-1.pdf", "42/factura-2.pdf"]'::jsonb
--
-- 4) Aplanar arrays anidados (ej. [["600/factura.pdf"]] → ["600/factura.pdf"])
-- Ejecutá 2 veces si hubiera triple anidación.
UPDATE ordenes_compra
SET fact_path = fact_path -> 0
WHERE jsonb_typeof(fact_path) = 'array'
  AND jsonb_array_length(fact_path) > 0
  AND jsonb_typeof(fact_path -> 0) = 'array';

UPDATE ordenes_compra
SET fc = fc -> 0
WHERE jsonb_typeof(fc) = 'array'
  AND jsonb_array_length(fc) > 0
  AND jsonb_typeof(fc -> 0) = 'array';

-- 5) Si la migración a JSONB NO se ejecutó todavía, NO corras migrate_fc_fact_path_jsonb
--    hasta recuperar datos. El formato anterior (fc INTEGER + fact_path TEXT) sigue
--    funcionando con la app actual.