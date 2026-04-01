/**
 * Smart Message Service — centralized WhatsApp message sending with fallback chain.
 *
 * 1. Look for approved template matching messageType (or suggestedTrigger)
 * 2. If template found → send it
 * 3. If no template → check 24h window
 *    3a. Window open + fallbackText → send text
 *    3b. Window closed + no template → create notification for receptionist
 * 4. Returns result with method used
 */

import { prisma } from "@dentiqa/db";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplate,
} from "@dentiqa/messaging";
import { decryptToken } from "./encryption.js";
import { recordUsage } from "./usage-tracker.js";
import { createNotification } from "./notifications.js";

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export type SmartMessageType =
  | "post_visit"
  | "appointment_reminder"
  | "missed_appointment"
  | "treatment_followup"
  | "welcome"
  | "re_engagement"
  | "remarketing"
  | "post_procedure";

export interface SmartMessageParams {
  tenantId: string;
  patientPhone: string;
  conversationId?: string; // If known, used to save message + check window
  patientId?: string; // Used to find conversation if conversationId not provided
  messageType: SmartMessageType;
  variables: {
    nombre: string;
    clinica?: string;
    tratamiento?: string;
    dentista?: string;
    descuento?: string;
    fecha?: string;
    hora?: string;
  };
  fallbackText?: string;
}

export interface SmartMessageResult {
  sent: boolean;
  method: "template" | "text" | "notification" | "none";
  waMessageId?: string;
  error?: string;
}

interface WACredentials {
  tenantId: string;
  tenantName: string;
  phoneNumberId: string;
  accessToken: string;
}

async function getWACredentials(tenantId: string): Promise<WACredentials | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      whatsappPhoneNumberId: true,
      whatsappAccessToken: true,
      whatsappStatus: true,
    },
  });

  if (!tenant?.whatsappPhoneNumberId || !tenant.whatsappAccessToken || tenant.whatsappStatus !== "CONNECTED") {
    return null;
  }

  let accessToken: string;
  try {
    accessToken = decryptToken(tenant.whatsappAccessToken);
  } catch {
    accessToken = tenant.whatsappAccessToken;
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    phoneNumberId: tenant.whatsappPhoneNumberId,
    accessToken,
  };
}

async function findConversation(tenantId: string, patientId?: string, conversationId?: string) {
  if (conversationId) {
    return prisma.conversation.findUnique({ where: { id: conversationId } });
  }
  if (patientId) {
    return prisma.conversation.findFirst({
      where: { tenantId, patientId, status: { not: "CLOSED" } },
    });
  }
  return null;
}

function isWindowOpen(lastPatientMessageAt: Date | null): boolean {
  if (!lastPatientMessageAt) return false;
  return Date.now() - lastPatientMessageAt.getTime() < WHATSAPP_WINDOW_MS;
}

/**
 * Find the best approved template for a given messageType.
 * Searches by: messageType field → suggestedTrigger → name contains.
 */
async function findBestTemplate(
  tenantId: string,
  messageType: string
): Promise<{
  id: string;
  name: string;
  language: string;
  bodyText: string;
  variablesJson: unknown;
} | null> {
  // 1. Try exact messageType match (tenant-specific first, then system)
  const byMessageType = await prisma.whatsAppTemplate.findFirst({
    where: {
      status: "APPROVED",
      isActive: true,
      messageType,
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: { tenantId: "desc" }, // Prefer tenant-specific over system
    select: { id: true, name: true, language: true, bodyText: true, variablesJson: true },
  });
  if (byMessageType) return byMessageType;

  // 2. Try suggestedTrigger match
  const byTrigger = await prisma.whatsAppTemplate.findFirst({
    where: {
      status: "APPROVED",
      isActive: true,
      suggestedTrigger: messageType,
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: { tenantId: "desc" },
    select: { id: true, name: true, language: true, bodyText: true, variablesJson: true },
  });
  if (byTrigger) return byTrigger;

  // 3. Try name contains (fuzzy)
  const normalized = messageType.replace(/_/g, "");
  const byName = await prisma.whatsAppTemplate.findFirst({
    where: {
      status: "APPROVED",
      isActive: true,
      name: { contains: normalized, mode: "insensitive" },
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: { tenantId: "desc" },
    select: { id: true, name: true, language: true, bodyText: true, variablesJson: true },
  });
  return byName;
}

/**
 * Build template components from variables mapping and provided values.
 */
function buildTemplateComponents(
  variablesJson: unknown,
  variables: SmartMessageParams["variables"]
): Record<string, unknown>[] {
  if (!variablesJson || !Array.isArray(variablesJson)) return [];

  const fieldMap: Record<string, string | undefined> = {
    firstName: variables.nombre?.split(" ")[0],
    nombre: variables.nombre,
    clinica: variables.clinica,
    clinic_name: variables.clinica,
    tratamiento: variables.tratamiento,
    treatment: variables.tratamiento,
    dentista: variables.dentista,
    dentist: variables.dentista,
    descuento: variables.descuento,
    discount: variables.descuento,
    fecha: variables.fecha,
    hora: variables.hora,
  };

  const params = (variablesJson as Array<{ position: number; field: string; example: string }>)
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      type: "text" as const,
      text: fieldMap[v.field] ?? v.example ?? variables.nombre,
    }));

  if (params.length === 0) return [];

  return [{ type: "body", parameters: params }];
}

