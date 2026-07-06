-- Ejecutar en Supabase SQL Editor si ya corrió la migración anterior y sigue el error
-- ordenes_compra_fact_path_by_fc_chk

-- 1) Convertir fact_path objeto a arrays paralelos
UPDATE ordenes_compra o
SET
  fc = sub.fc_arr,
  fact_path = sub.path_arr
FROM (
  SELECT
    id,
    COALESCE(
      jsonb_agg((e.key)::int ORDER BY e.key::bigint),
      '[]'::jsonb
    ) AS fc_arr,
    COALESCE(
      jsonb_agg(e.value ORDER BY e.key::bigint),
      '[]'::jsonb
    ) AS path_arr
  FROM ordenes_compra
  CROSS JOIN LATERAL jsonb_each_text(fact_path) AS e(key, value)
  WHERE jsonb_typeof(fact_path) = 'object'
  GROUP BY id
) AS sub
WHERE o.id = sub.id;

-- 2) Filas con solo FC o solo imagen
UPDATE ordenes_compra
SET fc = '[]'::jsonb
WHERE jsonb_typeof(fc) = 'array'
  AND jsonb_typeof(fact_path) = 'array'
  AND jsonb_array_length(fact_path) = 0
  AND jsonb_array_length(fc) > 0;

UPDATE ordenes_compra
SET fact_path = '[]'::jsonb
WHERE jsonb_typeof(fc) = 'array'
  AND jsonb_typeof(fact_path) = 'array'
  AND jsonb_array_length(fc) = 0
  AND jsonb_array_length(fact_path) > 0;

-- 3) Longitudes distintas: quedarse solo con pares completos
UPDATE ordenes_compra o
SET
  fc = COALESCE(
    (
      SELECT jsonb_agg(f.val ORDER BY f.i)
      FROM jsonb_array_elements(o.fc) WITH ORDINALITY AS f(val, i)
      WHERE f.i <= LEAST(jsonb_array_length(o.fc), jsonb_array_length(o.fact_path))
        AND f.val IS NOT NULL
        AND f.val <> 'null'::jsonb
        AND NULLIF(TRIM((jsonb_array_element(o.fact_path, (f.i - 1)::int))::text), '') IS NOT NULL
    ),
    '[]'::jsonb
  ),
  fact_path = COALESCE(
    (
      SELECT jsonb_agg(p.val ORDER BY p.i)
      FROM jsonb_array_elements(o.fact_path) WITH ORDINALITY AS p(val, i)
      WHERE p.i <= LEAST(jsonb_array_length(o.fc), jsonb_array_length(o.fact_path))
        AND p.val IS NOT NULL
        AND p.val <> 'null'::jsonb
        AND NULLIF(TRIM(p.val::text), '') IS NOT NULL
        AND (jsonb_array_element(o.fc, (p.i - 1)::int)) IS NOT NULL
        AND (jsonb_array_element(o.fc, (p.i - 1)::int)) <> 'null'::jsonb
    ),
    '[]'::jsonb
  )
WHERE jsonb_typeof(fc) = 'array'
  AND jsonb_typeof(fact_path) = 'array'
  AND jsonb_array_length(fc) <> jsonb_array_length(fact_path);

-- 4) Asegurar tipo array (por si quedó texto u objeto suelto)
UPDATE ordenes_compra
SET fact_path = '[]'::jsonb
WHERE fact_path IS NULL
   OR jsonb_typeof(fact_path) <> 'array';

UPDATE ordenes_compra
SET fc = '[]'::jsonb
WHERE fc IS NULL
   OR jsonb_typeof(fc) <> 'array';
