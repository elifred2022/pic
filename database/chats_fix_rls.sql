-- Fix completo de RLS y creación de conversaciones para el módulo de chats
-- Ejecutar en Supabase SQL Editor

-- Evita recursión infinita en RLS (error 500 de PostgREST)
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

-- Crea conversación directa evitando problemas de RLS en INSERT
CREATE OR REPLACE FUNCTION public.crear_conversacion_directa(otro_usuario_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mi_uuid uuid := auth.uid();
  conv_id uuid;
BEGIN
  IF mi_uuid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF otro_usuario_uuid IS NULL OR otro_usuario_uuid = mi_uuid THEN
    RAISE EXCEPTION 'Usuario destino inválido';
  END IF;

  SELECT cp1.conversacion_id INTO conv_id
  FROM conversacion_participantes cp1
  INNER JOIN conversacion_participantes cp2
    ON cp1.conversacion_id = cp2.conversacion_id
  INNER JOIN conversaciones c
    ON c.id = cp1.conversacion_id
  WHERE cp1.usuario_uuid = mi_uuid
    AND cp2.usuario_uuid = otro_usuario_uuid
    AND c.tipo = 'directo'
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO conversaciones (tipo) VALUES ('directo') RETURNING id INTO conv_id;

  INSERT INTO conversacion_participantes (conversacion_id, usuario_uuid)
  VALUES (conv_id, mi_uuid), (conv_id, otro_usuario_uuid);

  RETURN conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crear_conversacion_directa(uuid) TO authenticated;

-- conversaciones
DROP POLICY IF EXISTS "Participantes ven conversaciones" ON conversaciones;
DROP POLICY IF EXISTS "Usuarios autenticados crean conversaciones" ON conversaciones;

CREATE POLICY "Participantes ven conversaciones" ON conversaciones
    FOR SELECT USING (public.es_participante_conversacion(id));

CREATE POLICY "Usuarios autenticados crean conversaciones" ON conversaciones
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- conversacion_participantes
DROP POLICY IF EXISTS "Participantes ven participantes" ON conversacion_participantes;
DROP POLICY IF EXISTS "Usuarios se agregan o crean participación" ON conversacion_participantes;
DROP POLICY IF EXISTS "Participantes actualizan su last_read_at" ON conversacion_participantes;

CREATE POLICY "Participantes ven participantes" ON conversacion_participantes
    FOR SELECT USING (
        usuario_uuid = auth.uid()
        OR public.es_participante_conversacion(conversacion_id)
    );

CREATE POLICY "Usuarios se agregan o crean participación" ON conversacion_participantes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participantes actualizan su last_read_at" ON conversacion_participantes
    FOR UPDATE USING (usuario_uuid = auth.uid());

-- mensajes
DROP POLICY IF EXISTS "Participantes ven mensajes" ON mensajes;
DROP POLICY IF EXISTS "Participantes envían mensajes" ON mensajes;

CREATE POLICY "Participantes ven mensajes" ON mensajes
    FOR SELECT USING (public.es_participante_conversacion(conversacion_id));

CREATE POLICY "Participantes envían mensajes" ON mensajes
    FOR INSERT WITH CHECK (
        remitente_uuid = auth.uid()
        AND public.es_participante_conversacion(conversacion_id)
    );

-- usuarios: permitir ver perfiles básicos para listar contactos del chat
DROP POLICY IF EXISTS "Usuarios autenticados ven perfiles básicos" ON usuarios;

CREATE POLICY "Usuarios autenticados ven perfiles básicos" ON usuarios
    FOR SELECT USING (auth.uid() IS NOT NULL);
