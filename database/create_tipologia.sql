-- Migración: Crear tabla tipologia
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tipologia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tipologia VARCHAR NOT NULL,
    descripcion TEXT,
    cant_hoja INTEGER,
    ancho DECIMAL(10,2),
    alto DECIMAL(10,2),
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tipologia_tipologia ON tipologia(tipologia);

ALTER TABLE tipologia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tipologia" ON tipologia
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert tipologia" ON tipologia
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tipologia" ON tipologia
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tipologia" ON tipologia
    FOR DELETE USING (auth.role() = 'authenticated');
