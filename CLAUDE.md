# CLAUDE.md — DentalFlow SaaS Platform (v0.4.0)

## IDENTIDAD DEL PROYECTO

Sos el CTO y desarrollador principal de DentalFlow, una plataforma SaaS todo-en-uno para clínicas dentales (odontólogos). Construís y mantenés un sistema que reemplaza completamente a Kommo CRM + Dentalink + herramientas de marketing externas en UNA SOLA plataforma propietaria.

- **Modelo de negocio:** SaaS mensual ($150–500/mes por clínica). NO vendemos implementaciones únicas.
- **Mercado principal:** Clínicas dentales en Latinoamérica (español, WhatsApp como canal principal).
- **Modelo de costos:** Fair-use por plan. UNA API key de Anthropic para todos. WhatsApp via Embedded Signup (cada clínica conecta su propia cuenta Meta). Usage tracking por clínica.

---

## ESTADO ACTUAL DEL PROYECTO

### ✅ Completado
- **Backend API** Fastify+TS en localhost:3001, **Frontend** Next.js 15 en localhost:3000
- **DB** PostgreSQL (Supabase) 25+ modelos Prisma
- **Auth JWT** dos niveles: clínica (admin@clinica-demo.com / password123) + Super Admin (admin@dentalflow.app / DentalFlow2026!)

**Dashboard Clínica (7 páginas):**
- **Home** — métricas + widget uso mensual (WhatsApp/IA barras de progreso)
- **Agenda** — calendario semanal/diario, multi-dentista, GCal integrado, drag-and-drop, validaciones horario laboral + conflictos + GCal
- **Pacientes** — tabla + ficha con 5 tabs (Odontograma SVG interactivo, Historia Médica, Plan Tratamiento, Notas Clínicas, Periodontograma)
- **Pipeline CRM** — Kanban 8 stages, drag-and-drop persistente, drawer, valor monetario por columna ($), auto config por stage, sync bidireccional con Agenda
- **Campañas** — wizard 4 pasos, 8 campañas default (idempotente), 15 templates catálogo, segmentación, métricas, retry failed
- **Conversaciones** — inbox estilo WhatsApp Web, burbujas, delivery status, toggle IA activo/pausado, polling 3-5s, datos demo en seed
- **Configuración** — 6 tabs (Clínica, Profesionales CRUD completo, Tratamientos, Sillones, Integraciones, Equipo)

**Integraciones implementadas:**
- **Google Calendar** — OAuth2 bidireccional por dentista, eventos privados bloqueantes, tareas ignoradas
- **WhatsApp Cloud API** — webhook HMAC-SHA256, WhatsAppService (text/template/buttons/list/markAsRead), feature flag, status updates
- **Chatbot IA** — system prompt dinámico por tenant, 6 tools function calling, claude-haiku-4-5-20251001, 300 tokens, temp 0.3
- **WhatsApp Processor** — flujo completo: mensaje→paciente→conversación→chatbot→respuesta→pipeline→usage

**Super Admin** (/admin): Dashboard Global (MRR, gráfico crecimiento), Clínicas (CRUD+impersonar), WhatsApp (monitoreo+force-disconnect), Uso & Límites

**Usage Tracking:** UsageRecord por tenant, widget barras progreso, límites por plan

