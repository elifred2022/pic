-- Habilitar Realtime para pic (pedidos generales: altas y cambios de estado).
-- Ejecutar en Supabase SQL Editor si el alert no aparece.

-- 1. Publicar la tabla en Realtime (si ya está, ignorar el error "already member")
ALTER PUBLICATION supabase_realtime ADD TABLE pic;

-- 2. Enviar el registro anterior en UPDATE (necesario para detectar cambio de estado)
ALTER TABLE pic REPLICA IDENTITY FULL;
