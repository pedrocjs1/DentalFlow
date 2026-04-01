import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { sendHumanMessageViaWhatsApp, sendTemplateViaWhatsApp } from "../../services/whatsapp-processor.js";

type ConversationStatus = "OPEN" | "AI_HANDLING" | "HUMAN_NEEDED" | "CLOSED";
type Channel = "WHATSAPP" | "EMAIL" | "WEB_CHAT" | "SMS";

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function isWindowOpen(lastPatientMessageAt: Date | null): boolean {
  if (!lastPatientMessageAt) return false;
  return Date.now() - lastPatientMessageAt.getTime() < WHATSAPP_WINDOW_MS;
}

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // ─── GET /api/v1/conversations ─────────────────────────────────────────────
  // List conversations with search + status filter + unread count
  app.get("/api/v1/conversations", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { status?: string; search?: string };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: Record<string, any> = { tenantId: user.tenantId };
      if (query.status) where.status = query.status;

      if (query.search) {
        where.patient = {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search } },
          ],
        };
      }

      const [conversations, unreadGroups] = await Promise.all([
        prisma.conversation.findMany({
          where,
          orderBy: { lastMessageAt: "desc" },
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true, phone: true, tags: true },
            },
          },
        }),
        // Count unread (INBOUND + readAt null) per conversation for this tenant
        prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversation: { tenantId: user.tenantId },
            direction: "INBOUND",
            readAt: null,
          },
          _count: { id: true },
        }),
      ]);

      const unreadMap = new Map(
        unreadGroups.map((g) => [g.conversationId, g._count.id])
      );

      return conversations.map((c) => ({
        ...c,
        unreadCount: unreadMap.get(c.id) ?? 0,
      }));
    },
  });

  // ─── GET /api/v1/conversations/:id ────────────────────────────────────────
  // Single conversation with full patient info and next appointment
  app.get("/api/v1/conversations/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const conv = await prisma.conversation.findFirst({
        where: { id, tenantId: user.tenantId },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              tags: true,
              pipelineEntry: {
                select: {
                  stageId: true,
                  stage: { select: { id: true, name: true, color: true } },
                },
              },
            },
          },
        },
      });

      if (!conv) throw new AppError(404, "CONV_NOT_FOUND", "Conversación no encontrada");

      // Next upcoming appointment for this patient
      const nextAppointment = await prisma.appointment.findFirst({
        where: {
          patientId: conv.patientId,
          tenantId: user.tenantId,
          startTime: { gte: new Date() },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          status: true,
          treatmentType: { select: { name: true } },
          dentist: { select: { name: true } },
        },
      });

      return {
        ...conv,
        nextAppointment,
        windowOpen: isWindowOpen(conv.lastPatientMessageAt),
      };
    },
  });

  // ─── GET /api/v1/conversations/:id/messages ───────────────────────────────
  // Paginated messages — also marks INBOUND messages as read
  app.get("/api/v1/conversations/:id/messages", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const query = request.query as { page?: string; limit?: string };

      const conv = await prisma.conversation.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!conv) throw new AppError(404, "CONV_NOT_FOUND", "Conversación no encontrada");

      const limit = Math.min(100, Number(query.limit ?? 50));
      const page = Math.max(1, Number(query.page ?? 1));
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { conversationId: id },
          orderBy: { sentAt: "asc" },
          skip,
          take: limit,
        }),
        prisma.message.count({ where: { conversationId: id } }),
      ]);

      // Mark unread INBOUND messages as read (side effect)
      await prisma.message.updateMany({
        where: { conversationId: id, direction: "INBOUND", readAt: null },
        data: { readAt: new Date() },
      });

      return { messages, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  });

  // ─── POST /api/v1/conversations ───────────────────────────────────────────
  // Create or return existing open conversation for a patient
  app.post("/api/v1/conversations", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as { patientId: string; channel?: Channel };

      if (!body.patientId)
        throw new AppError(400, "INVALID_INPUT", "patientId es requerido");

      const patient = await prisma.patient.findFirst({
        where: { id: body.patientId, tenantId: user.tenantId },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      // Return existing open conversation if one exists
      const existing = await prisma.conversation.findFirst({
        where: {
          patientId: body.patientId,
          tenantId: user.tenantId,
          status: { not: "CLOSED" },
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, tags: true },
          },
        },
      });

      if (existing) return existing;

      const conv = await prisma.conversation.create({
        data: {
          tenantId: user.tenantId,
          patientId: body.patientId,
          channel: body.channel ?? "WHATSAPP",
          status: "OPEN",
          aiEnabled: true,
          lastMessageAt: new Date(),
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, tags: true },
          },
        },
      });

      return reply.status(201).send(conv);
    },
  });

  // ─── POST /api/v1/conversations/:id/messages ──────────────────────────────
  // Send a manual (human) message in a conversation
  // Supports type: "text" (default) and type: "template"
  app.post("/api/v1/conversations/:id/messages", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        content: string;
        type?: string;
        templateId?: string;
        templateName?: string;
        templateComponents?: unknown[];
      };

      const isTemplate = body.type === "template";

      if (!isTemplate && !body.content?.trim())
        throw new AppError(400, "INVALID_INPUT", "El contenido del mensaje es requerido");

      if (isTemplate && !body.templateId)
        throw new AppError(400, "INVALID_INPUT", "templateId es requerido para enviar templates");

      const conv = await prisma.conversation.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!conv) throw new AppError(404, "CONV_NOT_FOUND", "Conversación no encontrada");
      if (conv.status === "CLOSED")
        throw new AppError(400, "CONV_CLOSED", "No se puede enviar mensajes a una conversación cerrada");

      // 24h window check for TEXT messages (templates can always be sent)
      if (!isTemplate && conv.channel === "WHATSAPP" && !isWindowOpen(conv.lastPatientMessageAt)) {
        throw new AppError(
          403,
          "WINDOW_CLOSED",
          "La ventana de 24 horas está cerrada. Solo podés enviar templates aprobados."
        );
      }

      const now = new Date();
      const messageContent = isTemplate
        ? `[Template: ${body.templateName ?? body.templateId}]`
        : body.content.trim();

      const [message] = await Promise.all([
        prisma.message.create({
          data: {
            conversationId: id,
            direction: "OUTBOUND",
            type: isTemplate ? "TEMPLATE" : "TEXT",
            content: messageContent,
            metadata: {
              sentBy: "human",
              ...(isTemplate ? { templateId: body.templateId, templateName: body.templateName } : {}),
            },
            sentAt: now,
          },
        }),
        // Update last message info on conversation
        prisma.conversation.update({
          where: { id },
          data: {
            lastMessageAt: now,
            lastMessagePreview: messageContent.slice(0, 100),
            // If AI was handling and human sends, switch to OPEN to reflect human takeover
            status: conv.status === "AI_HANDLING" ? "OPEN" : conv.status,
          },
        }),
      ]);

      // Send via WhatsApp in background (don't block the API response)
      if (conv.channel === "WHATSAPP") {
        if (isTemplate) {
          sendTemplateViaWhatsApp(id, body.templateId!, body.templateComponents, request.log)
            .then((waMessageId) => {
              if (waMessageId) {
                prisma.message.update({
                  where: { id: message.id },
                  data: { whatsappMessageId: waMessageId },
                }).catch(() => {});
              }
            })
            .catch(() => {});
        } else {
          sendHumanMessageViaWhatsApp(id, body.content.trim(), request.log)
            .then((waMessageId) => {
              if (waMessageId) {
                prisma.message.update({
                  where: { id: message.id },
                  data: { whatsappMessageId: waMessageId },
                }).catch(() => {});
              }
            })
            .catch(() => {});
        }
      }

      return reply.status(201).send(message);
    },
  });

  // ─── GET /api/v1/conversations/:id/templates ─────────────────────────────
  // List approved templates for sending from chat (when 24h window is closed)
  app.get("/api/v1/conversations/:id/templates", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const conv = await prisma.conversation.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!conv) throw new AppError(404, "CONV_NOT_FOUND", "Conversación no encontrada");

      const templates = await prisma.whatsAppTemplate.findMany({
        where: {
          tenantId: user.tenantId,
          status: "APPROVED",
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          category: true,
          bodyText: true,
          language: true,
        },
        orderBy: { displayName: "asc" },
      });

      return {
        templates,
        windowOpen: isWindowOpen(conv.lastPatientMessageAt),
        lastPatientMessageAt: conv.lastPatientMessageAt,
      };
    },
  });

  // ─── PATCH /api/v1/conversations/:id ─────────────────────────────────────
  // Update status and/or toggle AI
  app.patch("/api/v1/conversations/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as { status?: ConversationStatus; aiEnabled?: boolean };

      const conv = await prisma.conversation.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!conv) throw new AppError(404, "CONV_NOT_FOUND", "Conversación no encontrada");

      // Track aiPausedAt for bot-pause alerts
      const aiPausedData: Record<string, unknown> = {};
      if (body.aiEnabled !== undefined) {
        if (!body.aiEnabled && conv.aiEnabled) {
          // AI being disabled → record pause time
          aiPausedData.aiPausedAt = new Date();
        } else if (body.aiEnabled && !conv.aiEnabled) {
          // AI being re-enabled → clear pause time
          aiPausedData.aiPausedAt = null;
        }
      }

      const updated = await prisma.conversation.update({
        where: { id },
        data: {
          ...(body.status !== undefined && { status: body.status }),
          ...(body.aiEnabled !== undefined && { aiEnabled: body.aiEnabled }),
          ...aiPausedData,
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, tags: true },
          },
        },
      });

      return {
        ...updated,
        windowOpen: isWindowOpen(updated.lastPatientMessageAt),
      };
    },
  });

  // ─── GET /api/v1/conversations/patient-search ─────────────────────────────
  // Search patients to start a new conversation (must be before /:id)
  app.get("/api/v1/conversations/patient-search", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { q?: string };

      if (!query.q || query.q.length < 2) return [];

      const patients = await prisma.patient.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          OR: [
            { firstName: { contains: query.q, mode: "insensitive" } },
            { lastName: { contains: query.q, mode: "insensitive" } },
            { phone: { contains: query.q } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, phone: true },
        take: 10,
      });

      return patients;
    },
  });
}
