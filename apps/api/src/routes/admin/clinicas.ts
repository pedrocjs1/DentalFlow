import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@dentiqa/db";
import { adminMiddleware } from "../../middleware/admin-middleware.js";
import { AppError } from "../../errors/app-error.js";

// Default 8 pipeline stages
const DEFAULT_STAGES = [
  { order: 1, name: "Nuevo Contacto", color: "#6B7280", isDefault: true, autoMessageEnabled: true, autoMessageDelayHours: 1, autoMessageTemplate: "Hola {nombre}! Gracias por contactarnos. ¿En qué podemos ayudarte?" },
  { order: 2, name: "Interesado - No Agendó", color: "#F59E0B", autoMessageEnabled: true, autoMessageDelayHours: 5, autoMessageTemplate: "Hola {nombre}! ¿Te gustaría agendar tu cita? Tenemos horarios disponibles." },
  { order: 3, name: "Primera Cita Agendada", color: "#3B82F6", autoMessageEnabled: true, autoMessageDelayHours: 24, autoMessageTemplate: "Hola {nombre}! Te recordamos tu cita mañana. ¿Confirmás tu asistencia?" },
  { order: 4, name: "En Tratamiento", color: "#10B981" },
  { order: 5, name: "Seguimiento", color: "#06B6D4", autoMessageEnabled: true, autoMessageDelayHours: 4320, autoMessageTemplate: "Hola {nombre}! Ya pasaron 6 meses desde tu último tratamiento. ¿Agendamos tu control?" },
  { order: 6, name: "Paciente Fidelizado", color: "#8B5CF6" },
  { order: 7, name: "Remarketing", color: "#F97316", autoMessageEnabled: true, autoMessageDelayHours: 168, discountEnabled: true, discountPercent: 10, discountMessage: "Descuento especial del 10% en tu próximo tratamiento." },
  { order: 8, name: "Inactivo", color: "#EF4444" },
];

// Default 5 treatments
const DEFAULT_TREATMENTS = [
  { name: "Limpieza dental", durationMin: 45, price: 5000, followUpEnabled: true, followUpMonths: 6 },
  { name: "Consulta general", durationMin: 30, price: 3000, followUpEnabled: true, followUpMonths: 12 },
  { name: "Extracción", durationMin: 60, price: 8000, followUpEnabled: true, followUpMonths: 12, postProcedureCheck: true, postProcedureDays: 7 },
  { name: "Ortodoncia - control", durationMin: 30, price: 4000, followUpEnabled: true, followUpMonths: 1, isMultiSession: true },
  { name: "Blanqueamiento", durationMin: 90, price: 15000, followUpEnabled: true, followUpMonths: 12 },
];

