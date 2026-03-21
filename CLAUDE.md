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
- **Configuración** — 7 tabs (Clínica, Chatbot IA [4 sub-tabs: General/Horarios/Reglas/Campañas], Profesionales CRUD completo, Tratamientos, Sillones, Integraciones, Equipo)

**Integraciones implementadas:**
- **Google Calendar** — OAuth2 bidireccional por dentista, eventos privados bloqueantes, tareas ignoradas
- **WhatsApp Cloud API** — webhook HMAC-SHA256, WhatsAppService (text/template/buttons/list/markAsRead), feature flag, status updates
- **Chatbot IA** — arquitectura 3 capas (Intent Router → Haiku 4.5 → Sonnet escalación), system prompt dinámico por tenant con BotConfig, 6 tools function calling, 300 tokens, temp 0.3
- **WhatsApp Processor** — flujo completo: mensaje→paciente→conversación→debounce→intent router→chatbot→respuesta→pipeline→usage. Debounce configurable (3-15s, default 5s) con processing lock. Manejo de audios sin IA.

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
- ~~Sistema de límites de mensajes mensuales por plan y cobro extra~~ → ✅ Implementado
- ~~Configuración por clínica (reglas del bot)~~ → ✅ Implementado (pestaña Chatbot IA)
- ~~Refinar system prompt del chatbot~~ → ✅ Optimizado con BotConfig + 3 capas
- Automatizaciones del pipeline (seguimiento automático por etapa con cron jobs)
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

25+ modelos: Tenant (con wabaId, whatsappPhoneNumberId, whatsappDisplayNumber, whatsappAccessToken, whatsappConnectedAt, whatsappStatus, botTone, botLanguage, askBirthdate, askInsurance, offerDiscounts, maxDiscountPercent, proactiveFollowUp, leadRecontactHours, campaignBirthday, campaignPeriodicReminder, campaignReactivation, messageDebounceSeconds), User, Dentist, DentistTreatment, DentistWorkingHours, DentistGoogleCalendarToken, Chair, WorkingHours, TreatmentType, Appointment, Patient, MedicalHistory, OdontogramFinding, TreatmentPlan+Items, ClinicalVisitNote, PeriodontogramEntry, ClinicalNote, PipelineStage (auto-config), PatientPipeline (interestTreatment, lastAutoMessageSentAt), Conversation, Message, Campaign, CampaignSend, Automation, FaqEntry, UsageRecord

---

## ENDPOINTS PRINCIPALES

Auth: login, me | Dashboard: stats+usage | Pacientes: CRUD + historial clínico completo | Citas: CRUD con validación GCal+horario+conflictos | Agenda: dentists, blocked-slots | Pipeline: stages+patients+move (stageValue) | Campañas: CRUD + segment-count + setup-defaults(idempotente) + duplicate + sends + retry-failed | Conversaciones: CRUD + messages + toggle IA | Config: clínica/working-hours/equipo/dentists/treatments/chairs + **bot** (GET/PUT configuración chatbot con Zod) | GCal: auth-url/callback/status/disconnect/sync | WhatsApp: embedded-signup-complete/disconnect/status/send-test + webhook | Admin: login/dashboard/tenants/impersonate/usage/whatsapp-monitor/force-disconnect

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

**Capa 2 — Haiku 4.5 (packages/ai/src/chatbot.ts):**
- 6 tools function calling: book_appointment, cancel_appointment, reschedule_appointment, check_appointment, answer_faq, transfer_to_human
- System prompt optimizado con BotConfig: tono (formal/friendly/casual), idioma (es/pt/en), reglas activas
- buildContextAwareSystemPrompt() + getRelevantContext() para optimización de contexto
- 300 tokens, temp 0.3

**Capa 3 — Escalación Sonnet (claude-sonnet-4-20250514):**
- Si Haiku devuelve respuesta inadecuada (vacía, muy corta, 3+ msgs sin resolución) → reintenta con Sonnet
- Si Haiku falla por error → fallback a Sonnet
- Si Sonnet también falla → transfer_to_human automático
- Sonnet = 3x en usage tracker (SONNET_USAGE_MULTIPLIER)

**Debounce de mensajes (whatsapp-processor.ts):**
- Map en memoria por conversación: timers + mensajes pendientes + processing lock
- Default 5s, configurable por clínica (3-15s) via messageDebounceSeconds
- Processing lock: si llegan mensajes durante el procesamiento de un batch, se acumulan y se procesan automáticamente al terminar (follow-up con debounce corto 2s)
- FRUSTRATION/HUMAN bypasean el debounce → respuesta inmediata

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

---

## REGLAS (no negociables)

1. Tenant isolation TODA query 2. Auth JWT+roles cada endpoint 3. SUPER_ADMIN accede cualquier tenant 4. Tokens encriptados AES-256-GCM 5. Zod cada endpoint 6. Seed idempotente (upsert) 7. Webhook idempotente (whatsappMessageId) 8. Feature flag WHATSAPP_ENABLED 9. Leer schema.prisma real antes de cambios 10. npx tsc --noEmit después de cambios 11. No romper lo que funciona 12. UI español, código inglés 13. Timezone UTC en DB, tenant timezone en UI 14. Soft delete (isActive: false) 15. ngrok URLs cambian — actualizar en Meta y .env al reiniciar
