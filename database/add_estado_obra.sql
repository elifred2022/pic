-- Migración: Agregar columna estado_obra a ordenes_produccion
-- Ejecutar en Supabase SQL Editor

-- Agregar columna estado_obra como array de texto (V1, V2, V3, V4 completados)
ALTER TABLE ordenes_produccion
ADD COLUMN IF NOT EXISTS estado_obra text[] DEFAULT '{}';

COMMENT ON COLUMN ordenes_produccion.estado_obra IS 'Array de versiones completadas: V1, V2, V3, V4';
