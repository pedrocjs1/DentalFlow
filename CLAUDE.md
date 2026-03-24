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
- **Configuración** — 8 tabs (Clínica, Chatbot IA [5 sub-tabs], Profesionales, Tratamientos [con follow-up], Sillones, Pipeline [config automations con SELECT de templates], Integraciones, Equipo)

**Integraciones implementadas:**
- **Google Calendar** — OAuth2 bidireccional por dentista, eventos privados bloqueantes, tareas ignoradas
- **WhatsApp Cloud API** — webhook HMAC-SHA256, WhatsAppService (text/template/buttons/list/markAsRead), feature flag, status updates
- **Chatbot IA** — arquitectura 3 capas (Intent Router → Haiku 4.5 → Sonnet escalación), system prompt dinámico por tenant con BotConfig, 8 tools function calling (book_appointment, confirm_appointment, cancel_appointment, reschedule_appointment, check_appointment, answer_faq, transfer_to_human, update_patient_data), 300 tokens, temp 0.3
- **WhatsApp Processor** — flujo completo: mensaje→registro→paciente→conversación→debounce→intent router→chatbot→respuesta→pipeline→usage. Debounce configurable (10-20s, default 12s) con processing lock. Manejo de audios sin IA.
- **Botones interactivos WhatsApp** — selección de slots (3 botones) y dentistas, cancelación (confirmar/mantener), resueltos en Capa 1 (0 tokens). PendingBooking state en memoria con TTL 15min.
- **Reagendamiento WhatsApp** — flujo completo: reschedule_appointment → buscar slots → botones → cancelar vieja + crear nueva. Pipeline no baja de etapa. GCal sync.
- **Cancelación WhatsApp** — flujo con confirmación: cancel_appointment → mostrar datos + botones [Sí/No] → cancelar o mantener. Pipeline → "Interesado - No Agendó". GCal sync.
- **Google Calendar en chatbot** — findAvailableSlots filtra por GCal blocked, createAppointment crea evento GCal, cancel/reschedule eliminan evento GCal. Graceful degradation si GCal no conectado.
- **Registro de pacientes** — state machine (RegistrationState) con pasos configurables: nombre→birthdate→insurance→email→address→condiciones→alergias→medicamentos→hábitos. Primera bienvenida inmediata, respuestas por debounce. Parser de fechas en español (texto natural, 0 tokens). Sub-tab "Registro" en Configuración con 9 toggles.

**Dashboard Reactivo (polling inteligente):**
- Pipeline: 8s, Agenda: 10s, Home: 30s, Pacientes: 15s, Campañas: 30s, Conversaciones: 3-5s
- document.hidden check — no gasta recursos en background
- Silent fetch (sin loading spinner en polling)

**Pipeline configurable (Configuración > Pipeline):**
- 8 etapas expandibles, auto-mensaje con SELECT de template aprobado, auto-move, descuentos
- Pipeline visual: borde 4px color por etapa, empty state SVG, link a configuración

**Tratamientos con seguimiento:**
- followUpEnabled, followUpMonths, postProcedureCheck, postProcedureDays, followUpMessage, isMultiSession
- Completar cita: multi-sesión→"En Tratamiento", sesión única→"Seguimiento"

**Templates WhatsApp (3 niveles):**
- Nivel 1: 10 templates del sistema (isSystemTemplate, APPROVED, solo lectura)
- Nivel 2: Templates personalizados (Draft→Submitted→Approved/Rejected)
- Nivel 3: Selección en Pipeline (SELECT de templates aprobados)
- Vista en Campañas: "Templates del sistema" + "Mis templates"

**Notificaciones categorizadas:**
- Panel 420px con 4 tabs: Mensajes, Sistema, Pipeline, IA
- 11+ tipos: new_patient, human_needed, new_appointment, appointment_completed, appointment_no_show, cancelled_appointment, appointment_end_reminder, usage_warning, pipeline_move, template_status
- Acciones rápidas: [Completar] [No asistió] desde notificación, [Abrir chat] para human_needed
- appointment_end_reminder: auto-detect citas pasadas cada 60s
- Badge: rojo si human_needed, azul normal, contador por tab

**Super Admin** (/admin): Dashboard Global (MRR, gráfico crecimiento), Clínicas (wizard crear+detalle tabs+importar pacientes+suscripción+impersonar), WhatsApp (monitoreo+force-disconnect), Templates (CRUD+Meta API submit/check/sync+timeline), Uso & Límites

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
- ~~Sistema de límites de mensajes mensuales por plan y cobro extra~~ → ✅ Implementado
- ~~Configuración por clínica (reglas del bot)~~ → ✅ Implementado (pestaña Chatbot IA)
- ~~Refinar system prompt del chatbot~~ → ✅ Optimizado con BotConfig + 3 capas + tabla fechas
- ~~Agendamiento end-to-end~~ → ✅ book_appointment + confirm_appointment + botones interactivos
- ~~Reagendamiento + Cancelación inteligente~~ → ✅ reschedule_appointment con botones + cancel con confirmación + GCal sync
- ~~Registro de pacientes nuevos~~ → ✅ State machine + configuración en dashboard
- ~~Landing page~~ → ✅ Completada (apps/landing)
- ~~Dashboard reactivo~~ → ✅ Polling inteligente en todas las vistas (8-30s)
- ~~Notificaciones~~ → ✅ Panel con 4 tabs + acciones rápidas + categorías
- ~~Templates WhatsApp~~ → ✅ Arquitectura 3 niveles (sistema/personalizados/pipeline)
- ~~Pipeline configurable~~ → ✅ Auto-mensaje con SELECT de templates + auto-move + descuentos
- ~~Tratamientos con seguimiento~~ → ✅ followUp + postProcedure + isMultiSession
- Google Calendar credenciales → ⏳ Pendiente configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env (código 100% listo)
- Cron jobs para automatizaciones del pipeline (BullMQ workers)
- Estadísticas y gráficos avanzados
- Recomendaciones de IA basadas en estadísticas (tab IA en notificaciones preparado)
- ~~Enviar templates a Meta para aprobación real~~ → ✅ Panel Super Admin con Meta API (submit/check/sync)
- Billing (Stripe/MP suscripciones)
- Deploy landing (Vercel → dentalflow.app)
- Conectar dominio dentalflow.app para landing + app.dentalflow.app para dashboard
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

