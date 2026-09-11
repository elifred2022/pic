-- Habilitar Realtime para pedidos_productivos (altas y cambios de estado).
-- Ejecutar en Supabase SQL Editor si el alert no aparece.

-- 1. Publicar la tabla en Realtime (si ya está, ignorar el error "already member")
ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_productivos;

-- 2. Enviar el registro anterior en UPDATE (necesario para detectar cambio de estado)
ALTER TABLE pedidos_productivos REPLICA IDENTITY FULL;
