/**
 * Appointment Reminder Job
 *
 * Runs every 30 minutes. Sends WhatsApp reminder to patients with
 * appointments in the next 24 hours that haven't been reminded yet.
 * Uses sendSmartMessage for centralized template/text/notification fallback.
 * Idempotent via reminderSent flag.
 */

import { prisma } from "@dentiqa/db";
import { sendSmartMessage } from "../services/smart-message.js";
import { createNotification } from "../services/notifications.js";

export async function runAppointmentReminders(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: now, lte: in24h },
      status: { in: ["CONFIRMED", "PENDING"] },
      reminderSent: false,
    },
    include: {
      patient: { select: { id: true, firstName: true, phone: true } },
      dentist: { select: { name: true } },
      treatmentType: { select: { name: true } },
      tenant: {
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      },
    },
  });

  for (const apt of appointments) {
    const { tenant } = apt;

    // Mark as sent first (idempotent)
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminderSent: true },
    });

    // Format time in tenant timezone
    const timeStr = apt.startTime.toLocaleTimeString("es-AR", {
      timeZone: tenant.timezone,
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = apt.startTime.toLocaleDateString("es-AR", {
      timeZone: tenant.timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const fallbackText = `Hola ${apt.patient.firstName}, te recordamos tu cita en ${tenant.name} el día ${dateStr} a las ${timeStr}. Si necesitás cambiarla, respondé este mensaje.`;

    await sendSmartMessage({
      tenantId: tenant.id,
      patientPhone: apt.patient.phone,
      patientId: apt.patient.id,
      messageType: "appointment_reminder",
      variables: {
        nombre: apt.patient.firstName,
        clinica: tenant.name,
        tratamiento: apt.treatmentType?.name,
        dentista: apt.dentist.name,
        fecha: dateStr,
        hora: timeStr,
      },
      fallbackText,
    });

    // Always create in-app notification
    await createNotification(tenant.id, {
      type: "appointment_reminder",
      title: "Recordatorio de cita enviado",
      message: `Recordatorio enviado a ${apt.patient.firstName} para su cita de mañana`,
      link: "/agenda",
    });
  }

  if (appointments.length > 0) {
    console.log(
      `[appointment-reminders] Processed ${appointments.length} reminders`
    );
  }
}
