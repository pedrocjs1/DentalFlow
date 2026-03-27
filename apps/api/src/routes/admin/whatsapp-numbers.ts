import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function adminWhatsAppNumberRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [adminMiddleware];

  // GET /api/v1/admin/whatsapp-numbers — monitoring view of all connected clinics
  app.get("/api/v1/admin/whatsapp-numbers", {
    preHandler,
    handler: async () => {
      const tenants = await prisma.tenant.findMany({
        where: {
          whatsappPhoneNumberId: { not: null },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          whatsappPhoneNumberId: true,
          whatsappDisplayNumber: true,
          wabaId: true,
          whatsappStatus: true,
          whatsappConnectedAt: true,
        },
        orderBy: { whatsappConnectedAt: "desc" },
      });

      // Also include disconnected tenants for full picture
      const allTenants = await prisma.tenant.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          whatsappPhoneNumberId: true,
          whatsappDisplayNumber: true,
          wabaId: true,
          whatsappStatus: true,
          whatsappConnectedAt: true,
        },
        orderBy: { name: "asc" },
      });

      return allTenants;
    },
  });

  // POST /api/v1/admin/whatsapp-numbers/:tenantId/force-disconnect
  // Super Admin can force-disconnect a clinic's WhatsApp
  app.post("/api/v1/admin/whatsapp-numbers/:tenantId/force-disconnect", {
    preHandler,
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new AppError(404, "NOT_FOUND", "Clínica no encontrada");

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          wabaId: null,
          whatsappPhoneNumberId: null,
          whatsappDisplayNumber: null,
          whatsappAccessToken: null,
          whatsappConnectedAt: null,
          whatsappStatus: "DISCONNECTED",
        },
      });

      app.log.info({ tenantId, tenantName: tenant.name }, "Super Admin force-disconnected WhatsApp");

      return { success: true };
    },
  });
}
