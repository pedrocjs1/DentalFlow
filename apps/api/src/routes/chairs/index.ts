import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function chairRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET all chairs
  app.get("/api/v1/chairs", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { includeInactive?: string };
      const includeInactive = query.includeInactive === "true";

      const chairs = await prisma.chair.findMany({
        where: {
          tenantId: user.tenantId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        select: { id: true, name: true, isActive: true },
        orderBy: { name: "asc" },
      });
      return { chairs };
    },
  });

  // POST create chair
  app.post("/api/v1/chairs", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as { name: string };

      const chair = await prisma.chair.create({
        data: { tenantId: user.tenantId, name: body.name },
        select: { id: true, name: true, isActive: true },
      });
      return reply.status(201).send(chair);
    },
  });

  // PATCH update chair
  app.patch("/api/v1/chairs/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as { name?: string; isActive?: boolean };

      const existing = await prisma.chair.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "CHAIR_NOT_FOUND", "Sillón no encontrado");

      const chair = await prisma.chair.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        select: { id: true, name: true, isActive: true },
      });
      return chair;
    },
  });

  // DELETE (soft delete) chair
  app.delete("/api/v1/chairs/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.chair.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "CHAIR_NOT_FOUND", "Sillón no encontrado");

      await prisma.chair.update({ where: { id }, data: { isActive: false } });
      return reply.status(204).send();
    },
  });
}
