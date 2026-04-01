/**
 * Treatment Follow-up Job
 *
 * Runs every 1 hour:
 * 1. Follow-up: sends message X months after treatment (per TreatmentType.followUpMonths)
 * 2. Post-procedure: sends check X days after procedure (per TreatmentType.postProcedureDays)
 *
 * Uses sendSmartMessage for centralized template/text/notification fallback.
 */

import { prisma } from "@dentiqa/db";
import { sendSmartMessage } from "../services/smart-message.js";
import { createNotification } from "../services/notifications.js";

export async function runTreatmentFollowup(): Promise<void> {
  const now = new Date();

  // Find all treatment types with follow-up enabled
  const followUpTreatments = await prisma.treatmentType.findMany({
    where: { followUpEnabled: true, isActive: true },
    include: { tenant: { select: { id: true, name: true } } },
  });

  for (const treatment of followUpTreatments) {
    // Dynamic cutoff based on each treatment's followUpMonths
    const cutoff = new Date(
      now.getTime() - treatment.followUpMonths * 30 * 24 * 60 * 60 * 1000
    );

    const appointments = await prisma.appointment.findMany({
      where: {
        treatmentTypeId: treatment.id,
        tenantId: treatment.tenantId,
        status: "COMPLETED",
        updatedAt: { lte: cutoff },
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
            whatsappPhoneNumberId: true,
            whatsappStatus: true,
          },
        },
      },
    });

    for (const apt of appointments) {
      const { tenant, patient } = apt;
      if (!patient.pipelineEntry) continue;

      // Only target patients in "Seguimiento" or later
      const seguimientoStage = await prisma.pipelineStage.findFirst({
        where: { tenantId: tenant.id, name: { contains: "Seguimiento", mode: "insensitive" } },
        select: { id: true, order: true },
      });
      if (!seguimientoStage) continue;

      const currentStage = await prisma.pipelineStage.findFirst({
        where: { id: patient.pipelineEntry.stageId },
        select: { order: true },
      });
      if (!currentStage || currentStage.order < seguimientoStage.order) continue;

      // Idempotency: skip if notified in last 30 days
      const recentNotification = await prisma.notification.findFirst({
        where: {
          tenantId: tenant.id,
          type: "treatment_followup",
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          message: { contains: patient.firstName },
        },
      });
      if (recentNotification) continue;

      // Send via sendSmartMessage
      const fallbackText = treatment.followUpMessage ??
        `Hola ${patient.firstName}! Desde ${tenant.name} te recordamos que es momento de tu control de ${treatment.name}. ¿Agendamos? 🦷`;

      await sendSmartMessage({
        tenantId: tenant.id,
        patientPhone: patient.phone,
        patientId: patient.id,
        messageType: "treatment_followup",
        variables: {
          nombre: patient.firstName,
          clinica: tenant.name,
          tratamiento: treatment.name,
        },
        fallbackText,
      });

      await createNotification(tenant.id, {
        type: "treatment_followup",
        title: "Seguimiento de tratamiento",
        message: `${patient.firstName} necesita seguimiento de ${treatment.name} (${treatment.followUpMonths} meses)`,
        link: `/pacientes/${patient.id}`,
        metadata: { patientId: patient.id, treatmentId: treatment.id },
      });

      console.log(
        `[treatment-followup] Processed follow-up for ${treatment.name} → ${patient.firstName} (${treatment.followUpMonths}mo)`
      );
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
    const minCutoff = new Date(cutoff.getTime() - 2 * 60 * 60 * 1000);

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
        tenant: { select: { id: true, name: true } },
      },
    });

    for (const apt of appointments) {
      const { tenant, patient } = apt;

      // Mark as sent first (idempotent)
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { postCheckSent: true },
      });

      const fallbackText = treatment.followUpMessage ??
        `Hola ${patient.firstName}! 👋 Queremos saber cómo te sentís después de tu ${treatment.name}. ¿Tenés alguna molestia o consulta? Respondé a este mensaje y te ayudamos.`;

      await sendSmartMessage({
        tenantId: tenant.id,
        patientPhone: patient.phone,
        patientId: patient.id,
        messageType: "post_procedure",
        variables: {
          nombre: patient.firstName,
          clinica: tenant.name,
          tratamiento: treatment.name,
        },
        fallbackText,
      });

      await createNotification(tenant.id, {
        type: "treatment_followup",
        title: "Control post-procedimiento",
        message: `Se envió control post-${treatment.name} a ${patient.firstName} (${treatment.postProcedureDays} días)`,
        link: `/pacientes/${patient.id}`,
      });

      console.log(
        `[post-procedure] Sent check for ${treatment.name} to ${patient.firstName}`
      );
    }
  }
}
