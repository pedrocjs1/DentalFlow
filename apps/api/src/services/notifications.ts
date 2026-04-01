/**
 * Notification Service — fire-and-forget notification creation
 * Never blocks the calling flow. Errors are logged and swallowed.
 */

import { prisma } from "@dentiqa/db";

// Auto-map notification type to category
const TYPE_TO_CATEGORY: Record<string, string> = {
  // messages — WhatsApp, bot, human-needed
  new_patient: "messages",
  human_needed: "messages",
  new_message: "messages",
  bot_paused_alert: "messages",
  // appointment — citas, recordatorios, no-shows
  new_appointment: "appointment",
  appointment_completed: "appointment",
  appointment_no_show: "appointment",
  cancelled_appointment: "appointment",
  rescheduled_appointment: "appointment",
  appointment_end_reminder: "appointment",
  // clinical — evoluciones, planes, tratamiento
  evolution_pending: "clinical",
  treatment_followup: "clinical",
  // pipeline — movimientos de pipeline, auto-messages
  pipeline_move: "pipeline",
  pipeline_stale: "pipeline",
  // system — templates, errors, billing
  usage_warning: "system",
  usage_limit: "system",
  template_status: "system",
  // ai
  ai_recommendation: "ai",
  ai_weekly_report: "ai",
};

// Role-based category access
const ROLE_CATEGORIES: Record<string, string[]> = {
  OWNER: ["messages", "appointment", "clinical", "pipeline", "system", "ai"],
  ADMIN: ["messages", "appointment", "clinical", "pipeline", "system", "ai"],
  RECEPTIONIST: ["messages", "appointment", "pipeline"],
  DENTIST: ["appointment", "clinical"],
};

export function getCategoriesForRole(role: string): string[] {
  return ROLE_CATEGORIES[role] ?? ["system"];
}

interface CreateNotificationParams {
  type: string;
  title: string;
  message: string;
  link?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(
  tenantId: string,
  params: CreateNotificationParams
): Promise<void> {
  try {
    const category = TYPE_TO_CATEGORY[params.type] ?? "system";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma.notification.create as any)({
      data: {
        tenantId,
        userId: params.userId ?? null,
        type: params.type,
        category,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        metadata: params.metadata ? (params.metadata as object) : undefined,
      },
    });
  } catch (err) {
    // Fire-and-forget — never block calling flow
    console.error("[notifications] Failed to create notification:", err);
  }
}
