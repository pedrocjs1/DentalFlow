# MEGA-PROMPT: Registro + Precios USD + Conversión por país + Trial lockout + Setup Fee

## CONTEXTO

Leé `CLAUDE.md` y `packages/db/prisma/schema.prisma` antes de empezar. DentalFlow necesita:
1. Página de registro self-service (crear cuenta → trial 14 días)
2. Precios en USD con conversión automática por país
3. Bloqueo de funciones cuando vence el trial
4. Modelo de negocio: Setup Fee (pago único) + Suscripción mensual

**No rompas nada. `npx tsc --noEmit` después de cada cambio.**

---

## BLOQUE 1: PÁGINA DE REGISTRO

### 1.1 — Página `/registro` en apps/web

Crear página pública (sin auth) en `apps/web/src/app/registro/page.tsx`:

**Formulario de registro (wizard 3 pasos):**

**Paso 1 — Tu clínica:**
- Nombre de la clínica *
- País (select con bandera): Argentina 🇦🇷, Chile 🇨🇱, Colombia 🇨🇴, México 🇲🇽, Uruguay 🇺🇾, Brasil 🇧🇷, Ecuador 🇪🇨, Paraguay 🇵🇾, Bolivia 🇧🇴, Perú 🇵🇪, Otro
- Ciudad
- Teléfono de la clínica

**Paso 2 — Tu cuenta:**
- Nombre completo del propietario *
- Email * (verificar que no exista ya)
- Contraseña * (mínimo 8 caracteres, 1 mayúscula, 1 número)
- Confirmar contraseña *

**Paso 3 — Confirmación:**
- Resumen de los datos
- Checkbox: "Acepto los Términos de Servicio y la Política de Privacidad"
- Botón "Crear mi cuenta gratis"

**Al crear la cuenta:**
1. Crear Tenant con los datos de la clínica
2. Crear User con role OWNER
3. Crear Subscription con status TRIALING, trialStartDate=now, trialEndDate=now+14days, plan=STARTER
4. Crear WorkingHours default (L-V 9:00-18:00)
5. Crear PipelineStages default (8 etapas)
6. Crear TreatmentTypes default (5 tratamientos)
7. Logear al usuario automáticamente (devolver JWT)
8. Redirigir al dashboard con modal de bienvenida

**Endpoint:**
```
POST /api/v1/auth/register
Body: {
  clinicName: string,
  country: string,
  city: string,
  phone: string,
  ownerName: string,
  email: string,
  password: string
}
Response: { token: string, user: {...}, tenant: {...} }
```

No requiere auth. Rate limit: 5 registros por IP por hora.

**Validaciones:**
- Email único (no puede existir ya)
- Slug auto-generado desde clinicName (sanitizado, lowercase, sin espacios)
- Password hasheado con bcrypt

### 1.2 — Modal de bienvenida post-registro

Después del primer login (o registro), mostrar un modal de bienvenida:
- "¡Bienvenido a DentalFlow! 🎉"
- "Tu prueba gratuita de 14 días está activa."
- 3 pasos sugeridos: 
  1. "Conectá tu WhatsApp" → link a Configuración > Integraciones
  2. "Agregá tus profesionales" → link a Configuración > Profesionales
  3. "Cargá tus pacientes" → link a Pacientes (o importar CSV)
- Botón "Empezar a usar DentalFlow"
- Checkbox "No mostrar de nuevo" (guardar en localStorage)

### 1.3 — Links en la landing

Actualizar la landing (`apps/landing/`):
- TODOS los botones "Empezar prueba gratis" / "Crear mi cuenta" → apuntar a `/registro` (URL relativa que en prod será `https://app.DOMINIO/registro`)
- Como la landing está en puerto 3002 y el app en 3000, por ahora usar URL completa configurable: `process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` + `/registro`

---

## BLOQUE 2: PRECIOS EN USD + CONVERSIÓN POR PAÍS

### 2.1 — Precios base en USD

Los precios oficiales son en USD:
```
STARTER:      USD  99/mes
PROFESSIONAL: USD 199/mes
ENTERPRISE:   USD 299/mes
```

### 2.2 — API de tipo de cambio

Crear servicio `apps/api/src/services/exchange-rates.ts`:

