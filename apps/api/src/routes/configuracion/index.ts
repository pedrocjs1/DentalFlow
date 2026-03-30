import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { requireRole } from "../../middleware/role-middleware.js";

// ─── User limit per plan ──────────────────────────────────────────────────────

const USER_LIMITS: Record<string, number> = {
  STARTER: 5,
  PROFESSIONAL: 10,
  ENTERPRISE: 999,
};

function getUserLimit(plan: string): number {
  return USER_LIMITS[plan] ?? USER_LIMITS.STARTER;
}

// ─── Bot config validation schema ─────────────────────────────────────────────

const botConfigSchema = z
  .object({
    welcomeMessage: z.string().max(500).nullable().optional(),
    botTone: z.enum(["formal", "friendly", "casual"]).optional(),
    botLanguage: z.enum(["es", "pt", "en"]).optional(),
    askBirthdate: z.boolean().optional(),
    askInsurance: z.boolean().optional(),
    askEmail: z.boolean().optional(),
    offerDiscounts: z.boolean().optional(),
    maxDiscountPercent: z.number().int().min(5).max(25).optional(),
    proactiveFollowUp: z.boolean().optional(),
    leadRecontactHours: z.enum(["0", "2", "4", "12", "24"]).transform(Number).optional()
      .or(z.number().refine((v) => [0, 2, 4, 12, 24].includes(v)).optional()),
    campaignBirthday: z.boolean().optional(),
    campaignPeriodicReminder: z.boolean().optional(),
    campaignReactivation: z.boolean().optional(),
    messageDebounceSeconds: z.number().int().min(10).max(20).optional(),
    // Registration config
    registrationEnabled: z.boolean().optional(),
    askFullName: z.boolean().optional(),
    askAddress: z.boolean().optional(),
    askMedicalConditions: z.boolean().optional(),
    askAllergies: z.boolean().optional(),
    askMedications: z.boolean().optional(),
    askHabits: z.boolean().optional(),
    registrationWelcomeMessage: z.string().max(500).nullable().optional(),
  })
  .refine(
    (data) => {
      // If askBirthdate is explicitly set to false, campaignBirthday must also be false
      if (data.askBirthdate === false && data.campaignBirthday === true) {
        return false;
      }
      return true;
    },
    { message: "No se puede activar la campaña de cumpleaños sin pedir fecha de nacimiento" }
  );

