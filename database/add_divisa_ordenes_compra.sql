-- Agregar columna divisa a ordenes_compra (para órdenes existentes)
-- Ejecutar en Supabase SQL Editor: Database → SQL Editor → New query
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS divisa VARCHAR DEFAULT 'USD';

-- Refrescar caché de PostgREST para que reconozca la columna divisa
NOTIFY pgrst, 'reload schema';

-- Si sigue sin funcionar, ejecutar esto para refrescar la cola de notificaciones:
-- SELECT pg_notification_queue_usage();
