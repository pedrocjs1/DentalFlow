import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@dentalflow/db";
import { AppError } from "../../errors/app-error.js";
import { adminMiddleware } from "../../middleware/admin-middleware.js";

export async function adminAuthRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/admin/auth/login
  app.post("/api/v1/admin/auth/login", {
    handler: async (request, reply) => {
      const body = request.body as { email: string; password: string };

      if (!body.email || !body.password) {
        throw new AppError(400, "INVALID_INPUT", "Email y contraseña requeridos");
      }

      const admin = await prisma.adminUser.findUnique({
        where: { email: body.email.toLowerCase().trim() },
      });

      if (!admin || !admin.isActive) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Credenciales inválidas");
      }

      const valid = await bcrypt.compare(body.password, admin.passwordHash);
      if (!valid) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Credenciales inválidas");
      }

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
      });

      const token = app.jwt.sign({
        sub: admin.id,
        role: "SUPER_ADMIN",
        isSuperAdmin: true,
        email: admin.email,
        name: admin.name,
      });

      return reply.send({
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name },
      });
    },
  });

  // GET /api/v1/admin/auth/me
  app.get("/api/v1/admin/auth/me", {
    preHandler: [adminMiddleware],
    handler: async (request) => {
      const payload = request.user as { sub: string; email: string; name: string };
      return { id: payload.sub, email: payload.email, name: payload.name, role: "SUPER_ADMIN" };
    },
  });
}
