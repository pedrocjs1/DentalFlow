import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@dentalflow/db";
import { AppError } from "../../errors/app-error.js";
import { logSecurityEvent, isLoginLocked } from "../../services/security-logger.js";
import { registerRoutes } from "./register.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Register endpoint (public)
  await app.register(registerRoutes);
  app.post("/api/v1/auth/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 8, maxLength: 128 },
        },
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body as { email: string; password: string };
      const ip = request.ip;
      const userAgent = request.headers["user-agent"] ?? undefined;

      // Check login lockout (5 failed attempts in 5 min)
      const locked = await isLoginLocked(ip);
      if (locked) {
        await logSecurityEvent({
          type: "RATE_LIMITED",
          ip,
          email,
          endpoint: "/api/v1/auth/login",
          details: "Login locked out — too many failed attempts",
          severity: "HIGH",
          userAgent,
        });
        throw new AppError(429, "TOO_MANY_ATTEMPTS", "Demasiados intentos. Esperá unos minutos.");
      }

      const user = await prisma.user.findFirst({
        where: { email, isActive: true },
        include: { tenant: { select: { id: true, name: true, plan: true, subscriptionStatus: true } } },
      });

      if (!user) {
        await logSecurityEvent({
          type: "LOGIN_FAILED",
          ip,
          email,
          endpoint: "/api/v1/auth/login",
          details: "User not found",
          severity: "LOW",
          userAgent,
        });
        throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        await logSecurityEvent({
          type: "LOGIN_FAILED",
          ip,
          email,
          userId: user.id,
          tenantId: user.tenantId,
          endpoint: "/api/v1/auth/login",
          details: "Invalid password",
          severity: "MEDIUM",
          userAgent,
        });
        throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");
      }

      // Success
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await logSecurityEvent({
        type: "LOGIN_ATTEMPT",
        ip,
        email,
        userId: user.id,
        tenantId: user.tenantId,
        endpoint: "/api/v1/auth/login",
        success: true,
        severity: "LOW",
        userAgent,
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
