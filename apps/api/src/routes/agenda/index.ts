import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";

export async function agendaRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // Get dentists for agenda (active only)
  app.get("/api/v1/agenda/dentists", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const dentists = await prisma.dentist.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: {
          id: true,
          name: true,
          color: true,
          specialty: true,
          birthdate: true,
          treatments: { select: { treatmentTypeId: true } },
        },
        orderBy: { name: "asc" },
      });
      return {
        dentists: dentists.map((d) => ({
          ...d,
          treatmentIds: d.treatments.map((t) => t.treatmentTypeId),
          treatments: undefined,
        })),
      };
    },
  });

  // Get treatment types for agenda
  app.get("/api/v1/agenda/treatment-types", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const treatmentTypes = await prisma.treatmentType.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true, durationMin: true, price: true, color: true },
        orderBy: { name: "asc" },
      });
      return { treatmentTypes };
    },
  });

  // Get working hours (tenant-wide + per dentist)
  app.get("/api/v1/agenda/working-hours", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { dentistId?: string };

      const [tenantHours, dentistHours] = await Promise.all([
        prisma.workingHours.findMany({
          where: { tenantId: user.tenantId, isActive: true },
          orderBy: { dayOfWeek: "asc" },
        }),
        query.dentistId
          ? prisma.dentistWorkingHours.findMany({
              where: { tenantId: user.tenantId, dentistId: query.dentistId, isActive: true },
              orderBy: { dayOfWeek: "asc" },
            })
          : prisma.dentistWorkingHours.findMany({
              where: { tenantId: user.tenantId, isActive: true },
              orderBy: [{ dentistId: "asc" }, { dayOfWeek: "asc" }],
            }),
      ]);

      return { tenantHours, dentistHours };
    },
  });

  // Get/set dentist working hours
  app.put("/api/v1/agenda/working-hours/dentist/:dentistId", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { dentistId } = request.params as { dentistId: string };
      const body = request.body as Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isActive: boolean;
      }>;

      // Upsert working hours for each day
      const operations = body.map((day) =>
        prisma.dentistWorkingHours.upsert({
          where: { dentistId_dayOfWeek: { dentistId, dayOfWeek: day.dayOfWeek } },
          create: {
            tenantId: user.tenantId,
            dentistId,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            isActive: day.isActive,
          },
          update: {
            startTime: day.startTime,
            endTime: day.endTime,
            isActive: day.isActive,
          },
        })
      );

      await prisma.$transaction(operations);
      return reply.status(200).send({ ok: true });
    },
  });

  // Get chairs
  app.get("/api/v1/agenda/chairs", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const chairs = await prisma.chair.findMany({
        where: { tenantId: user.tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return { chairs };
    },
  });
}
