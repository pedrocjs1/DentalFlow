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
import { sendSmartMessage, type SmartMessageType } from "../services/smart-message.js";
import { createNotification } from "../services/notifications.js";

// ─── Map stage name → messageType for sendSmartMessage ──────────────────────

function resolveMessageTypeForStage(stageName: string): SmartMessageType | null {
  const lower = stageName.toLowerCase();
  if (lower.includes("nuevo contacto") || lower.includes("nuevo")) return "no_booking_followup" as SmartMessageType;
  if (lower.includes("no agendó") || lower.includes("interesado")) return "re_engagement" as SmartMessageType;
  if (lower.includes("remarketing") || lower.includes("inactivo")) return "remarketing" as SmartMessageType;
  return null;
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
          console.warn(
            `[pipeline-automations] Max retries (${maxRetries}) exceeded for ${patient.firstName} (${patient.phone}) in stage "${stage.name}" — giving up`
          );
          await prisma.patientPipeline.update({
            where: { id: entry.id },
            data: { lastAutoMessageSentAt: now },
          });
          continue;
        }

        // Lazy-load dentist name for variables
        if (dentistNameCache === undefined) {
          const dentist = await prisma.dentist.findFirst({
            where: { tenantId: tenant.id, isActive: true },
            select: { name: true },
            orderBy: { createdAt: "asc" },
          });
          dentistNameCache = dentist?.name ?? null;
        }

        // Resolve messageType from stage name (or fall back to generic)
        const stageMessageType = resolveMessageTypeForStage(stage.name);

        const result = await sendSmartMessage({
          tenantId: tenant.id,
          patientPhone: patient.phone,
          patientId: patient.id,
          messageType: (stageMessageType ?? "re_engagement") as SmartMessageType,
          variables: {
            nombre: patient.firstName,
            clinica: tenant.name,
            tratamiento: entry.interestTreatment ?? undefined,
            dentista: dentistNameCache ?? undefined,
            descuento: stage.discountPercent?.toString(),
          },
          fallbackText: `Hola ${patient.firstName}, desde ${tenant.name} queremos ayudarte${entry.interestTreatment ? ` con ${entry.interestTreatment}` : ""}. ¿Querés agendar? Respondé a este mensaje.`,
        });

        if (result.sent || result.method === "notification") {
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

          console.log(
            `[pipeline-automations] Sent ${result.method} to ${patient.firstName} (${patient.phone}) in stage "${stage.name}"`
          );
        } else {
          await prisma.patientPipeline.update({
            where: { id: entry.id },
            data: { autoMessageAttempts: { increment: 1 } },
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
