/**
 * Treatment Follow-up Job
 *
 * Runs every 1 hour. Sends follow-up WhatsApp messages to patients
 * whose treatment follow-up period has elapsed.
 * Also handles post-procedure checks (e.g., "How are you feeling after your extraction?").
 */

import { prisma } from "@dentiqa/db";
import { sendWhatsAppTemplate, sendWhatsAppTextMessage } from "@dentiqa/messaging";
import { decryptToken } from "../services/encryption.js";
import { createNotification } from "../services/notifications.js";

export async function runTreatmentFollowup(): Promise<void> {
  const now = new Date();

  // ─── Follow-up (months after completion) ───────────────────────────────────
  const followUpTreatments = await prisma.treatmentType.findMany({
    where: { followUpEnabled: true, isActive: true },
    include: { tenant: { select: { id: true } } },
  });

  for (const treatment of followUpTreatments) {
    const cutoff = new Date(
      now.getTime() - treatment.followUpMonths * 30 * 24 * 60 * 60 * 1000
    );

    // Find completed appointments for this treatment type, completed before cutoff
    const appointments = await prisma.appointment.findMany({
      where: {
        treatmentTypeId: treatment.id,
        tenantId: treatment.tenantId,
        status: "COMPLETED",
        updatedAt: { lte: cutoff },
        // Use metadata or a separate tracking mechanism
        // For idempotency, check if patient is already in "Seguimiento" stage
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            phone: true,
            pipelineEntry: { select: { id: true, stageId: true } },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            timezone: true,
            whatsappPhoneNumberId: true,
            whatsappAccessToken: true,
            whatsappStatus: true,
          },
        },
      },
    });

    for (const apt of appointments) {
      const { tenant, patient } = apt;

      // Skip if no pipeline entry or already followed up recently
      if (!patient.pipelineEntry) continue;

      // Check if already in "Seguimiento" or later stage — skip
      const seguimientoStage = await prisma.pipelineStage.findFirst({
        where: { tenantId: tenant.id, name: { contains: "Seguimiento" } },
        select: { id: true, order: true },
      });

      if (!seguimientoStage) continue;

      const currentStage = await prisma.pipelineStage.findFirst({
        where: { id: patient.pipelineEntry.stageId },
        select: { order: true },
      });

      // Only send follow-up if patient is past the active treatment stages
      // but not yet re-contacted for follow-up
      if (currentStage && currentStage.order >= seguimientoStage.order) {
        // Check if already notified in the last month
        const recentNotification = await prisma.notification.findFirst({
          where: {
            tenantId: tenant.id,
            type: "treatment_followup",
            metadata: { path: ["patientId"], equals: patient.id },
            createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentNotification) continue;

        // Send follow-up WhatsApp if connected
        if (
          tenant.whatsappPhoneNumberId &&
          tenant.whatsappAccessToken &&
          tenant.whatsappStatus === "CONNECTED"
        ) {
          try {
            const accessToken = decryptToken(tenant.whatsappAccessToken);

            // Try to find a follow-up template
            const followUpTemplate = await prisma.whatsAppTemplate.findFirst({
              where: {
                OR: [
                  { suggestedTrigger: "follow_up" },
                  { name: { contains: "seguimiento" } },
                ],
                status: "APPROVED",
              },
            });

            if (followUpTemplate) {
              await sendWhatsAppTemplate({
                phoneNumberId: tenant.whatsappPhoneNumberId,
                accessToken,
                to: patient.phone,
                templateName: followUpTemplate.name,
                language: followUpTemplate.language.replace("_", "-"),
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: patient.firstName },
                      { type: "text", text: treatment.name },
                    ],
                  },
                ],
              });
            }

            console.log(
              `[treatment-followup] Sent follow-up for ${treatment.name} to ${patient.firstName}`
            );
          } catch (err) {
            console.error(
              `[treatment-followup] Failed to send follow-up to ${patient.phone}:`,
              err
            );
          }
        }

        await createNotification(tenant.id, {
          type: "treatment_followup",
          title: "Seguimiento de tratamiento",
          message: `${patient.firstName} necesita seguimiento de ${treatment.name} (${treatment.followUpMonths} meses)`,
          link: `/pacientes/${patient.id}`,
          metadata: { patientId: patient.id, treatmentId: treatment.id },
        });
      }
    }
  }
}

export async function runPostProcedureChecks(): Promise<void> {
  const now = new Date();

  const treatments = await prisma.treatmentType.findMany({
    where: { postProcedureCheck: true, isActive: true },
  });

  for (const treatment of treatments) {
    const cutoff = new Date(
      now.getTime() - treatment.postProcedureDays * 24 * 60 * 60 * 1000
    );
    // Find appointments completed around the cutoff time
    const minCutoff = new Date(
      cutoff.getTime() - 2 * 60 * 60 * 1000 // 2h window to avoid missing
    );

    const appointments = await prisma.appointment.findMany({
      where: {
        treatmentTypeId: treatment.id,
        tenantId: treatment.tenantId,
        status: "COMPLETED",
        postCheckSent: false,
        updatedAt: { gte: minCutoff, lte: cutoff },
      },
      include: {
        patient: { select: { id: true, firstName: true, phone: true } },
        tenant: {
          select: {
            id: true,
            name: true,
            whatsappPhoneNumberId: true,
            whatsappAccessToken: true,
            whatsappStatus: true,
          },
        },
      },
    });

    for (const apt of appointments) {
      const { tenant, patient } = apt;

      // Mark as sent (idempotent)
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { postCheckSent: true },
      });

      // Send post-procedure check via WhatsApp
      if (
        tenant.whatsappPhoneNumberId &&
        tenant.whatsappAccessToken &&
        tenant.whatsappStatus === "CONNECTED"
      ) {
        try {
          const accessToken = decryptToken(tenant.whatsappAccessToken);
          const message =
            treatment.followUpMessage ??
            `Hola ${patient.firstName}! 👋 Queremos saber cómo te sentís después de tu ${treatment.name}. ¿Tenés alguna molestia o consulta? Respondé a este mensaje y te ayudamos.`;

          // Use text message (within 24h window) or template
          const postCheckTemplate = await prisma.whatsAppTemplate.findFirst({
            where: {
              suggestedTrigger: "post_procedure",
              status: "APPROVED",
            },
          });

          if (postCheckTemplate) {
            await sendWhatsAppTemplate({
              phoneNumberId: tenant.whatsappPhoneNumberId,
              accessToken,
              to: patient.phone,
              templateName: postCheckTemplate.name,
              language: postCheckTemplate.language.replace("_", "-"),
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: patient.firstName },
                    { type: "text", text: treatment.name },
                  ],
                },
              ],
            });
          } else {
            // Fallback: text message (only works within 24h window)
            await sendWhatsAppTextMessage({
              phoneNumberId: tenant.whatsappPhoneNumberId,
              accessToken,
              to: patient.phone,
              message,
            });
          }

          console.log(
            `[post-procedure] Sent check for ${treatment.name} to ${patient.firstName}`
          );
        } catch (err) {
          console.error(
            `[post-procedure] Failed to send check to ${patient.phone}:`,
            err
          );
        }
      }

      await createNotification(tenant.id, {
        type: "system",
        title: "Control post-procedimiento",
        message: `Se envió control post-${treatment.name} a ${patient.firstName} (${treatment.postProcedureDays} días)`,
        link: `/pacientes/${patient.id}`,
      });
    }
  }
}
