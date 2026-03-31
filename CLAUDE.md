# CLAUDE.md — Dentiqa SaaS Platform (v1.1.0)

## IDENTIDAD DEL PROYECTO

Sos el CTO y desarrollador principal de Dentiqa, una plataforma SaaS todo-en-uno para clínicas dentales. Reemplaza Kommo CRM + Dentalink + herramientas de marketing en UNA SOLA plataforma propietaria con IA integrada. Empresa: **Violet Wave IA**. Dominio: **dentiqa.app**.

- **Modelo de negocio:** SaaS mensual (USD 89–249/mes) + Setup Fee (USD 1000 pago único, no visible en landing). Trial 14 días gratis.
- **Mercado:** Clínicas dentales en Latinoamérica (español, WhatsApp como canal principal).
- **Pricing:** Precios en USD, conversión automática a moneda local por país (10 monedas LATAM).
- **Costos:** UNA API key Anthropic para todos. WhatsApp via Embedded Signup (cada clínica conecta su WABA). Usage tracking por clínica.

---

## STACK TÉCNICO

```
MONOREPO
├── apps/web (Next.js 15 + shadcn/ui)     → localhost:3000  | dashboard.dentiqa.app
├── apps/api (Fastify + TypeScript)        → localhost:3001  | api.dentiqa.app
├── apps/landing (Next.js 15 + Tailwind)   → localhost:3002  | dentiqa.app
├── packages/db (Prisma), shared (Zod), ai (chatbot), messaging (WA+email), campaigns, connectors, ui
└── CLAUDE.md, .env, env.production.example
```

Frontend: Next.js 15 + shadcn/ui + Tailwind + Recharts (lazy loaded) | State: Zustand + TanStack Query
Backend: Fastify + TS + @fastify/helmet + @fastify/rate-limit + @fastify/jwt + fastify-raw-body
DB: PostgreSQL (Supabase) + Prisma (30+ modelos) | Cache: Redis + BullMQ (graceful degradation)
Auth: JWT dos niveles (clínica OWNER/ADMIN/DENTIST/RECEPTIONIST + SUPER_ADMIN) + login lockout + permisos por rol
IA: Anthropic claude-haiku-4-5-20251001 (principal) + claude-sonnet-4-20250514 (escalación)
WA: Meta Cloud API + Embedded Signup | GCal: OAuth2 bidireccional
Billing: Mercado Pago preapproval API (ARS) + exchange rates API
Security: Helmet + CORS estricto + input sanitizer + file validation + SecurityLog + prompt injection protection
DnD: @dnd-kit | Email: Resend | Tunnel: ngrok (dev)

---

## SUBDOMINIOS (producción)

| Servicio | URL | Deploy |
|----------|-----|--------|
| Landing | https://dentiqa.app | Vercel (apps/landing) |
| Dashboard | https://dashboard.dentiqa.app | Vercel (apps/web) |
| Admin | https://admin.dentiqa.app | Vercel rewrite → apps/web /admin/* |
| API | https://api.dentiqa.app | Railway (apps/api) |

Webhooks producción:
- WhatsApp: https://api.dentiqa.app/api/v1/webhooks/whatsapp
- Mercado Pago: https://api.dentiqa.app/api/v1/webhooks/mercadopago
- Google Calendar: https://api.dentiqa.app/api/v1/gcal/callback

---

## ESTADO ACTUAL — TODO LO IMPLEMENTADO

### Dashboard Clínica (8 páginas)

