# MEGA-PROMPT: Rebranding DentalFlow → Dentiqa + Reestructuración de subdominios

## CONTEXTO

El producto se renombra de **DentalFlow** a **Dentiqa**. Empresa: **Violet Wave IA**. Dominio: **dentiqa.app**.

Leé `CLAUDE.md` y toda la estructura del proyecto antes de empezar. **No rompas nada funcional.**

---

## BLOQUE 1: REBRANDING — Buscar y reemplazar en TODO el código

### 1.1 — Textos visibles (UI facing)

Reemplazar en TODOS los archivos (.tsx, .ts, .html, .css, .md):

```
"DentalFlow"  →  "Dentiqa"
"dentalflow"  →  "dentiqa"
"DentalFlow"  →  "Dentiqa"
"Dental Flow" →  "Dentiqa"
"DF"          →  "DQ" (solo donde sea el logo/icono, ej: sidebar logo)
```

**Archivos clave a revisar:**
- `apps/web/` — TODO el frontend del dashboard
- `apps/landing/` — TODA la landing page
- `apps/api/` — mensajes de error, system prompts, templates
- `packages/ai/` — system prompt del chatbot
- `CLAUDE.md` — documentación
- `package.json` — name fields
- `.env` — comments
- Seed data — nombres de clínica demo, templates, etc.

### 1.2 — Logo y branding visual

