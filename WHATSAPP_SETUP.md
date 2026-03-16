# WhatsApp Embedded Signup — Setup Guide

DentalFlow uses WhatsApp **Embedded Signup** so each clinic can connect their own WhatsApp Business account directly from the dashboard. We act as a **Solution Partner / Tech Provider** — one Meta app, multiple client WABAs.

---

## Prerequisites

- A **Meta Business Account** (business.facebook.com) verified and in good standing.
- A **Facebook Developer account** (developers.facebook.com).

---

## Step 1 — Create a Meta App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Create App**.
2. Select app type: **Business**.
3. Enter app name (e.g., "DentalFlow WhatsApp"), contact email, and select your Meta Business Account.
4. Click **Create App**.

**Save:**
- `App ID` → will be `WHATSAPP_APP_ID`
- `App Secret` (Settings → Basic → App Secret) → will be `WHATSAPP_APP_SECRET`

---

## Step 2 — Add WhatsApp Product

1. In the App Dashboard, click **Add Product** on the left sidebar.
2. Find **WhatsApp** and click **Set Up**.
3. This creates a test WABA and phone number for development — ignore them, they're for testing only.

---

## Step 3 — Configure Facebook Login for Business

1. In the App Dashboard, click **Add Product** → find **Facebook Login for Business** → **Set Up**.
2. In Facebook Login for Business settings:
   - **Login variation**: Select **WhatsApp Embedded Signup**.
   - **Valid OAuth Redirect URIs**: Add your app URL (e.g., `https://app.dentalflow.com`, `http://localhost:3000` for dev).

---

## Step 4 — Create Embedded Signup Configuration

1. Go to **WhatsApp** → **Embedded Signup** in the App Dashboard.
2. Click **Create configuration**.
3. Configure:
   - **Solution name**: "DentalFlow"
   - **Allow phone number selection**: Yes
   - **Allow creation of new WABA**: Yes
   - **Permissions requested**: `whatsapp_business_management`, `whatsapp_business_messaging`
4. Click **Create**.

**Save:**
- `Configuration ID` → will be `WHATSAPP_CONFIGURATION_ID`

---

## Step 5 — Configure Webhooks

1. Go to **WhatsApp** → **Configuration** in the App Dashboard.
2. **Webhook URL**: `https://api.dentalflow.com/api/v1/webhooks/whatsapp`
   - For development: use ngrok or similar tunnel.
3. **Verify Token**: Enter the same value as `WHATSAPP_VERIFY_TOKEN` in your `.env`.
4. Click **Verify and Save**.
5. **Subscribe to webhook fields:**
   - `messages` — incoming messages, message status updates
   - `message_template_status_update` — template approval notifications (optional)

---

## Step 6 — Request Permissions

For the app to work with Embedded Signup, request these permissions via **App Review**:

| Permission | Purpose |
|---|---|
| `whatsapp_business_management` | Access WABA info, subscribe to webhooks, manage phone numbers |
| `whatsapp_business_messaging` | Send and receive messages on behalf of client WABAs |

> During development, these permissions work without review for test users added to the app.

---

## Step 7 — Environment Variables

Add these to your `.env`:

```env
# WhatsApp Embedded Signup (Meta App)
WHATSAPP_APP_ID="your-meta-app-id"
WHATSAPP_APP_SECRET="your-meta-app-secret"
WHATSAPP_CONFIGURATION_ID="your-embedded-signup-config-id"

# Webhook verification token (choose any random string)
WHATSAPP_VERIFY_TOKEN="dentalflow-verify-token-prod"

# Feature flag (set to "true" in production)
WHATSAPP_ENABLED="false"
```

Also add to the **frontend** `.env.local`:

```env
NEXT_PUBLIC_WHATSAPP_APP_ID="your-meta-app-id"
NEXT_PUBLIC_WHATSAPP_CONFIG_ID="your-embedded-signup-config-id"
```

---

## How It Works (End-to-End Flow)

1. Clinic admin clicks **"Conectar WhatsApp"** in Configuración → Integraciones.
2. Frontend loads the Facebook JavaScript SDK and calls `FB.login()` with the Embedded Signup config.
3. Meta opens a popup where the clinic owner:
   - Logs in with their Facebook account
   - Selects or creates their Business Portfolio
   - Creates or selects a WhatsApp Business Account (WABA)
   - Adds and verifies their phone number via OTP
4. On success, the popup returns a `code` to our frontend.
5. Frontend sends the `code` to `POST /api/v1/whatsapp/embedded-signup-complete`.
6. Backend:
   - Exchanges `code` for an access token via Meta Graph API.
   - Retrieves the WABA ID and Phone Number ID.
   - Subscribes the WABA to our webhook (so we receive messages).
   - Registers the phone number for messaging.
   - Stores credentials (encrypted) on the Tenant.
7. Clinic is now connected. Incoming messages arrive at our webhook, resolved to this tenant by `phoneNumberId`.

---

## Architecture Notes

- **Each clinic has its own WABA** — their messaging limits, quality rating, and compliance are independent.
- **We subscribe each WABA to OUR webhook** — all messages from all clinics come to the same endpoint.
- **Token storage**: Access tokens are encrypted with AES-256-GCM before saving to the database.
- **If a clinic has issues** (banned, rate-limited), it does NOT affect other clinics.
- **Super Admin** can monitor all WhatsApp connections and force-disconnect if needed.
