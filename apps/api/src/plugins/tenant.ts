import type { FastifyInstance } from "fastify";

// Tenant context is injected via JWT payload (tenantId field)
// This plugin adds helper methods for tenant-aware DB queries
export async function tenantPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest("tenantId", null);
}
