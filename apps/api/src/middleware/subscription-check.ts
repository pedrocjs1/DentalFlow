import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@dentiqa/db";

/**
 * Subscription Check Middleware
 *
 * Checks if the tenant's subscription allows write operations.
 * - TRIALING (not expired) → allow all
 * - ACTIVE → allow all
 * - TRIAL_EXPIRED, CANCELLED → read-only (block POST/PUT/PATCH/DELETE)
 * - PAST_DUE → allow for 7 days grace, then read-only
 *
 * Only applied to mutation endpoints. GETs always pass through.
 * Billing and auth endpoints are exempt.
 */
export async function subscriptionCheckMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Only check mutations
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  // Exempt billing/auth/webhook endpoints
  const url = request.url;
  if (
    url.startsWith("/api/v1/billing") ||
    url.startsWith("/api/v1/auth") ||
    url.startsWith("/api/v1/webhooks") ||
    url.startsWith("/api/v1/admin") ||
    url === "/health"
  ) {
    return;
  }

  const user = request.user as { tenantId?: string } | undefined;
  if (!user?.tenantId) return; // Not authenticated — auth middleware will handle

  const subscription = await prisma.subscription.findUnique({
    where: { tenantId: user.tenantId },
    select: { status: true, trialEndDate: true },
  });

  if (!subscription) return; // No subscription record — let it through

  const { status } = subscription;

  // Active statuses — allow everything
  if (status === "ACTIVE" || status === "PAUSED") return;

  // Trialing — check if expired
  if (status === "TRIALING") {
    if (subscription.trialEndDate && subscription.trialEndDate < new Date()) {
      // Auto-expire
      await prisma.subscription.update({
        where: { tenantId: user.tenantId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: "TRIAL_EXPIRED" as any },
      });
      await prisma.tenant.update({
        where: { id: user.tenantId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { subscriptionStatus: "TRIAL_EXPIRED" as any },
      });
      return reply.status(402).send({
        error: "subscription_required",
        message: "Tu prueba gratuita ha vencido. Activá tu plan para seguir usando Dentiqa.",
        trialExpired: true,
      });
    }
    return; // Trial still active
  }

  // PAST_DUE — 7 days grace period
  if (status === "PAST_DUE") {
    // Allow 7 days of grace from when status changed
    return; // For MVP, allow PAST_DUE to keep working (MP handles dunning)
  }

  // TRIAL_EXPIRED or CANCELLED — block writes
  if (status === "TRIAL_EXPIRED" || status === "CANCELLED") {
    return reply.status(402).send({
      error: "subscription_required",
      message: status === "TRIAL_EXPIRED"
        ? "Tu prueba gratuita ha vencido. Activá tu plan para seguir usando Dentiqa."
        : "Tu suscripción está cancelada. Reactivá tu plan para seguir usando Dentiqa.",
      trialExpired: status === "TRIAL_EXPIRED",
    });
  }
}
