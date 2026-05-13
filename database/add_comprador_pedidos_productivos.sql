-- Migración: comprador asignado (pedidos productivos)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pedidos_productivos
ADD COLUMN IF NOT EXISTS comprador VARCHAR;

COMMENT ON COLUMN pedidos_productivos.comprador IS 'Comprador asignado al seguimiento del pedido (ej. área de compras)';