28+ modelos: Tenant (con wabaId, whatsappPhoneNumberId, whatsappDisplayNumber, whatsappAccessToken, whatsappConnectedAt, whatsappStatus, botTone, botLanguage, askBirthdate, askInsurance, offerDiscounts, maxDiscountPercent, proactiveFollowUp, leadRecontactHours, campaignBirthday, campaignPeriodicReminder, campaignReactivation, messageDebounceSeconds, disabledTemplateIds), User, Dentist, DentistTreatment, DentistWorkingHours, DentistGoogleCalendarToken, Chair, WorkingHours, TreatmentType, Appointment, Patient, MedicalHistory, OdontogramFinding, TreatmentPlan+Items, ClinicalVisitNote, PeriodontogramEntry, ClinicalNote, PipelineStage (auto-config), PatientPipeline (interestTreatment, lastAutoMessageSentAt), Conversation, Message, Campaign, CampaignSend, WhatsAppTemplate (global, tenantId nullable), TemplateEvent, Subscription (plan, status, trial, billing), Automation, FaqEntry, UsageRecord

---

## ENDPOINTS PRINCIPALES

Auth: login, me | Dashboard: stats+usage | Pacientes: CRUD + historial clínico completo | Citas: CRUD con validación GCal+horario+conflictos | Agenda: dentists, blocked-slots | Pipeline: stages+patients+move (stageValue) | Campañas: CRUD + segment-count + setup-defaults(idempotente) + duplicate + sends + retry-failed | Conversaciones: CRUD + messages + toggle IA | Config: clínica/working-hours/equipo/dentists/treatments/chairs + **bot** (GET/PUT configuración chatbot con Zod) | GCal: auth-url/callback/status/disconnect/sync | WhatsApp: embedded-signup-complete/disconnect/status/send-test + webhook | Admin: login/dashboard/tenants/impersonate/usage/whatsapp-monitor/force-disconnect/templates(CRUD+submit+check+sync)/connected-wabas/clinicas(crear+import-patients+subscription+patients) | Templates catálogo: catalog/toggle

---

## PIPELINE — 8 Stages con Automatización

Nuevo Contacto → Interesado No Agendó (5h msg auto) → Primera Cita Agendada → En Tratamiento → Seguimiento (6 meses reminder) → Paciente Fidelizado → Remarketing (1 semana + descuento configurable) → Inactivo

Config por stage: autoMessage(Enabled/DelayHours/Template), autoMove(Enabled/DelayHours/TargetStageId), discount(Enabled/Percent/Message)
Sync Agenda: Completada→Seguimiento, NoAsistió/Cancelada→InteresadoNoAgendó, Confirmada→PrimeraCitaAgendada
BullMQ job pipeline-automations cada 30min. Valor monetario por columna.

---

## CHATBOT IA — Arquitectura 3 Capas (Code-first, AI-last)

**Capa 1 — Intent Router (packages/ai/src/intent-router.ts) — 0 tokens:**
- Regex/keyword matching para 7 intenciones: GREETING, HOURS, CANCEL, LOCATION, TREATMENTS, HUMAN, FRUSTRATION
- Multi-idioma (es/pt/en), siempre incluye español como fallback
- FRUSTRATION y HUMAN con confidence "high" → transfer inmediato a humano, sin IA
- Detección de sentimiento negativo: "queja", "reclamo", "horrible", "pésimo", etc.

**Capa 1.5 — Registro de pacientes (whatsapp-processor.ts) — 0 tokens:**
- RegistrationState in-memory con TTL 30min, pasos configurables por clínica
- Primera bienvenida inmediata, respuestas por debounce
- Parser: fechas en español (texto natural), email (regex), condiciones médicas (keyword), hábitos (keyword)
- Datos se guardan en Patient + MedicalHistory

**Capa 1.5 — Botones interactivos (whatsapp-processor.ts) — 0 tokens:**
- PendingBooking state in-memory con TTL 15min
- dentist_xxx → busca slots de ese dentista → slot buttons
- slot_X → crea Appointment → confirmación (si isReschedule → cancela vieja primero + GCal sync)
- cancel_confirm → cancela cita + pipeline → "Interesado - No Agendó" + elimina GCal event
- cancel_keep → mantiene cita
- Body de botones: texto corto descriptivo, NO lista numerada

**Capa 2 — Haiku 4.5 (packages/ai/src/chatbot.ts):**
- 8 tools function calling: book_appointment, confirm_appointment, cancel_appointment, reschedule_appointment, check_appointment, answer_faq, transfer_to_human, update_patient_data
- System prompt optimizado con BotConfig: tono, idioma, reglas activas, tabla de fechas 14 días timezone-aware
- buildContextAwareSystemPrompt() + getRelevantContext() para optimización de contexto
- PatientContext con datos de completitud (hasCompleteName, hasBirthdate, hasInsurance, hasEmail)
- 300 tokens, temp 0.3

