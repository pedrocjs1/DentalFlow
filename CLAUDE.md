# CLAUDE.md — DentalFlow SaaS Platform (v0.6.0)

## IDENTIDAD DEL PROYECTO

Sos el CTO y desarrollador principal de DentalFlow, una plataforma SaaS todo-en-uno para clínicas dentales. Reemplaza Kommo CRM + Dentalink + herramientas de marketing en UNA SOLA plataforma propietaria con IA integrada.

- **Modelo de negocio:** SaaS mensual (USD 99–299/mes) + Setup Fee (USD 499 pago único). Trial 14 días gratis.
- **Mercado:** Clínicas dentales en Latinoamérica (español, WhatsApp como canal principal).
- **Pricing:** Precios en USD, conversión automática a moneda local por país (10 monedas LATAM).
- **Costos:** UNA API key Anthropic para todos. WhatsApp via Embedded Signup (cada clínica conecta su WABA). Usage tracking por clínica.

---

## STACK TÉCNICO

```
MONOREPO
├── apps/web (Next.js 15 + shadcn/ui)     → localhost:3000
├── apps/api (Fastify + TypeScript)        → localhost:3001
├── apps/landing (Next.js 15 + Tailwind)   → localhost:3002
├── packages/db (Prisma), shared (Zod), ai (chatbot), messaging (WA+email), campaigns, connectors, ui
└── CLAUDE.md, .env, env.production.example
```

Frontend: Next.js 15 + shadcn/ui + Tailwind + Recharts | State: Zustand + TanStack Query
Backend: Fastify + TS + @fastify/helmet + @fastify/rate-limit + @fastify/jwt + fastify-raw-body
DB: PostgreSQL (Supabase) + Prisma (30+ modelos) | Cache: Redis + BullMQ (graceful degradation)
Auth: JWT dos niveles (clínica OWNER/ADMIN/DENTIST/RECEPTIONIST + SUPER_ADMIN) + login lockout
IA: Anthropic claude-haiku-4-5-20251001 (principal) + claude-sonnet-4-20250514 (escalación)
WA: Meta Cloud API + Embedded Signup | GCal: OAuth2 bidireccional
Billing: Mercado Pago preapproval API (ARS) + exchange rates API
Security: Helmet + CORS estricto + input sanitizer + file validation + SecurityLog + prompt injection protection
DnD: @dnd-kit | Email: Resend | Tunnel: ngrok (dev)

---

## ESTADO ACTUAL — TODO LO IMPLEMENTADO

### Dashboard Clínica (8 páginas)

| Página | Ruta | Descripción |
|--------|------|-------------|
| Inicio | /dashboard | Métricas + widget uso mensual + próximas citas |
| Agenda | /agenda | Calendario semanal/diario, multi-dentista, GCal integrado, drag-and-drop |
| Pacientes | /pacientes | Tabla + ficha profesional con 8 tabs (ver abajo) |
| Pipeline | /pipeline | Kanban 8 stages, drag-and-drop, valor monetario, auto-config |
| Campañas | /campanas | Wizard 4 pasos, 8 campañas default, 15 templates, segmentación |
| Estadísticas | /estadisticas | 7 endpoints analytics, 6 gráficos Recharts, heatmap, filtro período |
| Conversaciones | /conversaciones | Inbox WhatsApp Web, burbujas, delivery status, toggle IA |
| Configuración | /configuracion | 9 tabs: Clínica, Chatbot IA (5 sub-tabs), Profesionales, Tratamientos, Sillones, Pipeline, Integraciones, Facturación, Equipo |

### Ficha del Paciente — 8 Tabs

1. **Resumen**: alertas médicas, stats cards, plan activo, próximas citas, timeline
2. **Odontograma**: versionado (snapshot/restaurar), permanente/temporal (32 vs 20), diagnóstico por hallazgo
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

- **WhatsApp Cloud API**: Embedded Signup, webhook HMAC-SHA256, multi-WABA, text/template/buttons/list
- **Google Calendar**: OAuth2 por dentista, bidireccional, slots bloqueados, graceful degradation
- **Mercado Pago**: preapproval API (suscripciones recurrentes ARS), webhook con verificación, dunning 3 intentos
- **Meta Templates**: submit/check/sync vía API Graph, timeline de eventos, panel Super Admin

### Estadísticas (Recharts)

7 endpoints: overview, appointments-chart, revenue-chart, patients-chart, top-treatments, dentist-performance, hours-heatmap. Filtro por período (7d/30d/90d/12m). Comparación vs período anterior.

### Registro Self-service

- Página /registro: wizard 3 pasos (clínica → cuenta → confirmación)
- POST /api/v1/auth/register: transacción que crea Tenant + User(OWNER) + Subscription(TRIALING 14d) + WorkingHours + 8 PipelineStages + 5 TreatmentTypes
- 10 países LATAM con timezone automático
- Auto-login con JWT + modal de bienvenida

### Precios y Billing

**Precios USD (source of truth):**

| | STARTER | PROFESSIONAL | ENTERPRISE |
|---|---|---|---|
| Precio | USD 99/mes | USD 199/mes | USD 299/mes |
| Perfil | Odontólogo independiente | Clínica mediana (<5 sillones) | Clínica grande (5+) |
| WhatsApp msgs/mes | 2,000 | 5,000 | 10,000 |
| IA interactions/mes | 2,000 | 5,000 | 10,000 |
| Dentistas | 2 | Ilimitados | Ilimitados |

