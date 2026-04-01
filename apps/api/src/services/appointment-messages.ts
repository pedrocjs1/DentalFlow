/**
 * Appointment Messages Service
 *
 * Thin wrapper around sendSmartMessage for appointment lifecycle events.
 */

import { prisma } from "@dentiqa/db";
import { sendSmartMessage, type SmartMessageType } from "./smart-message.js";

const FALLBACK_TEXTS: Record<string, (name: string, clinic: string) => string> = {
  welcome: (name, clinic) =>
    `Hola ${name}! Bienvenido/a a ${clinic}. Ya estamos listos para tu cita 😊`,
  post_visit: (name) =>
    `Hola ${name}! ¿Cómo te sentiste después de tu visita? Si tenés alguna duda sobre tu tratamiento, respondé este mensaje 🦷`,
  missed_appointment: (name, clinic) =>
    `Hola ${name}, notamos que no pudiste asistir a tu cita en ${clinic}. ¿Te gustaría reagendar? Respondé este mensaje.`,
};

/**
 * Send a message related to an appointment event via sendSmartMessage.
 */
export async function sendAppointmentMessage(
  tenantId: string,
  patientId: string,
  event: "welcome" | "post_visit" | "missed_appointment",
  context: {
    patientFirstName: string;
    clinicName?: string;
    treatmentName?: string;
    dentistName?: string;
  }
): Promise<void> {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, tenantId },
    select: { phone: true, firstName: true },
  });
  if (!patient?.phone) return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  const clinicName = context.clinicName ?? tenant?.name ?? "la clínica";
  const firstName = context.patientFirstName || patient.firstName;

  const fallbackFn = FALLBACK_TEXTS[event];
  const fallbackText = fallbackFn ? fallbackFn(firstName, clinicName) : undefined;

  await sendSmartMessage({
    tenantId,
    patientPhone: patient.phone,
    patientId,
    messageType: event as SmartMessageType,
    variables: {
      nombre: firstName,
      clinica: clinicName,
      tratamiento: context.treatmentName,
      dentista: context.dentistName,
    },
    fallbackText,
  });
}
