# 📦 Módulo de Artículos de Órdenes de Compra

## Descripción

Este módulo permite extraer y visualizar todos los artículos que están incluidos en las órdenes de compra del sistema. Proporciona una vista consolidada de todos los artículos con sus detalles, permitiendo búsquedas y filtros avanzados.

## Características Principales

### ✅ Funcionalidades Implementadas

- **Extracción automática** de artículos desde la tabla `ordenes_compra`
- **Vista consolidada** de todos los artículos con información de la orden
- **Filtros avanzados** por estado, proveedor y búsqueda de texto
- **Estadísticas en tiempo real** (total de artículos, cantidad, valor)
- **Navegación directa** a la orden de compra original
- **Interfaz responsive** y fácil de usar

### 🔗 Integración con Sistema Existente

- **Órdenes de Compra**: Extrae datos directamente de la tabla `ordenes_compra`
- **Proveedores**: Muestra información del proveedor asociado
- **Estados**: Respeta los estados de las órdenes (pendiente, aprobada, etc.)
- **UI Components**: Utiliza los mismos componentes de diseño del sistema

## Estructura de Archivos

```
app/auth/articulos-ordenes-compra/
└── page.tsx                           # Página principal del módulo

components/lists/
└── listaarticulosordenescompra.tsx    # Componente principal de lista
```

## Uso del Módulo

### 1. Acceso al Módulo

- Navegar a `/auth/articulos-ordenes-compra`
- También accesible desde el módulo de Órdenes de Compra → "Otros Módulos" → "Artículos de Órdenes"

### 2. Funcionalidades Disponibles

#### 📊 Panel de Estadísticas

- **Artículos Totales**: Cantidad total de artículos en todas las órdenes
- **Cantidad Total**: Suma de todas las cantidades de artículos
- **Valor Total**: Suma del valor total de todos los artículos
- **Órdenes**: Número total de órdenes de compra

#### 🔍 Sistema de Filtros

- **Búsqueda de Texto**: Buscar por nombre del artículo, proveedor o ID
- **Filtro por Estado**: Filtrar por estado de la orden (pendiente, aprobada, rechazada, completada)
- **Filtro por Proveedor**: Filtrar por proveedor específico

#### 📋 Vista de Artículos

Cada artículo muestra:

- **Información del Artículo**: ID, nombre, cantidad, precio unitario, total
- **Información de la Orden**: Número de orden, proveedor, fecha
- **Estado de la Orden**: Badge visual del estado actual
- **Acción**: Botón para ver la orden completa

## Estructura de Datos

### Tabla: `ordenes_compra`

Los artículos se extraen del campo `articulos` (JSONB) que contiene:

```json
[
  {
    "articulo_id": "string",
    "articulo_nombre": "string",
    "cantidad": "number",
    "precio_unitario": "number",
    "total": "number"
  }
]
```

### Interfaz: `ArticuloExtraido`

```typescript
interface ArticuloExtraido {
  articulo_id: string;
  articulo_nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  orden_id: number;
  orden_noc: number;
  proveedor: string;
  fecha_orden: string;
  estado_orden: string;
}
```

## Flujo de Trabajo

### 1. Carga de Datos

```
Sistema → Consulta tabla ordenes_compra → Extrae campo articulos (JSONB) →
Procesa cada artículo → Combina con datos de la orden → Muestra en interfaz
```

### 2. Filtrado y Búsqueda

```
Usuario aplica filtros → Sistema filtra array de artículos →
Actualiza estadísticas → Refresca vista
```

### 3. Navegación

```
Usuario hace clic en "Ver Orden" → Navega a vista detallada de la orden →
Muestra información completa de la orden de compra
```

## Casos de Uso

### 1. Consulta de Inventario

- Ver todos los artículos que han sido solicitados en órdenes
- Identificar artículos más frecuentemente solicitados
- Analizar patrones de compra

### 2. Seguimiento de Órdenes

- Ver el estado de artículos específicos
- Identificar órdenes pendientes por artículo
- Monitorear entregas por proveedor

### 3. Análisis de Costos

- Calcular costos totales por artículo
- Comparar precios entre proveedores
- Analizar tendencias de precios

### 4. Gestión de Proveedores

- Ver todos los artículos por proveedor
- Identificar proveedores principales
- Analizar distribución de compras

## Beneficios

- **Vista Consolidada**: Todos los artículos en un solo lugar
- **Búsqueda Eficiente**: Filtros rápidos y precisos
- **Información Completa**: Datos del artículo y contexto de la orden
- **Navegación Intuitiva**: Acceso directo a órdenes originales
- **Estadísticas en Tiempo Real**: Métricas actualizadas automáticamente

## Consideraciones Técnicas

- **Rendimiento**: Los datos se cargan una vez al inicio
- **Filtrado**: Se realiza en el cliente para mejor rendimiento
- **Memoria**: Maneja grandes cantidades de artículos eficientemente
- **Responsive**: Funciona en dispositivos móviles y desktop
