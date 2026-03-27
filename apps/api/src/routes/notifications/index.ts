import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { createNotification } from "../../services/notifications.js";

interface NotifRow {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
  metadata: unknown;
}

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET notifications (latest 50, optional category filter)
  app.get("/api/v1/notifications", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { unreadOnly?: string; category?: string };

      // Use raw query for category filtering (Prisma client may be stale for 'category' field)
      if (query.category) {
        const unreadFilter = query.unreadOnly === "true";
        const notifications = unreadFilter
          ? await prisma.$queryRaw<NotifRow[]>`
              SELECT id, type, category, title, message, link, "isRead", "createdAt", metadata
              FROM "Notification"
              WHERE "tenantId" = ${user.tenantId} AND category = ${query.category} AND "isRead" = false
              ORDER BY "createdAt" DESC LIMIT 50`
          : await prisma.$queryRaw<NotifRow[]>`
              SELECT id, type, category, title, message, link, "isRead", "createdAt", metadata
              FROM "Notification"
              WHERE "tenantId" = ${user.tenantId} AND category = ${query.category}
              ORDER BY "createdAt" DESC LIMIT 50`;
        return { notifications };
      }

      const notifications = await prisma.notification.findMany({
        where: {
          tenantId: user.tenantId,
          ...(query.unreadOnly === "true" ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return { notifications };
    },
  });

  // GET unread count — total + per category
  app.get("/api/v1/notifications/unread-count", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };

      // Use raw SQL to get counts by category (Prisma client may be stale for 'category' field)
      const rows = await prisma.$queryRaw<Array<{ category: string; cnt: bigint }>>`
        SELECT category, COUNT(*)::bigint as cnt
        FROM "Notification"
        WHERE "tenantId" = ${user.tenantId} AND "isRead" = false
        GROUP BY category
      `;

      const result: Record<string, number> = { messages: 0, system: 0, pipeline: 0, ai: 0 };
      let total = 0;
      for (const r of rows) {
        const count = Number(r.cnt);
        result[r.category] = count;
        total += count;
      }

      return { total, ...result };
    },
  });

  // PATCH mark one as read
  app.patch("/api/v1/notifications/:id/read", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      await prisma.notification.updateMany({
        where: { id, tenantId: user.tenantId },
        data: { isRead: true, readAt: new Date() },
      });
      return { ok: true };
    },
  });

  // PATCH mark all as read (optional category filter)
  app.patch("/api/v1/notifications/read-all", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const body = request.body as { category?: string } | undefined;

      if (body?.category) {
        // Raw SQL for category filter (Prisma client may be stale)
        await prisma.$executeRaw`
          UPDATE "Notification" SET "isRead" = true, "readAt" = NOW()
          WHERE "tenantId" = ${user.tenantId} AND "isRead" = false AND category = ${body.category}
        `;
      } else {
        await prisma.notification.updateMany({
          where: { tenantId: user.tenantId, isRead: false },
          data: { isRead: true, readAt: new Date() },
        });
      }
      return { ok: true };
    },
  });

  // GET check ended appointments and create reminders
  app.get("/api/v1/notifications/check-ended-appointments", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const now = new Date();

      // Find appointments that ended but are still CONFIRMED/IN_PROGRESS
      const endedAppointments = await prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          endTime: { lt: now },
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
          dentist: { select: { name: true } },
          treatmentType: { select: { name: true } },
        },
        take: 20,
      });

      let created = 0;
      for (const appt of endedAppointments) {
        // Check if reminder already exists for this appointment
        const existing = await prisma.notification.findFirst({
          where: {
            tenantId: user.tenantId,
            type: "appointment_end_reminder",
            // Check metadata for appointmentId — use raw query workaround
          },
        });

        // Use a simple approach: check by title + recent time window
        const recentReminder = await prisma.notification.findFirst({
          where: {
            tenantId: user.tenantId,
            type: "appointment_end_reminder",
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
            message: { contains: appt.patient.firstName },
          },
        });

        if (!recentReminder) {
          const timeStr = appt.startTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
          await createNotification(user.tenantId, {
            type: "appointment_end_reminder",
            title: "Turno finalizado",
            message: `${appt.patient.firstName} ${appt.patient.lastName} — ${appt.treatmentType?.name ?? "Consulta"} ${timeStr} con ${appt.dentist.name}`,
            link: "/agenda",
            metadata: {
              appointmentId: appt.id,
              patientId: appt.patient.id,
              patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
              treatmentName: appt.treatmentType?.name ?? "Consulta",
              dentistName: appt.dentist.name,
            },
          });
          created++;
        }
      }

      return { checked: endedAppointments.length, created };
    },
  });
}
