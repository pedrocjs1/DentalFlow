import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

type CampaignType =
  | "MANUAL"
  | "BIRTHDAY"
  | "REMINDER_6M"
  | "REMINDER_24H"
  | "REACTIVATION"
  | "PROMO"
  | "WELCOME"
  | "POST_VISIT"
  | "CUSTOM";

type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED";

type Channel = "WHATSAPP" | "EMAIL" | "WEB_CHAT" | "SMS";
type TriggerType = "DATE_FIELD" | "EVENT" | "TIME_AFTER_EVENT" | "CRON";

interface SegmentFilter {
  tags?: string[];
  lastVisitMoreThanMonths?: number;
  lastVisitLessThanMonths?: number;
  pipelineStageId?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: string;
}

// ─── Default campaigns created for every new tenant ───────────────────────────

const CAMPAIGN_DEFAULTS: Array<{
  name: string;
  type: CampaignType;
  channel: Channel;
  messageContent: string;
  triggerType: TriggerType;
  triggerConfig: object;
}> = [
  {
    name: "Recordatorio de Cita 24h",
    type: "REMINDER_24H",
    channel: "WHATSAPP",
    messageContent:
      "¡Hola {nombre}! 📅 Te recordamos tu cita mañana en *{clinica}*. Si necesitás reprogramar, escribinos. ¡Te esperamos! 😊",
    triggerType: "TIME_AFTER_EVENT",
    triggerConfig: {
      event: "appointment_created",
      offsetHours: -24,
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
  {
    name: "Feliz Cumpleaños + 15% Descuento",
    type: "BIRTHDAY",
    channel: "WHATSAPP",
    messageContent:
      "¡Feliz cumpleaños {nombre}! 🎂🦷 En *{clinica}* te regalamos un *15% de descuento* en tu próxima consulta. ¡Válido por 30 días! Escribinos para reservar tu turno.",
    triggerType: "DATE_FIELD",
    triggerConfig: {
      field: "birthdate",
      daysBefore: 0,
      allowedHoursStart: 10,
      allowedHoursEnd: 18,
    },
  },
  {
    name: "Recordatorio Control 6 Meses",
    type: "REMINDER_6M",
    channel: "WHATSAPP",
    messageContent:
      "¡Hola {nombre}! 😊 Han pasado 6 meses desde tu última visita a *{clinica}*. ¿Agendamos tu control? Tu salud bucal es nuestra prioridad. ¡Escribinos!",
    triggerType: "TIME_AFTER_EVENT",
    triggerConfig: {
      event: "appointment_completed",
      offsetMonths: 6,
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
  {
    name: "Promo 2x1 Limpieza",
    type: "PROMO",
    channel: "WHATSAPP",
    messageContent:
      "¡Hola {nombre}! 🦷✨ Promo especial en *{clinica}*: ¡2x1 en limpieza dental! Venís con un familiar o amigo y los dos pagan uno. ¿Te interesa? ¡Cupos limitados!",
    triggerType: "CRON",
    triggerConfig: {
      schedule: "manual",
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
  {
    name: "Bienvenida Nuevo Paciente",
    type: "WELCOME",
    channel: "WHATSAPP",
    messageContent:
      "¡Bienvenido/a a *{clinica}*, {nombre}! 😊🦷 Estamos muy felices de tenerte como paciente. Cualquier consulta, escribinos. ¡Nos vemos pronto!",
    triggerType: "EVENT",
    triggerConfig: {
      event: "patient_created",
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
  {
    name: "Reactivación de Inactivos (12 meses)",
    type: "REACTIVATION",
    channel: "WHATSAPP",
    messageContent:
      "¡Hola {nombre}! 😊 Hace tiempo que no sabemos de vos en *{clinica}*. ¿Cómo estás? ¿Te gustaría agendar un control? Tu sonrisa nos importa 🦷",
    triggerType: "CRON",
    triggerConfig: {
      schedule: "manual",
      inactiveMonths: 12,
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
  {
    name: "Agradecimiento Post-Visita",
    type: "POST_VISIT",
    channel: "WHATSAPP",
    messageContent:
      "¡Gracias por visitarnos, {nombre}! 😊 Esperamos que tu cita en *{clinica}* haya sido de tu agrado. Si tenés alguna consulta o molestia, escribinos. ¡Hasta pronto! 🦷",
    triggerType: "TIME_AFTER_EVENT",
    triggerConfig: {
      event: "appointment_completed",
      offsetHours: 2,
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
  {
    name: "Encuesta de Satisfacción",
    type: "CUSTOM",
    channel: "WHATSAPP",
    messageContent:
      "¡Hola {nombre}! 🌟 ¿Cómo calificarías tu experiencia en *{clinica}*? Tu opinión nos ayuda a mejorar 😊 Respondé del 1 al 5, ¡muchas gracias!",
    triggerType: "TIME_AFTER_EVENT",
    triggerConfig: {
      event: "appointment_completed",
      offsetHours: 24,
      allowedHoursStart: 9,
      allowedHoursEnd: 20,
    },
  },
];

// ─── Segment filter builder ────────────────────────────────────────────────────

function buildPatientWhere(tenantId: string, filter: SegmentFilter) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { tenantId, isActive: true };

  if (filter.tags && filter.tags.length > 0) {
    where.tags = { hasSome: filter.tags };
  }

  const lastVisitFilter: Record<string, Date> = {};
  if (filter.lastVisitMoreThanMonths) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - filter.lastVisitMoreThanMonths);
    lastVisitFilter.lt = cutoff;
  }
  if (filter.lastVisitLessThanMonths) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - filter.lastVisitLessThanMonths);
    lastVisitFilter.gt = cutoff;
  }
  if (Object.keys(lastVisitFilter).length > 0) {
    where.lastVisitAt = lastVisitFilter;
  }

  // Patient has a single pipelineEntry (one-to-one)
  if (filter.pipelineStageId) {
    where.pipelineEntry = { pipelineStageId: filter.pipelineStageId };
  }

  // Field is "birthdate" (lowercase d) in Prisma schema
  const birthdateFilter: Record<string, Date> = {};
  if (filter.ageMin) {
    const maxBirth = new Date();
    maxBirth.setFullYear(maxBirth.getFullYear() - filter.ageMin);
    birthdateFilter.lte = maxBirth;
  }
  if (filter.ageMax) {
    const minBirth = new Date();
    minBirth.setFullYear(minBirth.getFullYear() - filter.ageMax - 1);
    birthdateFilter.gte = minBirth;
  }
  if (Object.keys(birthdateFilter).length > 0) {
    where.birthdate = birthdateFilter;
  }

  if (filter.gender) {
    where.gender = filter.gender;
  }

  return where;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET /api/v1/campaigns — list campaigns with optional filters
  app.get("/api/v1/campaigns", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { status?: string; type?: string };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = { tenantId: user.tenantId };
      if (query.status) where.status = query.status;
      if (query.type) where.type = query.type;

      const campaigns = await prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { sends: true } },
        },
      });

      return campaigns;
    },
  });

  // GET /api/v1/campaigns/segment-count — count patients matching segment filter
  // Must be registered BEFORE /:id to avoid route conflict
  app.get("/api/v1/campaigns/segment-count", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as Record<string, string>;

      const filter: SegmentFilter = {};
      if (query.tags) filter.tags = query.tags.split(",").filter(Boolean);
      if (query.lastVisitMoreThanMonths)
        filter.lastVisitMoreThanMonths = Number(query.lastVisitMoreThanMonths);
      if (query.lastVisitLessThanMonths)
        filter.lastVisitLessThanMonths = Number(query.lastVisitLessThanMonths);
      if (query.pipelineStageId) filter.pipelineStageId = query.pipelineStageId;
      if (query.ageMin) filter.ageMin = Number(query.ageMin);
      if (query.ageMax) filter.ageMax = Number(query.ageMax);
      if (query.gender) filter.gender = query.gender;

      const where = buildPatientWhere(user.tenantId, filter);
      const count = await prisma.patient.count({ where });
      return { count };
    },
  });

  // POST /api/v1/campaigns/setup-defaults — seed the 8 default campaigns for this tenant
  // Idempotent: deduplicates existing same-name campaigns, then creates any missing ones.
  // Must be registered BEFORE /:id
  app.post("/api/v1/campaigns/setup-defaults", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };

      let deduplicated = 0;
      const created = [];

      for (const template of CAMPAIGN_DEFAULTS) {
        // Check by TYPE (not name) so seed-created campaigns with different names
        // don't cause duplicates when setup-defaults is called again.
        const sameTypeCampaigns = await prisma.campaign.findMany({
          where: { tenantId: user.tenantId, type: template.type },
          orderBy: { createdAt: "asc" }, // keep the oldest (first created)
        });

        if (sameTypeCampaigns.length > 1) {
          // Remove duplicates, keep only the oldest
          const toDelete = sameTypeCampaigns.slice(1).map((c) => c.id);
          await prisma.campaign.deleteMany({ where: { id: { in: toDelete } } });
          deduplicated += toDelete.length;
        }

        // Create if no campaign of this type exists at all
        if (sameTypeCampaigns.length === 0) {
          const campaign = await prisma.campaign.create({
            data: {
              tenantId: user.tenantId,
              name: template.name,
              type: template.type,
              channel: template.channel,
              messageContent: template.messageContent,
              triggerType: template.triggerType,
              triggerConfig: template.triggerConfig,
              status: "DRAFT",
            },
          });
          created.push(campaign);
        }
      }

      return reply.status(201).send({
        created: created.length,
        deduplicated,
        campaigns: created,
      });
    },
  });

  // GET /api/v1/campaigns/:id — get single campaign with send stats
  app.get("/api/v1/campaigns/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const campaign = await prisma.campaign.findFirst({
        where: { id, tenantId: user.tenantId },
        include: { _count: { select: { sends: true } } },
      });

      if (!campaign)
        throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campaña no encontrada");

      const sendStats = await prisma.campaignSend.groupBy({
        by: ["status"],
        where: { campaignId: id },
        _count: { id: true },
      });

      const statsByStatus: Record<string, number> = {};
      for (const s of sendStats) {
        statsByStatus[s.status] = s._count.id;
      }

      return { ...campaign, statsByStatus };
    },
  });

  // POST /api/v1/campaigns — create a new campaign
  app.post("/api/v1/campaigns", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        name: string;
        type: CampaignType;
        channel?: Channel;
        messageContent?: string;
        subject?: string;
        segmentFilter?: unknown;
        triggerType?: TriggerType;
        triggerConfig?: unknown;
        scheduledAt?: string;
      };

      if (!body.name?.trim())
        throw new AppError(400, "INVALID_INPUT", "El nombre es requerido");
      if (!body.type)
        throw new AppError(400, "INVALID_INPUT", "El tipo es requerido");

      const determinedStatus: CampaignStatus = body.scheduledAt
        ? "SCHEDULED"
        : "DRAFT";

      const campaign = await prisma.campaign.create({
        data: {
          tenantId: user.tenantId,
          name: body.name.trim(),
          type: body.type,
          channel: body.channel ?? "WHATSAPP",
          messageContent: body.messageContent,
          subject: body.subject,
          segmentFilter: (body.segmentFilter as object) ?? undefined,
          triggerType: body.triggerType,
          triggerConfig: (body.triggerConfig as object) ?? undefined,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          status: determinedStatus,
        },
      });

      return reply.status(201).send(campaign);
    },
  });

  // PATCH /api/v1/campaigns/:id — update campaign fields
  app.patch("/api/v1/campaigns/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        channel?: Channel;
        messageContent?: string;
        subject?: string;
        segmentFilter?: unknown;
        triggerType?: TriggerType;
        triggerConfig?: unknown;
        scheduledAt?: string | null;
        status?: CampaignStatus;
      };

      const existing = await prisma.campaign.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!existing)
        throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campaña no encontrada");

      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name.trim() }),
          ...(body.channel !== undefined && { channel: body.channel }),
          ...(body.messageContent !== undefined && {
            messageContent: body.messageContent,
          }),
          ...(body.subject !== undefined && { subject: body.subject }),
          ...(body.segmentFilter !== undefined && {
            segmentFilter: body.segmentFilter as object,
          }),
          ...(body.triggerType !== undefined && { triggerType: body.triggerType }),
          ...(body.triggerConfig !== undefined && {
            triggerConfig: body.triggerConfig as object,
          }),
          ...(body.scheduledAt !== undefined && {
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          }),
          ...(body.status !== undefined && { status: body.status }),
        },
      });

      return updated;
    },
  });

  // DELETE /api/v1/campaigns/:id — delete campaign and all its sends
  app.delete("/api/v1/campaigns/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.campaign.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!existing)
        throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campaña no encontrada");

      await prisma.campaign.delete({ where: { id } });
      return reply.status(204).send();
    },
  });

  // POST /api/v1/campaigns/:id/duplicate — clone a campaign as a new DRAFT
  app.post("/api/v1/campaigns/:id/duplicate", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const original = await prisma.campaign.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!original)
        throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campaña no encontrada");

      const duplicate = await prisma.campaign.create({
        data: {
          tenantId: user.tenantId,
          name: `${original.name} (copia)`,
          type: original.type,
          channel: original.channel,
          status: "DRAFT",
          messageContent: original.messageContent,
          subject: original.subject,
          segmentFilter: (original.segmentFilter as object) ?? undefined,
          triggerType: original.triggerType ?? undefined,
          triggerConfig: (original.triggerConfig as object) ?? undefined,
        },
      });

      return reply.status(201).send(duplicate);
    },
  });

  // GET /api/v1/campaigns/:id/sends — paginated sends list with patient info
  app.get("/api/v1/campaigns/:id/sends", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const query = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const campaign = await prisma.campaign.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!campaign)
        throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campaña no encontrada");

      const page = Math.max(1, Number(query.page ?? 1));
      const limit = Math.min(100, Number(query.limit ?? 50));
      const skip = (page - 1) * limit;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = { campaignId: id };
      if (query.status) where.status = query.status;

      const [sends, total] = await Promise.all([
        prisma.campaignSend.findMany({
          where,
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
          orderBy: [{ sentAt: "desc" }, { id: "asc" }],
          skip,
          take: limit,
        }),
        prisma.campaignSend.count({ where }),
      ]);

      return {
        sends,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    },
  });

  // POST /api/v1/campaigns/:id/retry-failed — reset FAILED sends back to PENDING
  app.post("/api/v1/campaigns/:id/retry-failed", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const campaign = await prisma.campaign.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!campaign)
        throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campaña no encontrada");

      const result = await prisma.campaignSend.updateMany({
        where: { campaignId: id, status: "FAILED" },
        data: { status: "PENDING", errorMessage: null },
      });

      return { retried: result.count };
    },
  });
}
