/**
 * Appointment Messages Service
 *
 * Handles sending WhatsApp messages for appointment lifecycle events:
 * - Welcome message when appointment starts (IN_PROGRESS)
 * - Post-visit follow-up (2h after COMPLETED, via cron job)
 *
 * Respects the 24h WhatsApp window: sends text if open, template if closed.
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

interface TenantWACredentials {
  id: string;
  name: string;
  whatsappPhoneNumberId: string | null;
  whatsappAccessToken: string | null;
  whatsappStatus: string;
}

async function getCredentials(tenantId: string): Promise<{
  tenant: TenantWACredentials;
  phoneNumberId: string;
  accessToken: string;
} | null> {
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

  return { tenant, phoneNumberId: tenant.whatsappPhoneNumberId, accessToken };
}

function isWindowOpen(lastPatientMessageAt: Date | null): boolean {
  if (!lastPatientMessageAt) return false;
  return Date.now() - lastPatientMessageAt.getTime() < WHATSAPP_WINDOW_MS;
}

async function findApprovedTemplate(
  tenantId: string,
  trigger: string
): Promise<{ name: string; language: string } | null> {
  const template = await prisma.whatsAppTemplate.findFirst({
    where: {
      tenantId,
      status: "APPROVED",
      OR: [
        { suggestedTrigger: trigger },
        { name: { contains: trigger.replace(/_/g, ""), mode: "insensitive" } },
      ],
    },
    select: { name: true, language: true },
  });
  return template ? { name: template.name, language: template.language ?? "es" } : null;
}

/**
 * Send a message related to an appointment event.
 * Automatically handles 24h window: text if open, template if available, or notification fallback.
 */
export async function sendAppointmentMessage(
  tenantId: string,
  patientId: string,
  event: "welcome" | "post_visit",
  context: {
    patientFirstName: string;
    clinicName?: string;
    treatmentName?: string;
    dentistName?: string;
  }
): Promise<void> {
  const creds = await getCredentials(tenantId);
  if (!creds) return;

  const clinicName = context.clinicName ?? creds.tenant.name;

  // Find the patient's conversation
  const conversation = await prisma.conversation.findFirst({
    where: { tenantId, patientId, status: { not: "CLOSED" } },
  });

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId },
    select: { phone: true, firstName: true },
  });
  if (!patient?.phone) return;

  const windowOpen = conversation ? isWindowOpen(conversation.lastPatientMessageAt) : false;

  const messages: Record<string, string> = {
    welcome: `Hola ${context.patientFirstName}! Bienvenido/a a ${clinicName}. Ya estamos listos para tu cita 😊`,
    post_visit: `Hola ${context.patientFirstName}! ¿Cómo te sentiste después de tu visita? Si tenés alguna duda sobre tu tratamiento, respondé este mensaje 🦷`,
  };

  const triggerMap: Record<string, string> = {
    welcome: "appointment_welcome",
    post_visit: "post_visit",
  };

  try {
    if (windowOpen) {
      // Window open — send text message
      const waMessageId = await sendWhatsAppTextMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.accessToken,
        to: patient.phone,
        message: messages[event],
      });

      // Save outbound message to conversation
      if (conversation) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            direction: "OUTBOUND",
            type: "TEXT",
            content: messages[event],
            whatsappMessageId: waMessageId,
            metadata: { sentBy: "bot", trigger: event },
          },
        });
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: new Date(),
            lastMessagePreview: messages[event].slice(0, 100),
          },
        });
      }

      recordUsage(tenantId, "WHATSAPP_MESSAGE", 1, { direction: `outbound_${event}` }).catch(() => {});
    } else {
      // Window closed — try template
      const template = await findApprovedTemplate(tenantId, triggerMap[event]);
      if (template) {
        const waMessageId = await sendWhatsAppTemplate({
          phoneNumberId: creds.phoneNumberId,
          accessToken: creds.accessToken,
          to: patient.phone,
          templateName: template.name,
          language: template.language,
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: context.patientFirstName }],
            },
          ],
        });

        if (conversation) {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              direction: "OUTBOUND",
              type: "TEMPLATE",
              content: `[Template: ${template.name}]`,
              whatsappMessageId: waMessageId,
              metadata: { sentBy: "bot", trigger: event, templateName: template.name },
            },
          });
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: new Date(),
              lastMessagePreview: `[Template: ${template.name}]`,
            },
          });
        }

        recordUsage(tenantId, "WHATSAPP_MESSAGE", 1, { direction: `outbound_template_${event}` }).catch(() => {});
      } else {
        // No template available — notify receptionist
        createNotification(tenantId, {
          type: event === "welcome" ? "system" : "message",
          title: event === "welcome"
            ? "No se pudo enviar bienvenida"
            : "No se pudo enviar seguimiento post-visita",
          message: `La ventana de 24hs está cerrada para ${context.patientFirstName} y no hay template aprobado. Contactalo manualmente.`,
          link: `/conversaciones`,
          metadata: { patientId, event },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`[appointment-messages] Failed to send ${event} message:`, err);
  }
}
