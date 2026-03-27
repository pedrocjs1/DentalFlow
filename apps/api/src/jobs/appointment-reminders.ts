/**
 * Appointment Reminder Job
 *
 * Runs every 30 minutes. Sends WhatsApp reminder to patients with
 * appointments in the next 24 hours that haven't been reminded yet.
 * Idempotent via reminderSent flag.
 */

import { prisma } from "@dentiqa/db";
import { sendWhatsAppTemplate } from "@dentiqa/messaging";
import { decryptToken } from "../services/encryption.js";
import { createNotification } from "../services/notifications.js";

export async function runAppointmentReminders(): Promise<void> {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find appointments in next 24h that haven't been reminded
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
          whatsappPhoneNumberId: true,
          whatsappAccessToken: true,
          whatsappStatus: true,
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

    // Send WhatsApp reminder if connected
    if (
      tenant.whatsappPhoneNumberId &&
      tenant.whatsappAccessToken &&
      tenant.whatsappStatus === "CONNECTED"
    ) {
      try {
        const accessToken = decryptToken(tenant.whatsappAccessToken);

        // Find the system reminder template
        const reminderTemplate = await prisma.whatsAppTemplate.findFirst({
          where: {
            OR: [
              { name: "recordatorio_cita" },
              { suggestedTrigger: "appointment_reminder" },
            ],
            status: "APPROVED",
            isSystemTemplate: true,
          },
        });

        if (reminderTemplate) {
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

          await sendWhatsAppTemplate({
            phoneNumberId: tenant.whatsappPhoneNumberId,
            accessToken,
            to: apt.patient.phone,
            templateName: reminderTemplate.name,
            language: reminderTemplate.language.replace("_", "-"),
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: apt.patient.firstName },
                  { type: "text", text: `${dateStr} a las ${timeStr}` },
                  { type: "text", text: apt.dentist.name },
                ],
              },
            ],
          });

          console.log(
            `[appointment-reminders] Sent reminder to ${apt.patient.firstName} for ${dateStr} ${timeStr}`
          );
        } else {
          // No template — send a plain text if within 24h window
          // Templates work outside 24h window, text only within
          console.log(
            `[appointment-reminders] No reminder template found, skipping WhatsApp for ${apt.patient.firstName}`
          );
        }
      } catch (err) {
        console.error(
          `[appointment-reminders] Failed to send reminder to ${apt.patient.phone}:`,
          err
        );
      }
    }

    // Always create in-app notification
    await createNotification(tenant.id, {
      type: "system",
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