- **Setup Fee**: USD 499 (pago único, waivable por admin)
- **Conversión**: API open.er-api.com con cache 6h + fallback + roundToNice()
- **10 monedas**: ARS, CLP, COP, MXN, UYU, BRL, USD (Ecuador), PYG, BOB, PEN
- **MP cobra en ARS**: conversión dinámica USD→ARS al crear suscripción
- **Overage**: $20/1000 interacciones extra, nunca se bloquea al paciente

### Trial y Lockout

- Trial: 14 días gratis desde registro
- Status: TRIALING → TRIAL_EXPIRED → ACTIVE → PAST_DUE → CANCELLED → PAUSED
- Middleware subscription-check: bloquea POST/PUT/PATCH/DELETE si expired (402)
- GET siempre permitido (read-only). Billing/auth/webhook/admin exentos.
- TrialBanner en dashboard: azul (trial activo), naranja (vencido), rojo (past-due)
- Cron job trial-expiration: cada hora

### Seguridad

- **@fastify/helmet**: X-Frame-Options, X-Content-Type-Options, HSTS, etc.
- **CORS estricto**: origin=APP_URL, methods/headers explícitos
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

### Landing Page (apps/landing — 14 secciones)

Navbar + Hero + Social Proof + Problema→Solución + 6 Features con mockups + Extra Features grid (12 cards) + Tabla Comparativa 4 columnas + Precios USD con conversión local + Cómo Funciona (3 pasos) + Testimonios + FAQ (8 preguntas) + CTA Final (gradiente azul→violeta) + Footer + WhatsApp flotante

### WhatsApp Embedded Signup

- App DentalFlow (ID: 1627937931777794) — Publicada (Live), Violet Wave IA verificada
- Embedded Signup Config ID: 1419326039498188
- WABA "Dental Link" (ID: 158155033313211)
- Multi-WABA: identifica tenant por phone_number_id

---

## SCHEMA (leer packages/db/prisma/schema.prisma para estado real)

30+ modelos: Tenant, User, Dentist, DentistTreatment, DentistWorkingHours, GoogleCalendarToken, Chair, WorkingHours, TreatmentType, Appointment, Patient, MedicalHistory, OdontogramFinding, OdontogramVersion, TreatmentPlan, TreatmentPlanItem, ClinicalVisitNote, PeriodontogramEntry, PeriodontogramVersion, ClinicalNote, PipelineStage, PatientPipeline, Conversation, Message, Campaign, CampaignSend, WhatsAppTemplate, TemplateEvent, Notification, Automation, FaqEntry, UsageRecord, Subscription, AdminUser, PatientImage, Prescription, ConsentTemplate, PatientConsent, EvolutionTemplate, PlaqueRecord, MedicalHistoryAudit, SecurityLog

---

## ENDPOINTS PRINCIPALES

**Auth**: POST login, POST register, GET me
**Dashboard**: GET stats, GET usage
**Pacientes**: CRUD + historial clínico completo (9 sub-routes clínicas)
**Citas**: CRUD con validación GCal+horario+conflictos
**Agenda**: GET dentists, GET blocked-slots
**Pipeline**: GET stages, GET patients, PATCH move
**Campañas**: CRUD + segment-count + setup-defaults + duplicate + sends + retry-failed
**Conversaciones**: CRUD + messages + toggle IA
**Estadísticas**: GET overview, appointments-chart, revenue-chart, patients-chart, top-treatments, dentist-performance, hours-heatmap
**Config**: clínica/working-hours/equipo/dentists/treatments/chairs/bot/pipeline
**Billing**: GET subscription, POST create-subscription, POST change-plan, POST cancel
**Pricing**: GET pricing?country=XX, GET pricing/countries (públicos)
**GCal**: auth-url/callback/status/disconnect/sync
**WhatsApp**: embedded-signup-complete/disconnect/status/send-test + webhook
**Webhooks**: POST whatsapp (HMAC-SHA256), POST mercadopago (verificación API)
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
APP_URL=(frontend URL, ngrok en dev), API_URL, NODE_ENV
ENCRYPTION_KEY, RESEND_API_KEY, FROM_EMAIL, S3_*
```

---

## PARA LEVANTAR (dev)

1. Docker Desktop (PostgreSQL running)
2. `npm run dev` → web:3000, api:3001, landing:3002
3. `ngrok http 3000` (actualizar APP_URL en .env + webhook en Meta)
4. Redis OPCIONAL — sin Redis el server arranca igual, cron jobs desactivados

---

## 📋 PENDIENTE

- Deploy a producción (Vercel + Railway + Supabase)
- Google Calendar credenciales (código 100% listo, falta configurar OAuth consent screen en Google Cloud)
- Definición de nombre/marca final
- Testing e2e automatizado

---

## ERRORES CONOCIDOS Y SOLUCIONES

**EPERM: rename query_engine-windows.dll.node** → Dev server tiene DLL bloqueado. Detener server, `npx prisma generate`, reiniciar.
**Slots vacíos** → DentistWorkingHours vacía → fallback a WorkingHours del tenant.
**Bot doble asterisco** → sanitizeForWhatsApp() convierte **bold** → *bold*.
**Bot 2 respuestas** → Processing lock por conversación. Follow-up batch con debounce 2s.
**Timezone** → DB siempre UTC. Tabla 14 días en system prompt con timezone Argentina.
**ECONNREFUSED Redis** → TCP probe antes de BullMQ. `.on("error")` swallows. Server continúa sin cron jobs.

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
