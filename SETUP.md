# ICIE Checador — Guía de Configuración
## Supabase + GitHub + Netlify

---

## PASO 1 — Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) → **New project**
2. Nombre: `icie-checador` · Región: `South America (São Paulo)` o US Central · Guarda la contraseña de BD
3. Espera ~2 minutos a que el proyecto se inicialice

---

## PASO 2 — Ejecutar el schema SQL

1. En el dashboard de Supabase → **SQL Editor**
2. Abre el archivo `supabase/schema.sql` de este proyecto
3. Pega todo el contenido y haz clic en **Run**
4. Verifica que aparecieron las tablas: `profiles`, `time_entries`, `pauses`, `employees`, `permisos_vacaciones`, `incidencias`

---

## PASO 3 — Configurar Google OAuth en Supabase

1. En Supabase → **Authentication → Providers → Google** → Enable
2. Ve a [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
3. Crea un **OAuth 2.0 Client ID** (tipo Web application)
4. En "Authorized redirect URIs" agrega:
   ```
   https://<tu-proyecto>.supabase.co/auth/v1/callback
   ```
5. Copia el **Client ID** y **Client Secret** de Google
6. Pégalos en Supabase → Authentication → Providers → Google

> **Consejo de dominio:** En `useAuth.ts` ya está configurado `hd: 'icie.mx'` para limitar el selector de cuentas a cuentas `@icie.mx`. Si quieres quitar esa restricción, elimina ese parámetro.

---

## PASO 4 — Obtener credenciales de Supabase

En el dashboard → **Project Settings → API**:

- **Project URL** → tu `VITE_SUPABASE_URL`
- **anon / public** key → tu `VITE_SUPABASE_ANON_KEY`

Crea el archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Para probar en local: `npm install && npm run dev`

---

## PASO 5 — Crear repositorio en GitHub

```bash
cd Archivos          # la carpeta raíz del proyecto

git init
git add .
git commit -m "feat: migración a Supabase + módulo admin"
git branch -M main

# Crea un repo en github.com/new, luego:
git remote add origin https://github.com/TU_USUARIO/icie-checador.git
git push -u origin main
```

> El archivo `.gitignore` ya excluye `.env` y `node_modules`.

---

## PASO 6 — Despliegue en Netlify

1. Ve a [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Conecta tu cuenta de GitHub y selecciona `icie-checador`
3. Configuración de build (Netlify la detecta del `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. En **Site configuration → Environment variables** agrega:
   ```
   VITE_SUPABASE_URL       = https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY  = eyJ...
   ```
5. En Supabase → **Authentication → URL Configuration** agrega tu URL de Netlify:
   ```
   Site URL:         https://tu-sitio.netlify.app
   Redirect URLs:    https://tu-sitio.netlify.app/**
   ```
6. Haz un `git push` — Netlify desplegará automáticamente.

---

## PASO 7 — Dar de alta a los colaboradores

Una vez desplegado, entra con `e.martinez@icie.mx` o `a.olvera@icie.mx` y ve a:

**Panel Admin → Colaboradores → Nuevo Colaborador**

Registra a cada empleado con:
- ID en formato `DEPT-NNNN` (ej. `ACAD-0007`)
- Su correo de Google (`@icie.mx`)
- Hora de entrada y tolerancia

---

## Flujo de auto-despliegue

```
git push origin main
       ↓
   GitHub (repo)
       ↓
   Netlify detecta push → build automático
       ↓
   https://tu-sitio.netlify.app (actualizado en ~1 min)
```

---

## Archivos clave del proyecto

| Archivo | Propósito |
|---|---|
| `supabase/schema.sql` | Schema PostgreSQL + RLS |
| `src/lib/supabase.ts` | Cliente Supabase |
| `src/hooks/useAuth.ts` | Auth con Google OAuth vía Supabase |
| `src/hooks/useTimeTracking.ts` | Checadas en tiempo real (Supabase) |
| `src/lib/adminApi.ts` | CRUD de empleados, permisos e incidencias |
| `src/types/admin.ts` | Tipos TypeScript del módulo admin |
| `netlify.toml` | Config de build y SPA routing |
| `.env.example` | Plantilla de variables de entorno |
