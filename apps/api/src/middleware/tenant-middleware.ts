import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@dentalflow/db";
import { AppError } from "../errors/app-error.js";

export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user as { tenantId?: string; sub?: string };

  if (!user?.tenantId) {
    throw new AppError(403, "TENANT_MISSING", "Tenant context required");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId, isActive: true },
    select: { id: true, plan: true, subscriptionStatus: true },
  });

  if (!tenant) {
    throw new AppError(403, "TENANT_NOT_FOUND", "Tenant not found or inactive");
  }

  // Attach tenant to request for downstream use
  (request as unknown as Record<string, unknown>).tenant = tenant;
}
