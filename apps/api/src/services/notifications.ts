/**
 * Notification Service — fire-and-forget notification creation
 * Never blocks the calling flow. Errors are logged and swallowed.
 */

import { prisma } from "@dentiqa/db";

// Auto-map notification type to category
const TYPE_TO_CATEGORY: Record<string, string> = {
  new_patient: "messages",
  human_needed: "messages",
  new_message: "messages",
  new_appointment: "system",
  appointment_completed: "system",
  appointment_no_show: "system",
  cancelled_appointment: "system",
  rescheduled_appointment: "system",
  appointment_end_reminder: "system",
  usage_warning: "system",
  usage_limit: "system",
  template_status: "system",
  pipeline_move: "pipeline",
  pipeline_stale: "pipeline",
  ai_recommendation: "ai",
  ai_weekly_report: "ai",
};

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
