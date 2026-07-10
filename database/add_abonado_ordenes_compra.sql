-- Columna abonado: checkbox + fecha en JSONB
-- Formato: { "abonado": true, "fecha": "2026-07-10" }
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS abonado JSONB DEFAULT NULL;
