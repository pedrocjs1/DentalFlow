/**
 * Role-based access control middleware.
 *
 * Usage:
 *   preHandler: [authMiddleware, tenantMiddleware, requireRole("OWNER", "ADMIN")]
 */

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { AppError } from "../errors/app-error.js";

export function requireRole(...allowedRoles: string[]) {
  return function (request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction) {
    const user = request.user as { role?: string } | undefined;
    const role = user?.role;

    if (!role || !allowedRoles.includes(role)) {
      throw new AppError(403, "FORBIDDEN", "No tenés permisos para acceder a esta sección.");
    }

    done();
  };
}
