import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function plaqueRecordRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // List all plaque records for a patient
  app.get("/api/v1/patients/:patientId/plaque-records", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const records = await prisma.plaqueRecord.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: { createdAt: "desc" },
      });

      return { records };
    },
  });

  // Create a new plaque record
  app.post("/api/v1/patients/:patientId/plaque-records", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        affectedSurfaces: Record<string, string[]>;
        totalSurfaces: number;
        affectedCount: number;
        percentage: number;
        comments?: string;
      };

      if (!body.affectedSurfaces || typeof body.totalSurfaces !== "number" || typeof body.affectedCount !== "number" || typeof body.percentage !== "number") {
        throw new AppError(400, "VALIDATION_ERROR", "affectedSurfaces, totalSurfaces, affectedCount y percentage son requeridos");
      }

      const record = await prisma.plaqueRecord.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          affectedSurfaces: body.affectedSurfaces as any,
          totalSurfaces: body.totalSurfaces,
          affectedCount: body.affectedCount,
          percentage: body.percentage,
          comments: body.comments || null,
          createdById: user.sub,
        },
      });

      return reply.status(201).send(record);
    },
  });
}
