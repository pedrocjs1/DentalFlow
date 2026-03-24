import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@dentalflow/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { PLAN_LIMITS } from "@dentalflow/shared";
import { getMonthlyUsage } from "../../services/usage-tracker.js";

export async function adminTenantRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [adminMiddleware];

  // ─── GET /api/v1/admin/tenants ─────────────────────────────────────────────
  app.get("/api/v1/admin/tenants", {
    preHandler,
    handler: async (request) => {
      const q = (request.query as { search?: string; plan?: string; status?: string });

      const tenants = await prisma.tenant.findMany({
        where: {
          ...(q.plan ? { plan: q.plan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE" } : {}),
          ...(q.status ? { subscriptionStatus: q.status as "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED" } : {}),
          ...(q.search ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { email: { contains: q.search, mode: "insensitive" } },
              { slug: { contains: q.search, mode: "insensitive" } },
            ],
          } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          subscriptionStatus: true,
          isActive: true,
          createdAt: true,
          email: true,
          city: true,
          country: true,
          trialEndsAt: true,
          whatsappStatus: true,
          whatsappDisplayNumber: true,
          _count: { select: { patients: true, users: true } },
        },
      });

      return tenants.map((t) => ({
        ...t,
        patientCount: t._count.patients,
        userCount: t._count.users,
        hasWhatsApp: t.whatsappStatus === "CONNECTED",
      }));
    },
  });

  // ─── GET /api/v1/admin/tenants/:id ────────────────────────────────────────
  app.get("/api/v1/admin/tenants/:id", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };

      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          users: { select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true } },
          _count: { select: { patients: true, appointments: true, conversations: true, campaigns: true } },
        },
      });

      if (!tenant) throw new AppError(404, "NOT_FOUND", "Clínica no encontrada");

      const usage = await getMonthlyUsage(id);
      const limits = PLAN_LIMITS[tenant.plan];

      return {
        ...tenant,
        usage,
        limits,
        counts: tenant._count,
      };
    },
  });

  // ─── POST /api/v1/admin/tenants ───────────────────────────────────────────
  app.post("/api/v1/admin/tenants", {
    preHandler,
    handler: async (request, reply) => {
      const body = request.body as {
        name: string;
        slug: string;
        plan?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
        adminEmail: string;
        adminName: string;
        adminPassword: string;
        city?: string;
        country?: string;
      };

      if (!body.name?.trim() || !body.slug?.trim() || !body.adminEmail?.trim() || !body.adminPassword) {
        throw new AppError(400, "INVALID_INPUT", "name, slug, adminEmail y adminPassword son requeridos");
      }

      // Check slug uniqueness
      const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });
      if (existing) throw new AppError(409, "SLUG_TAKEN", "El slug ya está en uso");

      const passwordHash = await bcrypt.hash(body.adminPassword, 12);

      const tenant = await prisma.tenant.create({
        data: {
          name: body.name.trim(),
          slug: body.slug.trim().toLowerCase(),
          plan: body.plan ?? "STARTER",
          city: body.city?.trim(),
          country: body.country ?? "AR",
          subscriptionStatus: "TRIALING",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          users: {
            create: {
              email: body.adminEmail.trim().toLowerCase(),
              name: body.adminName?.trim() || body.adminEmail.split("@")[0],
              passwordHash,
              role: "OWNER",
            },
          },
        },
        include: {
          users: { select: { id: true, email: true, name: true, role: true } },
        },
      });

      return reply.status(201).send(tenant);
    },
  });

  // ─── PATCH /api/v1/admin/tenants/:id ─────────────────────────────────────
  app.patch("/api/v1/admin/tenants/:id", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        plan?: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
        subscriptionStatus?: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED";
        isActive?: boolean;
        trialEndsAt?: string;
      };

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) throw new AppError(404, "NOT_FOUND", "Clínica no encontrada");

      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.plan !== undefined && { plan: body.plan }),
          ...(body.subscriptionStatus !== undefined && { subscriptionStatus: body.subscriptionStatus }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          ...(body.trialEndsAt !== undefined && { trialEndsAt: new Date(body.trialEndsAt) }),
        },
      });

      return updated;
    },
  });

  // ─── POST /api/v1/admin/tenants/:id/impersonate ───────────────────────────
  // Returns a short-lived JWT as the tenant's first admin/owner user
  app.post("/api/v1/admin/tenants/:id/impersonate", {
    preHandler,
    handler: async (request) => {
      const { id } = request.params as { id: string };

      const tenant = await prisma.tenant.findUnique({ where: { id } });
      if (!tenant) throw new AppError(404, "NOT_FOUND", "Clínica no encontrada");

      // Find the owner or first admin user
      const user = await prisma.user.findFirst({
        where: { tenantId: id, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      });

      if (!user) throw new AppError(404, "NO_USER", "No hay usuario admin en esta clínica");

      // Issue a short-lived impersonation token (1 hour)
      const token = app.jwt.sign(
        {
          sub: user.id,
          tenantId: user.tenantId,
          role: user.role,
          email: user.email,
          name: user.name,
          impersonatedBy: "SUPER_ADMIN",
        },
        { expiresIn: "1h" }
      );

      return {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      };
    },
  });
}