**Capa 3 — Escalación Sonnet (claude-sonnet-4-20250514):**
- Si Haiku devuelve respuesta inadecuada (vacía, muy corta, 3+ msgs sin resolución) → reintenta con Sonnet
- Si Haiku falla por error → fallback a Sonnet
- Si Sonnet también falla → transfer_to_human automático
- Sonnet = 3x en usage tracker (SONNET_USAGE_MULTIPLIER)

**Debounce de mensajes (whatsapp-processor.ts):**
- Map en memoria por conversación: timers + mensajes pendientes + processing lock
- Default 12s, configurable por clínica (10-20s) via messageDebounceSeconds
- Processing lock: si llegan mensajes durante el procesamiento de un batch, se acumulan y se procesan automáticamente al terminar (follow-up con debounce corto 2s)
- FRUSTRATION/HUMAN bypasean el debounce → respuesta inmediata
- In-memory dedup Set (recentlyProcessedIds, 60s TTL) para evitar race conditions en webhook
- Registro de pacientes también pasa por debounce (excepto primera bienvenida)
- sanitizeForWhatsApp() en todo texto saliente: metadata \[\d{4}...\] → eliminada, \*\*bold\*\* → \*bold\*, markdown → stripped

**Manejo de audios (0 tokens):**
- Mensajes tipo "audio" → respuesta fija localizada pidiendo texto, sin llamar a IA
- No incrementa contador de uso de IA

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

## PLANES Y LÍMITES (implementado)

| | STARTER $99/mes | PROFESSIONAL $199/mes | ENTERPRISE $299/mes |
|---|---|---|---|
| Perfil | Odontólogo independiente | Clínica mediana (<5 sillas) | Clínica grande (5+ sillas) |
| WhatsApp msgs/mes | 2,000 | 5,000 | 10,000 |
| IA interactions/mes | 2,000 | 5,000 | 10,000 |
| Dentistas | 2 | Ilimitados | Ilimitados |
| Al llegar al límite | Aviso al 80% y 100%, cobro extra $20/1000 interacciones | Ídem | Ídem |

Constantes en packages/shared/src/constants/index.ts (PLAN_LIMITS, AI_EXTRA_BLOCK_SIZE/PRICE, USAGE_WARNING/LIMIT_THRESHOLD).
Modelo IA: Haiku 4.5 principal, Sonnet 4 para escalaciones (3x usage). NUNCA se bloquea al paciente — overage se trackea y cobra aparte.

---

## PARA LEVANTAR EL ENTORNO (dev)

1. Abrir Docker Desktop (esperar a que PostgreSQL esté running)
2. `npm run dev` (levanta web:3000, api:3001, landing:3002)
3. `ngrok http 3000` (si la URL cambia, actualizar APP_URL en .env, webhook en Meta, y OAuth URIs)
4. Acceder via la URL HTTPS de ngrok

---

## CHANGELOG

### 2026-03-24 — Templates Meta API + Wizard 5 pasos + Importador mejorado + Fixes

**Templates Meta API — IMPLEMENTADO:**
- Servicio completo whatsapp-templates.ts: submitTemplate(), checkTemplateStatus(), syncAllTemplates(), deleteTemplateFromMeta()
- Panel Super Admin (/admin/templates): CRUD + enviar a Meta + verificar estado + sincronizar todos
- Timeline de progreso por template (modelo TemplateEvent)
- Catálogo para clínicas: solo templates APPROVED, toggle activar/desactivar por clínica
- Templates globales: tenantId nullable, isSystemTemplate para templates del sistema (solo lectura)

**Creador de clínicas (wizard 5 pasos) — MEJORADO:**
- Nuevo paso 5: Importar pacientes (opcional) con CSV drag-and-drop
- Paso 5 con 3 estados: elegir (Sí/No) → subir archivo → mapeo columnas + preview → crear clínica e importar
- Fix: field name mismatches frontend↔backend (ownerEmail→adminEmail, contactEmail→email, createDefaultPipeline→createDefaultStages)
- Fix: workingHours convertido de Record<day,WorkingDay> a Array con dayOfWeek numérico
- Fix: response parsing (data.tenant.id en vez de data.tenantId)

**Importador de pacientes — MEJORADO:**
- CSV con auto-detección de separador (coma/punto y coma)
- 30+ nombres de columnas en español/inglés auto-mapeados
- Mapeo de columnas editable con selects + preview de primeras 5 filas
- Normalización de teléfonos robusta con validación de longitud mínima
- Birthdate parsing seguro (no crashea con fechas inválidas)
- Error logging detallado: errorDetails array en response + app.log.warn() por error
- Cada error incluye: número de fila, nombre/teléfono, mensaje truncado

**Modelo Subscription — IMPLEMENTADO:**
- Prisma: plan, status (TRIALING/ACTIVE/PAST_DUE/CANCELLED/PAUSED), trialStartDate, trialEndDate, currentPeriodStart/End, paymentMethod, billingNotes
- Relación 1:1 con Tenant (tenantId unique)
- Endpoints: GET/PATCH /api/v1/admin/clinicas/:tenantId/subscription
- Sync bidireccional: cambiar plan/status en Subscription actualiza Tenant

**Vista mejorada clínicas admin — IMPLEMENTADA:**
- Lista: cards en grid (reemplazó tabla), botón "+ Crear clínica", filtro por estado, trial days remaining
- Detalle: 3 tabs (Resumen, Pacientes con importador, Configuración con suscripción)
- Fix: toLocaleString crash cuando count/limit es undefined (added ?? 0 defaults)
- Fix: pct calculation guarda contra limit <= 0 para evitar NaN/Infinity

