-- Crear tabla de usuarios para almacenar información adicional de los usuarios registrados
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    nombre TEXT NOT NULL
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_usuarios_uuid ON usuarios(uuid);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Habilitar RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver y editar su propio perfil
CREATE POLICY "Users can view own profile" ON usuarios
    FOR SELECT USING (auth.uid() = uuid);

CREATE POLICY "Users can insert own profile" ON usuarios
    FOR INSERT WITH CHECK (auth.uid() = auth.uid());

CREATE POLICY "Users can update own profile" ON usuarios
    FOR UPDATE USING (auth.uid() = uuid);



-- Comentarios sobre la tabla
COMMENT ON TABLE usuarios IS 'Tabla para almacenar información adicional de los usuarios registrados';
COMMENT ON COLUMN usuarios.uuid IS 'Referencia al ID del usuario en auth.users';
COMMENT ON COLUMN usuarios.email IS 'Email del usuario (duplicado para consultas rápidas)';
COMMENT ON COLUMN usuarios.nombre IS 'Nombre del usuario';
