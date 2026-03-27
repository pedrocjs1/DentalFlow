import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function periodontogramRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  app.get("/api/v1/patients/:patientId/periodontogram", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const [latest, history] = await Promise.all([
        prisma.periodontogramEntry.findFirst({
          where: { patientId, tenantId: user.tenantId },
          orderBy: { recordedAt: "desc" },
        }),
        prisma.periodontogramEntry.findMany({
          where: { patientId, tenantId: user.tenantId },
          orderBy: { recordedAt: "desc" },
          select: { id: true, recordedAt: true, notes: true },
        }),
      ]);

      return { latest, history };
    },
  });

  app.post("/api/v1/patients/:patientId/periodontogram", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        findings: Record<string, {
          depths: number[];
          mobility: number;
          furcation: string;
          bleeding: boolean[];
          plaque: boolean[];
        }>;
        notes?: string;
        recordedAt?: string;
      };

      if (!body.findings) {
        throw new AppError(400, "VALIDATION_ERROR", "findings es requerido");
      }

      const entry = await prisma.periodontogramEntry.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          recordedBy: user.sub,
          recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date(),
          findings: body.findings,
          notes: body.notes ?? null,
        },
      });

      return reply.status(201).send({ entry });
    },
  });

  app.get("/api/v1/patients/:patientId/periodontogram/:entryId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, entryId } = request.params as { patientId: string; entryId: string };

      const entry = await prisma.periodontogramEntry.findFirst({
        where: { id: entryId, patientId, tenantId: user.tenantId },
      });
      if (!entry) throw new AppError(404, "NOT_FOUND", "Registro no encontrado");

      return { entry };
    },
  });
}