| Página | Ruta | Descripción |
|--------|------|-------------|
| Inicio | /dashboard | Métricas + widget uso mensual + próximas citas |
| Agenda | /agenda | Calendario semanal/diario, multi-dentista, GCal integrado, drag-and-drop. Dentistas solo ven sus citas. |
| Pacientes | /pacientes | Tabla + ficha profesional con 8 tabs (ver abajo) |
| Pipeline | /pipeline | Kanban 8 stages, drag-and-drop, valor monetario, auto-config. UX expedientes (compact mode + hover expand). |
| Campañas | /campanas | Wizard 4 pasos, 8 campañas default, 15 templates, segmentación |
| Estadísticas | /estadisticas | 7 endpoints analytics, 6 gráficos Recharts (lazy loaded), heatmap, filtro período |
| Conversaciones | /conversaciones | Inbox WhatsApp Web, burbujas, delivery status, toggle IA |
| Configuración | /configuracion | 9 tabs: Clínica, Chatbot IA (5 sub-tabs), Profesionales, Tratamientos, Sillones, Pipeline, Integraciones, Facturación, Equipo |

### Permisos por Rol (implementado 30/03/2026)

| Sección | OWNER | ADMIN | DENTIST | RECEPTIONIST |
|---------|-------|-------|---------|--------------|
| Inicio | ✅ | ✅ | ✅ | ✅ |
| Agenda | ✅ todas | ✅ todas | ✅ solo suya | ✅ todas |
| Pacientes | ✅ todo | ✅ todo | ✅ todas las tabs clínicas | ✅ solo Resumen |
| Pipeline | ✅ | ✅ | ❌ | ✅ |
| Campañas | ✅ | ✅ | ❌ | ✅ |
| Estadísticas | ✅ | ✅ | ❌ | ❌ |
| Conversaciones | ✅ | ✅ | ✅ | ✅ |
| Configuración | ✅ | ✅ | ❌ | ❌ |

Backend: middleware requireRole() en rutas críticas.
Frontend: permissions.ts con canAccessRoute(), filterNavItems(), canSeePatientTab().
Agenda: DENTIST filtrado por dentistId directo del JWT (vinculación User.dentistId → Dentist).

### Vinculación User ↔ Dentist (implementado 30/03/2026)

- Campo User.dentistId (FK unique a Dentist)
- Al crear User con rol DENTIST, se requiere seleccionar un profesional vinculado
- En el formulario de Nuevo Profesional, opción "Crear usuario de acceso" que crea Dentist + User vinculados
- Login incluye dentistId en JWT y localStorage

### Límite de Usuarios por Plan (implementado 30/03/2026)

- STARTER: máximo 5 usuarios
- PROFESSIONAL: máximo 10 usuarios
- ENTERPRISE: ilimitados (999)
- Backend: getUserLimit() valida antes de crear usuario, error 403 si excede
- Frontend: contador "X/Y usuarios" en sección Equipo
- Downgrade: banner warning si usuarios > límite, no se desactivan automáticamente

### Ficha del Paciente — 8 Tabs

1. **Resumen**: alertas médicas, stats cards, plan activo, próximas citas, timeline
2. **Odontograma**: DUAL VIEW (frontal + oclusal), versionado (snapshot/restaurar), permanente/temporal (32 vs 20), 5 zonas clickeables por diente, 13 tipos de hallazgo con colores
3. **Periodontograma**: métricas BOP/NIC/placa, versionado, furca/supuración por sitio
4. **Plan de Tratamiento**: múltiples planes, secciones/fases, descuento por ítem, subtotales/totales, estado dropdown
5. **Evoluciones**: plantillas pre-llenables, firma digital (canvas), vinculación dentista/plan, timeline filtrable
6. **Historia Médica**: factor RH, alergias con severidad, medicamentos con dosis, condiciones con tratamiento, antecedentes familiares, audit trail
7. **Imágenes**: galería con categorías, drag-drop upload, visor zoom/rotar, validación MIME+magic bytes
8. **Recetas y Documentos**: recetas con plantillas + firma, consentimientos + firma paciente/profesional + revocar

### Chatbot IA — Arquitectura 3 Capas

