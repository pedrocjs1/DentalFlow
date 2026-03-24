import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function evolutionTemplateRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET /api/v1/evolution-templates
  app.get("/api/v1/evolution-templates", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      const templates = await prisma.evolutionTemplate.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        orderBy: { name: "asc" },
      });

      return { templates };
    },
  });

  // POST /api/v1/evolution-templates
  app.post("/api/v1/evolution-templates", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };

      const body = request.body as {
        name: string;
        procedure?: string;
        materials?: string;
        description?: string;
        instructions?: string;
      };

      if (!body.name) {
        throw new AppError(400, "VALIDATION_ERROR", "name es requerido");
      }

      const template = await prisma.evolutionTemplate.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          procedure: body.procedure ?? null,
          materials: body.materials ?? null,
          description: body.description ?? null,
          instructions: body.instructions ?? null,
        },
      });

      return reply.status(201).send({ template });
    },
  });

  // PUT /api/v1/evolution-templates/:id
  app.put("/api/v1/evolution-templates/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const template = await prisma.evolutionTemplate.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!template) throw new AppError(404, "TEMPLATE_NOT_FOUND", "Plantilla no encontrada");

      const body = request.body as {
        name?: string;
        procedure?: string;
        materials?: string;
        description?: string;
        instructions?: string;
        isActive?: boolean;
      };

      const updated = await prisma.evolutionTemplate.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.procedure !== undefined && { procedure: body.procedure }),
          ...(body.materials !== undefined && { materials: body.materials }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.instructions !== undefined && { instructions: body.instructions }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });

      return { template: updated };
    },
  });

  // DELETE /api/v1/evolution-templates/:id
  app.delete("/api/v1/evolution-templates/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const template = await prisma.evolutionTemplate.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!template) throw new AppError(404, "TEMPLATE_NOT_FOUND", "Plantilla no encontrada");

      await prisma.evolutionTemplate.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
}