export async function configuracionRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];
  const managerOnly = [authMiddleware, tenantMiddleware, requireRole("OWNER", "ADMIN")];

  // ─── Bot config endpoints ─────────────────────────────────────────────────

  // GET bot config
  app.get("/api/v1/configuracion/bot", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          welcomeMessage: true,
          botTone: true,
          botLanguage: true,
          askBirthdate: true,
          askInsurance: true,
          askEmail: true,
          offerDiscounts: true,
          maxDiscountPercent: true,
          proactiveFollowUp: true,
          leadRecontactHours: true,
          campaignBirthday: true,
          campaignPeriodicReminder: true,
          campaignReactivation: true,
          messageDebounceSeconds: true,
          registrationEnabled: true,
          askFullName: true,
          askAddress: true,
          askMedicalConditions: true,
          askAllergies: true,
          askMedications: true,
          askHabits: true,
          registrationWelcomeMessage: true,
        },
      });
      if (!tenant) throw new AppError(404, "TENANT_NOT_FOUND", "Clínica no encontrada");
      return tenant;
    },
  });

  // PUT bot config
  app.put("/api/v1/configuracion/bot", {
    preHandler: managerOnly,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const parsed = botConfigSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new AppError(400, "VALIDATION_ERROR", parsed.error.errors[0]?.message ?? "Datos inválidos");
      }
      const body = parsed.data;

      // Business rule: if askBirthdate → false, auto-disable campaignBirthday
      const updateData: Record<string, unknown> = {};
      if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage;
      if (body.botTone !== undefined) updateData.botTone = body.botTone;
      if (body.botLanguage !== undefined) updateData.botLanguage = body.botLanguage;
      if (body.askBirthdate !== undefined) {
        updateData.askBirthdate = body.askBirthdate;
        if (!body.askBirthdate) updateData.campaignBirthday = false;
      }
      if (body.askInsurance !== undefined) updateData.askInsurance = body.askInsurance;
      if (body.askEmail !== undefined) updateData.askEmail = body.askEmail;
      if (body.offerDiscounts !== undefined) updateData.offerDiscounts = body.offerDiscounts;
      if (body.maxDiscountPercent !== undefined) updateData.maxDiscountPercent = body.maxDiscountPercent;
      if (body.proactiveFollowUp !== undefined) updateData.proactiveFollowUp = body.proactiveFollowUp;
      if (body.leadRecontactHours !== undefined) updateData.leadRecontactHours = body.leadRecontactHours;
      if (body.campaignBirthday !== undefined && body.askBirthdate !== false) {
        updateData.campaignBirthday = body.campaignBirthday;
      }
      if (body.campaignPeriodicReminder !== undefined) updateData.campaignPeriodicReminder = body.campaignPeriodicReminder;
      if (body.campaignReactivation !== undefined) updateData.campaignReactivation = body.campaignReactivation;
      if (body.messageDebounceSeconds !== undefined) updateData.messageDebounceSeconds = body.messageDebounceSeconds;
      // Registration config
      if (body.registrationEnabled !== undefined) updateData.registrationEnabled = body.registrationEnabled;
      if (body.askFullName !== undefined) updateData.askFullName = body.askFullName;
      if (body.askAddress !== undefined) updateData.askAddress = body.askAddress;
      if (body.askMedicalConditions !== undefined) updateData.askMedicalConditions = body.askMedicalConditions;
      if (body.askAllergies !== undefined) updateData.askAllergies = body.askAllergies;
      if (body.askMedications !== undefined) updateData.askMedications = body.askMedications;
      if (body.askHabits !== undefined) updateData.askHabits = body.askHabits;
      if (body.registrationWelcomeMessage !== undefined) updateData.registrationWelcomeMessage = body.registrationWelcomeMessage;

      const tenant = await prisma.tenant.update({
        where: { id: user.tenantId },
        data: updateData,
        select: {
          welcomeMessage: true,
          botTone: true,
          botLanguage: true,
          askBirthdate: true,
          askInsurance: true,
          askEmail: true,
          offerDiscounts: true,
          maxDiscountPercent: true,
          proactiveFollowUp: true,
          leadRecontactHours: true,
          campaignBirthday: true,
          campaignPeriodicReminder: true,
          campaignReactivation: true,
          messageDebounceSeconds: true,
          registrationEnabled: true,
          askFullName: true,
          askAddress: true,
          askMedicalConditions: true,
          askAllergies: true,
          askMedications: true,
          askHabits: true,
          registrationWelcomeMessage: true,
        },
      });
      return tenant;
    },
  });

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
    preHandler: managerOnly,
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
    preHandler: managerOnly,
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
      const [users, tenant] = await Promise.all([
        prisma.user.findMany({
          where: { tenantId: user.tenantId, isActive: true },
          select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, createdAt: true },
          orderBy: { name: "asc" },
        }),
        prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plan: true } }),
      ]);
      const plan = tenant?.plan ?? "STARTER";
      return { users, plan, userLimit: getUserLimit(plan) };
    },
  });

  // POST invite team member
  app.post("/api/v1/configuracion/equipo", {
    preHandler: managerOnly,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name: string;
        email: string;
        role: "ADMIN" | "DENTIST" | "RECEPTIONIST";
        phone?: string;
        password: string;
      };

      // Check user limit for tenant's plan
      const [activeCount, tenant] = await Promise.all([
        prisma.user.count({ where: { tenantId: user.tenantId, isActive: true } }),
        prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { plan: true } }),
      ]);
      const limit = getUserLimit(tenant?.plan ?? "STARTER");
      if (activeCount >= limit) {
        throw new AppError(
          403,
          "USER_LIMIT_REACHED",
          `Tu plan permite un máximo de ${limit} usuarios. Actualizá tu plan para agregar más miembros.`
        );
      }

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
    preHandler: managerOnly,
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
    preHandler: managerOnly,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "USER_NOT_FOUND", "Usuario no encontrado");

      await prisma.user.update({ where: { id }, data: { isActive: false } });
      return reply.status(204).send();
    },
  });

  // WhatsApp configuration has been moved to /api/v1/whatsapp/* (Embedded Signup flow)
}