### 2026-03-23 — Creador de clínicas + Importador de pacientes + Suscripciones

**Creador de clínicas (wizard 4 pasos) — IMPLEMENTADO:**
- Nueva página /admin/clinicas/crear con wizard completo
- Paso 1: Datos de la clínica (nombre, slug auto-generado, dirección, teléfono, email, timezone)
- Paso 2: Plan y facturación (3 cards STARTER/PROFESSIONAL/ENTERPRISE, estado, trial, método pago, notas)
- Paso 3: Usuario administrador (nombre, email, contraseña auto-generada, copiable)
- Paso 4: Configuración inicial (horarios por día, bot tone/language/debounce, checkboxes pipeline+tratamientos)
- Backend: POST /api/v1/admin/clinicas/crear — transacción que crea Tenant + User(OWNER) + Subscription + WorkingHours + PipelineStages(8) + TreatmentTypes(5)
- Pantalla de éxito con credenciales copiables y link a la clínica

**Importador de pacientes (CSV) — IMPLEMENTADO:**
- Sección en /admin/clinicas/:id (tab Pacientes)
- Drag-and-drop de archivos CSV
- Parseo en frontend: auto-detección de separador (coma/punto y coma), 30+ nombres de columnas en español/inglés
- Mapeo de columnas editable con selects
- Vista previa de las primeras 5 filas
- Backend: POST /api/v1/admin/clinicas/:tenantId/import-patients — normalización de teléfonos, detección de duplicados, pipeline auto
- Resultado: imported/skipped/errors con detalle

**Modelo Subscription — NUEVO:**
- Modelo Prisma Subscription (plan, status, trialStartDate, trialEndDate, currentPeriodStart/End, paymentMethod, billing notes, MP/Stripe IDs futuros)
- Relación 1:1 con Tenant (tenantId unique)
- Endpoints: GET/PATCH /api/v1/admin/clinicas/:tenantId/subscription
- Sync bidireccional: al cambiar plan/status en Subscription, se actualiza también en Tenant
- Seed: Subscription demo (PROFESSIONAL, TRIALING, 14 días)

**Vista mejorada de clínicas — IMPLEMENTADA:**
- Lista: layout de cards en grid (reemplazó tabla), botón "+ Crear clínica", filtro por estado, trial days remaining
- Detalle: 3 tabs (Resumen, Pacientes con importador, Configuración con suscripción)
- Resumen: info clínica + suscripción + 4 stat cards + usage bars + users table
- Configuración: plan/status/payment method/billing notes con save

**Endpoints API — Admin clínicas:**
- POST /api/v1/admin/clinicas/crear — wizard completo con transacción
- POST /api/v1/admin/clinicas/:tenantId/import-patients — importar pacientes CSV
- GET /api/v1/admin/clinicas/:tenantId/subscription — ver suscripción
- PATCH /api/v1/admin/clinicas/:tenantId/subscription — editar suscripción
- GET /api/v1/admin/clinicas/:tenantId/patients — listar pacientes (admin)

**Migración Prisma:**
- 20260323210000_subscriptions_clinic_onboarding

### 2026-03-23 — Templates globales + Meta API + Super Admin Templates Panel

**Templates refactorizados como GLOBALES — IMPLEMENTADO:**
- WhatsAppTemplate.tenantId ahora es nullable — templates del sistema (isSystemTemplate=true) tienen tenantId=null
- Nuevo modelo TemplateEvent para timeline de progreso (created, submitted, approved, rejected, edited, status_check, etc.)
- Campos nuevos: description, metaStatus, qualityScore, lastCheckedAt, suggestedTrigger
- Campo triggerType renombrado a suggestedTrigger
- Tenant tiene nuevo campo disabledTemplateIds (String[]) para que cada clínica desactive templates individualmente
- Migración: 20260323200000_templates_global_timeline
- Seed actualizado: 10 templates globales con status DRAFT (antes estaban APPROVED por tenant)

**Servicio de Meta API para templates (whatsapp-templates.ts) — NUEVO:**
- submitTemplate(): envía template a Meta para aprobación (POST /message_templates)
- checkTemplateStatus(): verifica estado actual en Meta (GET /message_templates?name=X)
- syncAllTemplates(): sincroniza TODOS los templates con Meta (bulk status check)
- deleteTemplateFromMeta(): elimina template de Meta (DELETE /message_templates)
- buildComponents(): convierte formato DB a formato Meta API components
- Manejo de errores de Meta (100, 190, 2388023, 2388024, 2388047)
- Cada acción crea TemplateEvent en timeline
- allow_category_change: true en cada envío

**Panel Super Admin — Templates — NUEVO:**
- Nueva sección "Templates" en sidebar del admin (/admin/templates)
- Lista con filtros: Todos, DRAFT, PENDING, APPROVED, REJECTED
- Selector de WABA: elige desde qué clínica enviar (GET /admin/connected-wabas)
- Crear template: nombre (validación minúsculas+números+_), displayName, categoría, idioma, body con variables {{1}}..{{N}}, footer, trigger sugerido
- Editar template: solo DRAFT o REJECTED, reset a DRAFT al editar
- Enviar a Meta: POST /admin/templates/:id/submit con tenantId seleccionado
- Verificar estado: POST /admin/templates/:id/check (actualiza status, qualityScore)
- Sincronizar todos: POST /admin/templates/sync (bulk sync con Meta)
- Vista detalle: preview burbuja WhatsApp, variables, info de Meta, timeline de eventos
- Detección automática de variables al escribir {{N}} en el body
- Eliminar template (con cascade de TemplateEvents)

