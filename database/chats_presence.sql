-- Presencia de usuarios en línea para el módulo de chats
-- Ejecutar en Supabase SQL Editor

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_last_seen_at
  ON usuarios(last_seen_at DESC);

COMMENT ON COLUMN usuarios.last_seen_at IS
  'Última actividad del usuario en la app; se usa para mostrar estado en línea en chats';
