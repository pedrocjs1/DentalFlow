import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@dentalflow/db";
import { LoginSchema } from "@dentalflow/shared";
import { AppError } from "../../errors/app-error.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };

      const user = await prisma.user.findFirst({
        where: { email, isActive: true },
        include: { tenant: { select: { id: true, name: true, plan: true, subscriptionStatus: true } } },
      });

      if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      const token = app.jwt.sign({
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        name: user.name,
      });

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenant: user.tenant,
        },
      });
    },
  });
}
