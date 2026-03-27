import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { createNotification } from "../../services/notifications.js";
import { isMercadoPagoConfigured, getSubscriptionStatus, getPaymentById } from "../../services/mercadopago.js";
import { logSecurityEvent } from "../../services/security-logger.js";

export async function mercadoPagoWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/webhooks/mercadopago", {
    handler: async (request, reply) => {
      if (!isMercadoPagoConfigured()) {
        return reply.status(200).send({ received: true });
      }

      const body = request.body as {
        type?: string;
        action?: string;
        data?: { id?: string };
      };

      if (!body?.type || !body?.data?.id) {
        return reply.status(200).send({ received: true });
      }

      const eventType = body.type;
      const resourceId = body.data.id;

      app.log.info(`[mp-webhook] Event: ${eventType}, action: ${body.action ?? "none"}, id: ${resourceId}`);

      try {
        // ─── Subscription events ────────────────────────────────────────
        if (eventType === "subscription_preapproval") {
          // Always verify against MP API — never trust webhook payload alone
          let mpSub: { status?: string; external_reference?: string; payer_id?: number; next_payment_date?: string };
          try {
            mpSub = await getSubscriptionStatus(resourceId);
          } catch {
            app.log.warn(`[mp-webhook] Could not verify subscription ${resourceId} with MP API`);
            await logSecurityEvent({
              type: "WEBHOOK_INVALID_SIGNATURE",
              endpoint: "/api/v1/webhooks/mercadopago",
              details: `Could not verify subscription ${resourceId}`,
              ip: request.ip,
              severity: "MEDIUM",
            });
            return reply.status(200).send({ received: true });
          }

          const externalRef = mpSub.external_reference;
          if (!externalRef) {
            return reply.status(200).send({ received: true });
          }

          const subscription = await prisma.subscription.findFirst({
            where: {
              OR: [
                { mpSubscriptionId: resourceId },
                { tenantId: externalRef },
              ],
            },
          });

          if (!subscription) {
            app.log.warn(`[mp-webhook] No subscription found for ${resourceId}`);
            return reply.status(200).send({ received: true });
          }

          const tenantId = subscription.tenantId;

          // Map MP status → our status
          let newStatus: string;
          switch (mpSub.status) {
            case "authorized": newStatus = "ACTIVE"; break;
            case "paused": newStatus = "PAUSED"; break;
            case "cancelled": newStatus = "CANCELLED"; break;
            case "pending": newStatus = subscription.status; break;
            default: newStatus = subscription.status;
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: newStatus,
              mpSubscriptionId: resourceId,
              mpPayerId: mpSub.payer_id?.toString() ?? subscription.mpPayerId,
              ...(newStatus === "ACTIVE" ? {
                currentPeriodStart: new Date(),
                currentPeriodEnd: mpSub.next_payment_date ? new Date(mpSub.next_payment_date) : undefined,
                failedPaymentAttempts: 0,
              } : {}),
              ...(newStatus === "CANCELLED" ? { cancelledAt: new Date() } : {}),
            },
          });

          // Sync tenant
          const tenantStatus = newStatus === "ACTIVE" ? "ACTIVE"
            : newStatus === "CANCELLED" ? "CANCELLED"
            : newStatus === "PAUSED" ? "PAUSED"
            : "TRIALING";
          await prisma.tenant.update({
            where: { id: tenantId },
            data: { subscriptionStatus: tenantStatus as "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED" },
          });

          if (newStatus !== subscription.status) {
            await createNotification(tenantId, {
              type: "system",
              title: "Estado de suscripción actualizado",
              message: `Tu suscripción cambió a: ${newStatus}`,
            });
          }

          app.log.info(`[mp-webhook] Subscription ${resourceId} → ${newStatus} for tenant ${tenantId}`);
        }

        // ─── Payment events ─────────────────────────────────────────────
        if (eventType === "payment") {
          // Verify payment against MP API
          let payment: { status?: string; external_reference?: string };
          try {
            payment = await getPaymentById(resourceId);
          } catch {
            app.log.warn(`[mp-webhook] Could not verify payment ${resourceId} with MP API`);
            return reply.status(200).send({ received: true });
          }

          const externalRef = payment.external_reference;
          if (!externalRef) {
            return reply.status(200).send({ received: true });
          }

          const subscription = await prisma.subscription.findUnique({
            where: { tenantId: externalRef },
          });

          if (!subscription) {
            return reply.status(200).send({ received: true });
          }

          // Idempotency check
          if (subscription.mpLastPaymentId === resourceId) {
            return reply.status(200).send({ received: true });
          }

          if (payment.status === "approved") {
            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                status: "ACTIVE",
                mpLastPaymentId: resourceId,
                failedPaymentAttempts: 0,
                currentPeriodStart: new Date(),
              },
            });

            await prisma.tenant.update({
              where: { id: externalRef },
              data: { subscriptionStatus: "ACTIVE" },
            });

            app.log.info(`[mp-webhook] Payment approved for tenant ${externalRef}`);
          } else if (payment.status === "rejected") {
            const attempts = (subscription.failedPaymentAttempts ?? 0) + 1;
            const newStatus = attempts >= 3 ? "CANCELLED" : "PAST_DUE";

            await prisma.subscription.update({
              where: { id: subscription.id },
              data: {
                mpLastPaymentId: resourceId,
                failedPaymentAttempts: attempts,
                status: newStatus,
              },
            });

            await prisma.tenant.update({
              where: { id: externalRef },
              data: { subscriptionStatus: newStatus as "PAST_DUE" | "CANCELLED" },
            });

            await createNotification(externalRef, {
              type: "system",
              title: "Pago rechazado",
              message: `Tu pago fue rechazado (intento ${attempts}/3). Actualizá tu método de pago.`,
              link: "/configuracion?tab=facturacion",
            });

            app.log.warn(`[mp-webhook] Payment rejected for tenant ${externalRef} (attempt ${attempts})`);
          }
        }
      } catch (err) {
        app.log.error(`[mp-webhook] Error processing webhook: ${String(err)}`);
      }

      return reply.status(200).send({ received: true });
    },
  });
}
