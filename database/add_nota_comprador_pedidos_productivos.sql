-- Migración: nota del comprador en pedidos productivos (comparativa / compras)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pedidos_productivos
ADD COLUMN IF NOT EXISTS nota_comprador TEXT;

COMMENT ON COLUMN pedidos_productivos.nota_comprador IS 'Observaciones del área de compras sobre la comparativa de precios';

-- Si ya ejecutaste la migración anterior con columna notas_comprador, renombrala:
-- ALTER TABLE pedidos_productivos RENAME COLUMN notas_comprador TO nota_comprador;
