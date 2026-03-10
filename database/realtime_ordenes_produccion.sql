-- Habilitar Realtime para ordenes_produccion
-- Ejecutar en Supabase SQL Editor si la alerta no aparece

-- 1. Agregar tabla a la publicación de Realtime
-- (Si da error "already member", la tabla ya está habilitada)
ALTER PUBLICATION supabase_realtime ADD TABLE ordenes_produccion;

-- 2. IMPORTANTE: Realtime respeta RLS. Para que TODOS los usuarios reciban
--    los eventos, debe existir una política SELECT que permita a los
--    usuarios autenticados ver las filas. Si ordenes_produccion tiene RLS
--    muy restrictivo (ej. solo usuario_id = auth.uid()), otros usuarios
--    no recibirán el evento. Verifica en Database > Policies.

-- 3. Para recibir el registro "old" en UPDATE (opcional)
-- ALTER TABLE ordenes_produccion REPLICA IDENTITY FULL;