**Endpoints API — Admin templates:**
- GET /api/v1/admin/templates — listar (con filtro ?status=)
- GET /api/v1/admin/templates/:id — detalle con timeline
- GET /api/v1/admin/templates/:id/timeline — timeline de eventos
- POST /api/v1/admin/templates — crear (DRAFT)
- PUT /api/v1/admin/templates/:id — editar (solo DRAFT/REJECTED)
- DELETE /api/v1/admin/templates/:id — eliminar
- POST /api/v1/admin/templates/:id/submit — enviar a Meta
- POST /api/v1/admin/templates/:id/check — verificar estado en Meta
- POST /api/v1/admin/templates/sync — sincronizar todos con Meta
- GET /api/v1/admin/connected-wabas — clínicas con WhatsApp conectado

**Endpoints API — Catálogo clínica:**
- GET /api/v1/templates/catalog — templates aprobados con campo isEnabledForClinic
- PATCH /api/v1/templates/:id/toggle — activar/desactivar template para esta clínica
- GET /api/v1/whatsapp-templates — ahora devuelve globales APPROVED + custom de la clínica

**Seguridad:**
- Todas las rutas /admin/templates protegidas por adminMiddleware (SUPER_ADMIN)
- Clínicas no pueden ver DRAFT, REJECTED ni el timeline
- Clínicas no pueden editar templates del sistema (isSystemTemplate check)

**Migración Prisma:**
- 20260323200000_templates_global_timeline

### 2026-03-23 — Reagendamiento + Cancelación + Pipeline automático + Templates + Notificaciones

**Reagendamiento inteligente — IMPLEMENTADO:**
- reschedule_appointment tool acepta preferredDate + preferredTimeOfDay
- Handler busca próxima cita del paciente, busca slots nuevos, muestra botones interactivos
- PendingBooking con flags isReschedule + oldAppointmentId
- Al elegir slot: cancela cita vieja + crea nueva + mantiene pipeline
- Integración con Google Calendar (elimina evento viejo, crea nuevo)

**Cancelación con confirmación — IMPLEMENTADA:**
- cancel_appointment muestra datos de la cita + botones [Sí, cancelar] / [No, mantener]
- Botones cancel_confirm y cancel_keep en Capa 1 (0 tokens)
- Cancelar: status=CANCELLED + pipeline→"Interesado - No Agendó" + elimina evento GCal
- System prompt con instrucciones de reagendamiento y cancelación

**Google Calendar — CÓDIGO LISTO:**
- findAvailableSlots verifica eventos bloqueantes de GCal por dentista
- createAppointmentFromSlot crea evento GCal si dentista tiene token
- Cancel/Reschedule eliminan eventos GCal
- Frontend de integraciones funcional (muestra warning si env vars vacías)
- Estado: código 100% listo, falta configurar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET

**Dashboard Reactivo — IMPLEMENTADO:**
- Polling inteligente en todas las vistas
- Pipeline: 8s, Agenda: 10s, Home: 30s, Pacientes: 15s, Campañas: 30s
- document.hidden check — no gasta recursos en background
- Silent fetch (sin loading spinner en polling)

**Pipeline Rediseñado — IMPLEMENTADO:**
- Borde superior 4px con color por etapa (gris, amarillo, azul, verde, cyan, esmeralda, naranja, gris oscuro)
- Cards mejoradas con avatar, tratamiento, cita, tags, tiempo en etapa
- Empty state con ícono SVG
- Header con link a configuración de pipeline

**Configuración del Pipeline — IMPLEMENTADA:**
- Nuevo tab "Pipeline" en Configuración
- Etapas expandibles/colapsables con:
  - Auto-mensaje: toggle, delay horas, SELECT de template aprobado (no textarea), reintentos
  - Auto-movimiento: toggle, delay horas, select de etapa destino
  - Descuento: toggle, porcentaje, mensaje
- SELECT solo muestra templates con status APPROVED

**Tratamientos con Seguimiento — IMPLEMENTADO:**
- 5 campos nuevos: followUpEnabled, followUpMonths, postProcedureCheck, postProcedureDays, followUpMessage
- isMultiSession: boolean (ortodoncia=true, limpieza=false)
- Frontend: modal con sección de seguimiento
- Lista muestra "Seguimiento c/6m" y "Control 7d"
- Seed con defaults realistas

**Templates de WhatsApp — Arquitectura 3 niveles:**
- Nivel 1: Templates del sistema (isSystemTemplate=true, solo lectura para clínica)
- Nivel 2: Templates personalizados de la clínica (con flujo de aprobación Draft→Submitted→Approved/Rejected)
- Nivel 3: Selección en Pipeline (SELECT de templates aprobados)
- 10 templates del sistema seeded (recordatorio, seguimiento, reactivación, cumpleaños, etc.)
- WhatsAppTemplate model con: displayName, category, status, rejectionReason, version, submittedAt/approvedAt/rejectedAt
- Vista en Campañas con 2 tabs: "Templates del sistema" + "Mis templates"
- Templates desactivados/rechazados no rompen el pipeline

