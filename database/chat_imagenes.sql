-- Fotos en el chat (bucket + columna). Ejecutar en Supabase → SQL Editor.

-- 1. Columna de la imagen en el mensaje
ALTER TABLE public.mensajes
  ADD COLUMN IF NOT EXISTS imagen_path TEXT;

-- 2. Permitir mensaje solo con foto (sin texto)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.mensajes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%contenido%'
  LOOP
    EXECUTE format('ALTER TABLE public.mensajes DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.mensajes
  ALTER COLUMN contenido SET DEFAULT '';

ALTER TABLE public.mensajes
  DROP CONSTRAINT IF EXISTS mensajes_contenido_o_imagen_check;

ALTER TABLE public.mensajes
  ADD CONSTRAINT mensajes_contenido_o_imagen_check
  CHECK (
    char_length(trim(contenido)) > 0
    OR (imagen_path IS NOT NULL AND char_length(trim(imagen_path)) > 0)
  );

-- 3. Bucket de Storage (público para poder ver la foto en el chat)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat', 'chat', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "chat_authenticated_all" ON storage.objects;
DROP POLICY IF EXISTS "chat_public_read" ON storage.objects;

CREATE POLICY "chat_authenticated_all"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (bucket_id = 'chat')
WITH CHECK (bucket_id = 'chat');

CREATE POLICY "chat_public_read"
ON storage.objects
AS PERMISSIVE
FOR SELECT
TO public
USING (bucket_id = 'chat');