/**
 * Send a smart message with automatic template/text/notification fallback.
 */
export async function sendSmartMessage(params: SmartMessageParams): Promise<SmartMessageResult> {
  const {
    tenantId,
    patientPhone,
    conversationId,
    patientId,
    messageType,
    variables,
    fallbackText,
  } = params;

  const creds = await getWACredentials(tenantId);
  if (!creds) {
    return { sent: false, method: "none", error: "WhatsApp not connected" };
  }

  const clinicName = variables.clinica ?? creds.tenantName;
  variables.clinica = clinicName;

  const conversation = await findConversation(tenantId, patientId, conversationId);
  const windowOpen = conversation ? isWindowOpen(conversation.lastPatientMessageAt) : false;

  // 1. Try to find an approved template
  const template = await findBestTemplate(tenantId, messageType);

  if (template) {
    try {
      const components = buildTemplateComponents(template.variablesJson, variables);
      const waMessageId = await sendWhatsAppTemplate({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        to: patientPhone,
        templateName: template.name,
        language: template.language ?? "es",
        components,
      });

      // Save to conversation if available
      if (conversation) {
        const preview = `[Template: ${template.name}]`;
        await Promise.all([
          prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: "OUTBOUND",
              type: "TEMPLATE",
              content: preview,
              whatsappMessageId: waMessageId,
              metadata: { sentBy: "bot", messageType, templateName: template.name },
            },
          }),
          prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date(), lastMessagePreview: preview },
          }),
        ]);
      }

      recordUsage(tenantId, "WHATSAPP_MESSAGE", 1, { direction: `outbound_smart_template`, messageType }).catch(() => {});
      return { sent: true, method: "template", waMessageId };
    } catch (err) {
      console.error(`[smart-message] Template send failed for ${messageType}:`, err);
      // Fall through to text fallback
    }
  }

  // 2. No template (or template failed) → try text if window is open
  if (windowOpen && fallbackText) {
    try {
      const waMessageId = await sendWhatsAppTextMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        to: patientPhone,
        message: fallbackText,
      });

      if (conversation) {
        await Promise.all([
          prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: "OUTBOUND",
              type: "TEXT",
              content: fallbackText,
              whatsappMessageId: waMessageId,
              metadata: { sentBy: "bot", messageType },
            },
          }),
          prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date(), lastMessagePreview: fallbackText.slice(0, 100) },
          }),
        ]);
      }

      recordUsage(tenantId, "WHATSAPP_MESSAGE", 1, { direction: `outbound_smart_text`, messageType }).catch(() => {});
      return { sent: true, method: "text", waMessageId };
    } catch (err) {
      console.error(`[smart-message] Text send failed for ${messageType}:`, err);
    }
  }

  // 3. Can't send message → create notification for receptionist
  const firstName = variables.nombre?.split(" ")[0] ?? "Paciente";
  createNotification(tenantId, {
    type: "bot_paused_alert",
    title: `No se pudo enviar mensaje (${messageType})`,
    message: `No se pudo contactar a ${firstName}${variables.tratamiento ? ` sobre ${variables.tratamiento}` : ""}. ${
      !template ? "No hay template aprobado." : "La ventana de 24hs está cerrada."
    } Contactalo manualmente.`,
    link: "/conversaciones",
    metadata: { patientId, messageType, patientPhone },
  }).catch(() => {});

  return { sent: false, method: "notification" };
}
