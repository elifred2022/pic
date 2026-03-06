# Permitir múltiples dispositivos para un usuario (tabletpys331@gmail.com)

## Problema

Si el usuario `tabletpys331@gmail.com` recibe "credenciales inválidas" al intentar iniciar sesión en varios dispositivos, suele deberse a la configuración **"Single session per user"** en Supabase.

## Solución

### 1. Desactivar "Single session per user" en Supabase

1. Entra al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Settings** (o **Auth** → **Sessions**)
4. Busca la opción **"Single session per user"**
5. **Desactívala** si está activada

Con esto, el mismo usuario podrá tener sesiones activas en varios dispositivos a la vez.

### 2. Ubicación exacta en el Dashboard

- **Ruta:** `Authentication` → `Settings` → sección **Sessions**
- O: `Project Settings` → `Auth` → **Session Management**

> **Nota:** Esta opción solo está disponible en planes **Pro** o superiores. En el plan gratuito, Supabase permite múltiples sesiones por defecto. Si no ves la opción, es posible que ya esté desactivada.

### 3. Verificar

Después de desactivar la opción:

1. Inicia sesión con `tabletpys331@gmail.com` en el dispositivo 1
2. Inicia sesión con el mismo usuario en el dispositivo 2
3. Ambas sesiones deberían mantenerse activas

## Alternativa: variable de entorno (self-hosted)

Si usas Supabase self-hosted, puedes configurar:

```
SESSIONS_SINGLE_PER_USER=false
```

En el plan cloud, esta opción se gestiona desde el Dashboard.
