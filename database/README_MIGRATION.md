# Migración de Base de Datos

## Problema Resuelto

El error "relation 'picstock' does not exist" se debe a que el código intenta acceder a una tabla que ya no se usa.

## Solución

Se han creado las siguientes tablas faltantes:

1. **articulos** - Para almacenar información de artículos
2. **pedidos_productivos** - Para pedidos productivos
3. **pic** - Para otros formularios de pedidos
4. **proveedores** - Para información de proveedores
5. **ordenes_compra** - Para órdenes de compra

**Nota:** La tabla `picstock` ha sido eliminada del código ya que no se usa más.

## Cómo Ejecutar la Migración

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `migrate.sql`
4. Ejecuta el script

### Opción 2: Supabase CLI

```bash
supabase db reset
# O ejecutar el archivo específico:
supabase db push
```

## Verificación

Después de ejecutar la migración, verifica que las tablas se crearon correctamente:

```sql
-- Verificar que las tablas existen
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('articulos', 'pedidos_productivos', 'pic', 'proveedores', 'ordenes_compra');
```

## Notas Importantes

- Todas las tablas tienen Row Level Security (RLS) habilitado
- Se han creado políticas de seguridad apropiadas
- Los índices están optimizados para consultas frecuentes
- Las tablas usan UUIDs como claves primarias

## Próximos Pasos

1. Ejecutar la migración
2. Probar el formulario de pedidos productivos
3. Verificar que no hay más errores de tablas faltantes
