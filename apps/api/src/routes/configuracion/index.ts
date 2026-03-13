import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function configuracionRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET clinic settings
  app.get("/api/v1/configuracion/clinica", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          country: true,
          timezone: true,
          logoUrl: true,
          welcomeMessage: true,
          currency: true,
          plan: true,
          subscriptionStatus: true,
        },
      });
      if (!tenant) throw new AppError(404, "TENANT_NOT_FOUND", "Clínica no encontrada");
      return tenant;
    },
  });

  // PUT clinic settings
  app.put("/api/v1/configuracion/clinica", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        country?: string;
        timezone?: string;
        logoUrl?: string;
        welcomeMessage?: string;
        currency?: string;
      };

      const tenant = await prisma.tenant.update({
        where: { id: user.tenantId },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(body.email !== undefined && { email: body.email }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.country !== undefined && { country: body.country }),
          ...(body.timezone !== undefined && { timezone: body.timezone }),
          ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
          ...(body.welcomeMessage !== undefined && { welcomeMessage: body.welcomeMessage }),
          ...(body.currency !== undefined && { currency: body.currency }),
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          country: true,
          timezone: true,
          logoUrl: true,
          welcomeMessage: true,
          currency: true,
        },
      });
      return tenant;
    },
  });

  // GET working hours (tenant-wide)
  app.get("/api/v1/configuracion/working-hours", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const hours = await prisma.workingHours.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { dayOfWeek: "asc" },
      });
      return { hours };
    },
  });

  // PUT working hours (bulk upsert)
  app.put("/api/v1/configuracion/working-hours", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        breakStart?: string;
        breakEnd?: string;
        isActive: boolean;
      }>;

      const operations = body.map((day) =>
        prisma.workingHours.upsert({
          where: { tenantId_dayOfWeek: { tenantId: user.tenantId, dayOfWeek: day.dayOfWeek } },
          create: {
            tenantId: user.tenantId,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            breakStart: day.breakStart ?? null,
            breakEnd: day.breakEnd ?? null,
            isActive: day.isActive,
          },
          update: {
            startTime: day.startTime,
            endTime: day.endTime,
            breakStart: day.breakStart ?? null,
            breakEnd: day.breakEnd ?? null,
            isActive: day.isActive,
          },
        })
      );

      await prisma.$transaction(operations);
      return reply.status(200).send({ ok: true });
    },
  });

  // GET team members (users)
  app.get("/api/v1/configuracion/equipo", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const users = await prisma.user.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, createdAt: true },
        orderBy: { name: "asc" },
      });
      return { users };
    },
  });

  // POST invite team member
  app.post("/api/v1/configuracion/equipo", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name: string;
        email: string;
        role: "ADMIN" | "DENTIST" | "RECEPTIONIST";
        phone?: string;
        password: string;
      };

      const existing = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: user.tenantId, email: body.email } },
      });
      if (existing) throw new AppError(409, "EMAIL_TAKEN", "Ya existe un usuario con ese email");

      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(body.password, 10);

      const newUser = await prisma.user.create({
        data: {
          tenantId: user.tenantId,
          name: body.name,
          email: body.email,
          role: body.role,
          phone: body.phone,
          passwordHash,
        },
        select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
      });

      return reply.status(201).send(newUser);
    },
  });

  // PATCH team member
  app.patch("/api/v1/configuracion/equipo/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        role?: "ADMIN" | "DENTIST" | "RECEPTIONIST";
        phone?: string;
        password?: string;
      };

      const existing = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "USER_NOT_FOUND", "Usuario no encontrado");

      let passwordHash: string | undefined;
      if (body.password) {
        const bcrypt = await import("bcryptjs");
        passwordHash = await bcrypt.hash(body.password, 10);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.role !== undefined && { role: body.role }),
          ...(body.phone !== undefined && { phone: body.phone }),
          ...(passwordHash && { passwordHash }),
        },
        select: { id: true, name: true, email: true, role: true, phone: true },
      });
      return updated;
    },
  });

  // DELETE (deactivate) team member
  app.delete("/api/v1/configuracion/equipo/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "USER_NOT_FOUND", "Usuario no encontrado");

      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return reply.status(204).send();
    },
  });
}