- **Capa 1 — Intent Router** (0 tokens): regex/keyword → GREETING, HOURS, CANCEL, LOCATION, TREATMENTS, HUMAN, FRUSTRATION
- **Capa 1.5 — Registro** (0 tokens): state machine, 9 pasos configurables, parser fechas español
- **Capa 1.5 — Botones** (0 tokens): slots, dentistas, cancelación confirm/keep
- **Capa 2 — Haiku 4.5**: 8 tools function calling, system prompt dinámico con BotConfig, 300 tokens, temp 0.3
- **Capa 3 — Sonnet**: escalación si Haiku falla (3x usage)
- **Seguridad**: sanitizeForLLM() + detectPromptInjection() + reglas anti-injection en system prompt
- **Debounce**: 10-20s configurable, processing lock, FRUSTRATION/HUMAN bypass
- **Filtro mensajes sistema Meta**: ignora mensajes de setup/sistema de Meta (isMetaSystemMessage filter)

### Cron Jobs — BullMQ (5 workers)

| Job | Intervalo | Función |
|-----|-----------|---------|
| pipeline-automations | 15 min | Auto-mensaje WhatsApp + auto-move entre etapas |
| appointment-reminders | 30 min | Recordatorio 24h antes de cita |
| treatment-followup | 1 hora | Seguimiento post-tratamiento (followUpMonths) |
| post-procedure-check | 1 hora | Control post-procedimiento (postProcedureDays) |
| trial-expiration | 1 hora | Verifica trials vencidos → TRIAL_EXPIRED |

- Scheduler con TCP probe antes de BullMQ init
- `.on("error")` en todos los Queue/Worker
- Redis OPCIONAL — server arranca sin Redis con warning

### Integraciones

- **WhatsApp Cloud API**: Embedded Signup ✅ FUNCIONANDO, webhook HMAC-SHA256, multi-WABA, text/template/buttons/list
- **Google Calendar**: OAuth2 por dentista, bidireccional, slots bloqueados, graceful degradation
- **Mercado Pago**: preapproval API (suscripciones recurrentes ARS), webhook con verificación, dunning 3 intentos
- **Meta Templates**: submit/check/sync vía API Graph, timeline de eventos, panel Super Admin

### Estadísticas (Recharts — lazy loaded)

7 endpoints: overview, appointments-chart, revenue-chart, patients-chart, top-treatments, dentist-performance, hours-heatmap. Filtro por período (7d/30d/90d/12m). Comparación vs período anterior.

### Registro Self-service

- Página /registro: wizard 3 pasos (clínica → cuenta → confirmación)
- POST /api/v1/auth/register: transacción que crea Tenant + User(OWNER) + Subscription(TRIALING 14d) + WorkingHours + 8 PipelineStages + 5 TreatmentTypes
- 10 países LATAM con timezone automático
- Auto-login con JWT + modal de bienvenida

### Precios y Billing (ACTUALIZADO 30/03/2026)

**Precios USD (source of truth):**

| | STARTER | PROFESSIONAL | ENTERPRISE |
|---|---|---|---|
| Precio | USD 89/mes | USD 149/mes | USD 249/mes |
| Perfil | Clínicas pequeñas | Clínicas medianas | Clínicas grandes |
| WhatsApp msgs/mes | 2,000 | 5,000 | 10,000 |
| IA interactions/mes | 2,000 | 5,000 | 10,000 |
| Usuarios | 5 | 10 | Ilimitados |

- **Setup Fee**: USD 1,000 (pago único, NO visible en landing — "Implementación integral" con 9 items de valor)
- **Conversión**: API open.er-api.com con cache 6h + fallback + roundToNice()
- **10 monedas**: ARS, CLP, COP, MXN, UYU, BRL, USD (Ecuador), PYG, BOB, PEN
- **MP cobra en ARS**: conversión dinámica USD→ARS al crear suscripción
- **Overage**: $20/1000 interacciones extra, nunca se bloquea al paciente
- **Billing bug fix**: botón "Activar plan" habilitado en TRIALING/TRIAL_EXPIRED (antes estaba grisado)

### Trial y Lockout

