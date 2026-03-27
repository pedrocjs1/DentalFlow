# Migración de Webhooks a Producción — Dentiqa

## 1. WhatsApp (Meta Business)

1. Ir a [Meta Developers](https://developers.facebook.com/) → App "Dentiqa" (ID: 1627937931777794)
2. Ir a **WhatsApp** → **Configuration** → **Webhook**
3. Cambiar Callback URL a:
   ```
   https://api.dentiqa.app/api/v1/webhooks/whatsapp
   ```
4. Verify Token: usar el mismo `WHATSAPP_VERIFY_TOKEN` configurado en Railway
5. Suscribirse a los campos: `messages`, `message_deliveries`, `message_reads`
6. Verificar que el webhook responde 200 al challenge de Meta

## 2. Mercado Pago

1. Ir a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel/app)
2. Seleccionar la aplicación de producción
3. Ir a **Webhooks** → **Configurar notificaciones**
4. Cambiar URL de notificación a:
   ```
   https://api.dentiqa.app/api/v1/webhooks/mercadopago
   ```
5. Eventos a escuchar: `preapproval` (suscripciones)
6. Guardar y verificar que el endpoint responde 200

## 3. Resend (Email) — DNS en Cloudflare

1. Ir a [Resend Dashboard](https://resend.com/domains) → Add Domain → `dentiqa.app`
2. Resend te dará registros DNS para agregar en Cloudflare:
   - **MX record** — para recibir emails (si aplica)
   - **TXT record** — SPF verification
   - **CNAME record** — DKIM signing
3. En [Cloudflare Dashboard](https://dash.cloudflare.com/) → dominio `dentiqa.app` → DNS:
   - Agregar cada registro que Resend indique
   - IMPORTANTE: Los registros CNAME de Resend deben tener el proxy de Cloudflare **DESACTIVADO** (DNS only, nube gris)
4. Volver a Resend y hacer click en "Verify" — puede tardar hasta 72h pero suele ser minutos
5. Configurar `FROM_EMAIL=hola@dentiqa.app` en las variables de entorno

## 4. Google Calendar (futuro)

1. Ir a [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Editar el OAuth 2.0 Client ID existente
3. Agregar Authorized redirect URI:
   ```
   https://api.dentiqa.app/api/v1/google-calendar/callback
   ```
4. Configurar OAuth consent screen para producción (requiere verificación de Google)
5. Actualizar `GOOGLE_REDIRECT_URI` en Railway

## 5. DNS en Cloudflare (registros CNAME)

| Tipo | Nombre | Destino | Proxy |
|------|--------|---------|-------|
| CNAME | `@` (o dentiqa.app) | `cname.vercel-dns.com` | DNS only |
| CNAME | `dashboard` | `cname.vercel-dns.com` | DNS only |
| CNAME | `admin` | `cname.vercel-dns.com` | DNS only |
| CNAME | `api` | `<tu-app>.up.railway.app` | DNS only |

> NOTA: Vercel y Railway requieren que el proxy de Cloudflare esté **desactivado** (nube gris / DNS only) para que SSL funcione correctamente con sus propios certificados.