function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-()]/g, "");
  if (!p.startsWith("+")) {
    // Assume Argentina if no country code
    if (p.startsWith("0")) p = p.slice(1);
    p = "+54" + p;
  }
  return p;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function adminClinicaRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [adminMiddleware];

  // ─── POST /api/v1/admin/clinicas/crear — Full clinic creation wizard ─────────
  app.post("/api/v1/admin/clinicas/crear", {
    preHandler,
    handler: async (request, reply) => {
      const body = request.body as {
        // Step 1: clinic data
        name: string;
        slug?: string;
        address?: string;
        phone?: string;
        email?: string;
        timezone?: string;
        // Step 2: plan
        plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
        subscriptionStatus?: string;
        trialDays?: number;
        paymentMethod?: string;
        billingNotes?: string;
        // Step 3: admin user
        adminName: string;
        adminEmail: string;
        adminPassword: string;
        // Step 4: config
        workingHours?: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>;
        botTone?: string;
        botLanguage?: string;
        messageDebounceSeconds?: number;
        createDefaultStages?: boolean;
        createDefaultTreatments?: boolean;
      };

      // Validation
      if (!body.name?.trim()) throw new AppError(400, "INVALID_INPUT", "El nombre de la clínica es obligatorio");
      if (!body.adminEmail?.trim()) throw new AppError(400, "INVALID_INPUT", "El email del administrador es obligatorio");
      if (!body.adminPassword || body.adminPassword.length < 6) throw new AppError(400, "INVALID_INPUT", "La contraseña debe tener al menos 6 caracteres");
      if (!body.plan) throw new AppError(400, "INVALID_INPUT", "El plan es obligatorio");

      const slug = body.slug?.trim().toLowerCase() || slugify(body.name);

      // Check slug uniqueness
      const existing = await prisma.tenant.findUnique({ where: { slug } });
      if (existing) throw new AppError(409, "SLUG_TAKEN", `El slug "${slug}" ya está en uso`);

      // Check email uniqueness across all tenants
      const existingEmail = await prisma.user.findFirst({ where: { email: body.adminEmail.trim().toLowerCase() } });
      if (existingEmail) throw new AppError(409, "EMAIL_TAKEN", "Ya existe un usuario con ese email");

      const passwordHash = await bcrypt.hash(body.adminPassword, 12);
      const trialDays = body.trialDays ?? 14;
      const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

      // Create tenant + admin user + subscription in transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: body.name.trim(),
            slug,
            plan: body.plan,
            address: body.address?.trim() || null,
            phone: body.phone?.trim() || null,
            email: body.email?.trim() || null,
            timezone: body.timezone || "America/Argentina/Buenos_Aires",
            subscriptionStatus: (body.subscriptionStatus as "TRIALING" | "ACTIVE") ?? "TRIALING",
            trialEndsAt: trialEndDate,
            botTone: body.botTone || "friendly",
            botLanguage: body.botLanguage || "es",
            messageDebounceSeconds: body.messageDebounceSeconds || 12,
          },
        });

        // 2. Create admin user (OWNER)
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: body.adminEmail.trim().toLowerCase(),
            name: body.adminName?.trim() || body.adminEmail.split("@")[0],
            passwordHash,
            role: "OWNER",
          },
        });

        // 3. Create subscription
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            plan: body.plan,
            status: body.subscriptionStatus || "TRIALING",
            trialStartDate: new Date(),
            trialEndDate,
            paymentMethod: body.paymentMethod || "pending",
            billingNotes: body.billingNotes || null,
          },
        });

        // 4. Create working hours
        const hours = body.workingHours ?? [
          { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isActive: true },
          { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isActive: true },
          { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isActive: true },
          { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isActive: true },
          { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isActive: true },
          { dayOfWeek: 6, startTime: "09:00", endTime: "13:00", isActive: true },
          { dayOfWeek: 0, startTime: "09:00", endTime: "13:00", isActive: false },
        ];

        for (const h of hours) {
          if (h.isActive) {
            await tx.workingHours.create({
              data: {
                tenantId: tenant.id,
                dayOfWeek: h.dayOfWeek,
                startTime: h.startTime,
                endTime: h.endTime,
              },
            });
          }
        }

        // 5. Create default pipeline stages (if selected)
        if (body.createDefaultStages !== false) {
          for (const stage of DEFAULT_STAGES) {
            await tx.pipelineStage.create({
              data: { tenantId: tenant.id, ...stage },
            });
          }
        }

        // 6. Create default treatments (if selected)
        if (body.createDefaultTreatments !== false) {
          for (const treatment of DEFAULT_TREATMENTS) {
            await tx.treatmentType.create({
              data: { tenantId: tenant.id, ...treatment },
            });
          }
        }

        return { tenant, user };
      });

      app.log.info(`Clínica "${body.name}" creada por Super Admin`);

      return reply.status(201).send({
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          plan: result.tenant.plan,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        credentials: {
          email: result.user.email,
          password: body.adminPassword,
        },
      });
    },
  });

  // ─── POST /api/v1/admin/clinicas/:tenantId/import-patients ──────────────────
  app.post("/api/v1/admin/clinicas/:tenantId/import-patients", {
    preHandler,
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      const body = request.body as {
        patients: Array<{
          firstName: string;
          lastName: string;
          phone: string;
          email?: string;
          birthdate?: string;
          insurance?: string;
          address?: string;
          notes?: string;
        }>;
      };

      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new AppError(404, "NOT_FOUND", "Clínica no encontrada");

      if (!Array.isArray(body.patients) || body.patients.length === 0) {
        throw new AppError(400, "INVALID_INPUT", "No se recibieron pacientes para importar");
      }

      // Get "Nuevo Contacto" stage for pipeline
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: { tenantId, isDefault: true },
        select: { id: true },
      });

      let imported = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (let idx = 0; idx < body.patients.length; idx++) {
        const p = body.patients[idx];
        try {
          if (!p.firstName?.trim() || !p.phone?.trim()) {
            skipped++;
            continue;
          }

          let phone: string;
          try {
            phone = normalizePhone(p.phone);
          } catch {
            errorDetails.push(`Fila ${idx + 1}: teléfono inválido "${p.phone}"`);
            errors++;
            continue;
          }

          // Validate phone has at least some digits
          if (phone.replace(/\D/g, "").length < 6) {
            errorDetails.push(`Fila ${idx + 1}: teléfono muy corto "${p.phone}"`);
            skipped++;
            continue;
          }

          // Check for duplicate by phone within tenant
          const existing = await prisma.patient.findFirst({
            where: { tenantId, phone },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Parse birthdate safely
          let birthdate: Date | null = null;
          if (p.birthdate?.trim()) {
            const parsed = new Date(p.birthdate.trim());
            if (!isNaN(parsed.getTime())) {
              birthdate = parsed;
            }
          }

          const patient = await prisma.patient.create({
            data: {
              tenantId,
              firstName: p.firstName.trim(),
              lastName: (p.lastName ?? "").trim(),
              phone,
              email: p.email?.trim() || null,
              birthdate,
              insurance: p.insurance?.trim() || null,
              address: p.address?.trim() || null,
              notes: p.notes?.trim() || null,
              source: "DENTALINK",
            },
          });

          // Add to pipeline "Nuevo Contacto"
          if (defaultStage) {
            await prisma.patientPipeline.create({
              data: {
                patientId: patient.id,
                stageId: defaultStage.id,
              },
            }).catch(() => {
              // Ignore if pipeline entry already exists
            });
          }

          imported++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          const shortMsg = msg.length > 120 ? msg.slice(0, 120) + "..." : msg;
          errorDetails.push(`Fila ${idx + 1} (${p.firstName ?? "?"} ${p.phone ?? "?"}): ${shortMsg}`);
          app.log.warn(`Import patient error row ${idx + 1}: ${msg}`);
          errors++;
        }
      }

      return { imported, skipped, errors, total: body.patients.length, errorDetails };
    },
  });

  // ─── GET /api/v1/admin/clinicas/:tenantId/subscription — Get subscription ────
  app.get("/api/v1/admin/clinicas/:tenantId/subscription", {
    preHandler,
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };

      const subscription = await prisma.subscription.findUnique({
        where: { tenantId },
      });

      return { subscription };
    },
  });

  // ─── PATCH /api/v1/admin/clinicas/:tenantId/subscription — Update subscription
  app.patch("/api/v1/admin/clinicas/:tenantId/subscription", {
    preHandler,
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      const body = request.body as {
        plan?: string;
        status?: string;
        paymentMethod?: string;
        billingNotes?: string;
        trialEndDate?: string;
      };

      // Verify tenant exists
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new AppError(404, "NOT_FOUND", "Clínica no encontrada");

      // Upsert subscription
      const subscription = await prisma.subscription.upsert({
        where: { tenantId },
        update: {
          ...(body.plan && { plan: body.plan }),
          ...(body.status && { status: body.status }),
          ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod }),
          ...(body.billingNotes !== undefined && { billingNotes: body.billingNotes }),
          ...(body.trialEndDate && { trialEndDate: new Date(body.trialEndDate) }),
          ...(body.status === "CANCELLED" && { cancelledAt: new Date() }),
        },
        create: {
          tenantId,
          plan: body.plan || tenant.plan,
          status: body.status || tenant.subscriptionStatus,
          paymentMethod: body.paymentMethod || "pending",
          billingNotes: body.billingNotes || null,
          trialEndDate: body.trialEndDate ? new Date(body.trialEndDate) : tenant.trialEndsAt,
        },
      });

      // Also sync plan and status to the tenant
      if (body.plan || body.status) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            ...(body.plan && { plan: body.plan as "STARTER" | "PROFESSIONAL" | "ENTERPRISE" }),
            ...(body.status && { subscriptionStatus: body.status as "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED" }),
          },
        });
      }

      return { subscription };
    },
  });

  // ─── GET /api/v1/admin/clinicas/:tenantId/patients — List patients for admin ──
  app.get("/api/v1/admin/clinicas/:tenantId/patients", {
    preHandler,
    handler: async (request) => {
      const { tenantId } = request.params as { tenantId: string };
      const query = request.query as { search?: string };

      const where: Record<string, unknown> = { tenantId };
      if (query.search) {
        where.OR = [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
          { email: { contains: query.search, mode: "insensitive" } },
        ];
      }

      const patients = await prisma.patient.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      return { patients, total: patients.length };
    },
  });
}
