import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { encryptToken, decryptToken } from "../../services/encryption.js";
import { sendWhatsAppTextMessage } from "@dentalflow/messaging";

export async function whatsappRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // ─── POST /api/v1/whatsapp/embedded-signup-complete ─────────────────────────
  // Receives the code from the Facebook Login SDK Embedded Signup flow,
  // exchanges it for credentials, and connects WhatsApp for this tenant.
  app.post("/api/v1/whatsapp/embedded-signup-complete", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string; role: string };
      if (user.role !== "OWNER" && user.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN", "Solo el propietario o admin puede conectar WhatsApp");
      }

      const { code, accessToken: directToken } = request.body as { code?: string; accessToken?: string };

      const appId = process.env.WHATSAPP_APP_ID;
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (!appId || !appSecret || appSecret === "placeholder") {
        throw new AppError(500, "CONFIG_ERROR", "WhatsApp Embedded Signup no está configurado en el servidor");
      }

      let accessToken: string;

      if (directToken) {
        // Token received directly from FB.login() — no exchange needed
        app.log.info("Using direct access token from FB.login()");
        accessToken = directToken;
      } else if (code?.trim()) {
        // Exchange code for access token (fallback)
        const appUrl = process.env.APP_URL ?? "http://localhost:3000";
        const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(appUrl + "/")}`;
        app.log.info("Exchanging code for access token");
        const tokenRes = await fetch(tokenUrl);
        const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message?: string } };

        if (!tokenData.access_token) {
          app.log.error({ error: tokenData.error }, "Token exchange failed");
          throw new AppError(400, "TOKEN_EXCHANGE_FAILED", tokenData.error?.message ?? "Error al intercambiar el código por un token");
        }
        accessToken = tokenData.access_token;
      } else {
        throw new AppError(400, "INVALID_INPUT", "Se requiere accessToken o code de autorización");
      }

      // Step 2: Debug the token to get WABA ID and granted scopes
      const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}`;
      const debugRes = await fetch(debugUrl, {
        headers: { Authorization: `Bearer ${appId}|${appSecret}` },
      });
      const debugData = (await debugRes.json()) as {
        data?: {
          granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
          scopes?: string[];
        };
        error?: { message?: string };
      };

      if (!debugData.data) {
        app.log.error({ error: debugData.error }, "Failed to debug token");
        throw new AppError(400, "TOKEN_DEBUG_FAILED", "Error al verificar el token de acceso");
      }

      // Extract WABA ID from granular scopes
      const wabaScope = debugData.data.granular_scopes?.find(
        (s) => s.scope === "whatsapp_business_management"
      );
      const wabaId = wabaScope?.target_ids?.[0];
      if (!wabaId) {
        throw new AppError(400, "NO_WABA", "No se encontró una cuenta de WhatsApp Business. Asegurate de completar todo el flujo.");
      }

      // Extract Phone Number ID from whatsapp_business_messaging scope
      const messagingScope = debugData.data.granular_scopes?.find(
        (s) => s.scope === "whatsapp_business_messaging"
      );
      let phoneNumberId = messagingScope?.target_ids?.[0];

      // If not in scopes, fetch it from the WABA
      if (!phoneNumberId) {
        const phonesUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`;
        const phonesRes = await fetch(phonesUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const phonesData = (await phonesRes.json()) as {
          data?: Array<{ id: string; display_phone_number: string; verified_name: string }>;
        };
        phoneNumberId = phonesData.data?.[0]?.id;
      }

      if (!phoneNumberId) {
        throw new AppError(400, "NO_PHONE", "No se encontró un número de teléfono registrado en la cuenta.");
      }

      // Step 3: Get the display phone number
      const phoneInfoUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name`;
      const phoneInfoRes = await fetch(phoneInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const phoneInfo = (await phoneInfoRes.json()) as {
        display_phone_number?: string;
        verified_name?: string;
      };

      const displayNumber = phoneInfo.display_phone_number ?? "Número conectado";

      // Step 4: Subscribe our app to the WABA's webhook
      const subscribeUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;
      const subscribeRes = await fetch(subscribeUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!subscribeRes.ok) {
        const subErr = (await subscribeRes.json()) as { error?: { message?: string } };
        app.log.warn({ wabaId, error: subErr.error }, "Failed to subscribe WABA to webhook — continuing anyway");
      }

      // Step 5: Register the phone number for messaging
      const registerUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/register`;
      const pin = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit random PIN
      const registerRes = await fetch(registerUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", pin }),
      });

      if (!registerRes.ok) {
        const regErr = (await registerRes.json()) as { error?: { message?: string; code?: number } };
        // Code 100 = already registered (normal scenario)
        if (regErr.error?.code !== 100) {
          app.log.warn({ phoneNumberId, error: regErr.error }, "Phone number registration warning");
        }
      }

      // Step 6: Save everything to the Tenant (token encrypted)
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          wabaId,
          whatsappPhoneNumberId: phoneNumberId,
          whatsappDisplayNumber: displayNumber,
          whatsappAccessToken: encryptToken(accessToken),
          whatsappConnectedAt: new Date(),
          whatsappStatus: "CONNECTED",
        },
      });

      app.log.info(
        { tenantId: user.tenantId, wabaId, phoneNumberId, displayNumber },
        "WhatsApp Embedded Signup completed successfully"
      );

      return {
        success: true,
        displayNumber,
        phoneNumberId,
        wabaId,
      };
    },
  });

  // ─── DELETE /api/v1/whatsapp/disconnect ─────────────────────────────────────
  app.delete("/api/v1/whatsapp/disconnect", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; role: string };
      if (user.role !== "OWNER" && user.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN", "Solo el propietario o admin puede desconectar WhatsApp");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { wabaId: true, whatsappAccessToken: true },
      });

      // Try to unsubscribe our app from the WABA webhook
      if (tenant?.wabaId && tenant.whatsappAccessToken) {
        try {
          const token = decryptToken(tenant.whatsappAccessToken);
          const url = `https://graph.facebook.com/v21.0/${tenant.wabaId}/subscribed_apps`;
          await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          app.log.warn({ err, tenantId: user.tenantId }, "Failed to unsubscribe WABA — cleaning up anyway");
        }
      }

      // Clear all WhatsApp fields
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          wabaId: null,
          whatsappPhoneNumberId: null,
          whatsappDisplayNumber: null,
          whatsappAccessToken: null,
          whatsappConnectedAt: null,
          whatsappStatus: "DISCONNECTED",
        },
      });

      app.log.info({ tenantId: user.tenantId }, "WhatsApp disconnected");
      return reply.status(204).send();
    },
  });

  // ─── GET /api/v1/whatsapp/status ────────────────────────────────────────────
  app.get("/api/v1/whatsapp/status", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          whatsappStatus: true,
          whatsappPhoneNumberId: true,
          whatsappDisplayNumber: true,
          wabaId: true,
          whatsappConnectedAt: true,
        },
      });

      if (!tenant) throw new AppError(404, "TENANT_NOT_FOUND", "Tenant no encontrado");

      return {
        status: tenant.whatsappStatus,
        phoneNumberId: tenant.whatsappPhoneNumberId,
        displayNumber: tenant.whatsappDisplayNumber,
        wabaId: tenant.wabaId,
        connectedAt: tenant.whatsappConnectedAt,
        webhookUrl: `${process.env.API_URL ?? "http://localhost:3001"}/api/v1/webhooks/whatsapp`,
      };
    },
  });

  // ─── POST /api/v1/whatsapp/send-test ────────────────────────────────────────
  // Sends a test message to the clinic admin's phone number
  app.post("/api/v1/whatsapp/send-test", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          whatsappStatus: true,
          whatsappPhoneNumberId: true,
          whatsappAccessToken: true,
          phone: true,
          name: true,
        },
      });

      if (!tenant || tenant.whatsappStatus !== "CONNECTED") {
        throw new AppError(400, "NOT_CONNECTED", "WhatsApp no está conectado");
      }

      if (!tenant.phone) {
        throw new AppError(400, "NO_PHONE", "Configurá un teléfono de la clínica primero en Configuración → Datos");
      }

      if (!tenant.whatsappPhoneNumberId || !tenant.whatsappAccessToken) {
        throw new AppError(400, "NOT_CONNECTED", "Credenciales de WhatsApp incompletas");
      }

      const accessToken = decryptToken(tenant.whatsappAccessToken);

      const waMessageId = await sendWhatsAppTextMessage({
        phoneNumberId: tenant.whatsappPhoneNumberId,
        accessToken,
        to: tenant.phone,
        message: `Hola desde ${tenant.name}! Este es un mensaje de prueba de DentalFlow. Si recibiste esto, tu WhatsApp está configurado correctamente. ✅`,
      });

      return { success: true, waMessageId };
    },
  });
}
