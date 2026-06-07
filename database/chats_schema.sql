-- Esquema de chat entre usuarios (referencia)
-- Ejecutar en Supabase SQL Editor si aún no se creó

CREATE TABLE IF NOT EXISTS conversaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo TEXT NOT NULL DEFAULT 'directo' CHECK (tipo IN ('directo', 'grupo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversacion_participantes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
    usuario_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE (conversacion_id, usuario_uuid)
);

CREATE TABLE IF NOT EXISTS mensajes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversacion_id UUID NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE,
    remitente_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL CHECK (char_length(trim(contenido)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON conversacion_participantes(usuario_uuid);
CREATE INDEX IF NOT EXISTS idx_participantes_conversacion ON conversacion_participantes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_updated ON conversaciones(updated_at DESC);

ALTER TABLE conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversacion_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Participantes ven conversaciones" ON conversaciones
    FOR SELECT USING (public.es_participante_conversacion(id));

CREATE POLICY "Usuarios autenticados crean conversaciones" ON conversaciones
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participantes ven participantes" ON conversacion_participantes
    FOR SELECT USING (
        usuario_uuid = auth.uid()
        OR public.es_participante_conversacion(conversacion_id)
    );

CREATE POLICY "Usuarios se agregan o crean participación" ON conversacion_participantes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participantes actualizan su last_read_at" ON conversacion_participantes
    FOR UPDATE USING (usuario_uuid = auth.uid());

CREATE POLICY "Participantes ven mensajes" ON mensajes
    FOR SELECT USING (public.es_participante_conversacion(conversacion_id));

CREATE POLICY "Participantes envían mensajes" ON mensajes
    FOR INSERT WITH CHECK (
        remitente_uuid = auth.uid()
        AND public.es_participante_conversacion(conversacion_id)
    );

CREATE POLICY "Usuarios autenticados ven perfiles básicos" ON usuarios
    FOR SELECT USING (auth.uid() IS NOT NULL);

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

ALTER PUBLICATION supabase_realtime ADD TABLE mensajes;

CREATE OR REPLACE FUNCTION actualizar_conversacion_por_mensaje()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversaciones
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversacion_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_mensaje_actualiza_conversacion
    AFTER INSERT ON mensajes
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_conversacion_por_mensaje();
