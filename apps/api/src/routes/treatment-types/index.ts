import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function treatmentTypeRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET all treatment types
  app.get("/api/v1/treatment-types", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { includeInactive?: string };
      const includeInactive = query.includeInactive === "true";

      const treatmentTypes = await prisma.treatmentType.findMany({
        where: {
          tenantId: user.tenantId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        select: {
          id: true,
          name: true,
          durationMin: true,
          price: true,
          color: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
      return { treatmentTypes };
    },
  });

  // POST create treatment type
  app.post("/api/v1/treatment-types", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name: string;
        durationMin?: number;
        price?: number;
        color?: string;
      };

      const tt = await prisma.treatmentType.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          durationMin: body.durationMin ?? 30,
          price: body.price ?? undefined,
          color: body.color,
        },
        select: { id: true, name: true, durationMin: true, price: true, color: true, isActive: true },
      });
      return reply.status(201).send(tt);
    },
  });

  // PATCH update treatment type
  app.patch("/api/v1/treatment-types/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        durationMin?: number;
        price?: number | null;
        color?: string | null;
        isActive?: boolean;
      };

      const existing = await prisma.treatmentType.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "TREATMENT_TYPE_NOT_FOUND", "Tipo de tratamiento no encontrado");

      const tt = await prisma.treatmentType.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.durationMin !== undefined && { durationMin: body.durationMin }),
          ...(body.price !== undefined && { price: body.price }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
        select: { id: true, name: true, durationMin: true, price: true, color: true, isActive: true },
      });
      return tt;
    },
  });

  // DELETE (soft delete) treatment type
  app.delete("/api/v1/treatment-types/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.treatmentType.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "TREATMENT_TYPE_NOT_FOUND", "Tipo de tratamiento no encontrado");

      await prisma.treatmentType.update({ where: { id }, data: { isActive: false } });
      return reply.status(204).send();
    },
  });
}
