-- Agregar columnas fc (factura), rt (remitos) y fecha_entrega a ordenes_compra
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS fc INTEGER;
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS rt INTEGER;
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS fecha_entrega DATE;
