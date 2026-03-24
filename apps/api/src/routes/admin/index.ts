import type { FastifyInstance } from "fastify";
import { adminAuthRoutes } from "./auth.js";
import { adminDashboardRoutes } from "./dashboard.js";
import { adminTenantRoutes } from "./tenants.js";
import { adminWhatsAppNumberRoutes } from "./whatsapp-numbers.js";
import { adminUsageRoutes } from "./usage.js";
import { adminTemplateRoutes } from "./templates.js";
import { adminClinicaRoutes } from "./clinicas.js";
import { adminJobRoutes } from "./jobs.js";
import { adminSecurityRoutes } from "./security.js";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  await app.register(adminAuthRoutes);
  await app.register(adminDashboardRoutes);
  await app.register(adminTenantRoutes);
  await app.register(adminWhatsAppNumberRoutes);
  await app.register(adminUsageRoutes);
  await app.register(adminTemplateRoutes);
  await app.register(adminClinicaRoutes);
  await app.register(adminJobRoutes);
  await app.register(adminSecurityRoutes);
}