**Notificaciones — IMPLEMENTADAS:**
- Panel categorizado con 4 tabs: Mensajes, Sistema, Pipeline, IA
- 420px panel, z-50, click-outside handler
- Badge: rojo si hay human_needed, azul normal, contador por tab
- Categorías: messages, system, pipeline, ai (auto-mapeado por type)
- Tipos: new_patient, human_needed, new_appointment, appointment_completed, appointment_no_show, cancelled_appointment, rescheduled_appointment, appointment_end_reminder, usage_warning, pipeline_move, template_status
- appointment_end_reminder: check cada 60s detecta citas pasadas sin completar
- Acciones rápidas: [Completar] [No asistió] directo desde la notificación (PATCH appointment)
- human_needed con fondo rojo (prioridad alta)
- Tab IA: placeholder "Próximamente" para recomendaciones futuras
- API: GET /notifications?category=X, GET /unread-count (por categoría), PATCH /read-all (por categoría)

**Completado de Citas → Pipeline Automático:**
- Cita completada + tratamiento sesión única → "Seguimiento"
- Cita completada + tratamiento multi-sesión → "En Tratamiento"
- No asistió → "Interesado - No Agendó"
- Cancelada desde agenda → "Interesado - No Agendó"
- movePipelineToStage como servicio compartido (chatbot + agenda)
- Notificaciones automáticas en cada cambio

**Limpieza:**
- Pacientes de prueba del seed eliminados
- Seed ya no crea pacientes falsos
- Solo se crean: tenant, users, dentistas, tratamientos, pipeline stages, working hours, templates

**Migraciones Prisma:**
- 20260323004655_pipeline_config_treatments_templates
- 20260323050000_templates_notifications_refactor
- 20260323060000_add_multi_session
- 20260323070000_notification_category

### 2026-03-22 — Agendamiento completo + Registro de pacientes + Botones interactivos

**Flujo de agendamiento end-to-end — COMPLETADO Y FUNCIONANDO:**
- book_appointment busca slots disponibles reales (DentistWorkingHours con fallback a WorkingHours del tenant)
- confirm_appointment crea el Appointment en la DB con source CHATBOT
- Pipeline se actualiza automáticamente a "Primera Cita Agendada"
- Cita visible en la Agenda del dashboard
- Soporte de preferredDate y preferredTimeOfDay para búsqueda de slots por fecha específica
- findAvailableSlots: con fecha específica devuelve hasta 5 slots, sin fecha devuelve 3 más próximos
- morning = 8:00-12:59, afternoon = 13:00-18:00

**Botones interactivos de WhatsApp — IMPLEMENTADOS:**
- Selección de slots: 3 botones con horarios disponibles
- Selección de dentista: botones cuando hay múltiples dentistas para un tratamiento
- Botones = Capa 1 (0 tokens), se resuelven en código sin pasar por IA
- PendingBooking state en memoria con TTL 15min
- Body de botones: texto corto descriptivo, NO lista numerada
- Lista numerada es FALLBACK solo si botones fallan

**Registro de pacientes nuevos — IMPLEMENTADO:**
- Detección automática de paciente nuevo (lastName vacío)
- State machine de registro con pasos configurables por clínica
- Datos recolectados UNO A LA VEZ: nombre completo → fecha nacimiento → obra social → email → dirección → condiciones médicas → alergias → medicamentos → hábitos
- Parser de fechas en español (texto natural): "10 de mayo del 2000", "15/05/1990", etc. 100% código, 0 tokens
- Validación de email con regex
- Condiciones médicas → MedicalHistory (diabetes, hipertensión, etc.)
- Registro pasa por debounce (respeta messageDebounceSeconds del tenant)
- Primera bienvenida es inmediata, respuestas posteriores pasan por debounce
- update_patient_data tool para guardar datos del paciente desde la IA
- Interrupciones (HUMAN/FRUSTRATION) pausan el registro

**Configuración de registro en dashboard:**
- Nuevo sub-tab "Registro" en Configuración > Chatbot IA (5to tab)
- 9 toggles configurables: nombre completo (siempre activo), fecha nacimiento, obra social, email, dirección, condiciones médicas, alergias, medicamentos, hábitos
- Mensaje de bienvenida personalizable
- Campos en Tenant: registrationEnabled, askFullName, askEmail, askAddress, askMedicalConditions, askAllergies, askMedications, askHabits, registrationWelcomeMessage

