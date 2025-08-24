# Sistema de Perfil de Usuario - PIC

## 📋 Descripción

Este sistema permite que los usuarios nuevos completen su perfil con información adicional después de registrarse, antes de acceder al dashboard principal.

## 🚀 Funcionalidades

### ✅ **Características implementadas:**

1. **Verificación automática** - Al hacer login, se verifica si el usuario tiene perfil completo
2. **Redirección inteligente** - Usuarios nuevos van a completar perfil, existentes al dashboard
3. **Formulario de perfil** - Interfaz amigable para completar información personal
4. **Validación de datos** - Campos obligatorios y opcionales claramente marcados
5. **Seguridad** - RLS (Row Level Security) implementado en Supabase
6. **Persistencia** - Datos guardados en tabla `usuarios` de Supabase

## 🗄️ Estructura de la Base de Datos

### **Tabla: `usuarios`**

| Campo    | Tipo | Descripción               | Obligatorio |
| -------- | ---- | ------------------------- | ----------- |
| `id`     | UUID | ID único del registro     | ✅ (Auto)   |
| `uuid`   | UUID | Referencia a `auth.users` | ✅          |
| `email`  | TEXT | Email del usuario         | ✅          |
| `nombre` | TEXT | Nombre del usuario        | ✅          |

## 🔧 Instalación

### **1. Crear la tabla en Supabase:**

Ejecuta el script SQL en `database/schema.sql` en tu proyecto de Supabase:

```sql
-- Copia y pega el contenido de database/schema.sql en el SQL Editor de Supabase
```

### **2. Verificar archivos creados:**

- ✅ `components/auth/user-profile-setup.tsx` - Componente del formulario
- ✅ `app/auth/complete-profile/page.tsx` - Página del formulario
- ✅ `database/schema.sql` - Script de base de datos

### **3. Archivos modificados:**

- ✅ `components/auth/login-form.tsx` - Verificación de perfil en login
- ✅ `app/protected/page.tsx` - Protección de ruta con verificación de perfil

## 🔄 Flujo de Usuario

### **Usuario Nuevo:**

1. Se registra con email/password
2. Hace login por primera vez
3. Es redirigido a `/auth/complete-profile`
4. Completa formulario con información personal
5. Datos se guardan en tabla `usuarios`
6. Es redirigido al dashboard principal (`/protected`)

### **Usuario Existente:**

1. Hace login
2. Sistema verifica que ya tiene perfil completo
3. Es redirigido directamente al dashboard (`/protected`)

## 🛡️ Seguridad

### **Row Level Security (RLS):**

- Usuarios solo pueden ver/editar su propio perfil
- Políticas implementadas para SELECT, INSERT y UPDATE
- Referencia segura a `auth.users` con CASCADE DELETE

### **Validación:**

- Campos obligatorios marcados con `*`
- Validación en frontend y backend
- Manejo de errores robusto

## 🎨 Personalización

### **Campos del formulario:**

- **Obligatorio:** Nombre
- **Automático:** Email (se obtiene del usuario logueado), ID (UUID generado), Fechas (NOW())

### **Estilos:**

- Diseño responsive con Tailwind CSS
- Componentes UI consistentes con el sistema
- Animaciones y transiciones suaves

## 🐛 Solución de Problemas

### **Error común: "Table 'usuarios' does not exist"**

- Ejecuta el script SQL en Supabase
- Verifica que la tabla se haya creado correctamente

### **Usuario no puede acceder al dashboard:**

- Verifica que haya completado el perfil
- Revisa logs de consola para errores
- Confirma que los datos se guardaron en la tabla

### **Problemas de permisos:**

- Verifica que RLS esté habilitado
- Confirma que las políticas estén activas
- Revisa logs de Supabase para errores de autenticación

## 📱 Próximas Mejoras

### **Funcionalidades sugeridas:**

1. **Edición de perfil** - Permitir actualizar información existente
2. **Avatar de usuario** - Subir foto de perfil
3. **Preferencias** - Configuraciones personalizadas del usuario
4. **Historial de cambios** - Auditoría de modificaciones del perfil
5. **Notificaciones** - Recordatorios para completar información faltante

## 🔗 Archivos Relacionados

- `components/auth/user-profile-setup.tsx` - Componente principal
- `app/auth/complete-profile/page.tsx` - Página del formulario
- `database/schema.sql` - Estructura de base de datos
- `components/auth/login-form.tsx` - Lógica de verificación
- `app/protected/page.tsx` - Protección de rutas

## 📞 Soporte

Para dudas o problemas con la implementación:

1. Revisa los logs de consola del navegador
2. Verifica los logs de Supabase
3. Confirma que todos los archivos estén en su lugar
4. Ejecuta el script SQL completo en Supabase
