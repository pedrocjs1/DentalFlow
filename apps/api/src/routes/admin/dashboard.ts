import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { PLAN_PRICES } from "@dentalflow/shared";

export async function adminDashboardRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/admin/dashboard/stats
  app.get("/api/v1/admin/dashboard/stats", {
    preHandler: [adminMiddleware],
    handler: async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalTenants,
        activeTenants,
        totalPatients,
        appointmentsToday,
        appointmentsThisMonth,
        messagesThisMonth,
        messagesToday,
        pastDueTenants,
        recentTenants,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { isActive: true } }),
        prisma.patient.count({ where: { isActive: true } }),
        prisma.appointment.count({ where: { startTime: { gte: startOfToday } } }),
        prisma.appointment.count({ where: { startTime: { gte: startOfMonth } } }),
        prisma.message.count({ where: { sentAt: { gte: startOfMonth } } }),
        prisma.message.count({ where: { sentAt: { gte: startOfToday } } }),
        prisma.tenant.count({
          where: { subscriptionStatus: { in: ["PAST_DUE", "CANCELLED"] }, isActive: true },
        }),
        // Tenants per month for the last 6 months
        prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT to_char("createdAt", 'YYYY-MM') as month, COUNT(*) as count
          FROM "Tenant"
          WHERE "createdAt" >= NOW() - INTERVAL '6 months'
          GROUP BY month
          ORDER BY month ASC
        `,
      ]);

      // MRR = sum of plan prices for all active ACTIVE/TRIALING tenants
      const activeForMrr = await prisma.tenant.findMany({
        where: { isActive: true, subscriptionStatus: { in: ["ACTIVE", "TRIALING"] } },
        select: { plan: true },
      });
      const mrr = activeForMrr.reduce((acc, t) => acc + (PLAN_PRICES[t.plan] ?? 0), 0);

      return {
        totalTenants,
        activeTenants,
        totalPatients,
        appointmentsToday,
        appointmentsThisMonth,
        messagesThisMonth,
        messagesToday,
        pastDueTenants,
        mrr,
        growth: recentTenants.map((r) => ({
          month: r.month,
          count: Number(r.count),
        })),
      };
    },
  });
}
