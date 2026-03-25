import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@dentalflow/db";
import { AppError } from "../../errors/app-error.js";
import { logSecurityEvent } from "../../services/security-logger.js";

// Default 8 pipeline stages
const DEFAULT_STAGES = [
  { order: 1, name: "Nuevo Contacto", color: "#6B7280", isDefault: true },
  { order: 2, name: "Interesado - No Agendó", color: "#F59E0B" },
  { order: 3, name: "Primera Cita Agendada", color: "#3B82F6" },
  { order: 4, name: "En Tratamiento", color: "#10B981" },
  { order: 5, name: "Seguimiento", color: "#06B6D4" },
  { order: 6, name: "Paciente Fidelizado", color: "#8B5CF6" },
  { order: 7, name: "Remarketing", color: "#F97316" },
  { order: 8, name: "Inactivo", color: "#EF4444" },
];

const DEFAULT_TREATMENTS = [
  { name: "Limpieza dental", durationMin: 45, price: 5000, followUpEnabled: true, followUpMonths: 6 },
  { name: "Consulta general", durationMin: 30, price: 3000, followUpEnabled: true, followUpMonths: 12 },
  { name: "Extracción", durationMin: 60, price: 8000, postProcedureCheck: true, postProcedureDays: 7 },
  { name: "Ortodoncia - control", durationMin: 30, price: 4000, isMultiSession: true },
  { name: "Blanqueamiento", durationMin: 90, price: 15000 },
];

const COUNTRY_TIMEZONES: Record<string, string> = {
  AR: "America/Argentina/Buenos_Aires",
  CL: "America/Santiago",
  CO: "America/Bogota",
  MX: "America/Mexico_City",
  UY: "America/Montevideo",
  BR: "America/Sao_Paulo",
  EC: "America/Guayaquil",
  PY: "America/Asuncion",
  BO: "America/La_Paz",
  PE: "America/Lima",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/v1/auth/register", {
    schema: {
      body: {
        type: "object",
        required: ["clinicName", "country", "ownerName", "email", "password"],
        properties: {
          clinicName: { type: "string", minLength: 2, maxLength: 100 },
          country: { type: "string", minLength: 2, maxLength: 5 },
          city: { type: "string", maxLength: 100 },
          phone: { type: "string", maxLength: 30 },
          ownerName: { type: "string", minLength: 2, maxLength: 100 },
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 8, maxLength: 128 },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        clinicName: string;
        country: string;
        city?: string;
        phone?: string;
        ownerName: string;
        email: string;
        password: string;
      };

      const email = body.email.trim().toLowerCase();
      const ip = request.ip;

      // Check if email already exists
      const existingUser = await prisma.user.findFirst({ where: { email } });
      if (existingUser) {
        throw new AppError(409, "EMAIL_TAKEN", "Ya existe una cuenta con ese email");
      }

      // Generate unique slug
      let slug = slugify(body.clinicName);
      const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }

      const passwordHash = await bcrypt.hash(body.password, 12);
      const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const countryCode = body.country.toUpperCase();
      const timezone = COUNTRY_TIMEZONES[countryCode] ?? "America/Argentina/Buenos_Aires";

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: body.clinicName.trim(),
            slug,
            plan: "STARTER",
            phone: body.phone?.trim() || null,
            country: countryCode,
            city: body.city?.trim() || null,
            timezone,
            subscriptionStatus: "TRIALING",
            trialEndsAt: trialEndDate,
          },
        });

        // 2. Create owner user
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            name: body.ownerName.trim(),
            passwordHash,
            role: "OWNER",
          },
        });

        // 3. Create subscription
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            plan: "STARTER",
            status: "TRIALING",
            trialStartDate: new Date(),
            trialEndDate,
            paymentMethod: "pending",
          },
        });

        // 4. Create working hours (M-F 9-18, Sat 9-13)
        for (const h of [
          { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 6, startTime: "09:00", endTime: "13:00" },
        ]) {
          await tx.workingHours.create({ data: { tenantId: tenant.id, ...h } });
        }

        // 5. Create default pipeline stages
        for (const stage of DEFAULT_STAGES) {
          await tx.pipelineStage.create({ data: { tenantId: tenant.id, ...stage } });
        }

        // 6. Create default treatments
        for (const t of DEFAULT_TREATMENTS) {
          await tx.treatmentType.create({ data: { tenantId: tenant.id, ...t } });
        }

        return { tenant, user };
      });

      await logSecurityEvent({
        type: "LOGIN_ATTEMPT",
        ip,
        email,
        userId: result.user.id,
        tenantId: result.tenant.id,
        endpoint: "/api/v1/auth/register",
        details: `New clinic registered: ${body.clinicName}`,
        success: true,
        severity: "LOW",
      });

      // Auto-login: issue JWT
      const token = app.jwt.sign({
        sub: result.user.id,
        tenantId: result.tenant.id,
        role: "OWNER",
        email,
        name: body.ownerName.trim(),
      });

      return reply.status(201).send({
        token,
        user: {
          id: result.user.id,
          email,
          name: body.ownerName.trim(),
          role: "OWNER",
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            plan: result.tenant.plan,
            subscriptionStatus: "TRIALING",
          },
        },
      });
    },
  });
}
