import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { createNotification } from "../../services/notifications.js";
import { isMercadoPagoConfigured, getSubscriptionStatus } from "../../services/mercadopago.js";

export async function mercadoPagoWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/webhooks/mercadopago", {
    handler: async (request, reply) => {
      app.log.info("Mercado Pago webhook received");

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

      try {
        // Handle subscription events
        if (eventType === "subscription_preapproval") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mpSub: any = await getSubscriptionStatus(resourceId);
          const externalRef = mpSub.external_reference;

          if (!externalRef) {
            app.log.warn(`[mp-webhook] No external_reference for subscription ${resourceId}`);
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

          // Map MP status to our status
          let newStatus: string;
          switch (mpSub.status) {
            case "authorized":
              newStatus = "ACTIVE";
              break;
            case "paused":
              newStatus = "PAUSED";
              break;
            case "cancelled":
              newStatus = "CANCELLED";
              break;
            case "pending":
              newStatus = subscription.status; // Keep current
              break;
            default:
              newStatus = subscription.status;
          }

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: newStatus,
              mpSubscriptionId: resourceId,
              mpPayerId: mpSub.payer_id?.toString() ?? subscription.mpPayerId,
              ...(newStatus === "ACTIVE"
                ? {
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: mpSub.next_payment_date
                      ? new Date(mpSub.next_payment_date)
                      : undefined,
                    failedPaymentAttempts: 0,
                  }
                : {}),
              ...(newStatus === "CANCELLED"
                ? { cancelledAt: new Date() }
                : {}),
            },
          });

          // Sync tenant subscription status
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

        // Handle payment events
        if (eventType === "payment") {
          // Find subscription by searching for the tenant from the payment
          const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
          if (!MP_ACCESS_TOKEN) {
            return reply.status(200).send({ received: true });
          }

          try {
            const paymentRes = await fetch(
              `https://api.mercadopago.com/v1/payments/${resourceId}`,
              {
                headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
              }
            );

            if (paymentRes.ok) {
              const payment = await paymentRes.json() as {
                status: string;
                external_reference?: string;
              };
              const externalRef = payment.external_reference;

              if (externalRef) {
                const subscription = await prisma.subscription.findUnique({
                  where: { tenantId: externalRef },
                });

                if (subscription) {
                  // Idempotency: check if we already processed this payment
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

                    await prisma.subscription.update({
                      where: { id: subscription.id },
                      data: {
                        mpLastPaymentId: resourceId,
                        failedPaymentAttempts: attempts,
                        status: attempts >= 3 ? "CANCELLED" : "PAST_DUE",
                      },
                    });

                    if (attempts >= 3) {
                      await prisma.tenant.update({
                        where: { id: externalRef },
                        data: { subscriptionStatus: "CANCELLED" },
                      });
                    } else {
                      await prisma.tenant.update({
                        where: { id: externalRef },
                        data: { subscriptionStatus: "PAST_DUE" },
                      });
                    }

                    await createNotification(externalRef, {
                      type: "system",
                      title: "Pago rechazado",
                      message: `Tu pago fue rechazado (intento ${attempts}/3). Actualizá tu método de pago.`,
                      link: "/configuracion?tab=facturacion",
                    });

                    app.log.warn(`[mp-webhook] Payment rejected for tenant ${externalRef} (attempt ${attempts})`);
                  }
                }
              }
            }
          } catch (err) {
            app.log.error(`[mp-webhook] Error fetching payment ${resourceId}: ${String(err)}`);
          }
        }
      } catch (err) {
        app.log.error(`[mp-webhook] Error processing webhook: ${String(err)}`);
      }

      return reply.status(200).send({ received: true });
    },
  });
}
