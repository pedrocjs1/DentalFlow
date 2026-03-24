import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import {
  isMercadoPagoConfigured,
  createSubscription,
  cancelMpSubscription,
  getSubscriptionStatus,
  getPlanDetails,
} from "../../services/mercadopago.js";

type UserPayload = { tenantId: string; sub: string; email: string; name: string; role: string };

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

      // If we have an MP subscription, optionally sync its status
      let mpStatus: string | null = null;
      if (subscription.mpSubscriptionId && isMercadoPagoConfigured()) {
        try {
          const mpSub = await getSubscriptionStatus(subscription.mpSubscriptionId);
          mpStatus = mpSub.status;
        } catch {
          // MP down or invalid ID — use local status
        }
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
        mpStatus,
        planPrice: planDetails.price,
        planCurrency: planDetails.currency,
      };
    },
  });

  // ─── Create subscription (redirect to MP checkout) ────────────────────────
  app.post("/api/v1/billing/create-subscription", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as UserPayload;
      const body = request.body as { plan?: string } | null;
      const plan = body?.plan;

      if (!isMercadoPagoConfigured()) {
        return reply.status(400).send({ error: "Mercado Pago no está configurado", checkoutUrl: null });
      }

      if (!plan || !["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(plan)) {
        return reply.status(400).send({ error: "Plan inválido" });
      }

      // Check for existing active MP subscription
      const existing = await prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });
      if (existing?.mpSubscriptionId && existing.status === "ACTIVE") {
        return reply.status(400).send({ error: "Ya tenés una suscripción activa. Cancelala primero para cambiar." });
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
    handler: async (request, reply) => {
      const user = request.user as UserPayload;
      const body = request.body as { newPlan?: string } | null;
      const newPlan = body?.newPlan;

      if (!newPlan || !["STARTER", "PROFESSIONAL", "ENTERPRISE"].includes(newPlan)) {
        return reply.status(400).send({ error: "Plan inválido" });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      // For MP: cancel old + create new subscription
      if (subscription?.mpSubscriptionId && isMercadoPagoConfigured()) {
        try {
          await cancelMpSubscription(subscription.mpSubscriptionId);
        } catch {
          // Old sub might already be cancelled
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
          plan: newPlan,
          backUrl: `${appUrl}/configuracion?tab=facturacion&mp=callback`,
        });

        await prisma.subscription.update({
          where: { tenantId: user.tenantId },
          data: {
            plan: newPlan,
            mpSubscriptionId: result.mpSubscriptionId,
            paymentMethod: "mercadopago",
          },
        });

        await prisma.tenant.update({
          where: { id: user.tenantId },
          data: { plan: newPlan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE" },
        });

        return { success: true, plan: newPlan, checkoutUrl: result.checkoutUrl };
      }

      // No MP — update locally only
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
    handler: async (request, reply) => {
      const user = request.user as UserPayload;

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId: user.tenantId },
      });

      if (!subscription) {
        return reply.status(400).send({ error: "No hay suscripción activa" });
      }

      // Cancel in MP if connected
      if (subscription.mpSubscriptionId && isMercadoPagoConfigured()) {
        try {
          await cancelMpSubscription(subscription.mpSubscriptionId);
        } catch {
          // Already cancelled or MP down
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
