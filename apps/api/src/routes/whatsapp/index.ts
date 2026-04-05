import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { encryptToken, decryptToken } from "../../services/encryption.js";
import { sendWhatsAppTextMessage } from "@dentiqa/messaging";
import { submitTemplate } from "../../services/whatsapp-templates.js";

// ─── Default templates to create on WhatsApp connect ─────────────────────────
// 7 UTILITY (variante A) + 7 UTILITY (variante B backup) + 3 MARKETING = 17

interface DefaultTemplate {
  name: string;
  displayName: string;
  description: string;
  messageType: string;
  suggestedTrigger: string;
  category: string;
  bodyText: string;
  variablesJson: Array<{ position: number; field: string; example: string }>;
  isBackup: boolean;
}

const VARS_PATIENT_CLINIC = [
  { position: 1, field: "firstName", example: "Pedro" },
  { position: 2, field: "clinicName", example: "Clínica Dental" },
];

const VARS_PATIENT_CLINIC_TREATMENT = [
  ...VARS_PATIENT_CLINIC,
  { position: 3, field: "treatmentName", example: "limpieza" },
];

const VARS_APPOINTMENT = [
  { position: 1, field: "firstName", example: "Pedro" },
  { position: 2, field: "time", example: "10:00" },
  { position: 3, field: "dentistName", example: "Dra. González" },
  { position: 4, field: "clinicName", example: "Clínica Dental" },
];

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // ── UTILITY — Variante A (primarios) ──────────────────────────────────────
  {
    name: "appointment_reminder_24h",
    displayName: "Recordatorio de cita 24hs",
    description: "Se envía 24hs antes de la cita programada",
    messageType: "appointment_reminder",
    suggestedTrigger: "Recordatorio de cita",
    category: "UTILITY",
    bodyText: "Hola {{1}}, te recordamos tu cita programada para mañana a las {{2}} con {{3}} en {{4}}. Si necesitás reprogramar, escribinos con anticipación.",
    variablesJson: VARS_APPOINTMENT,
    isBackup: false,
  },
  {
    name: "post_visit_followup",
    displayName: "Seguimiento post-visita",
    description: "Se envía después de una visita para seguimiento",
    messageType: "post_visit_followup",
    suggestedTrigger: "post_visit",
    category: "UTILITY",
    bodyText: "Hola {{1}}, desde {{2}} queremos saber cómo te sentís después de tu última visita. Si tenés alguna molestia o consulta, no dudes en escribirnos.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: false,
  },
  {
    name: "treatment_followup_6m",
    displayName: "Control de tratamiento",
    description: "Recordatorio de control periódico vinculado a tratamiento",
    messageType: "treatment_followup",
    suggestedTrigger: "follow_up",
    category: "UTILITY",
    bodyText: "Hola {{1}}, te escribimos de {{2}} respecto a tu tratamiento de {{3}}. Según el plan indicado, corresponde un control de seguimiento. Escribinos para coordinar el turno.",
    variablesJson: VARS_PATIENT_CLINIC_TREATMENT,
    isBackup: false,
  },
  {
    name: "post_procedure_check",
    displayName: "Control post-procedimiento",
    description: "Control post-procedimiento",
    messageType: "post_procedure_check",
    suggestedTrigger: "post_procedure",
    category: "UTILITY",
    bodyText: "Hola {{1}}, te escribimos de {{2}} para saber cómo evolucionás después de tu tratamiento de {{3}}. Si tenés alguna molestia, escribinos.",
    variablesJson: VARS_PATIENT_CLINIC_TREATMENT,
    isBackup: false,
  },
  {
    name: "no_show_followup",
    displayName: "Cita no asistida",
    description: "Se envía cuando el paciente no asiste a la cita",
    messageType: "no_show_followup",
    suggestedTrigger: "missed_appointment",
    category: "UTILITY",
    bodyText: "Hola {{1}}, notamos que no pudiste asistir a tu cita en {{2}}. Entendemos que pueden surgir imprevistos. Escribinos cuando quieras reprogramar.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: false,
  },
  {
    name: "interested_not_booked",
    displayName: "Interesado sin agendar",
    description: "Para interesados que no agendaron cita",
    messageType: "interested_not_booked",
    suggestedTrigger: "no_booking_followup",
    category: "UTILITY",
    bodyText: "Hola {{1}}, te escribimos desde {{2}}. Vimos que consultaste por {{3}} y queremos ayudarte a coordinar una cita. Respondé este mensaje y te agendamos.",
    variablesJson: VARS_PATIENT_CLINIC_TREATMENT,
    isBackup: false,
  },
  {
    name: "welcome_new_patient",
    displayName: "Bienvenida paciente nuevo",
    description: "Primer contacto con paciente cargado manualmente",
    messageType: "welcome_new_patient",
    suggestedTrigger: "welcome",
    category: "UTILITY",
    bodyText: 'Hola {{1}}, te contactamos desde {{2}}. Respondé "Hola" para que podamos asistirte.',
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: false,
  },

  // ── UTILITY — Variante B (backups) ────────────────────────────────────────
  {
    name: "appointment_reminder_24h_b",
    displayName: "Recordatorio de cita 24hs (B)",
    description: "Backup - Recordatorio de cita 24hs",
    messageType: "appointment_reminder",
    suggestedTrigger: "Recordatorio de cita",
    category: "UTILITY",
    bodyText: "Hola {{1}}, mañana tenés turno a las {{2}} en {{4}}. Profesional: {{3}}. Respondé este mensaje si necesitás hacer algún cambio.",
    variablesJson: VARS_APPOINTMENT,
    isBackup: true,
  },
  {
    name: "post_visit_followup_b",
    displayName: "Seguimiento post-visita (B)",
    description: "Backup - Seguimiento post-visita",
    messageType: "post_visit_followup",
    suggestedTrigger: "post_visit",
    category: "UTILITY",
    bodyText: "Hola {{1}}, te escribimos de {{2}} para tu seguimiento post-consulta. ¿Está todo bien? Cualquier duda estamos a disposición.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: true,
  },
  {
    name: "treatment_followup_6m_b",
    displayName: "Control de tratamiento (B)",
    description: "Backup - Control periódico vinculado a tratamiento",
    messageType: "treatment_followup",
    suggestedTrigger: "follow_up",
    category: "UTILITY",
    bodyText: "Hola {{1}}, desde {{2}} te informamos que tu tratamiento de {{3}} requiere una revisión de control. Respondé este mensaje para agendar.",
    variablesJson: VARS_PATIENT_CLINIC_TREATMENT,
    isBackup: true,
  },
  {
    name: "post_procedure_check_b",
    displayName: "Control post-procedimiento (B)",
    description: "Backup - Control post-procedimiento",
    messageType: "post_procedure_check",
    suggestedTrigger: "post_procedure",
    category: "UTILITY",
    bodyText: "Hola {{1}}, desde {{2}} hacemos seguimiento de tu {{3}}. ¿Cómo te sentís? Ante cualquier duda, respondé este mensaje.",
    variablesJson: VARS_PATIENT_CLINIC_TREATMENT,
    isBackup: true,
  },
  {
    name: "no_show_followup_b",
    displayName: "Cita no asistida (B)",
    description: "Backup - Seguimiento de cita no asistida",
    messageType: "no_show_followup",
    suggestedTrigger: "missed_appointment",
    category: "UTILITY",
    bodyText: "Hola {{1}}, te habíamos reservado un turno en {{2}} pero no pudimos atenderte. Si querés coordinar una nueva fecha, respondé este mensaje.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: true,
  },
  {
    name: "interested_not_booked_b",
    displayName: "Interesado sin agendar (B)",
    description: "Backup - Interesados que no agendaron cita",
    messageType: "interested_not_booked",
    suggestedTrigger: "no_booking_followup",
    category: "UTILITY",
    bodyText: "Hola {{1}}, desde {{2}} queremos retomar tu consulta sobre {{3}}. ¿Te gustaría agendar un turno? Escribinos y te damos los horarios disponibles.",
    variablesJson: VARS_PATIENT_CLINIC_TREATMENT,
    isBackup: true,
  },
  {
    name: "welcome_new_patient_b",
    displayName: "Bienvenida paciente nuevo (B)",
    description: "Backup - Primer contacto con paciente nuevo",
    messageType: "welcome_new_patient",
    suggestedTrigger: "welcome",
    category: "UTILITY",
    bodyText: "Hola {{1}}, somos {{2}}. Escribinos por acá y te ayudamos a coordinar tu consulta.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: true,
  },

  // ── MARKETING (sin backup) ────────────────────────────────────────────────
  {
    name: "reactivation_standard",
    displayName: "Reactivación estándar",
    description: "Para pacientes inactivos hace tiempo",
    messageType: "reactivation_standard",
    suggestedTrigger: "re_engagement",
    category: "MARKETING",
    bodyText: "Hola {{1}}, hace tiempo que no nos visitás en {{2}}. Tu salud dental es importante y nos gustaría verte pronto. Escribinos para agendar tu próxima visita.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: false,
  },
  {
    name: "reactivation_discount",
    displayName: "Reactivación con descuento",
    description: "Para pacientes inactivos con oferta",
    messageType: "reactivation_discount",
    suggestedTrigger: "remarketing",
    category: "MARKETING",
    bodyText: "Hola {{1}}, en {{2}} tenemos una promoción especial para vos. Escribinos para conocer los detalles y agendar tu visita.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: false,
  },
  {
    name: "birthday_greeting",
    displayName: "Saludo de cumpleaños",
    description: "Saludo automático de cumpleaños",
    messageType: "birthday_greeting",
    suggestedTrigger: "birthday",
    category: "MARKETING",
    bodyText: "Hola {{1}}, desde {{2}} te deseamos un muy feliz cumpleaños. Esperamos que pases un gran día.",
    variablesJson: VARS_PATIENT_CLINIC,
    isBackup: false,
  },
];

