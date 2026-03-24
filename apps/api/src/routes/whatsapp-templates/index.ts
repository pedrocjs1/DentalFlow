import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function whatsappTemplateRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET /api/v1/whatsapp-templates — All templates visible to the clinic
  // Returns system templates (global, APPROVED) + clinic custom templates
  app.get("/api/v1/whatsapp-templates", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      const templates = await prisma.whatsAppTemplate.findMany({
        where: {
          OR: [
            // Global system templates that are approved
            { isSystemTemplate: true, status: "APPROVED", tenantId: null },
            // Clinic's own custom templates (future)
            { tenantId: user.tenantId },
          ],
        },
        orderBy: { createdAt: "asc" },
      });

      return { templates };
    },
  });

  // GET /api/v1/templates/catalog — Approved templates for the catalog view
  app.get("/api/v1/templates/catalog", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      // Get tenant's disabled template IDs
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { disabledTemplateIds: true },
      });

      const templates = await prisma.whatsAppTemplate.findMany({
        where: {
          isSystemTemplate: true,
          status: "APPROVED",
          isActive: true,
          tenantId: null,
        },
        orderBy: { createdAt: "asc" },
      });

      // Add isEnabledForClinic field
      const disabledIds = new Set(tenant?.disabledTemplateIds ?? []);
      const catalogTemplates = templates.map((t) => ({
        ...t,
        isEnabledForClinic: !disabledIds.has(t.id),
      }));

      return { templates: catalogTemplates };
    },
  });

  // PATCH /api/v1/templates/:id/toggle — Toggle template for this clinic
  app.patch("/api/v1/templates/:id/toggle", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string; role: string };
      const { id } = request.params as { id: string };

      if (user.role !== "OWNER" && user.role !== "ADMIN") {
        throw new AppError(403, "FORBIDDEN", "Solo el propietario o admin puede cambiar esta configuración");
      }

      // Verify template exists and is approved
      const template = await prisma.whatsAppTemplate.findFirst({
        where: { id, isSystemTemplate: true, status: "APPROVED" },
      });

      if (!template) {
        throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template no encontrado o no aprobado");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { disabledTemplateIds: true },
      });

      const disabledIds = tenant?.disabledTemplateIds ?? [];
      const isCurrentlyDisabled = disabledIds.includes(id);

      let newDisabledIds: string[];
      if (isCurrentlyDisabled) {
        // Enable: remove from disabled list
        newDisabledIds = disabledIds.filter((tid) => tid !== id);
      } else {
        // Disable: add to disabled list
        newDisabledIds = [...disabledIds, id];
      }

      await prisma.tenant.update({
        where: { id: user.tenantId },
        data: { disabledTemplateIds: newDisabledIds },
      });

      return { enabled: isCurrentlyDisabled, templateId: id };
    },
  });

  // PATCH /api/v1/whatsapp-templates/:id — Update template (for clinic custom templates only)
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
      };

      const existing = await prisma.whatsAppTemplate.findFirst({
        where: { id, tenantId: user.tenantId },
      });

      if (!existing) {
        throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template no encontrado");
      }

      // System templates can't be edited by clinics
      if (existing.isSystemTemplate) {
        throw new AppError(403, "CANNOT_EDIT", "Los templates del sistema no se pueden editar");
      }

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
