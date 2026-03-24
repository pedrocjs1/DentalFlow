/**
 * Pipeline Automations Job
 *
 * Runs every 15 minutes via BullMQ (when Redis is available).
 * For each active PipelineStage with automation enabled:
 *   1. autoMessage: send WhatsApp template to patients in stage for >= delay hours
 *   2. autoMove: move patients to target stage after delay hours
 *
 * Idempotent: uses lastAutoMessageSentAt and lastManualMoveAt to avoid double actions.
 */

import { prisma } from "@dentalflow/db";
import { sendWhatsAppTemplate } from "@dentalflow/messaging";
import { decryptToken } from "../services/encryption.js";
import { createNotification } from "../services/notifications.js";

export async function runPipelineAutomations(): Promise<void> {
  const now = new Date();

  // Fetch all stages that have any automation enabled, include tenant info
  const stages = await prisma.pipelineStage.findMany({
    where: {
      OR: [{ autoMessageEnabled: true }, { autoMoveEnabled: true }],
    },
    include: {
      patients: {
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              phone: true,
              tenantId: true,
              tenant: {
                select: {
                  id: true,
                  whatsappPhoneNumberId: true,
                  whatsappAccessToken: true,
                  whatsappStatus: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const stage of stages) {
    const cutoffMessage = new Date(
      now.getTime() - stage.autoMessageDelayHours * 60 * 60 * 1000
    );
    const cutoffMove = new Date(
      now.getTime() - stage.autoMoveDelayHours * 60 * 60 * 1000
    );

    for (const entry of stage.patients) {
      const { patient } = entry;
      const tenant = patient.tenant;

      // --- Auto-message ---
      if (
        stage.autoMessageEnabled &&
        stage.autoMessageTemplate &&
        entry.movedAt <= cutoffMessage &&
        !entry.lastAutoMessageSentAt
      ) {
        // Only send if tenant has WhatsApp connected
        if (
          tenant.whatsappPhoneNumberId &&
          tenant.whatsappAccessToken &&
          tenant.whatsappStatus === "CONNECTED"
        ) {
          try {
            const accessToken = decryptToken(tenant.whatsappAccessToken);

            // Look up the template
            const template = await prisma.whatsAppTemplate.findFirst({
              where: {
                id: stage.autoMessageTemplate,
                status: "APPROVED",
              },
            });

            if (template) {
              await sendWhatsAppTemplate({
                phoneNumberId: tenant.whatsappPhoneNumberId,
                accessToken,
                to: patient.phone,
                templateName: template.name,
                language: template.language.replace("_", "-"),
                components: template.variablesJson
                  ? [
                      {
                        type: "body",
                        parameters: (
                          template.variablesJson as Array<{
                            position: number;
                            field: string;
                            example: string;
                          }>
                        ).map((v) => ({
                          type: "text",
                          text:
                            v.field === "firstName"
                              ? patient.firstName
                              : v.example,
                        })),
                      },
                    ]
                  : [],
              });

              console.log(
                `[pipeline-automations] Sent template "${template.name}" to ${patient.firstName} (${patient.phone}) in stage "${stage.name}"`
              );
            }
          } catch (err) {
            console.error(
              `[pipeline-automations] Failed to send auto-message to ${patient.phone}:`,
              err
            );
          }
        }

        // Mark as sent regardless (idempotent — don't retry forever)
        await prisma.patientPipeline.update({
          where: { id: entry.id },
          data: { lastAutoMessageSentAt: now },
        });

        await createNotification(tenant.id, {
          type: "pipeline_move",
          title: "Auto-mensaje enviado",
          message: `Se envió mensaje automático a ${patient.firstName} en etapa "${stage.name}"`,
          link: "/pipeline",
        });
      }

      // --- Auto-move ---
      if (
        stage.autoMoveEnabled &&
        stage.autoMoveTargetStageId &&
        entry.movedAt <= cutoffMove
      ) {
        // Skip if manually moved after the cutoff
        if (entry.lastManualMoveAt && entry.lastManualMoveAt > entry.movedAt) {
          continue;
        }

        try {
          await prisma.patientPipeline.update({
            where: { id: entry.id },
            data: {
              stageId: stage.autoMoveTargetStageId,
              movedAt: now,
              lastAutoMessageSentAt: null,
            },
          });

          const targetStage = await prisma.pipelineStage.findUnique({
            where: { id: stage.autoMoveTargetStageId },
            select: { name: true },
          });

          console.log(
            `[pipeline-automations] Auto-moved ${patient.firstName} from "${stage.name}" to "${targetStage?.name ?? "unknown"}"`
          );

          await createNotification(tenant.id, {
            type: "pipeline_move",
            title: "Paciente movido automáticamente",
            message: `${patient.firstName} fue movido de "${stage.name}" a "${targetStage?.name ?? "?"}"`,
            link: "/pipeline",
          });
        } catch (err) {
          console.error(
            `[pipeline-automations] Failed to auto-move ${patient.firstName}:`,
            err
          );
        }
      }
    }
  }
}
