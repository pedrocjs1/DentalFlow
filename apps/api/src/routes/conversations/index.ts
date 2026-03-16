import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { sendHumanMessageViaWhatsApp } from "../../services/whatsapp-processor.js";

type ConversationStatus = "OPEN" | "AI_HANDLING" | "HUMAN_NEEDED" | "CLOSED";
type Channel = "WHATSAPP" | "EMAIL" | "WEB_CHAT" | "SMS";

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

      return { ...conv, nextAppointment };
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
  app.post("/api/v1/conversations/:id/messages", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as { content: string; type?: string };

      if (!body.content?.trim())
        throw new AppError(400, "INVALID_INPUT", "El contenido del mensaje es requerido");

      const conv = await prisma.conversation.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!conv) throw new AppError(404, "CONV_NOT_FOUND", "Conversación no encontrada");
      if (conv.status === "CLOSED")
        throw new AppError(400, "CONV_CLOSED", "No se puede enviar mensajes a una conversación cerrada");

      const now = new Date();

      const [message] = await Promise.all([
        prisma.message.create({
          data: {
            conversationId: id,
            direction: "OUTBOUND",
            type: (body.type as "TEXT") ?? "TEXT",
            content: body.content.trim(),
            metadata: { sentBy: "human" },
            sentAt: now,
          },
        }),
        // Update last message info on conversation
        prisma.conversation.update({
          where: { id },
          data: {
            lastMessageAt: now,
            lastMessagePreview: body.content.trim().slice(0, 100),
            // If AI was handling and human sends, switch to OPEN to reflect human takeover
            status: conv.status === "AI_HANDLING" ? "OPEN" : conv.status,
          },
        }),
      ]);

      // Send via WhatsApp in background (don't block the API response)
      if (conv.channel === "WHATSAPP") {
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

      return reply.status(201).send(message);
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

      const updated = await prisma.conversation.update({
        where: { id },
        data: {
          ...(body.status !== undefined && { status: body.status }),
          ...(body.aiEnabled !== undefined && { aiEnabled: body.aiEnabled }),
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, phone: true, tags: true },
          },
        },
      });

      return updated;
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