**Sidebar del dashboard:**
- Cambiar "DF" → "DQ" en el ícono cuadrado
- Cambiar "DentalFlow" → "Dentiqa" en el texto del sidebar
- Mantener la paleta azul (#2563eb)

**Header del dashboard:**
- Cambiar "DentalFlow" → "Dentiqa"

**Landing page:**
- Cambiar TODOS los "DentalFlow" → "Dentiqa"
- Navbar: "Dentiqa" + "by Violet Wave IA"
- Footer: "Dentiqa" + "by Violet Wave IA"
- Meta tags: title, description, og:title, og:description

**Admin Panel:**
- Cambiar "DentalFlow" → "Dentiqa" en sidebar, header, títulos

**Login page:**
- Cambiar título y branding

**Página de registro (/registro):**
- Cambiar título, textos, branding

### 1.3 — System prompt del chatbot

En `packages/ai/src/chatbot.ts` (o donde esté el system prompt):
- Reemplazar toda mención de "DentalFlow" → "Dentiqa"
- El bot debe presentarse como asistente de la clínica, no como "Dentiqa", pero si menciona la plataforma debe decir "Dentiqa"

### 1.4 — Templates de WhatsApp (seed)

En el seed y en los templates del sistema:
- Reemplazar "DentalFlow" → "Dentiqa" en los textos de los templates
- NOTA: Los templates ya enviados a Meta NO se pueden cambiar — solo los del seed/nuevos

### 1.5 — Emails y notificaciones

Si hay textos de email (Resend, notificaciones, etc.):
- Reemplazar "DentalFlow" → "Dentiqa"

### 1.6 — Credenciales demo (seed)

Actualizar en el seed:
```
Admin clínica demo: admin@clinica-demo.com → mantener (es del tenant, no del producto)
Super Admin: admin@dentalflow.app → admin@dentiqa.app
```

---

## BLOQUE 2: REESTRUCTURACIÓN DE SUBDOMINIOS

### 2.1 — URLs de producción

```
Landing:    https://dentiqa.app
Dashboard:  https://dashboard.dentiqa.app
Admin:      https://admin.dentiqa.app
API:        https://api.dentiqa.app
```

### 2.2 — Variables de entorno

Crear/actualizar las variables que referencian URLs. Estas van a tener valores DIFERENTES en dev vs prod.

**Para desarrollo (.env):**
```env
# URLs de desarrollo
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
LANDING_URL=http://localhost:3002
ADMIN_URL=http://localhost:3000/admin

# URLs de producción (para referencia, se configuran en el hosting)
# APP_URL=https://dashboard.dentiqa.app
# API_URL=https://api.dentiqa.app
# LANDING_URL=https://dentiqa.app
# ADMIN_URL=https://admin.dentiqa.app
```

**Actualizar env.production.example:**
```env
APP_URL=https://dashboard.dentiqa.app
API_URL=https://api.dentiqa.app
LANDING_URL=https://dentiqa.app
ADMIN_URL=https://admin.dentiqa.app
```

### 2.3 — Separar Admin como subdominio (admin.dentiqa.app)

Actualmente el Admin Panel está en `/admin` dentro de `apps/web`. Para producción hay dos opciones:

**Opción A (recomendada para MVP):** Mantener el admin dentro de `apps/web` pero servir en un subdominio diferente usando Vercel rewrites. En producción, `admin.dentiqa.app` apunta al mismo deploy de Vercel pero con un rewrite rule que mapea `/admin/*`. El código no cambia, solo la config de Vercel.

**Opción B (futuro):** Separar el admin en su propio proyecto Next.js (`apps/admin/`). Esto es más trabajo y no es necesario ahora.

**Implementar Opción A:**
- En `apps/web/vercel.json` (o `next.config.ts`), agregar configuración para que el subdominio `admin.dentiqa.app` sirva las rutas `/admin/*`
- El middleware de auth ya verifica SUPER_ADMIN para esas rutas, así que la seguridad está cubierta
- En el frontend, los links del admin deben ser relativos (ya lo son: `/admin/...`)

### 2.4 — Landing en dentiqa.app

La landing (`apps/landing/`) se deploya como proyecto independiente en Vercel apuntando a `dentiqa.app`.

**Actualizar en la landing:**
- Links "Empezar prueba gratis" → `https://dashboard.dentiqa.app/registro`
- Links "Hablar con un asesor" → WhatsApp de Violet Wave
- Links internos (precios, FAQ, etc.) → anchors (`#precios`, `#faq`)
- Meta tags con el dominio correcto

### 2.5 — Dashboard en dashboard.dentiqa.app

El dashboard (`apps/web/`) se deploya en Vercel apuntando a `dashboard.dentiqa.app`.

**Actualizar:**
- CORS en el API debe aceptar: `https://dashboard.dentiqa.app` y `https://admin.dentiqa.app`
- Next.js rewrites: `/api/v1/*` → `https://api.dentiqa.app/api/v1/*` (en producción) o `http://localhost:3001/api/v1/*` (en dev)
- La página de login debe estar en `dashboard.dentiqa.app/login`
- La página de registro debe estar en `dashboard.dentiqa.app/registro`

### 2.6 — API en api.dentiqa.app

El API (`apps/api/`) se deploya en Railway apuntando a `api.dentiqa.app`.

**Actualizar CORS origins:**
```typescript
const ALLOWED_ORIGINS = [
  // Producción
  'https://dentiqa.app',
  'https://dashboard.dentiqa.app',
  'https://admin.dentiqa.app',
  // Desarrollo
  'http://localhost:3000',
  'http://localhost:3002',
  // Ngrok (dev con WhatsApp)
  process.env.APP_URL,
].filter(Boolean);
```

### 2.7 — Webhook URLs (actualizar documentación)

Documentar que en producción los webhooks serán:
```
WhatsApp: https://api.dentiqa.app/api/v1/webhooks/whatsapp
Mercado Pago: https://api.dentiqa.app/api/v1/webhooks/mercadopago
Google Calendar: https://api.dentiqa.app/api/v1/gcal/callback
```

---

## BLOQUE 3: METADATA Y SEO

### 3.1 — Landing page (dentiqa.app)

```html
<title>Dentiqa — El software dental con IA para tu clínica</title>
<meta name="description" content="Agenda, historial clínico, WhatsApp con chatbot IA, pipeline CRM, estadísticas y más. Todo en una sola plataforma. Probá gratis 14 días." />
<meta property="og:title" content="Dentiqa — Software dental con IA" />
<meta property="og:description" content="Reemplazá 5 herramientas con una. Chatbot IA por WhatsApp, odontograma digital, pipeline CRM, estadísticas. Probá gratis." />
<meta property="og:url" content="https://dentiqa.app" />
<meta property="og:site_name" content="Dentiqa" />
<meta property="og:type" content="website" />
<link rel="canonical" href="https://dentiqa.app" />
```

### 3.2 — Dashboard (dashboard.dentiqa.app)

```html
<title>Dentiqa — Dashboard</title>
<meta name="robots" content="noindex, nofollow" /> <!-- No indexar el dashboard -->
```

### 3.3 — Favicon

Actualizar el favicon en todos los proyectos:
- Usar las letras "DQ" en un cuadrado azul (#2563eb) con bordes redondeados
- Generar: favicon.ico, apple-touch-icon.png, favicon-32x32.png, favicon-16x16.png
- Colocar en `apps/web/public/` y `apps/landing/public/`

---

## BLOQUE 4: PACKAGE.JSON Y CONFIGS

### 4.1 — Actualizar nombres de paquetes

```json
// Raíz package.json
{ "name": "dentiqa" }

// apps/web/package.json
{ "name": "@dentiqa/web" }

// apps/api/package.json
{ "name": "@dentiqa/api" }

// apps/landing/package.json
{ "name": "@dentiqa/landing" }

// packages/db/package.json
{ "name": "@dentiqa/db" }

// packages/ai/package.json
{ "name": "@dentiqa/ai" }

// packages/shared/package.json (si existe)
{ "name": "@dentiqa/shared" }

// packages/messaging/package.json (si existe)
{ "name": "@dentiqa/messaging" }
```

### 4.2 — Actualizar scripts de npm si referencian "dentalflow"

Buscar en todos los package.json si hay scripts con "dentalflow" en el nombre y actualizar.

---

## BLOQUE 5: CLAUDE.md Y DOCUMENTACIÓN

### 5.1 — Actualizar CLAUDE.md

- Cambiar TODAS las menciones de "DentalFlow" → "Dentiqa"
- Actualizar URLs a los nuevos dominios
- Actualizar credenciales de ejemplo:
  - Super Admin: admin@dentiqa.app / (password)
  - Dominio: dentiqa.app
- Versión: v1.0.0 (es el primer release oficial con marca propia)

### 5.2 — Actualizar env.production.example

Con todas las URLs de dentiqa.app.

### 5.3 — Actualizar README.md (si existe)

Con el nuevo nombre y estructura.

---

## BLOQUE 6: VERIFICACIONES FINALES

### 6.1 — Búsqueda exhaustiva

Después de todos los cambios, ejecutar:
```bash
# Buscar cualquier mención residual de "dentalflow" (case insensitive)
grep -rni "dentalflow" apps/ packages/ --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" --include="*.html" --include="*.css" --include="*.env*"

# Buscar "DentalFlow" específicamente
grep -rn "DentalFlow" apps/ packages/ --include="*.ts" --include="*.tsx"

# Buscar en el seed
grep -rni "dentalflow" apps/api/src/ --include="*.ts"
```

Si queda alguna mención, reemplazarla. La ÚNICA excepción es en archivos de migración de Prisma (no tocar migraciones pasadas).

### 6.2 — Compilación

```bash
npx tsc --noEmit
```

Debe compilar limpio.

### 6.3 — Test visual

Verificar que NO aparece "DentalFlow" en ningún lugar visible:
- Login page
- Dashboard sidebar y header
- Todas las páginas del dashboard
- Landing page completa
- Admin panel
- Página de registro
- Modales y banners

---

## ORDEN DE IMPLEMENTACIÓN

1. **Búsqueda global** — Identificar TODOS los archivos con "DentalFlow" o "dentalflow"
2. **Reemplazo en código** — Reemplazar en todos los archivos
3. **Actualizar seed** — Super Admin email, textos de templates
4. **Actualizar chatbot** — System prompt
5. **Actualizar package.json** — Nombres de paquetes
6. **Actualizar landing** — Textos, meta tags, links a dashboard.dentiqa.app
7. **Actualizar dashboard** — Sidebar, header, login, registro
8. **Actualizar admin** — Sidebar, header
9. **Actualizar CORS** — Lista de origins permitidos
10. **Actualizar env.production.example** — URLs de producción
11. **Actualizar CLAUDE.md** — Todo el documento a v1.0.0
12. **Favicon** — Generar nuevo con "DQ"
13. **Grep final** — Verificar que no queda ningún "DentalFlow"
14. **Compilar** — `npx tsc --noEmit`
15. **Commit** — `git add -A && git commit -m "rebrand: DentalFlow → Dentiqa v1.0.0" && git push`

---

## REGLAS

1. NO tocar archivos de migración de Prisma (son históricos)
2. NO cambiar nombres de tablas/columnas en la DB (el rebranding es solo UI/texto)
3. NO romper funcionalidad — solo cambiar textos y nombres
4. Mantener "by Violet Wave IA" en landing y footer
5. `npx tsc --noEmit` limpio al final
6. Hacer UN solo commit con todo el rebranding
