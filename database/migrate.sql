-- Script de migración para crear las tablas faltantes
-- Ejecutar este script en Supabase SQL Editor

-- Crear tabla de artículos
CREATE TABLE IF NOT EXISTS articulos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codint VARCHAR NOT NULL UNIQUE,
    articulo VARCHAR NOT NULL,
    descripcion TEXT,
    existencia INTEGER DEFAULT 0,
    costo_compra DECIMAL(10,2),
    provsug VARCHAR,
    cc VARCHAR,
    aprueba VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para artículos
CREATE INDEX IF NOT EXISTS idx_articulos_codint ON articulos(codint);
CREATE INDEX IF NOT EXISTS idx_articulos_articulo ON articulos(articulo);

-- Habilitar RLS para artículos
ALTER TABLE articulos ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver artículos
CREATE POLICY "Authenticated users can view articulos" ON articulos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan insertar artículos
CREATE POLICY "Authenticated users can insert articulos" ON articulos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan actualizar artículos
CREATE POLICY "Authenticated users can update articulos" ON articulos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Crear tabla de pedidos productivos
CREATE TABLE IF NOT EXISTS pedidos_productivos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    necesidad DATE,
    categoria VARCHAR,
    solicita VARCHAR NOT NULL,
    sector VARCHAR,
    estado VARCHAR DEFAULT 'iniciado',
    observ TEXT,
    aprueba VARCHAR,
    numero_oc VARCHAR,
    proveedor_seleccionado VARCHAR,
    articulos JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para pedidos productivos
CREATE INDEX IF NOT EXISTS idx_pedidos_productivos_estado ON pedidos_productivos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_productivos_solicita ON pedidos_productivos(solicita);
CREATE INDEX IF NOT EXISTS idx_pedidos_productivos_created_at ON pedidos_productivos(created_at);

-- Habilitar RLS para pedidos productivos
ALTER TABLE pedidos_productivos ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver pedidos productivos
CREATE POLICY "Authenticated users can view pedidos_productivos" ON pedidos_productivos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan insertar pedidos productivos
CREATE POLICY "Authenticated users can insert pedidos_productivos" ON pedidos_productivos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan actualizar pedidos productivos
CREATE POLICY "Authenticated users can update pedidos_productivos" ON pedidos_productivos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Crear tabla pic (para otros formularios)
CREATE TABLE IF NOT EXISTS pic (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    necesidad DATE,
    categoria VARCHAR,
    solicita VARCHAR,
    sector VARCHAR,
    cc INTEGER,
    cant INTEGER,
    cant_exist INTEGER,
    articulo VARCHAR,
    descripcion TEXT,
    estado VARCHAR DEFAULT 'iniciado',
    aprueba VARCHAR,
    prov_uno VARCHAR,
    cost_prov_uno DECIMAL(10,2),
    subt_prov1 DECIMAL(10,2),
    prov_dos VARCHAR,
    cost_prov_dos DECIMAL(10,2),
    subt_prov2 DECIMAL(10,2),
    prov_tres VARCHAR,
    cost_prov_tres DECIMAL(10,2),
    subt_prov3 DECIMAL(10,2),
    oc INTEGER,
    proveedor_selec VARCHAR,
    usd DECIMAL(10,2),
    eur DECIMAL(10,2),
    tc DECIMAL(10,2),
    porcent DECIMAL(5,2),
    ars_desc DECIMAL(10,2),
    ars DECIMAL(10,2),
    total_simp DECIMAL(10,2),
    fecha_conf DATE,
    fecha_prom DATE,
    fecha_ent DATE,
    rto DECIMAL(10,2),
    fac DECIMAL(10,2),
    mod_pago VARCHAR,
    proceso VARCHAR,
    notas TEXT,
    articulos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para pic
CREATE INDEX IF NOT EXISTS idx_pic_uuid ON pic(uuid);
CREATE INDEX IF NOT EXISTS idx_pic_estado ON pic(estado);
CREATE INDEX IF NOT EXISTS idx_pic_created_at ON pic(created_at);

-- Habilitar RLS para pic
ALTER TABLE pic ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propios pedidos
CREATE POLICY "Users can view own pic" ON pic
    FOR SELECT USING (auth.uid() = uuid);

CREATE POLICY "Users can insert own pic" ON pic
    FOR INSERT WITH CHECK (auth.uid() = uuid);

CREATE POLICY "Users can update own pic" ON pic
    FOR UPDATE USING (auth.uid() = uuid);

-- La tabla picstock ha sido eliminada - ya no se usa

-- Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cuitprov BIGINT UNIQUE NOT NULL,
    nombreprov VARCHAR NOT NULL,
    direccionprov TEXT,
    telefonoprov BIGINT,
    emailprov VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_cuit ON proveedores(cuitprov);
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombreprov);

-- Habilitar RLS para proveedores
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver proveedores
CREATE POLICY "Authenticated users can view proveedores" ON proveedores
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan insertar proveedores
CREATE POLICY "Authenticated users can insert proveedores" ON proveedores
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan actualizar proveedores
CREATE POLICY "Authenticated users can update proveedores" ON proveedores
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Crear tabla de órdenes de compra
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cuit VARCHAR NOT NULL,
    proveedor VARCHAR NOT NULL,
    direccion TEXT,
    telefono VARCHAR,
    lugar_entrega VARCHAR,
    sector VARCHAR,
    cod_cta VARCHAR,
    importe_competencia DECIMAL(10,2),
    ahorro DECIMAL(10,2),
    condicion_pago VARCHAR,
    noc VARCHAR,
    total DECIMAL(10,2),
    observaciones TEXT,
    articulos JSONB,
    estado VARCHAR DEFAULT 'pendiente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para órdenes de compra
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_cuit ON ordenes_compra(cuit);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_created_at ON ordenes_compra(created_at);

-- Habilitar RLS para órdenes de compra
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;

-- Política para que todos los usuarios autenticados puedan ver órdenes de compra
CREATE POLICY "Authenticated users can view ordenes_compra" ON ordenes_compra
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan insertar órdenes de compra
CREATE POLICY "Authenticated users can insert ordenes_compra" ON ordenes_compra
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para que todos los usuarios autenticados puedan actualizar órdenes de compra
CREATE POLICY "Authenticated users can update ordenes_compra" ON ordenes_compra
    FOR UPDATE USING (auth.role() = 'authenticated');