export { DEFAULT_TEMPLATES };

export async function createDefaultTemplates(
  tenantId: string,
  wabaId: string,
  accessToken: string,
  log: FastifyBaseLogger
): Promise<void> {
  let succeeded = 0;
  let failed = 0;

  for (const tmpl of DEFAULT_TEMPLATES) {
    try {
      // Check if template already exists for this tenant
      const existing = await prisma.whatsAppTemplate.findFirst({
        where: { tenantId, name: tmpl.name },
      });
      if (existing) {
        log.info({ templateName: tmpl.name }, "Default template already exists, skipping");
        continue;
      }

      // Create in local DB as DRAFT
      const created = await prisma.whatsAppTemplate.create({
        data: {
          tenantId,
          name: tmpl.name,
          displayName: tmpl.displayName,
          description: tmpl.description,
          category: tmpl.category,
          language: "es_AR",
          bodyText: tmpl.bodyText,
          variablesJson: tmpl.variablesJson,
          messageType: tmpl.messageType,
          suggestedTrigger: tmpl.suggestedTrigger,
          isSystemTemplate: false,
          isBackup: tmpl.isBackup,
          status: "DRAFT",
        },
      });

      // Submit to Meta via the shared service (handles status update, metaTemplateId, and TemplateEvents)
      try {
        const result = await submitTemplate(created.id, wabaId, accessToken);
        if (result.success) {
          succeeded++;
          log.info({ templateName: tmpl.name, metaId: result.metaTemplateId }, "Default template submitted to Meta");
        } else {
          failed++;
          log.warn({ templateName: tmpl.name, error: result.error }, "Meta rejected default template (non-fatal)");
        }
      } catch (submitErr) {
        failed++;
        // submitTemplate() already creates TemplateEvents on error, but log for visibility
        log.warn({ templateName: tmpl.name, err: submitErr }, "Failed to submit template to Meta (non-fatal)");
      }
    } catch (err) {
      failed++;
      log.warn({ templateName: tmpl.name, err }, "Failed to create default template (non-fatal)");
    }
  }

  log.info(
    { succeeded, failed, total: DEFAULT_TEMPLATES.length },
    `Default templates: ${succeeded}/${DEFAULT_TEMPLATES.length} submitted, ${failed} failed`
  );
}

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
        // Exchange code for access token
        // FB.login() popup flow does not use redirect_uri, so we must omit it here
        const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`;
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

      // Step 1b: Exchange short-lived token for a long-lived token (~60 days)
      try {
        const llUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${encodeURIComponent(accessToken)}`;
        const llRes = await fetch(llUrl);
        const llData = (await llRes.json()) as { access_token?: string; token_type?: string; expires_in?: number; error?: { message?: string } };

        if (llData.access_token) {
          app.log.info(
            { expiresIn: llData.expires_in },
            "Exchanged for long-lived token successfully"
          );
          accessToken = llData.access_token;
        } else {
          app.log.warn(
            { error: llData.error },
            "Long-lived token exchange failed — continuing with short-lived token"
          );
        }
      } catch (err) {
        app.log.warn({ err }, "Long-lived token exchange request failed — continuing with short-lived token");
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

      // Fetch the real Phone Number ID from the WABA
      // Note: debug_token granular_scopes target_ids for whatsapp_business_messaging
      // returns the WABA ID, NOT the phone number ID — so we always query the WABA.
      const phonesUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`;
      const phonesRes = await fetch(phonesUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const phonesData = (await phonesRes.json()) as {
        data?: Array<{ id: string; display_phone_number: string; verified_name: string }>;
        error?: { message?: string };
      };

      if (!phonesData.data?.length) {
        app.log.error({ wabaId, error: phonesData.error }, "No phone numbers found on WABA");
        throw new AppError(400, "NO_PHONE", "No se encontró un número de teléfono registrado en la cuenta.");
      }

      const phoneNumberId = phonesData.data[0].id;
      const displayNumber = phonesData.data[0].display_phone_number ?? "Número conectado";

      app.log.info(
        { wabaId, phoneNumberId, displayNumber },
        "Fetched phone number from WABA"
      );

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

      // Create default UTILITY templates (fire-and-forget)
      createDefaultTemplates(user.tenantId, wabaId, accessToken, app.log).catch((err) => {
        app.log.warn({ err }, "Failed to create default templates (non-fatal)");
      });

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
        message: `Hola desde ${tenant.name}! Este es un mensaje de prueba de Dentiqa. Si recibiste esto, tu WhatsApp está configurado correctamente. ✅`,
      });

      return { success: true, waMessageId };
    },
  });
}
