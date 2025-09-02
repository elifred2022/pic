# 📋 Módulo de Órdenes de Compra

## Descripción

Este módulo permite crear y gestionar órdenes de compra de manera eficiente, integrando con el sistema de proveedores y artículos aprobados existente.

## Características Principales

### ✅ Funcionalidades Implementadas

- **Creación de órdenes de compra** con autocompletado de proveedores
- **Selección de artículos aprobados** desde pedidos productivos
- **Cálculo automático de totales** basado en cantidades y precios
- **Gestión de estados** (pendiente, aprobada, rechazada, completada)
- **Vista detallada** de cada orden
- **Integración completa** con el sistema de roles existente

### 🔗 Integración con Sistema Existente

- **Proveedores**: Autocompletado desde tabla `proveedor`
- **Artículos**: Selección desde `pedidos_productivos` con estado "aprobado"
- **Usuarios**: Sistema de autenticación y autorización existente
- **UI Components**: Utiliza los mismos componentes de diseño

## Estructura de Archivos

```
app/auth/ordenes-compra/
├── page.tsx                           # Lista principal de órdenes
├── crear-orden/
│   └── page.tsx                      # Formulario de creación
└── ver-orden/
    └── [id]/
        └── page.tsx                  # Vista detallada de orden

components/
├── forms/
│   └── crear-formordencompra.tsx     # Formulario principal
├── lists/
│   └── listaordenescompra.tsx        # Componente de lista
└── panels/
    └── listbicomponenteordenescompra.tsx  # Panel principal con tabs
```

## Uso del Módulo

### 1. Acceso al Módulo

- Los usuarios con acceso pueden navegar a `/auth/ordenes-compra`
- El módulo se integra con el sistema de roles existente
- Incluye navegación a otros módulos del sistema

### 2. Crear Nueva Orden

1. Navegar a "Crear Nueva Orden"
2. **Seleccionar Proveedor**:
   - Ingresar CUIT del proveedor
   - El sistema autocompleta automáticamente:
     - Nombre del proveedor
     - Dirección
     - Teléfono
     - Email
3. **Seleccionar Artículos**:
   - Ver lista de artículos aprobados disponibles
   - Agregar artículos a la orden
   - Ajustar cantidades y precios si es necesario
4. **Completar Orden**:
   - Agregar observaciones (opcional)
   - Revisar total calculado automáticamente
   - Confirmar creación

### 3. Gestionar Órdenes Existentes

- **Lista Principal**: Ver todas las órdenes con estado y totales
- **Vista Detallada**: Ver información completa de cada orden
- **Filtros**: Por estado, fecha, proveedor, etc.

## Estructura de Base de Datos

### Tabla: `ordenes_compra`

```sql
CREATE TABLE ordenes_compra (
    id SERIAL PRIMARY KEY,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    cuit_proveedor VARCHAR NOT NULL,
    nombre_proveedor VARCHAR NOT NULL,
    direccion_proveedor TEXT,
    telefono_proveedor VARCHAR,
    email_proveedor VARCHAR,
    estado VARCHAR DEFAULT 'pendiente',
    total DECIMAL(10,2),
    observaciones TEXT,
    items JSONB
);
```

### Campos Principales

- **id**: Identificador único autoincremental
- **fecha_creacion**: Timestamp automático de creación
- **cuit_proveedor**: CUIT del proveedor (referencia a tabla proveedor)
- **nombre_proveedor**: Nombre del proveedor (autocompletado)
- **direccion_proveedor**: Dirección del proveedor (autocompletado)
- **telefono_proveedor**: Teléfono del proveedor (autocompletado)
- **email_proveedor**: Email del proveedor (autocompletado)
- **estado**: Estado de la orden (pendiente, aprobada, rechazada, completada)
- **total**: Total calculado de la orden
- **observaciones**: Observaciones adicionales
- **items**: Array JSON con los artículos de la orden

## Flujo de Trabajo

### 1. Creación de Orden

```
Usuario → Selecciona CUIT → Sistema autocompleta datos del proveedor
     ↓
Selecciona artículos aprobados → Sistema calcula totales
     ↓
Agrega observaciones → Confirma orden → Sistema crea registro
```

### 2. Gestión de Estados

```
Pendiente → Aprobada → Completada
     ↓
  Rechazada (si es necesario)
```

## Integración con Otros Módulos

### 🔗 Proveedores

- **Tabla**: `proveedor`
- **Función**: Autocompletado de datos
- **Campos**: CUIT, nombre, dirección, teléfono, email

### 🔗 Artículos Aprobados

- **Tabla**: `pedidos_productivos`
- **Filtro**: Solo artículos con estado "aprobado"
- **Campos**: ID, artículo, cantidad, precio, proveedor seleccionado

### 🔗 Sistema de Usuarios

- **Autenticación**: Supabase Auth
- **Autorización**: Sistema de roles por email
- **Perfiles**: Tabla `usuarios`

## Consideraciones Técnicas

### ✅ Implementado

- Formularios reactivos con validación
- Autocompletado de proveedores
- Cálculo automático de totales
- Gestión de estados
- Navegación entre módulos
- Diseño responsive

### 🔄 Pendiente de Implementación

- Filtros avanzados de búsqueda
- Exportación a PDF/Excel
- Notificaciones por email
- Historial de cambios
- Aprobación en múltiples niveles

## Próximos Pasos

1. **Pruebas Locales**: Verificar funcionamiento sin afectar producción
2. **Ajustes de UI/UX**: Refinamientos basados en feedback
3. **Funcionalidades Adicionales**: Implementar filtros y exportación
4. **Integración Completa**: Conectar con otros módulos del sistema
5. **Despliegue**: Solo cuando esté completamente probado

## Notas Importantes

⚠️ **NO SUBIR A PRODUCCIÓN** hasta que se complete la implementación y pruebas
✅ **Solo desarrollo local** por el momento
🔒 **Mantener consistencia** con el sistema de autenticación existente
🎨 **Seguir patrones de diseño** establecidos en la aplicación