```typescript
// Usar API gratuita: https://open.er-api.com/v6/latest/USD
// Cachear resultado por 6 horas (no consultar en cada request)
// Fallback hardcodeado si la API falla

const SUPPORTED_CURRENCIES = {
  AR: { code: 'ARS', symbol: '$', name: 'Pesos argentinos', flag: '🇦🇷' },
  CL: { code: 'CLP', symbol: '$', name: 'Pesos chilenos', flag: '🇨🇱' },
  CO: { code: 'COP', symbol: '$', name: 'Pesos colombianos', flag: '🇨🇴' },
  MX: { code: 'MXN', symbol: '$', name: 'Pesos mexicanos', flag: '🇲🇽' },
  UY: { code: 'UYU', symbol: '$', name: 'Pesos uruguayos', flag: '🇺🇾' },
  BR: { code: 'BRL', symbol: 'R$', name: 'Reales', flag: '🇧🇷' },
  EC: { code: 'USD', symbol: '$', name: 'Dólares', flag: '🇪🇨' }, // Ecuador usa USD
  PY: { code: 'PYG', symbol: '₲', name: 'Guaraníes', flag: '🇵🇾' },
  BO: { code: 'BOB', symbol: 'Bs', name: 'Bolivianos', flag: '🇧🇴' },
  PE: { code: 'PEN', symbol: 'S/', name: 'Soles', flag: '🇵🇪' },
};

// Función para redondear a número "lindo":
function roundToNice(amount: number): number {
  if (amount < 100) return Math.round(amount / 5) * 5;           // Redondear a 5: 47 → 45
  if (amount < 1000) return Math.round(amount / 50) * 50;        // Redondear a 50: 873 → 850
  if (amount < 10000) return Math.round(amount / 500) * 500;     // Redondear a 500: 8,730 → 8,500
  if (amount < 100000) return Math.round(amount / 1000) * 1000;  // Redondear a 1000: 87,300 → 87,000
  if (amount < 1000000) return Math.round(amount / 5000) * 5000; // Redondear a 5000: 139,200 → 140,000
  return Math.round(amount / 10000) * 10000;                     // Redondear a 10000
}
```

### 2.3 — Endpoint de precios

```
GET /api/v1/pricing?country=AR
Response: {
  currency: { code: "ARS", symbol: "$", name: "Pesos argentinos", flag: "🇦🇷" },
  exchangeRate: 1390,
  plans: {
    STARTER: { usd: 99, local: 140000, formatted: "$ 140.000" },
    PROFESSIONAL: { usd: 199, local: 280000, formatted: "$ 280.000" },
    ENTERPRISE: { usd: 299, local: 420000, formatted: "$ 420.000" }
  },
  lastUpdated: "2026-03-24T..."
}
```

Este endpoint es público (sin auth). Cacheable.

### 2.4 — Landing: precios dinámicos

Actualizar la sección de precios en la landing:
- Detectar país del visitante por IP (usar header `x-vercel-ip-country` en prod, o API gratuita como `https://ipapi.co/json/` en dev)
- Mostrar precio en USD como principal: **"USD 99/mes"**
- Debajo, en texto más chico y gris: **"≈ $ 140.000 ARS/mes"** (convertido al país detectado)
- Selector de país manual por si la detección falla (dropdown discreto)
- Si el país es Ecuador, mostrar solo USD (ya usan dólar)

### 2.5 — Tab Facturación: precios en USD

Actualizar el tab de Facturación en Configuración:
- Mostrar precios en USD como principal
- Conversión local debajo según el país del tenant (del campo country)
- Modal de "Elegí tu plan" con precios USD + conversión local

### 2.6 — Mercado Pago: cobrar en ARS siempre

Mercado Pago Argentina cobra en ARS. Para clientes de otros países, hay 2 opciones:
- **Opción A (MVP):** Cobrar siempre en ARS al tipo de cambio del día. El cliente de Chile/Colombia paga con su tarjeta y MP hace la conversión automáticamente.
- **Opción B (futuro):** Crear cuentas MP por país.

Implementar Opción A. En el servicio de MP, convertir el precio USD → ARS al crear la suscripción.

---

## BLOQUE 3: SETUP FEE (PAGO ÚNICO DE IMPLEMENTACIÓN)

### 3.1 — Concepto

