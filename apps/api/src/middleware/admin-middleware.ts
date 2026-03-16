import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../errors/app-error.js";

/**
 * Validates the request has a valid SUPER_ADMIN JWT.
 * Admin tokens contain { sub, role: "SUPER_ADMIN", isSuperAdmin: true }.
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Admin authentication required");
  }

  const payload = request.user as { role?: string; isSuperAdmin?: boolean };
  if (payload.role !== "SUPER_ADMIN" || !payload.isSuperAdmin) {
    throw new AppError(403, "FORBIDDEN", "Super admin access required");
  }
}
