import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import {
  isMercadoPagoConfigured,
  createSubscription,
  cancelMpSubscription,
  updateSubscriptionPlan,
  getPlanDetails,
} from "../../services/mercadopago.js";

type UserPayload = { tenantId: string; sub: string; email: string; name: string };

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // ─── Get subscription status ──────────────────────────────────────────────
  app.get("/api/v1/billing/subscription", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { plan: true, subscriptionStatus: true, trialEndsAt: true },
      });

      if (!subscription) {
        return {
          plan: tenant?.plan ?? "STARTER",
          status: tenant?.subscriptionStatus ?? "TRIALING",
          trialEndsAt: tenant?.trialEndsAt,
          mpConfigured: isMercadoPagoConfigured(),
        };
      }

      const planDetails = getPlanDetails(subscription.plan);

      return {
        plan: subscription.plan,
        status: subscription.status,
        trialStartDate: subscription.trialStartDate,
        trialEndDate: subscription.trialEndDate,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        paymentMethod: subscription.paymentMethod,
        cancelsAt: subscription.cancelsAt,
        failedPaymentAttempts: subscription.failedPaymentAttempts,
        mpConfigured: isMercadoPagoConfigured(),
        planPrice: planDetails.price,
        planCurrency: planDetails.currency,
      };
    },
  });

  // ─── Create subscription (redirect to MP checkout) ────────────────────────
  app.post("/api/v1/billing/create-subscription", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { plan } = request.body as { plan: string };

      if (!isMercadoPagoConfigured()) {
        return { error: "Mercado Pago no está configurado", checkoutUrl: null };
      }

      if (!["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) {
        return { error: "Plan inválido" };
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true },
      });

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";

      const result = await createSubscription({
        tenantId: user.tenantId,
        tenantName: tenant?.name ?? "Clínica",
        payerEmail: user.email,
        plan,
        backUrl: `${appUrl}/configuracion?tab=facturacion&mp=callback`,
      });

      // Save the MP subscription ID
      await prisma.subscription.upsert({
        where: { tenantId: user.tenantId },
        update: {
          mpSubscriptionId: result.mpSubscriptionId,
          plan,
          paymentMethod: "mercadopago",
        },
        create: {
          tenantId: user.tenantId,
          plan,
          status: "TRIALING",
          mpSubscriptionId: result.mpSubscriptionId,
          paymentMethod: "mercadopago",
        },
      });

      return { checkoutUrl: result.checkoutUrl, subscriptionId: result.mpSubscriptionId };
    },
  });

  // ─── Change plan ──────────────────────────────────────────────────────────
  app.post("/api/v1/billing/change-plan", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { newPlan } = request.body as { newPlan: string };

      if (!["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(newPlan)) {
        return { error: "Plan inválido" };
      }

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      // Update in MP if connected
      if (subscription?.mpSubscriptionId && isMercadoPagoConfigured()) {
        try {
          await updateSubscriptionPlan(subscription.mpSubscriptionId, newPlan);
        } catch (err) {
          console.error("[billing] Failed to update MP subscription:", err);
        }
      }

      // Update locally
      await prisma.subscription.upsert({
        where: { tenantId: user.tenantId },
        update: { plan: newPlan },
        create: {
          tenantId: user.tenantId,
          plan: newPlan,
          status: "ACTIVE",
          paymentMethod: subscription?.paymentMethod ?? "pending",
        },
      });

      // Sync tenant plan
      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { plan: newPlan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE" },
      });

      return { success: true, plan: newPlan };
    },
  });

  // ─── Cancel subscription ──────────────────────────────────────────────────
  app.post("/api/v1/billing/cancel", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!subscription) {
        return { error: "No hay suscripción activa" };
      }

      // Cancel in MP if connected
      if (subscription.mpSubscriptionId && isMercadoPagoConfigured()) {
        try {
          await cancelMpSubscription(subscription.mpSubscriptionId);
        } catch (err) {
          console.error("[billing] Failed to cancel MP subscription:", err);
        }
      }

      const cancelsAt = subscription.currentPeriodEnd ?? new Date();

      await prisma.subscription.update({
        where: { tenantId: user.tenantId },
        data: {
          status: "CANCELLED",
          cancelsAt,
          cancelledAt: new Date(),
        },
      });

      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { subscriptionStatus: "CANCELLED" },
      });

      return { success: true, cancelsAt };
    },
  });
}