- Trial: 14 días gratis desde registro
- Status: TRIALING → TRIAL_EXPIRED → ACTIVE → PAST_DUE → CANCELLED → PAUSED
- Middleware subscription-check: bloquea POST/PUT/PATCH/DELETE si expired (402)
- GET siempre permitido (read-only). Billing/auth/webhook/admin exentos.
- TrialBanner en dashboard: azul (trial activo), naranja (vencido), rojo (past-due)
- Cron job trial-expiration: cada hora

### Pipeline — UX Expedientes (implementado 30/03/2026)

- Primeras 3 tarjetas expandidas (nombre, teléfono, tags, próxima cita)
- Resto comprimidas como pestañas de expediente (solo nombre + indicador color)
- Hover expande la tarjeta con z-index alto y sombra
- Se activa cuando hay >5 pacientes en una columna
- Drag-and-drop funciona en ambos modos
- CSV import NO crea entradas en pipeline (solo Patient). Pipeline entry se crea por WhatsApp, creación manual, o cita.

### Seguridad

- **@fastify/helmet**: X-Frame-Options, X-Content-Type-Options, HSTS, etc.
- **CORS estricto**: origins explícitos (dashboard.dentiqa.app, admin.dentiqa.app, dentiqa.app)
- **Rate limiting**: 200/min general, 100/min WA webhook, 50/min MP webhook, 10/min login
- **Login lockout**: 5 intentos fallidos en 5 min → bloqueo por IP
- **SecurityLog model**: tipo, IP, email, userId, tenantId, endpoint, severity, userAgent
- **Input sanitizer**: stripHtml, sanitizeForLLM, detectPromptInjection, sanitizeLLMOutput, validateFileUpload
- **File upload**: MIME whitelist (jpeg/png/gif/webp/pdf) + magic bytes + 10MB limit. SVG bloqueado.
- **Tokens encriptados**: AES-256-GCM para WhatsApp access tokens y GCal tokens
- **Admin Security Dashboard**: /admin/security con stats 24h + logs filtrables + polling 10s

### Super Admin (/admin)

- Dashboard Global (MRR, gráfico crecimiento)
- Clínicas (wizard crear 5 pasos + detalle tabs + importar pacientes CSV + suscripción + impersonar)
- WhatsApp (monitoreo + force-disconnect) — polling 15s
- Templates (CRUD + Meta API submit/check/sync + timeline) — polling 15s
- Uso & Límites
- Seguridad (stats + logs filtrables) — polling 10s
- Jobs (estado de BullMQ workers)

### Landing Page (apps/landing — 14 secciones + SEO)

Navbar + Hero + Social Proof + Problema→Solución + 6 Features con mockups + Extra Features grid (12 cards) + Tabla Comparativa ("Dentiqa" vs "Sin sistema" vs "Herramientas separadas") + Precios USD con conversión local + Implementación Integral (9 items, sin precio visible) + Cómo Funciona (3 pasos) + Testimonios + FAQ (8 preguntas) + CTA Final (gradiente azul→violeta) + Footer con párrafo SEO + WhatsApp flotante

**SEO (implementado 30/03/2026):**
- Metadata completa con 20 keywords, OpenGraph, Twitter cards
- JSON-LD: SoftwareApplication + FAQPage
- sitemap.xml y robots.txt generados por Next.js
- OG image dinámica (1200x630, gradiente azul/violeta)
- H1/H2 con keywords, alt texts, footer descriptivo
- PENDIENTE: registrar en Google Search Console + enviar sitemap

### WhatsApp Embedded Signup

- App Dentiqa (ID: 1627937931777794) — Publicada (Live), Violet Wave IA verificada
- Embedded Signup Config ID: 1419326039498188
- ✅ FUNCIONANDO — Clínica Dentiqa conectada con +54 9 261 231-2567 (30/03/2026)
- Multi-WABA: identifica tenant por phone_number_id
- Webhook fields suscritos: messages ✅
- App Violet Wave IA (vieja): webhook ELIMINADO, no interfiere

