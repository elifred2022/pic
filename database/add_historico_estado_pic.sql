-- Migración: histórico de cambios de estado en pedidos generales
-- Ejecutar en Supabase SQL Editor

ALTER TABLE pic
ADD COLUMN IF NOT EXISTS historico_estado JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN pic.historico_estado IS
  'Historial de cambios de estado: [{ estado, fecha }] (fecha = día del cambio, YYYY-MM-DD)';
