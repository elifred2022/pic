-- Migración: histórico de cambios de estado en órdenes de compra
-- Ejecutar en Supabase SQL Editor

ALTER TABLE ordenes_compra
ADD COLUMN IF NOT EXISTS historico_estado JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ordenes_compra.historico_estado IS
  'Historial de cambios de estado: [{ estado, fecha, nombre? }] (fecha = día del cambio, YYYY-MM-DD)';