**Rediseño UI Dashboard (Marzo 2026):**
- Sistema de diseño global: paleta azul profesional (#2563eb) reemplazando verde mint, tipografía Inter, cards con shadow-sm/rounded-xl, transiciones suaves
- Sidebar rediseñado: logo "DF" + "DentalFlow", items con borde izquierdo 3px primary activo, sección MENU con label uppercase, mobile hamburguesa con overlay
- Header rediseñado: subtítulos descriptivos por página, campana notificaciones (visual), avatar con gradiente, responsive
- Dashboard Home: cards métricas con íconos de color, widget uso del plan con barras de progreso, próximas citas, fallback elegante si API no responde
- Pacientes: empty state con ícono y CTA, avatares con gradiente, table headers uppercase, responsive columns
- Pipeline CRM: cards con avatar initials, hover scale, stripe 3px por stage, valor monetario con ícono DollarSign
- Conversaciones: colores teal→primary azul, conversación activa borde izquierdo, burbujas outbound más oscuras
- Campañas: colores unificados al sistema de diseño
- Configuración: consistencia visual global
- Admin pages: colores teal→primary
- Fix API URL: apiFetch usa rutas relativas via proxy Next.js rewrites para evitar CORS, apiServerFetch usa URL completa

**Landing Page (apps/landing) — Marzo 2026:**
- Proyecto Next.js 15 independiente en apps/landing/, puerto 3002
- Stack: Next.js 15 + Tailwind CSS + lucide-react
- 11 secciones: Navbar sticky, Hero con mockup dashboard, Social Proof, Problema→Solución, 6 Features con mockups de código, Tabla comparativa, Precios (3 plans), Testimonios, FAQ acordeón, CTA final con gradiente, Footer completo
- 100% responsive mobile-first
- Animaciones scroll con Intersection Observer
- SEO meta tags configurados
- Todos los mockups construidos con código (no imágenes)
- Texto completo en español orientado a clínicas dentales LATAM

### ✅ Completado — WhatsApp Embedded Signup (end-to-end funcionando)
- Flujo completo operativo con número real +54 9 261 231-2567
- WABA "Dental Link" (ID: 158155033313211) conectada al portfolio "EPRE MDZ"
- Modelo datos: Tenant con wabaId, whatsappPhoneNumberId, whatsappDisplayNumber, whatsappAccessToken (encriptado), whatsappConnectedAt, whatsappStatus
- Backend: POST embedded-signup-complete (code exchange + long-lived token + WABA phone_numbers lookup), DELETE disconnect, GET status, POST send-test
- Frontend: botón "Conectar WhatsApp" con FB SDK, FB.login() con response_type "code", config_id 1419326039498188
- Webhook multi-WABA: identifica tenant por phone_number_id, HMAC-SHA256 con rawBody (fastify-raw-body)
- Next.js proxy: rewrites /api/v1/* → localhost:3001 (ngrok al puerto 3000)
- Long-lived token exchange (~60 días) después del code exchange
- Modal de desconexión profesional (reemplazó window.confirm)
- apiFetch maneja 204 No Content sin crash

### ✅ Completado — Meta Tech Provider
- Verificación del negocio (Violet Wave IA): ✅ APROBADA
- 2FA activado en cuenta Meta
- Configuración de la app: ✅ Completada (política privacidad, ícono, categoría Business and Pages)
- Videos documentación: ✅ Subidos (whatsapp_business_messaging + whatsapp_business_management)
- Uso permitido + Tratamiento de datos: ✅ Completado (Supabase Inc + Anthropic PBC como data processors, Argentina como país responsable)
- Revisión de la app: ✅ APROBADA
- App publicada en modo Live

### App Meta configurada:
- App: DentalFlow (ID: 1627937931777794), Business: Violet Wave IA — **Publicada (Live)**
- Embedded Signup Configuration ID: 1419326039498188 (variación "Registro insertado de WhatsApp", token que no expira, WhatsApp Cloud API + Marketing Messages API)
- Webhook verificado, suscrito a: messages
- FB Login for Business: SDK JS activado, OAuth URIs configuradas
- **NOTA:** URLs de ngrok cambian al reiniciar. Actualizar en Meta + .env/APP_URL

### 📋 Pendiente
- ~~Tech Provider Meta~~ → ✅ Aprobada y publicada
- Sistema de límites de mensajes mensuales por plan y cobro extra
- Configuración por clínica (reglas del bot: descuentos sí/no, mensajes de seguimiento, etc.)
- Automatizaciones del pipeline (seguimiento automático por etapa con cron jobs)
- Refinar system prompt del chatbot
- Billing (Stripe/MP suscripciones)
- ~~Landing page~~ → ✅ Completada (apps/landing)
- Deploy landing (Vercel → dentalflow.app)
- Conectar dominio dentalflow.app para landing + app.dentalflow.app para dashboard
- IA Central (templates recomendados cross-clínica)
- BullMQ workers producción
- Deploy (Vercel + Railway + Supabase)
- Testing (unit + e2e)

---

## STACK TÉCNICO

```
MONOREPO
├── apps/web (Next.js 15 + shadcn/ui), apps/api (Fastify+TS), apps/landing (Next.js 15 + Tailwind, puerto 3002)
├── packages/db (Prisma), shared (Zod), ai (chatbot), messaging (WA+email), campaigns, connectors, ui
├── CLAUDE.md, WHATSAPP_SETUP.md, .env
```

Frontend: Next.js 15 + shadcn/ui + Tailwind | State: Zustand + TanStack Query | Backend: Fastify+TS | DB: PostgreSQL Supabase + Prisma | Cache: Redis + BullMQ | Auth: @fastify/jwt (OWNER/ADMIN/DENTIST/RECEPTIONIST/SUPER_ADMIN) | IA: Anthropic claude-haiku-4-5-20251001 | WA: Meta Cloud API + Embedded Signup | GCal: OAuth2 | DnD: @dnd-kit | Email: Resend | FB SDK: Facebook JS SDK | Tunnel: ngrok (dev)

---

## SCHEMA (SIEMPRE leer packages/db/prisma/schema.prisma para estado real)

25+ modelos: Tenant (con wabaId, whatsappPhoneNumberId, whatsappDisplayNumber, whatsappAccessToken, whatsappConnectedAt, whatsappStatus), User, Dentist, DentistTreatment, DentistWorkingHours, DentistGoogleCalendarToken, Chair, WorkingHours, TreatmentType, Appointment, Patient, MedicalHistory, OdontogramFinding, TreatmentPlan+Items, ClinicalVisitNote, PeriodontogramEntry, ClinicalNote, PipelineStage (auto-config), PatientPipeline (interestTreatment, lastAutoMessageSentAt), Conversation, Message, Campaign, CampaignSend, Automation, FaqEntry, UsageRecord

---

## ENDPOINTS PRINCIPALES

Auth: login, me | Dashboard: stats+usage | Pacientes: CRUD + historial clínico completo | Citas: CRUD con validación GCal+horario+conflictos | Agenda: dentists, blocked-slots | Pipeline: stages+patients+move (stageValue) | Campañas: CRUD + segment-count + setup-defaults(idempotente) + duplicate + sends + retry-failed | Conversaciones: CRUD + messages + toggle IA | Config: clínica/working-hours/equipo/dentists/treatments/chairs | GCal: auth-url/callback/status/disconnect/sync | WhatsApp: embedded-signup-complete/disconnect/status/send-test + webhook | Admin: login/dashboard/tenants/impersonate/usage/whatsapp-monitor/force-disconnect

---

## PIPELINE — 8 Stages con Automatización

Nuevo Contacto → Interesado No Agendó (5h msg auto) → Primera Cita Agendada → En Tratamiento → Seguimiento (6 meses reminder) → Paciente Fidelizado → Remarketing (1 semana + descuento configurable) → Inactivo

Config por stage: autoMessage(Enabled/DelayHours/Template), autoMove(Enabled/DelayHours/TargetStageId), discount(Enabled/Percent/Message)
Sync Agenda: Completada→Seguimiento, NoAsistió/Cancelada→InteresadoNoAgendó, Confirmada→PrimeraCitaAgendada
BullMQ job pipeline-automations cada 30min. Valor monetario por columna.

---

## CHATBOT IA — 6 Tools Function Calling

1. book_appointment — busca slots (agenda+GCal+WorkingHours), filtra dentistas por tratamiento, 3 opciones botones
2. cancel_appointment — cancela, mueve pipeline
3. reschedule_appointment — reagenda
4. check_appointment — consulta próxima cita
5. answer_faq — busca FaqEntry tenant
6. transfer_to_human — cambia conversación HUMAN_NEEDED

System prompt dinámico: clínica(nombre/dirección/horarios) + dentistas(especialidades/tratamientos) + precios + FAQs + paciente(nombre/cita/pipeline) + últimos 10 msgs

---

## ENV VARS

```
DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRES_IN
ANTHROPIC_API_KEY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
WHATSAPP_APP_ID=1627937931777794
WHATSAPP_APP_SECRET=(en .env, no commitear)
WHATSAPP_CONFIGURATION_ID=1419326039498188
WHATSAPP_VERIFY_TOKEN=dentalflow_webhook_verify_2026
WHATSAPP_ENABLED=true
APP_URL=(URL frontend, ngrok en dev)
API_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MP_ACCESS_TOKEN
RESEND_API_KEY, FROM_EMAIL, S3_*, ENCRYPTION_KEY, NODE_ENV
```

---

## PLANES Y LÍMITES (nueva arquitectura pensada)

| | Plan $100/mes | Plan $200/mes | Plan $250-300/mes |
|---|---|---|---|
| Perfil | Odontólogo independiente | Clínica mediana (<5 sillas) | Clínica grande (5+ sillas) |
| Conversaciones IA/mes | ~1,000 | ~3,000 | ~5,000+ |
| Al llegar al límite | Aviso al 80% y 100%, cobro extra $15-20/500 conv | Ídem | Ídem |

Modelo IA: Haiku 4.5 principal (~$0.005-0.01/conv), Sonnet 4 para escalaciones complejas.

---

## PARA LEVANTAR EL ENTORNO (dev)

1. Abrir Docker Desktop (esperar a que PostgreSQL esté running)
2. `npm run dev` (levanta web:3000, api:3001, landing:3002)
3. `ngrok http 3000` (si la URL cambia, actualizar APP_URL en .env, webhook en Meta, y OAuth URIs)
4. Acceder via la URL HTTPS de ngrok

---

## CHANGELOG

### 2026-03-19 — WhatsApp Embedded Signup end-to-end + Haiku 4.5

**WhatsApp Embedded Signup — COMPLETADO Y FUNCIONANDO:**
- Flujo completo end-to-end operativo con número real +54 9 261 231-2567
- WABA "Dental Link" (ID: 158155033313211) conectada al portfolio "EPRE MDZ"
- App DentalFlow publicada en modo Live en Meta Developer Dashboard
- Nueva configuración de Embedded Signup (ID: 1419326039498188) con variación "Registro insertado de WhatsApp", token que no expira
- ngrok apuntando al puerto 3000 (frontend), webhooks pasan por proxy de Next.js al API en 3001

**Fixes aplicados:**
- response_type cambiado de 'token' a 'code' en FB.login() para nueva configuración
- redirect_uri removido del code exchange (no se usa en flujo popup)
- Phone Number ID fix: ahora se obtiene via GET /{wabaId}/phone_numbers en vez de usar WABA ID de granular_scopes
- Bug body vacío en POST send-test y DELETE disconnect: agregado JSON.stringify({})
- apiFetch global: manejo de 204 No Content sin intentar parsear JSON
- Modal de desconectar: reemplazado window.confirm() con modal React profesional
- Webhook signature: usa rawBody (fastify-raw-body) en vez de JSON.stringify(body)
- Long-lived token exchange (~60 días) después del code exchange

**Configuración de IA:**
- Modelo cambiado de claude-sonnet-4-20250514 a claude-haiku-4-5-20251001
- ANTHROPIC_API_KEY configurada ($5 USD créditos en console.anthropic.com, org: DentalFlow)
- Chatbot respondiendo correctamente a mensajes de WhatsApp

**URLs y configuración actual:**
- ngrok: https://postulational-humourlessly-julianne.ngrok-free.dev → localhost:3000
- Webhook URL en Meta: https://postulational-humourlessly-julianne.ngrok-free.dev/api/v1/webhooks/whatsapp
- Meta App DentalFlow (ID: 1627937931777794) — Publicada, review aprobada
- Embedded Signup Config ID: 1419326039498188

### 2026-03-16 — Rediseño UI + Landing Page
- Rediseño completo del dashboard: nueva paleta azul (#2563eb), sidebar, header, todas las páginas
- Fix bug dashboard "Failed to parse URL": apiFetch ahora usa rutas relativas via Next.js proxy
- Fix CORS: todos los fetch client-side usan /api/v1/* que pasan por rewrite de Next.js a localhost:3001
- Creada landing page completa en apps/landing/ (puerto 3002) con 11 secciones
- Política de privacidad DentalFlow publicada: violetwaveai.com/dentalflow/politica-de-privacidad

### 2026-03-14/15 — Registro Meta Tech Provider
- Verificación negocio Violet Wave IA: APROBADA
- App DentalFlow configurada: política privacidad, ícono, categoría
- Videos documentación grabados y subidos
- Solicitud revisión app enviada (whatsapp_business_messaging + whatsapp_business_management + public_profile)
- Esperando aprobación de Meta

---

## ERRORES CONOCIDOS Y SOLUCIONES (para no repetir)

**Error: "Body cannot be empty when content-type is set to 'application/json'" (Fastify 400)**
- Causa: El frontend envía POST/DELETE con Content-Type: application/json pero sin body
- Solución: Agregar body: JSON.stringify({}) en el fetch del frontend
- Regla: Siempre que se haga fetch con apiFetch y método POST/DELETE/PUT, incluir body aunque sea {}

**Error: "Object with ID 'xxx' does not exist" al enviar mensaje de WhatsApp**
- Causa: Se guardaba el WABA ID como Phone Number ID. debug_token devuelve WABA IDs en granular_scopes, no phone number IDs
- Solución: Siempre obtener el Phone Number ID via GET /{wabaId}/phone_numbers, nunca usar IDs de granular_scopes
- Archivo: apps/api/src/routes/whatsapp/index.ts

**Error: "Error validating verification code. redirect_uri must be identical"**
- Causa: El code exchange enviaba redirect_uri pero FB.login() popup no usa redirects
- Solución: No enviar redirect_uri en el code exchange cuando se usa FB.login() popup flow

**Error: "response_type=token no se admite en este flujo"**
- Causa: La configuración de Embedded Signup con variación "Registro insertado de WhatsApp" requiere response_type: 'code'
- Solución: Usar response_type: 'code' y override_default_response_type: true en FB.login()

**Error: 204 No Content causa crash en apiFetch**
- Causa: res.json() en una respuesta 204 falla porque no hay body
- Solución: Verificar res.status === 204 antes de parsear JSON, retornar undefined
- Archivo: apps/web/src/lib/api.ts

**Error: "authentication_error - invalid x-api-key" en chatbot**
- Causa: ANTHROPIC_API_KEY no configurada o inválida en .env
- Solución: Obtener API key de console.anthropic.com y agregarla al .env
- Nota: La conversación queda en "Necesita Humano" cuando el chatbot falla. Reactivar IA desde Conversaciones.

**Error: "Embedded signup is only available for BSPs or TPs"**
- Causa: La app de Meta estaba en modo Development (sin publicar)
- Solución: Publicar la app desde Meta Developer Dashboard → Publicar (app review debe estar aprobada)

**Error: "Dominio de host desconocido de JSSDK"**
- Causa: El dominio de ngrok no estaba en los dominios permitidos del SDK de JavaScript en Meta
- Solución: Agregar en Facebook Login → Settings → "Dominios permitidos para el SDK de JavaScript" y "URI de redireccionamiento de OAuth válidos"

---

## REGLAS (no negociables)

1. Tenant isolation TODA query 2. Auth JWT+roles cada endpoint 3. SUPER_ADMIN accede cualquier tenant 4. Tokens encriptados AES-256-GCM 5. Zod cada endpoint 6. Seed idempotente (upsert) 7. Webhook idempotente (whatsappMessageId) 8. Feature flag WHATSAPP_ENABLED 9. Leer schema.prisma real antes de cambios 10. npx tsc --noEmit después de cambios 11. No romper lo que funciona 12. UI español, código inglés 13. Timezone UTC en DB, tenant timezone en UI 14. Soft delete (isActive: false) 15. ngrok URLs cambian — actualizar en Meta y .env al reiniciar
