/**
 * Pipeline Automations Job
 *
 * Runs every 15 minutes via BullMQ (when Redis is available).
 * For each active PipelineStage with automation enabled:
 *   1. autoMessage: send WhatsApp template to patients in stage for >= delay hours
 *   2. autoMove: move patients to target stage after delay hours
 *
 * Idempotent: uses lastAutoMessageSentAt, lastManualMoveAt, and autoMessageAttempts.
 */

import { prisma } from "@dentiqa/db";
import { sendWhatsAppTemplate } from "@dentiqa/messaging";
import { decryptToken } from "../services/encryption.js";
import { createNotification } from "../services/notifications.js";

// ─── Variable substitution for template parameters ──────────────────────────

function substituteVariable(
  field: string,
  example: string,
  context: {
    firstName: string;
    lastName: string;
    interestTreatment: string | null;
    tenantName: string;
    discountPercent: number;
    dentistName: string | null;
  }
): string {
  const key = field.toLowerCase().replace(/[{}]/g, "").trim();
  switch (key) {
    case "firstname":
    case "first_name":
      return context.firstName;
    case "nombre":
      return `${context.firstName} ${context.lastName}`.trim() || context.firstName;
    case "tratamiento_interes":
    case "treatment_interest":
    case "tratamiento":
      return context.interestTreatment || "tu consulta";
    case "clinica":
    case "clinic":
    case "clinic_name":
      return context.tenantName;
    case "descuento":
    case "discount":
      return context.discountPercent.toString();
    case "dentista":
    case "dentist":
      return context.dentistName || "nuestro equipo";
    default:
      // If no mapping found, try firstName as default (most common), else use example
      return example;
  }
}

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
              lastName: true,
              phone: true,
              tenantId: true,
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

    // Max retries for auto-messages (default 3 if stage config says 1 or less)
    const maxRetries = Math.max(stage.autoMessageMaxRetries, 3);

    // Fetch a dentist name once per stage (for variable substitution)
    let dentistNameCache: string | null | undefined;

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
        // Check retry limit
        if (entry.autoMessageAttempts >= maxRetries) {
          // Max retries exceeded — mark as sent to stop retrying
          console.warn(
            `[pipeline-automations] Max retries (${maxRetries}) exceeded for ${patient.firstName} (${patient.phone}) in stage "${stage.name}" — giving up`
          );
          await prisma.patientPipeline.update({
            where: { id: entry.id },
            data: { lastAutoMessageSentAt: now },
          });
          continue;
        }

        // Only send if tenant has WhatsApp connected
        if (
          tenant.whatsappPhoneNumberId &&
          tenant.whatsappAccessToken &&
          tenant.whatsappStatus === "CONNECTED"
        ) {
          let sendSuccess = false;

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
              // Lazy-load dentist name for variable substitution
              if (dentistNameCache === undefined) {
                const dentist = await prisma.dentist.findFirst({
                  where: { tenantId: tenant.id, isActive: true },
                  select: { name: true },
                  orderBy: { createdAt: "asc" },
                });
                dentistNameCache = dentist?.name ?? null;
              }

              const varContext = {
                firstName: patient.firstName,
                lastName: patient.lastName,
                interestTreatment: entry.interestTreatment,
                tenantName: tenant.name,
                discountPercent: stage.discountPercent,
                dentistName: dentistNameCache,
              };

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
                          text: substituteVariable(v.field, v.example, varContext),
                        })),
                      },
                    ]
                  : [],
              });

              sendSuccess = true;
              console.log(
                `[pipeline-automations] Sent template "${template.name}" to ${patient.firstName} (${patient.phone}) in stage "${stage.name}"`
              );
            } else {
              // Template not found or not approved — mark as sent to avoid infinite loop
              console.warn(
                `[pipeline-automations] Template ${stage.autoMessageTemplate} not found/approved for stage "${stage.name}"`
              );
              sendSuccess = true; // Don't retry for missing template
            }
          } catch (err) {
            console.error(
              `[pipeline-automations] Failed to send auto-message to ${patient.phone} (attempt ${entry.autoMessageAttempts + 1}/${maxRetries}):`,
              err
            );
          }

          if (sendSuccess) {
            // Mark as sent — successful
            await prisma.patientPipeline.update({
              where: { id: entry.id },
              data: { lastAutoMessageSentAt: now, autoMessageAttempts: 0 },
            });

            await createNotification(tenant.id, {
              type: "pipeline_move",
              title: "Auto-mensaje enviado",
              message: `Se envió mensaje automático a ${patient.firstName} en etapa "${stage.name}"`,
              link: "/pipeline",
            });
          } else {
            // Failed — increment attempt counter, will retry next cycle
            await prisma.patientPipeline.update({
              where: { id: entry.id },
              data: { autoMessageAttempts: { increment: 1 } },
            });
          }
        } else {
          // WhatsApp not connected — mark as sent to avoid retrying forever
          await prisma.patientPipeline.update({
            where: { id: entry.id },
            data: { lastAutoMessageSentAt: now },
          });
        }
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

        // Protect "En Tratamiento": don't auto-move if patient has active plan with pending items
        if (stage.name.toLowerCase().includes("en tratamiento")) {
          const activePlan = await prisma.treatmentPlan.findFirst({
            where: {
              patientId: patient.id,
              tenantId: tenant.id,
              status: "ACTIVE",
              isActive: true,
              items: { some: { status: { not: "COMPLETED" } } },
            },
            select: { id: true },
          });
          if (activePlan) {
            // Patient has pending treatment items — skip auto-move
            continue;
          }
        }

        try {
          await prisma.patientPipeline.update({
            where: { id: entry.id },
            data: {
              stageId: stage.autoMoveTargetStageId,
              movedAt: now,
              lastAutoMessageSentAt: null,
              autoMessageAttempts: 0,
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
