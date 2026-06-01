-- Ruta del archivo de factura en storage (bucket fact_compras)
ALTER TABLE ordenes_compra ADD COLUMN IF NOT EXISTS fact_path TEXT;
