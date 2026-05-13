-- Migración: notas del solicitante en pedidos productivos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pedidos_productivos
ADD COLUMN IF NOT EXISTS nota_solicitante TEXT;

COMMENT ON COLUMN pedidos_productivos.nota_solicitante IS 'Observaciones o aclaraciones del solicitante sobre el pedido';
