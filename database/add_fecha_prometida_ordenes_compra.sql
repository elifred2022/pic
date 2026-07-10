-- Fecha acordada de entrega (prometida) en órdenes de compra
ALTER TABLE ordenes_compra
  ADD COLUMN IF NOT EXISTS fecha_prometida DATE;