Además de la suscripción mensual, existe un pago único de "Setup/Implementación" que incluye:
- Configuración personalizada de la clínica
- Importación de pacientes
- Conexión de WhatsApp Business
- Personalización del chatbot IA
- Capacitación del equipo

**Precio: USD 499** (configurable por Super Admin)

### 3.2 — Schema Prisma

```prisma
// Agregar a Subscription o crear nuevo modelo:
// setupFeeAmount: Float? // USD 499
// setupFeePaid: Boolean @default(false)
// setupFeePaymentId: String? // ID de pago MP
// setupFeePaidAt: DateTime?
// setupFeeWaived: Boolean @default(false) // Si el admin lo exime

// O agregar a Tenant:
// setupFeeRequired: Boolean @default(true)
// setupFeePaid: Boolean @default(false)
// setupFeeAmount: Float @default(499)
```

### 3.3 — Flujo de Setup Fee

1. Cuando el trial vence y el cliente quiere activar:
   - Si setupFeePaid = false → mostrar paso de "Pago de implementación" (USD 499) ANTES del plan mensual
   - Si setupFeePaid = true → ir directo a elegir plan mensual
   - Si setupFeeWaived = true (admin lo eximió) → ir directo a plan mensual

2. Crear preferencia de pago en MP para el setup fee (pago único, NO suscripción)
3. Después de pagar el setup → redirigir a elegir plan mensual → crear suscripción recurrente

4. El Super Admin puede:
   - Ver si la clínica pagó el setup fee
   - Eximir del setup fee (waive) — para demos, primeros clientes, etc.
   - Cambiar el monto del setup fee por clínica

### 3.4 — Frontend

En la página de activación (cuando el trial vence o el usuario hace click en "Activar plan"):

**Paso 1: Setup Fee**
- "Implementación y Onboarding — USD 499"
- "Incluye: configuración completa, importación de datos, conexión WhatsApp, capacitación"
- Botón "Pagar implementación" → checkout MP (pago único)
- Si ya pagó o fue eximido → skip este paso

**Paso 2: Elegir plan**
- Los 3 planes con precios USD + conversión local
- Botón "Suscribirme" → checkout MP (suscripción recurrente)

---

## BLOQUE 4: BLOQUEO POST-TRIAL

### 4.1 — Middleware de verificación de suscripción

Crear middleware `apps/api/src/middleware/subscription-check.ts`:

```typescript
// En cada request autenticado (excepto billing, auth, health):
// 1. Obtener la Subscription del tenant
// 2. Si status === 'TRIALING' y trialEndDate < NOW() → marcar como TRIAL_EXPIRED
// 3. Si status === 'TRIAL_EXPIRED' o 'CANCELLED' o 'PAST_DUE' (>30 días):
//    - Endpoints GET → permitir (read-only)
//    - Endpoints POST/PUT/PATCH/DELETE → bloquear con 402 Payment Required
//    - Excepto: billing endpoints (para que pueda pagar), auth endpoints
// 4. Response 402: { error: "subscription_required", message: "Tu suscripción no está activa", trialExpired: true }
```

### 4.2 — Frontend: Banner de trial/expiración

**Durante el trial (14 días):**
- Banner sutil arriba del dashboard: "Prueba gratuita — X días restantes" + botón "Activar plan"
- Color: azul info
- Se muestra en TODAS las páginas

**Cuando el trial vence:**
- Banner prominente: "Tu prueba gratuita ha vencido. Activá tu plan para seguir usando DentalFlow."
- Color: naranja/rojo warning
- El dashboard se muestra pero con overlay semi-transparente
- Los botones de acción (crear paciente, agendar cita, etc.) están deshabilitados
- Al intentar hacer una acción → modal: "Necesitás un plan activo para realizar esta acción" + botón "Activar plan"
- Los datos se pueden VER pero no EDITAR/CREAR

**Cuando el pago falló (PAST_DUE):**
- Banner: "Hay un problema con tu pago. Actualizá tu método de pago para no perder acceso."
- Dar 7 días de gracia antes de bloquear
- Después de 7 días → mismo bloqueo que trial vencido

### 4.3 — Schema: agregar status TRIAL_EXPIRED

