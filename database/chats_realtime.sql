-- Habilitar Realtime para alertas de mensajes nuevos en chats
-- Ejecutar en Supabase SQL Editor si no llegan las alertas

ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE conversacion_participantes;
