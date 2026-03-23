# Divisa en ordenes_compra

## Si divisa NO se guarda al crear o editar

La causa suele ser el **caché de PostgREST** que no reconoce la columna. Ejecuta en **Supabase SQL Editor**:

```sql
-- 1. Asegurar que la columna existe
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS divisa VARCHAR DEFAULT 'USD';

-- 2. Refrescar caché de PostgREST
NOTIFY pgrst, 'reload schema';

-- 3. Si sigue sin funcionar, refrescar la cola de notificaciones:
SELECT pg_notification_queue_usage();
```

Luego **reinicia el proyecto** en Supabase (Settings → General → Restart project) para forzar que PostgREST recargue el esquema.
