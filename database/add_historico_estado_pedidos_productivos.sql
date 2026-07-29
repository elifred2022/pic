-- Migración: histórico de cambios de estado en pedidos productivos
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pedidos_productivos
ADD COLUMN IF NOT EXISTS historico_estado JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN pedidos_productivos.historico_estado IS
  'Historial de cambios de estado: [{ estado, fecha }] (fecha = día del cambio, YYYY-MM-DD)';
