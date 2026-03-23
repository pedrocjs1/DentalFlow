import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function whatsappTemplateRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET all templates for tenant
  app.get("/api/v1/whatsapp-templates", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      const templates = await prisma.whatsAppTemplate.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { createdAt: "asc" },
      });
      return { templates };
    },
  });

  // PATCH update template
  app.patch("/api/v1/whatsapp-templates/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        bodyText?: string;
        headerText?: string | null;
        footerText?: string | null;
        isActive?: boolean;
        status?: string;
      };

      const existing = await prisma.whatsAppTemplate.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!existing) throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template no encontrado");

      const template = await prisma.whatsAppTemplate.update({
        where: { id },
        data: {
          ...(body.bodyText !== undefined && { bodyText: body.bodyText, status: "DRAFT" }),
          ...(body.headerText !== undefined && { headerText: body.headerText }),
          ...(body.footerText !== undefined && { footerText: body.footerText }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
        },
      });
      return template;
    },
  });
}
