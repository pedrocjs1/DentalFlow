import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { getAllTenantsUsage, getMonthlyUsage } from "../../services/usage-tracker.js";
import { PLAN_LIMITS } from "@dentiqa/shared";

export async function adminUsageRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [adminMiddleware];

  // GET /api/v1/admin/usage?period=2026-03
  app.get("/api/v1/admin/usage", {
    preHandler,
    handler: async (request) => {
      const { period } = request.query as { period?: string };

      const [usageSummaries, tenants] = await Promise.all([
        getAllTenantsUsage(period),
        prisma.tenant.findMany({
          select: { id: true, name: true, slug: true, plan: true },
        }),
      ]);

      const tenantMap = new Map(tenants.map((t) => [t.id, t]));

      return usageSummaries.map((u) => {
        const tenant = tenantMap.get(u.tenantId);
        const limits = PLAN_LIMITS[tenant?.plan ?? "STARTER"];
        return {
          ...u,
          tenantName: tenant?.name ?? "Unknown",
          tenantSlug: tenant?.slug ?? "—",
          plan: tenant?.plan ?? "STARTER",
          limits,
          overWhatsApp:
            limits.whatsappMessages !== -1 && u.whatsappMessages > limits.whatsappMessages,
          overAi:
            limits.aiInteractions !== -1 && u.aiInteractions > limits.aiInteractions,
        };
      });
    },
  });

  // GET /api/v1/admin/usage/:tenantId?period=2026-03
  app.get("/api/v1/admin/usage/:tenantId", {
    preHandler,
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      const { period } = request.query as { period?: string };

      const [usage, tenant] = await Promise.all([
        getMonthlyUsage(tenantId, period),
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, plan: true },
        }),
      ]);

      const limits = PLAN_LIMITS[tenant?.plan ?? "STARTER"];

      return { tenantId, tenantName: tenant?.name, plan: tenant?.plan, usage, limits };
    },
  });
}
