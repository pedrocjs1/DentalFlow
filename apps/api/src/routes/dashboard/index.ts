import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { getMonthlyUsage, checkPlanLimit } from "../../services/usage-tracker.js";
import { PLAN_LIMITS, AI_EXTRA_BLOCK_PRICE, AI_EXTRA_BLOCK_SIZE } from "@dentalflow/shared";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/dashboard/stats", {
    preHandler: [authMiddleware, tenantMiddleware],
    handler: async (request) => {
      const user = request.user as { tenantId: string; sub: string; name: string; email: string; role: string };

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        appointmentsToday,
        appointmentsTodayList,
        newPatientsThisMonth,
        totalPatients,
        openConversations,
        activeCampaigns,
        upcomingAppointments,
        tenant,
      ] = await Promise.all([
        // Count appointments today
        prisma.appointment.count({
          where: {
            tenantId: user.tenantId,
            startTime: { gte: todayStart, lte: todayEnd },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
        }),

        // Appointments today with detail
        prisma.appointment.findMany({
          where: {
            tenantId: user.tenantId,
            startTime: { gte: todayStart, lte: todayEnd },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
          include: {
            patient: { select: { firstName: true, lastName: true } },
            dentist: { select: { name: true, color: true } },
            treatmentType: { select: { name: true } },
          },
          orderBy: { startTime: "asc" },
          take: 5,
        }),

        // New patients this month
        prisma.patient.count({
          where: {
            tenantId: user.tenantId,
            isActive: true,
            createdAt: { gte: monthStart },
          },
        }),

        // Total active patients
        prisma.patient.count({
          where: { tenantId: user.tenantId, isActive: true },
        }),

        // Open conversations
        prisma.conversation.count({
          where: {
            tenantId: user.tenantId,
            status: { in: ["OPEN", "HUMAN_NEEDED"] },
          },
        }),

        // Active campaigns (sending or scheduled)
        prisma.campaign.count({
          where: {
            tenantId: user.tenantId,
            status: { in: ["SENDING", "SCHEDULED"] },
          },
        }),

        // Next upcoming appointments (next 7 days)
        prisma.appointment.findMany({
          where: {
            tenantId: user.tenantId,
            startTime: { gte: now },
            status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
          },
          include: {
            patient: { select: { firstName: true, lastName: true, phone: true } },
            dentist: { select: { name: true, color: true } },
            treatmentType: { select: { name: true } },
          },
          orderBy: { startTime: "asc" },
          take: 5,
        }),

        // Tenant info
        prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { name: true, plan: true, subscriptionStatus: true },
        }),
      ]);

      return {
        stats: {
          appointmentsToday,
          newPatientsThisMonth,
          totalPatients,
          openConversations,
          activeCampaigns,
        },
        appointmentsTodayList,
        upcomingAppointments,
        tenant,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    },
  });

  // GET /api/v1/dashboard/usage — usage widget for tenant
  app.get("/api/v1/dashboard/usage", {
    preHandler: [authMiddleware, tenantMiddleware],
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { plan: true },
      });
      const plan = tenant?.plan ?? "STARTER";
      const usage = await getMonthlyUsage(user.tenantId);
      const limits = PLAN_LIMITS[plan];
      const aiLimit = await checkPlanLimit(user.tenantId, "AI_INTERACTION");
      return {
        plan,
        usage,
        limits,
        overage: {
          overLimit: aiLimit.overLimit,
          atWarning: aiLimit.atWarning,
          percentUsed: aiLimit.percentUsed,
          extraBlocksUsed: aiLimit.extraBlocksUsed,
          extraCostUSD: aiLimit.extraCostUSD,
          extraBlockPrice: AI_EXTRA_BLOCK_PRICE,
          extraBlockSize: AI_EXTRA_BLOCK_SIZE,
        },
      };
    },
  });
}