```prisma
// Subscription.status opciones:
// TRIALING → activo, dentro del trial
// TRIAL_EXPIRED → trial venció sin pagar
// ACTIVE → pagando, todo OK
// PAST_DUE → pago falló, en período de gracia
// CANCELLED → cancelado por el cliente
// PAUSED → pausado (por admin)
```

### 4.4 — Cron job: verificar trials vencidos

Agregar job al scheduler (cada 1 hora):
```
Trial Expiration Check:
1. Buscar Subscriptions donde status = 'TRIALING' y trialEndDate < NOW()
2. Actualizar status = 'TRIAL_EXPIRED'
3. Enviar notificación in-app al OWNER
4. Enviar email (si hay servicio de email configurado) — sino solo notificación
5. Crear SecurityLog tipo 'TRIAL_EXPIRED'
```

---

## BLOQUE 5: ACTUALIZAR LANDING CON PRECIOS USD

### 5.1 — Sección de precios

Actualizar la sección de precios en `apps/landing/`:

```
┌─────────────────────────────────────────────────────────────────┐
│  Toggle: [Mensual]  (único toggle por ahora, semestral futuro) │
│                                                                 │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────┐        │
│  │   Starter   │  │  Professional   │  │  Enterprise  │        │
│  │             │  │  ⭐ Más popular │  │              │        │
│  │  USD 99/mes │  │  USD 199/mes    │  │  USD 299/mes │        │
│  │             │  │                 │  │              │        │
│  │ ≈$140.000   │  │ ≈$280.000       │  │ ≈$420.000    │        │
│  │ ARS/mes 🇦🇷 │  │ ARS/mes 🇦🇷     │  │ ARS/mes 🇦🇷  │        │
│  │             │  │                 │  │              │        │
│  │ • 2 dent.   │  │ • Ilimitados    │  │ • Ilimitados │        │
│  │ • 2K msgs   │  │ • 5K msgs       │  │ • 10K msgs   │        │
│  │ • 2K IA     │  │ • 5K IA         │  │ • 10K IA     │        │
│  │             │  │                 │  │              │        │
│  │[Empezar]    │  │[Empezar]        │  │[Empezar]     │        │
│  └─────────────┘  └─────────────────┘  └─────────────┘        │
│                                                                 │
│  + Setup de implementación: USD 499 (pago único)               │
│  "Incluye configuración, importación de datos y capacitación"  │
│                                                                 │
│  14 días gratis. Sin tarjeta de crédito.                       │
│  Selector: [🇦🇷 Argentina ▼] ← para cambiar conversión        │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 — Tabla comparativa

Actualizar los precios en la tabla comparativa a USD:
- DentalFlow: Desde USD 99/mes
- Dentalink: Desde ~USD 150/mes (referencia)
- Kommo CRM: Desde ~USD 100/mes (referencia)

---

## ORDEN DE IMPLEMENTACIÓN

1. **Schema Prisma** — Agregar campos de setup fee, status TRIAL_EXPIRED
2. **Endpoint de registro** — POST /api/v1/auth/register
3. **Página de registro** — Frontend wizard 3 pasos
4. **Servicio de exchange rates** — API + cache + redondeo
5. **Endpoint de pricing** — GET /api/v1/pricing?country=XX
6. **Landing precios USD** — Actualizar sección precios con conversión dinámica
7. **Middleware subscription-check** — Bloqueo POST/PUT/DELETE si trial vencido
8. **Frontend trial banners** — Banners de trial, expiración, past-due
9. **Frontend bloqueo** — Overlay + modales cuando trial vencido
10. **Setup fee flow** — Pago único en MP + flujo de activación
11. **Cron job trial expiration** — Verificar trials vencidos cada hora
12. **Modal de bienvenida** — Post-registro
13. **Actualizar CLAUDE.md**

---

## REGLAS

1. No romper lo que funciona
2. Tenant isolation en toda query
3. Auth JWT en endpoints (excepto register, pricing, health)
4. Zod validation en todo
5. `npx tsc --noEmit` limpio
6. UI en español, código en inglés
7. El registro NO debe requerir setup fee ni pago — es trial gratuito
8. El bloqueo post-trial es SOFT — los datos se ven pero no se editan
9. NUNCA borrar datos de un tenant aunque no pague — solo bloquear acceso de escritura
10. Precios en USD como source of truth, conversión local es solo display
