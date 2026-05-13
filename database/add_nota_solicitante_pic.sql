-- Migración: notas del solicitante en pedidos generales (tabla pic)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pic
ADD COLUMN IF NOT EXISTS nota_solicitante TEXT;

COMMENT ON COLUMN pic.nota_solicitante IS 'Observaciones o aclaraciones del solicitante sobre el pedido (generales)';
