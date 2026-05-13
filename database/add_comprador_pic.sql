-- Migración: comprador asignado en pedidos generales (tabla pic)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pic
ADD COLUMN IF NOT EXISTS comprador VARCHAR;

COMMENT ON COLUMN pic.comprador IS 'Comprador asignado al seguimiento del pedido (ej. área de compras)';