### Performance (optimizado 30/03/2026)

- Polling reducido ~70%: de 60 req/min a 25 req/min
- Recharts: lazy loaded con next/dynamic (ssr: false) — ahorra ~126KB
- TanStack Query: staleTime configurado por tipo de dato
- Conversaciones: no pollea con tab oculto (document.hidden check)
- Pacientes: refresh-on-focus en vez de polling timer

### Favicons

- Landing (dentiqa.app): DQ azul (#2563EB)
- Dashboard (dashboard.dentiqa.app): DQ azul (#2563EB)
- Admin (admin.dentiqa.app): DQ negro (#1a1a1a)

---

## SCHEMA (leer packages/db/prisma/schema.prisma para estado real)

30+ modelos: Tenant, User (con dentistId FK → Dentist), Dentist (con linkedUser), DentistTreatment, DentistWorkingHours, GoogleCalendarToken, Chair, WorkingHours, TreatmentType, Appointment, Patient, MedicalHistory, OdontogramFinding, OdontogramVersion, TreatmentPlan, TreatmentPlanItem, ClinicalVisitNote, PeriodontogramEntry, PeriodontogramVersion, ClinicalNote, PipelineStage, PatientPipeline, Conversation, Message, Campaign, CampaignSend, WhatsAppTemplate, TemplateEvent, Notification, Automation, FaqEntry, UsageRecord, Subscription, AdminUser, PatientImage, Prescription, ConsentTemplate, PatientConsent, EvolutionTemplate, PlaqueRecord, MedicalHistoryAudit, SecurityLog

---

## ENDPOINTS PRINCIPALES

**Auth**: POST login, POST register, GET me
**Dashboard**: GET stats, GET usage
**Pacientes**: CRUD + historial clínico completo (9 sub-routes clínicas)
**Citas**: CRUD con validación GCal+horario+conflictos
**Agenda**: GET dentists, GET blocked-slots
**Pipeline**: GET stages, GET patients, PATCH move (OWNER/ADMIN/RECEPTIONIST only)
**Campañas**: CRUD + segment-count + setup-defaults + duplicate + sends + retry-failed (OWNER/ADMIN/RECEPTIONIST only)
**Conversaciones**: CRUD + messages + toggle IA
**Estadísticas**: GET overview, appointments-chart, revenue-chart, patients-chart, top-treatments, dentist-performance, hours-heatmap (OWNER/ADMIN only)
**Config**: clínica/working-hours/equipo/dentists/treatments/chairs/bot/pipeline (OWNER/ADMIN only)
**Billing**: GET subscription, POST create-subscription, POST change-plan, POST cancel
**Pricing**: GET pricing?country=XX, GET pricing/countries (públicos)
**GCal**: auth-url/callback/status/disconnect/sync
**WhatsApp**: embedded-signup-complete/disconnect/status/send-test + webhook
**Webhooks**: POST whatsapp (HMAC-SHA256 + filtro mensajes sistema Meta), POST mercadopago (verificación API)
**Admin**: auth/dashboard/tenants/clinicas/templates/whatsapp/usage/jobs/security
**Notificaciones**: GET list, GET unread-count, PATCH read, PATCH read-all

---

## ENV VARS

```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN
ANTHROPIC_API_KEY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
WHATSAPP_APP_ID=1627937931777794, WHATSAPP_APP_SECRET, WHATSAPP_CONFIGURATION_ID=1419326039498188
WHATSAPP_VERIFY_TOKEN, WHATSAPP_ENABLED=true
MP_ACCESS_TOKEN, MP_PUBLIC_KEY
APP_URL=(frontend URL, ngrok en dev), API_URL, LANDING_URL, ADMIN_URL, NODE_ENV
ENCRYPTION_KEY, RESEND_API_KEY, FROM_EMAIL, S3_*
```

---

## PARA LEVANTAR (dev)

1. Docker Desktop (PostgreSQL running)
2. `npm run dev` → web:3000, api:3001, landing:3002
3. `ngrok http 3000` (actualizar APP_URL en .env + webhook en Meta)
4. Redis OPCIONAL — sin Redis el server arranca igual, cron jobs desactivados

---

## PRODUCCIÓN — DEPLOY COMPLETADO (27/03/2026, actualizado 30/03/2026)

### Infraestructura

| Servicio | Plataforma | URL/Detalle |
|----------|-----------|-------------|
| PostgreSQL | Supabase (sa-east-1, us-west-2 pooler) | Proyecto "Dentiqa", 30+ tablas migradas |
| API (Fastify) | Railway | api.dentiqa.app (Dockerfile multi-stage, node:20-alpine + tsx) |
| Redis + BullMQ | Railway (mismo proyecto) | Addon Redis, URL interna |
| Dashboard | Vercel | dashboard.dentiqa.app (apps/web, root: apps/web) |
| Admin | Vercel (mismo deploy que dashboard) | admin.dentiqa.app (rewrite → /admin/*) |
| Landing | Vercel (proyecto separado) | dentiqa.app (apps/landing, root: apps/landing) |
| Storage (S3) | Supabase Storage | Bucket: patient-images, protocolo S3, endpoint propio |
| DNS | Cloudflare | dentiqa.app, 5 registros (A root + CNAME www/dashboard/admin/api) |

### Credenciales de producción (Super Admin)
- Email: admin@dentiqa.app
- Password: Dentiqa2026!

### Credenciales clínica test (Propietario)
- Email: pedrovega4680@gmail.com
- Password: Dentiqa2026!

### DNS en Cloudflare (todos DNS only, nube gris)

| Tipo | Nombre | Target |
|------|--------|--------|
| A | @ | 216.198.79.1 (Vercel) |
| CNAME | www | 599b43ea7f0f3dd3.vercel-dns-017.com |
| CNAME | dashboard | faf12bed34ae2d69.vercel-dns-017.com |
| CNAME | admin | faf12bed34ae2d69.vercel-dns-017.com |
| CNAME | api | zhyeabzt.up.railway.app |
| TXT | _railway-verify... | railway-verify=673635f... |

### Variables de entorno — Railway (API)

NODE_ENV, DATABASE_URL (pooled 6543), REDIS_URL (interno Railway), JWT_SECRET, JWT_EXPIRES_IN, ENCRYPTION_KEY, ANTHROPIC_API_KEY, WHATSAPP_APP_ID, WHATSAPP_APP_SECRET, WHATSAPP_CONFIGURATION_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_ENABLED, MP_ACCESS_TOKEN (producción), MP_PUBLIC_KEY (producción), APP_URL, API_URL, LANDING_URL, ADMIN_URL, RESEND_API_KEY, FROM_EMAIL, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

### Variables de entorno — Vercel (Dashboard + Landing)

NEXT_PUBLIC_API_URL=https://api.dentiqa.app, NEXT_PUBLIC_APP_URL=https://dashboard.dentiqa.app, NEXT_PUBLIC_LANDING_URL=https://dentiqa.app, NEXT_PUBLIC_MP_PUBLIC_KEY, NEXT_PUBLIC_WHATSAPP_APP_ID, NEXT_PUBLIC_WHATSAPP_CONFIGURATION_ID

### Webhook URLs (producción)
- WhatsApp: https://api.dentiqa.app/api/v1/webhooks/whatsapp ✅ (configurado en Meta, messages suscrito)
- Mercado Pago: https://api.dentiqa.app/api/v1/webhooks/mercadopago ✅ (configurado)
- Google Calendar: https://api.dentiqa.app/api/v1/gcal/callback ✅ (configurado)

### Docker (Railway)
- Dockerfile: apps/api/Dockerfile (multi-stage: builder + runner)
- Builder: node:20-alpine, npm ci, prisma generate, tsc build
- Runner: node:20-alpine + tsx (para resolver imports .ts de workspace packages en runtime)
- Watch paths: apps/api/**, packages/**
- Railway detecta PORT automáticamente (no setear PORT manualmente)

### Fixes aplicados durante deploy
1. binaryTargets en schema.prisma: ["native", "linux-musl-openssl-3.0.x"] para Alpine
2. skipLibCheck: true en apps/api/tsconfig.json para SDK de Anthropic
3. tsconfig.json raíz copiado en Dockerfile para resolver extends
4. Prisma JSON types casteados a InputJsonValue en templates.ts
5. tenantId cast a UncheckedCreateInput en medical-history.ts
6. tsx como loader en Docker runner (workspace packages exportan .ts, no .js)
7. bcryptjs v3 unificado entre packages/db y apps/api
8. CORS incluye los 3 dominios de producción siempre (no solo en NODE_ENV=production)
9. Admin API calls usan NEXT_PUBLIC_API_URL (no URLs relativas)
10. Vercel rewrite: /api/v1/* desde admin.dentiqa.app pasa directo (no prefija /admin/)
11. Health check usa singleton PrismaClient

### Errores conocidos producción
- DATABASE_URL sin espacios ni caracteres raros (causó "Database post  gres does not exist")
- PORT no setear manualmente en Railway (Railway lo inyecta, si lo ponés puede conflictear)
- Supabase Free plan pausa proyectos inactivos — reactivar antes de usar
- next/dynamic con ssr: false requiere "use client" en Next.js 15

---

## META BUSINESS — Estado (actualizado 30/03/2026)

### Business Manager: Violet Wave IA (ID: 4363335420552804)
- ✅ Verificado como proveedor de tecnología
- ✅ Verificación del negocio completada

### Apps en Meta Developers:
| App | ID | Estado | Uso |
|-----|----|--------|-----|
| **Dentiq** | 1627937931777794 | ✅ Publicada, Live, permisos aprobados | APP PRINCIPAL. Webhook OK, messages suscrito |
| **Violet Wave IA** | 87768683264473 | Modo Desarrollo | App vieja. Webhook ELIMINADO. No interfiere |

### WABAs en Business Manager:
| WABA | Estado |
|------|--------|
| Violet Wave IA (835367735905460) | ✅ Activa, verificada, mantener |
| Clínica Dentiqa | ✅ Activa, creada por Embedded Signup 30/03/2026 |
| Test WhatsApp Business Account (1516056797191360) | ❌ Bloqueada, ticket Meta abierto para eliminar |
| Dental Link / EPRE MDZ | Propiedad de EPRE MDZ, no se pueden eliminar, no afectan |

### Portfolios comerciales:
- **Violet Wave IA** — MANTENER (empresa principal verificada)
- EPRE MDZ — no se puede eliminar (tiene píxeles), no afecta
- Pedro Vega / EPRE Virtual / Gestor De Turnos — programados para eliminación

---

## COMPLETADO (actualizado 30/03/2026)

1. ✅ Mercado Pago webhook configurado + validación x-signature + notification_url en preapprovals + MP_WEBHOOK_SECRET en Railway
2. ✅ Facebook Login URIs actualizadas (ngrok → dashboard.dentiqa.app)
3. ✅ WhatsApp Embedded Signup typo fix (CONFIG_ID → CONFIGURATION_ID)
4. ✅ WhatsApp webhook configurado en app Dentiq (api.dentiqa.app)
5. ✅ Password Super Admin cambiado en producción
6. ✅ Páginas legales creadas (privacidad, términos, eliminación de datos)
7. ✅ URLs legales actualizadas en Meta Developers
8. ✅ Resend dominio dentiqa.app verificado — emails funcionando
9. ✅ Cloudflare Email Routing — admin@dentiqa.app + hola@dentiqa.app → pedrodev468@gmail.com
10. ✅ Google Calendar OAuth — redirect URI producción + app publicada
11. ✅ WhatsApp WABA DESBLOQUEADA — Meta confirmó
12. ✅ Embedded Signup FUNCIONANDO — clínica conectada con +54 9 261 231-2567
13. ✅ Limpieza Meta: WABAs innecesarias eliminadas, webhook app vieja eliminado
14. ✅ Filtro mensajes sistema Meta en webhook
15. ✅ CSV import no crea pipeline entries
16. ✅ Pipeline cards arregladas + UX expedientes (compact + hover)
17. ✅ Precios actualizados (89/149/249 USD)
18. ✅ Landing: tabla comparativa, sección implementación, badges funcionalidades
19. ✅ Favicons DQ (azul dashboard, negro admin)
20. ✅ Billing bug fix: botón activar plan habilitado en trial
21. ✅ Bug form nuevo usuario: campos vacíos al abrir
22. ✅ Límite usuarios por plan (5/10/ilimitados) + banner downgrade
23. ✅ Vinculación User ↔ Dentist (dentistId FK)
24. ✅ Permisos por rol (OWNER/ADMIN/DENTIST/RECEPTIONIST)
25. ✅ Performance: polling 60→25 req/min, lazy load Recharts
26. ✅ Odontograma dual view (frontal + oclusal) con dientes anatómicos SVG
27. ✅ SEO: metadata, JSON-LD, sitemap, robots.txt, OG image, H1/H2 keywords

---

## PENDIENTE

- Registrar dentiqa.app en Google Search Console + enviar sitemap
- Respuesta Meta sobre Test WABA (ticket abierto)
- Google OAuth verificación (quitar cartel "no verificado")
- Precio MP vs Landing consistencia (roundToNice)
- Odontograma: refinar SVGs con ilustraciones más anatómicas (diseñador o IA de ilustración)
- Testing e2e automatizado
- Monitoreo y alertas en producción

---

## ERRORES CONOCIDOS Y SOLUCIONES

**EPERM: rename query_engine-windows.dll.node** → Dev server tiene DLL bloqueado. Detener server, `npx prisma generate`, reiniciar.
**Slots vacíos** → DentistWorkingHours vacía → fallback a WorkingHours del tenant.
**Bot doble asterisco** → sanitizeForWhatsApp() convierte **bold** → *bold*.
**Bot 2 respuestas** → Processing lock por conversación. Follow-up batch con debounce 2s.
**Timezone** → DB siempre UTC. Tabla 14 días en system prompt con timezone Argentina.
**ECONNREFUSED Redis** → TCP probe antes de BullMQ. `.on("error")` swallows. Server continúa sin cron jobs.
**next/dynamic ssr:false** → Requiere "use client" directive en Next.js 15.
**Prisma migrate vs db push** → Producción usa db push, tabla _prisma_migrations puede no existir. Migraciones manuales ejecutar en Supabase SQL Editor.

---

## REGLAS (no negociables)

1. Tenant isolation en TODA query
2. Auth JWT + roles en cada endpoint
3. SUPER_ADMIN accede cualquier tenant
4. Tokens encriptados AES-256-GCM
5. Zod en cada endpoint
6. Seed idempotente (upsert)
7. Webhook idempotente
8. Feature flag WHATSAPP_ENABLED
9. Leer schema.prisma ANTES de cambios
10. `npx tsc --noEmit` después de cambios
11. No romper lo que funciona
12. UI español, código inglés
13. Timezone UTC en DB, tenant timezone en UI
14. Soft delete (isActive: false)
15. Precios en USD como source of truth
16. NUNCA bloquear datos del paciente por falta de pago (solo bloquear escritura)
17. Redis OPCIONAL — graceful degradation
18. Permisos por rol — DENTIST ve clínico, RECEPTIONIST ve comercial
19. User con rol DENTIST requiere dentistId vinculado
20. CSV import NO crea pipeline entries
