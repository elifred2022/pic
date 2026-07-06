-- fc y fact_path como JSON (arrays paralelos alineados por índice)
-- Formato que usa la app:
--   fc:        [12345, 67890]
--   fact_path: ["42/factura-1.pdf", "42/factura-2.pdf"]

ALTER TABLE ordenes_compra
  ALTER COLUMN fc TYPE JSONB
  USING CASE
    WHEN fc IS NULL THEN '[]'::jsonb
    WHEN jsonb_typeof(to_jsonb(fc)) = 'array' THEN to_jsonb(fc)
    ELSE jsonb_build_array(fc)
  END;

ALTER TABLE ordenes_compra
  ALTER COLUMN fact_path TYPE JSONB
  USING CASE
    WHEN fact_path IS NULL OR TRIM(fact_path::text) IN ('', '[]', '{}') THEN '[]'::jsonb
    WHEN jsonb_typeof(to_jsonb(fact_path)) = 'array' THEN to_jsonb(fact_path)
    WHEN jsonb_typeof(to_jsonb(fact_path)) = 'object' THEN to_jsonb(fact_path)
    ELSE jsonb_build_array(TRIM(fact_path::text))
  END;

ALTER TABLE ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_fact_path_by_fc_chk;

ALTER TABLE ordenes_compra ADD CONSTRAINT ordenes_compra_fact_path_by_fc_chk CHECK (
  jsonb_typeof(fc) = 'array'
  AND jsonb_typeof(fact_path) = 'array'
  AND jsonb_array_length(fc) = jsonb_array_length(fact_path)
  AND (
    jsonb_array_length(fc) = 0
    OR NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(fc) WITH ORDINALITY AS f(val, i)
      JOIN jsonb_array_elements(fact_path) WITH ORDINALITY AS p(val, j) ON f.i = p.j
      WHERE f.val IS NULL
         OR f.val = 'null'::jsonb
         OR p.val IS NULL
         OR p.val = 'null'::jsonb
         OR NULLIF(TRIM(p.val::text), '') IS NULL
    )
  )
);
