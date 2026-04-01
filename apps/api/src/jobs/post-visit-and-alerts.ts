/**
 * Post-Visit Messages & Bot-Paused Alerts
 *
 * Runs every 30 minutes:
 * 1. Sends post-visit follow-up messages 2h after appointment COMPLETED
 * 2. Creates notifications for conversations with bot paused > 24h
 */

import { prisma } from "@dentiqa/db";
import { sendAppointmentMessage } from "../services/appointment-messages.js";
import { createNotification } from "../services/notifications.js";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Send post-visit follow-up messages for appointments completed ~2h ago.
 */
export async function runPostVisitMessages(): Promise<void> {
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - TWO_HOURS_MS);
  // Look for appointments completed between 2h and 3h ago (to avoid re-sending on next run)
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      postVisitSent: false,
      updatedAt: {
        gte: threeHoursAgo,
        lte: twoHoursAgo,
      },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      dentist: { select: { name: true } },
      treatmentType: { select: { name: true } },
      tenant: { select: { id: true, name: true } },
    },
    take: 50,
  });

  for (const appt of appointments) {
    // Mark as sent first (idempotent)
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { postVisitSent: true },
    });

    await sendAppointmentMessage(appt.tenantId, appt.patientId, "post_visit", {
      patientFirstName: appt.patient.firstName,
      clinicName: appt.tenant.name,
      treatmentName: appt.treatmentType?.name,
      dentistName: appt.dentist?.name,
    });

    console.log(`[post-visit] Sent follow-up for appointment ${appt.id} (${appt.patient.firstName})`);
  }

  if (appointments.length > 0) {
    console.log(`[post-visit] Processed ${appointments.length} post-visit messages`);
  }
}

/**
 * Create notifications for conversations where the bot has been paused > 24h.
 * Only sends one alert per conversation per 24h period.
 */
export async function runBotPausedAlerts(): Promise<void> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - TWENTY_FOUR_HOURS_MS);

  // Find conversations where AI is paused and was paused more than 24h ago
  const pausedConversations = await prisma.conversation.findMany({
    where: {
      aiEnabled: false,
      aiPausedAt: {
        not: null,
        lte: twentyFourHoursAgo,
      },
      status: { not: "CLOSED" },
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      tenant: { select: { id: true } },
    },
    take: 100,
  });

  for (const conv of pausedConversations) {
    const patientName = `${conv.patient.firstName} ${conv.patient.lastName}`.trim();
    const pausedHours = Math.round((now.getTime() - conv.aiPausedAt!.getTime()) / (60 * 60 * 1000));

    // Check if we already sent a bot_paused_alert in the last 24h for this conversation
    const recentAlert = await prisma.notification.findFirst({
      where: {
        tenantId: conv.tenantId,
        type: "bot_paused_alert",
        createdAt: { gte: twentyFourHoursAgo },
        message: { contains: conv.patient.firstName },
      },
    });

    if (!recentAlert) {
      await createNotification(conv.tenantId, {
        type: "bot_paused_alert",
        title: "Bot pausado hace mucho",
        message: `El bot lleva pausado ${pausedHours}hs para la conversación con ${patientName}. Reactivalo o respondé manualmente.`,
        link: "/conversaciones",
        metadata: {
          conversationId: conv.id,
          patientId: conv.patient.id,
          pausedHours,
        },
      });

      console.log(`[bot-paused] Alert created for conversation ${conv.id} (${patientName}, ${pausedHours}h)`);
    }
  }
}

/**
 * Combined runner for both tasks.
 */
export async function runPostVisitAndAlerts(): Promise<void> {
  await runPostVisitMessages();
  await runBotPausedAlerts();
}
