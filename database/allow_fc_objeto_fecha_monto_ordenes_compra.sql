-- Permite guardar fecha y monto dentro de ordenes_compra.fc.
-- Cada elemento puede ser el número o un objeto:
--   [12345, {"fc": 67890, "fecha": "2026-10-13", "monto": 150000.5}]
--
-- Un CHECK no puede llevar subconsultas. La validación está en la función
-- y la restricción solo la llama.
--
-- Ejecutar todo el archivo una vez. Las dos primeras columnas del resultado
-- tienen que ser true, y la definición tiene que mencionar
-- ordenes_compra_fc_es_valido.

CREATE OR REPLACE FUNCTION public.ordenes_compra_fc_es_valido(valor jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  elem jsonb;
BEGIN
  IF valor IS NULL THEN
    RETURN true;
  END IF;

  IF jsonb_typeof(valor) <> 'array' THEN
    RETURN false;
  END IF;

  FOR elem IN
    SELECT value FROM jsonb_array_elements(valor) AS t(value)
  LOOP
    IF jsonb_typeof(elem) = 'number' THEN
      CONTINUE;
    END IF;

    IF jsonb_typeof(elem) = 'object'
       AND (
         jsonb_typeof(elem -> 'fc') = 'number'
         OR COALESCE(elem ->> 'fc', '') ~ '^[0-9]+$'
       ) THEN
      CONTINUE;
    END IF;

    RETURN false;
  END LOOP;

  RETURN true;
END;
$fn$;

ALTER TABLE ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_fc_numeric_array_chk;

ALTER TABLE ordenes_compra
  ADD CONSTRAINT ordenes_compra_fc_numeric_array_chk
  CHECK (public.ordenes_compra_fc_es_valido(fc))
  NOT VALID;

SELECT
  public.ordenes_compra_fc_es_valido('[12345]'::jsonb) AS solo_numero,
  public.ordenes_compra_fc_es_valido(
    '[{"fc": 67890, "fecha": "2026-10-13", "monto": 150000.5}]'::jsonb
  ) AS con_objeto,
  pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conname = 'ordenes_compra_fc_numeric_array_chk';