**Sanitización de mensajes WhatsApp:**
- sanitizeForWhatsApp() aplicada en todos los mensajes salientes
- Convierte **bold** a *bold* (WhatsApp format)
- Elimina metadata de slots [YYYY-...] con regex /\s*\[\d{4}[^\]]*\]/g
- Elimina markdown (###, ```, etc.)
- .trim() en nombre de clínica antes de asteriscos

**Fixes de bugs:**
- Respuesta duplicada: in-memory dedup Set (recentlyProcessedIds, 60s TTL) + fix race condition en follow-up batch
- Timezone: tabla de fechas de referencia en system prompt usa timezone Argentina (America/Argentina/Buenos_Aires)
- Timezone en citas: localTimeToUTC(), formatDateInTimezone(), formatTimeInTimezone() helpers
- lastName vacío en vez de "WhatsApp" para pacientes nuevos
- Fix "Pundefined" en avatar: optional chaining en 5 archivos frontend
- Debounce mínimo: opciones 10s/12s/15s/20s (eliminados 3s/5s/8s), default 12s

**System prompt optimizado:**
- Flujo de agendamiento en pasos estrictos (8 pasos)
- Formato WhatsApp explícito (un asterisco, NO markdown)
- "Una cosa a la vez" — nunca pedir múltiples datos
- Tabla de fechas de referencia de 14 días (timezone-aware Argentina)
- Instrucciones de cálculo de fechas estrictas
- Contexto de datos faltantes del paciente (hasCompleteName, hasBirthdate, hasInsurance, hasEmail)
- Registro se maneja automáticamente antes de la conversación

**Migraciones Prisma:**
- 20260322011749_add_insurance_askemail
- 20260322022408_add_registration_config

**Tools del chatbot (8 tools):**
- book_appointment — busca slots disponibles
- confirm_appointment — crea la cita en DB
- cancel_appointment — cancela próxima cita
- reschedule_appointment — reagenda cita
- check_appointment — consulta próxima cita
- answer_faq — responde FAQs
- transfer_to_human — escala a humano
- update_patient_data — actualiza datos del paciente

### 2026-03-21 — System prompt mejorado + sanitize WhatsApp + fix slots

**System prompt reescrito (chatbot.ts buildSystemPrompt):**
- Formato WhatsApp explícito: *negrita* con 1 asterisco, _cursiva_ con 1 guión bajo, NO markdown
- Flujo de agendamiento estricto en 5 pasos: tratamiento → book_appointment tool → slots → elegir → datos extra
- Regla "UNA COSA A LA VEZ" — nunca pedir múltiples datos en el mismo mensaje
- Fecha actual inyectada en el prompt para que el bot calcule "mañana", "el lunes", etc.

**sanitizeForWhatsApp() (whatsapp-processor.ts):**
- Convierte **bold** → *bold*, __italic__ → _italic_
- Elimina ### headers, ``` bloques de código, backticks inline
- Reemplaza "- item" → "• item"
- Aplicada en TODOS los puntos de envío: bot response, audio reply, transfer messages, human messages

**Fix tool handler vs Haiku text:**
- Cuando hay tool calls con respuestas, se usa SOLO el texto del tool handler
- El texto de Haiku se descarta (solía contradecir: "voy a buscar horarios" + tool: "no hay slots")

**Fix findAvailableSlots — slots vacíos:**
- DentistWorkingHours estaba vacía → siempre devolvía 0 slots
- Fallback implementado: si un dentista no tiene DentistWorkingHours propias, usa WorkingHours del tenant
- Seed actualizado: DentistWorkingHours para ambos dentistas L-V 9:00-18:00 (10 rows)

### 2026-03-20 — Bot Config 3 capas + Debounce + Audio handling

**Configuración del bot por clínica (BotConfig):**
- 13 campos nuevos en Tenant: botTone, botLanguage, askBirthdate, askInsurance, offerDiscounts, maxDiscountPercent, proactiveFollowUp, leadRecontactHours, campaignBirthday, campaignPeriodicReminder, campaignReactivation, messageDebounceSeconds
- API: GET/PUT /api/v1/configuracion/bot con validación Zod
- Frontend: nueva pestaña "Chatbot IA" en Configuración con 4 sub-tabs (General, Horarios, Reglas del Bot, Campañas)
- Lógica: askBirthdate=false auto-desactiva campaignBirthday

**Arquitectura 3 capas para chatbot:**
- Capa 1: Intent Router (packages/ai/src/intent-router.ts) — regex/keyword, 0 tokens, detecta GREETING/HOURS/CANCEL/LOCATION/TREATMENTS/HUMAN/FRUSTRATION
- Capa 2: Haiku 4.5 con system prompt optimizado usando BotConfig (tono/idioma/reglas activas)
- Capa 3: Escalación automática a Sonnet si Haiku falla o respuesta inadecuada (3x usage)
- Detección de frustración → transfer inmediato a humano sin IA

**Debounce de mensajes WhatsApp:**
- Acumula mensajes por conversación, procesa en batch después de pausa configurable (default 5s, rango 3-15s)
- Processing lock: mensajes que llegan durante procesamiento de IA se acumulan y procesan automáticamente en follow-up batch
- FRUSTRATION/HUMAN bypasean debounce → respuesta inmediata
- UI: selector "Tiempo de espera entre mensajes" en Configuración > Chatbot IA > Reglas

**Manejo de audios:**
- Mensajes tipo "audio" → respuesta fija localizada (es/pt/en) sin llamar a IA, 0 tokens
- No incrementa contador de uso de IA

**Migraciones Prisma:**
- 20260321013713_add_bot_config_fields
- 20260321022528_add_message_debounce_seconds

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

**Error: "No encontré horarios disponibles" para TODOS los tratamientos**
- Causa: La tabla DentistWorkingHours estaba vacía. findAvailableSlots solo buscaba horarios en DentistWorkingHours, no en WorkingHours del tenant.
- Solución: (1) Fallback en findAvailableSlots: si dentista no tiene DentistWorkingHours propias, usar WorkingHours del tenant. (2) Seed actualizado para crear DentistWorkingHours.
- Regla: Siempre verificar que los dentistas tengan horarios configurados. Si no, los WorkingHours del tenant se usan como fallback.

**Error: Bot envía **doble asterisco** que WhatsApp no renderiza como negrita**
- Causa: Haiku/Sonnet generan markdown con ** para bold. WhatsApp usa * simple.
- Solución: sanitizeForWhatsApp() convierte **texto** → *texto*, __texto__ → _texto_, elimina ###, ```, y convierte "- " → "• "
- Archivo: apps/api/src/services/whatsapp-processor.ts

**Error: Bot envía 2 textos contradictorios (ej: "voy a buscar horarios" + "no hay horarios")**
- Causa: handleToolCalls producía el texto definitivo, pero se concatenaba con el texto de Haiku que decía otra cosa
- Solución: Cuando hay tool calls con respuestas, usar SOLO el texto del tool handler, descartar el texto de Haiku

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

**Error: "EPERM: operation not permitted, rename query_engine-windows.dll.node" al ejecutar prisma generate**
- Causa: El dev server (npm run dev) tiene el archivo DLL del Prisma client bloqueado
- Solución: Detener el dev server, ejecutar `npx prisma generate --schema packages/db/prisma/schema.prisma`, reiniciar dev server
- Nota: Las migraciones se aplican correctamente aunque generate falle. Al reiniciar el server se regenera automáticamente.

**Error: Bot responde 2 veces cuando el paciente manda muchos mensajes seguidos**
- Causa: El debounce timer original expiraba y empezaba a procesar el batch en IA (~3-5s). Si un mensaje nuevo llegaba durante ese procesamiento, creaba un ciclo de debounce independiente → 2 respuestas.
- Solución: Processing lock por conversación. Mensajes que llegan durante procesamiento se acumulan sin crear timer. Al terminar el batch, se verifica si hay mensajes pendientes y se procesan en follow-up batch con debounce corto.
- Archivo: apps/api/src/services/whatsapp-processor.ts (processingLock Map)

**Error: "Dominio de host desconocido de JSSDK"**
- Causa: El dominio de ngrok no estaba en los dominios permitidos del SDK de JavaScript en Meta
- Solución: Agregar en Facebook Login → Settings → "Dominios permitidos para el SDK de JavaScript" y "URI de redireccionamiento de OAuth válidos"

**Error: Bot muestra texto de lista numerada junto con botones interactivos**
- Causa: El body del mensaje interactivo de WhatsApp contenía la lista completa de slots en vez de un texto corto descriptivo
- Solución: El body de sendWhatsAppInteractiveButtons debe ser un texto corto ("Elegí el horario que te quede mejor:"). La lista numerada se guarda solo en rawTextForHistory para el historial de la IA.
- Regla: NUNCA poner la lista de slots/opciones en el body del mensaje interactivo. Los botones ya muestran las opciones.

**Error: "El martes próximo" agenda para la semana incorrecta (timezone)**
- Causa: La tabla de fechas de referencia en el system prompt usaba new Date() en UTC. A las 00:30 Argentina (03:30 UTC), el servidor creía que era lunes en vez de domingo.
- Solución: Usar toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }) para calcular "hoy" en timezone Argentina.
- Regla: SIEMPRE usar timezone Argentina para cualquier cálculo de "hoy", "mañana", o fechas relativas.

