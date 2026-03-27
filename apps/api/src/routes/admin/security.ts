import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";

export async function adminSecurityRoutes(app: FastifyInstance): Promise<void> {
  // ─── Security Dashboard ───────────────────────────────────────────────────
  app.get("/api/v1/admin/security/dashboard", {
    preHandler: [adminMiddleware],
    handler: async () => {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        loginSuccess,
        loginFailed,
        rateLimited,
        webhookInvalid,
        promptInjection,
        unauthorizedAccess,
        recentEvents,
      ] = await Promise.all([
        prisma.securityLog.count({
          where: { type: "LOGIN_ATTEMPT", success: true, createdAt: { gte: h24 } },
        }),
        prisma.securityLog.count({
          where: { type: "LOGIN_FAILED", createdAt: { gte: h24 } },
        }),
        prisma.securityLog.count({
          where: { type: "RATE_LIMITED", createdAt: { gte: h24 } },
        }),
        prisma.securityLog.count({
          where: { type: "WEBHOOK_INVALID_SIGNATURE", createdAt: { gte: h24 } },
        }),
        prisma.securityLog.count({
          where: { type: "PROMPT_INJECTION_ATTEMPT", createdAt: { gte: h24 } },
        }),
        prisma.securityLog.count({
          where: { type: "UNAUTHORIZED_ACCESS", createdAt: { gte: h24 } },
        }),
        prisma.securityLog.findMany({
          where: { createdAt: { gte: h24 } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            type: true,
            ip: true,
            email: true,
            endpoint: true,
            details: true,
            success: true,
            severity: true,
            createdAt: true,
          },
        }),
      ]);

      return {
        period: "24h",
        loginSuccess,
        loginFailed,
        rateLimited,
        webhookInvalid,
        promptInjection,
        unauthorizedAccess,
        totalEvents: loginSuccess + loginFailed + rateLimited + webhookInvalid + promptInjection + unauthorizedAccess,
        recentEvents,
      };
    },
  });

  // ─── Security Logs ────────────────────────────────────────────────────────
  app.get("/api/v1/admin/security/logs", {
    preHandler: [adminMiddleware],
    handler: async (request) => {
      const { type, period = "24h", limit = "50", offset = "0" } = request.query as {
        type?: string;
        period?: string;
        limit?: string;
        offset?: string;
      };

      const periodMs = period === "1h" ? 3600000
        : period === "24h" ? 86400000
        : period === "7d" ? 604800000
        : 86400000;

      const since = new Date(Date.now() - periodMs);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { createdAt: { gte: since } };
      if (type) where.type = type;

      const [logs, total] = await Promise.all([
        prisma.securityLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: Math.min(parseInt(limit) || 50, 200),
          skip: parseInt(offset) || 0,
          select: {
            id: true,
            type: true,
            ip: true,
            email: true,
            userId: true,
            tenantId: true,
            endpoint: true,
            details: true,
            success: true,
            userAgent: true,
            severity: true,
            createdAt: true,
          },
        }),
        prisma.securityLog.count({ where }),
      ]);

      return { logs, total, period };
    },
  });
}
