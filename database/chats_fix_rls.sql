-- Fix: error 500 en conversacion_participantes por recursión infinita en RLS
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.es_participante_conversacion(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversacion_participantes
    WHERE conversacion_id = conv_id
      AND usuario_uuid = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.es_participante_conversacion(uuid) TO authenticated;

-- Eliminar políticas que causan recursión
DROP POLICY IF EXISTS "Participantes ven conversaciones" ON conversaciones;
DROP POLICY IF EXISTS "Participantes ven participantes" ON conversacion_participantes;
DROP POLICY IF EXISTS "Participantes ven mensajes" ON mensajes;
DROP POLICY IF EXISTS "Participantes envían mensajes" ON mensajes;

-- Recrear sin subconsultas recursivas sobre la misma tabla
CREATE POLICY "Participantes ven conversaciones" ON conversaciones
    FOR SELECT USING (public.es_participante_conversacion(id));

CREATE POLICY "Participantes ven participantes" ON conversacion_participantes
    FOR SELECT USING (
        usuario_uuid = auth.uid()
        OR public.es_participante_conversacion(conversacion_id)
    );

CREATE POLICY "Participantes ven mensajes" ON mensajes
    FOR SELECT USING (public.es_participante_conversacion(conversacion_id));

CREATE POLICY "Participantes envían mensajes" ON mensajes
    FOR INSERT WITH CHECK (
        remitente_uuid = auth.uid()
        AND public.es_participante_conversacion(conversacion_id)
    );