**Error: Cita no aparece en la Agenda del dashboard (timezone)**
- Causa: El bot guardaba la hora local como UTC. Si agendaba "9:00 AM Argentina", guardaba 09:00 UTC en vez de 12:00 UTC.
- Solución: Helpers localTimeToUTC() y formatDateInTimezone()/formatTimeInTimezone() para convertir correctamente.
- Regla: DB SIEMPRE en UTC. Convertir hora local → UTC al guardar, UTC → local al mostrar.

**Error: Paciente aparece como "Pedro WhatsApp" o "Pundefined"**
- Causa 1: findOrCreatePatient ponía "WhatsApp" como apellido default. Solución: lastName="" (vacío).
- Causa 2: El frontend hacía firstName[0] + lastName[0] sin verificar que lastName existiera. Solución: optional chaining ?.[0].
- Regla: lastName vacío para pacientes nuevos. Siempre verificar con optional chaining.

**Error: Bot pide fecha de nacimiento y obra social CADA VEZ**
- Causa: El system prompt no sabía si el paciente ya tenía esos datos cargados.
- Solución: PatientContext incluye hasCompleteName, hasBirthdate, hasInsurance, hasEmail. El prompt dice "Datos faltantes: ..." o "Datos completos ✓".
- Regla: Solo pedir datos que el paciente NO tiene cargados.

**Error: Debounce de 3-5 segundos causa mensajes cortados**
- Causa: La gente manda mensajes de WhatsApp en ráfagas de 2-5 mensajes. Con debounce de 5s, el bot respondía a los primeros 2 mensajes y los siguientes quedaban huérfanos.
- Solución: Mínimo debounce 10s, default 12s, opciones: 10/12/15/20s.
- Regla: Mínimo 10 segundos de debounce. Para Latinoamérica, 12s es el sweet spot.

**Error: "10 de mayo del 2000" no se parsea como fecha de nacimiento**
- Causa: El parser solo aceptaba formato dd/mm/aaaa numérico.
- Solución: Parser con diccionario de 24 meses (completos + abreviados) y regex para texto natural español.
- Regla: Siempre aceptar fechas en texto natural español. Parser en código, 0 tokens.

**Error: Asteriscos mal formateados "*Clínica *" con espacio**
- Causa: El nombre de la clínica tenía trailing whitespace.
- Solución: .trim() antes de envolver en asteriscos.
- Regla: Siempre .trim() nombres antes de formatear para WhatsApp.

---

## REGLAS (no negociables)

1. Tenant isolation TODA query 2. Auth JWT+roles cada endpoint 3. SUPER_ADMIN accede cualquier tenant 4. Tokens encriptados AES-256-GCM 5. Zod cada endpoint 6. Seed idempotente (upsert) 7. Webhook idempotente (whatsappMessageId) 8. Feature flag WHATSAPP_ENABLED 9. Leer schema.prisma real antes de cambios 10. npx tsc --noEmit después de cambios 11. No romper lo que funciona 12. UI español, código inglés 13. Timezone UTC en DB, tenant timezone en UI 14. Soft delete (isActive: false) 15. ngrok URLs cambian — actualizar en Meta y .env al reiniciar
