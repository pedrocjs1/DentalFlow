import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function odontogramVersionRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // List all odontogram versions for a patient
  app.get("/api/v1/patients/:patientId/odontogram/versions", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const versions = await prisma.odontogramVersion.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: { versionNumber: "desc" },
      });

      return { versions };
    },
  });

  // Create a new odontogram version (snapshot current findings)
  app.post("/api/v1/patients/:patientId/odontogram/versions", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as { label?: string };

      // Snapshot all current findings for this patient
      const currentFindings = await prisma.odontogramFinding.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: [{ toothFdi: "asc" }, { createdAt: "asc" }],
      });

      // Auto-increment version number
      const existingCount = await prisma.odontogramVersion.count({
        where: { patientId, tenantId: user.tenantId },
      });
      const versionNumber = existingCount + 1;

      const version = await prisma.odontogramVersion.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          versionNumber,
          label: body.label || null,
          findings: JSON.parse(JSON.stringify(currentFindings)),
          createdById: user.sub,
        },
      });

      return reply.status(201).send(version);
    },
  });
}
