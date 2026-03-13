import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import {
  getAuthUrl,
  exchangeCode,
  encryptToken,
  decryptToken,
  getBlockedSlots,
  isGoogleCalendarConfigured,
} from "../../services/google-calendar.js";

export async function googleCalendarRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // Check if Google Calendar is configured
  app.get("/api/v1/google-calendar/status", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const configured = isGoogleCalendarConfigured();

      const tokens = await prisma.googleCalendarToken.findMany({
        where: { tenantId: user.tenantId },
        include: { dentist: { select: { id: true, name: true, color: true } } },
      });

      return {
        configured,
        connected: tokens.map((t) => ({
          dentistId: t.dentistId,
          dentistName: t.dentist.name,
          dentistColor: t.dentist.color,
          calendarId: t.calendarId,
          syncEnabled: t.syncEnabled,
          expiresAt: t.expiresAt,
        })),
      };
    },
  });

  // Get OAuth URL for a dentist
  app.get("/api/v1/google-calendar/auth-url", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { dentistId: string };

      if (!isGoogleCalendarConfigured()) {
        throw new AppError(503, "NOT_CONFIGURED", "Google Calendar no está configurado. Configure GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env");
      }

      if (!query.dentistId) {
        throw new AppError(400, "VALIDATION_ERROR", "dentistId es requerido");
      }

      const dentist = await prisma.dentist.findFirst({
        where: { id: query.dentistId, tenantId: user.tenantId },
      });
      if (!dentist) throw new AppError(404, "NOT_FOUND", "Dentista no encontrado");

      const state = Buffer.from(
        JSON.stringify({ dentistId: query.dentistId, tenantId: user.tenantId })
      ).toString("base64");

      const url = getAuthUrl(state);
      return { url };
    },
  });

  // OAuth2 callback
  app.get("/api/v1/google-calendar/callback", {
    handler: async (request, reply) => {
      const query = request.query as { code: string; state: string; error?: string };

      if (query.error) {
        return reply.redirect(
          `${process.env.APP_URL ?? "http://localhost:3000"}/configuracion?gcal=error&reason=${query.error}`
        );
      }

      let dentistId: string;
      let tenantId: string;
      try {
        const decoded = JSON.parse(Buffer.from(query.state, "base64").toString());
        dentistId = decoded.dentistId;
        tenantId = decoded.tenantId;
      } catch {
        return reply.redirect(
          `${process.env.APP_URL ?? "http://localhost:3000"}/configuracion?gcal=error&reason=invalid_state`
        );
      }

      try {
        const { accessToken, refreshToken, expiresAt } = await exchangeCode(query.code);

        await prisma.googleCalendarToken.upsert({
          where: { dentistId },
          create: {
            tenantId,
            dentistId,
            accessToken: encryptToken(accessToken),
            refreshToken: encryptToken(refreshToken),
            expiresAt,
          },
          update: {
            accessToken: encryptToken(accessToken),
            refreshToken: encryptToken(refreshToken),
            expiresAt,
          },
        });

        return reply.redirect(
          `${process.env.APP_URL ?? "http://localhost:3000"}/configuracion?gcal=success`
        );
      } catch {
        return reply.redirect(
          `${process.env.APP_URL ?? "http://localhost:3000"}/configuracion?gcal=error&reason=exchange_failed`
        );
      }
    },
  });

  // Disconnect Google Calendar for a dentist
  app.delete("/api/v1/google-calendar/disconnect/:dentistId", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { dentistId } = request.params as { dentistId: string };

      await prisma.googleCalendarToken.deleteMany({
        where: { dentistId, tenantId: user.tenantId },
      });

      return reply.status(204).send();
    },
  });

  // Get blocked slots from Google Calendar.
  // If dentistId is provided: fetch for that specific dentist.
  // If dentistId is omitted: fetch for ALL dentists connected in the tenant.
  // Each returned slot includes dentistId and type ('event').
  app.get("/api/v1/google-calendar/blocked-slots", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { dentistId?: string; startDate: string; endDate: string };

      const timeMin = new Date(query.startDate);
      const timeMax = new Date(query.endDate);

      if (query.dentistId) {
        // Single dentist
        const token = await prisma.googleCalendarToken.findFirst({
          where: { dentistId: query.dentistId, tenantId: user.tenantId, syncEnabled: true },
        });
        if (!token) return { slots: [] };

        const slots = await getBlockedSlots({
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          calendarId: token.calendarId,
          timeMin,
          timeMax,
        });
        return { slots: slots.map((s) => ({ ...s, dentistId: query.dentistId! })) };
      }

      // All dentists in tenant
      const tokens = await prisma.googleCalendarToken.findMany({
        where: { tenantId: user.tenantId, syncEnabled: true },
      });
      if (tokens.length === 0) return { slots: [] };

      const allSlots = await Promise.all(
        tokens.map(async (token) => {
          const slots = await getBlockedSlots({
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
            calendarId: token.calendarId,
            timeMin,
            timeMax,
          });
          return slots.map((s) => ({ ...s, dentistId: token.dentistId }));
        })
      );
      return { slots: allSlots.flat() };
    },
  });

  // Toggle sync
  app.patch("/api/v1/google-calendar/sync/:dentistId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { dentistId } = request.params as { dentistId: string };
      const body = request.body as { syncEnabled: boolean };

      await prisma.googleCalendarToken.updateMany({
        where: { dentistId, tenantId: user.tenantId },
        data: { syncEnabled: body.syncEnabled },
      });

      return { ok: true };
    },
  });
}
