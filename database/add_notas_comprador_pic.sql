-- Migración: notas del comprador en pedidos generales (tabla pic)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pic
ADD COLUMN IF NOT EXISTS notas_comprador TEXT;

COMMENT ON COLUMN pic.notas_comprador IS 'Observaciones de compras sobre la comparativa de precios (pedidos generales)';
