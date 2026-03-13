import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function odontogramRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  app.get("/api/v1/patients/:patientId/odontogram", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const findings = await prisma.odontogramFinding.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: [{ toothFdi: "asc" }, { createdAt: "asc" }],
      });

      return { findings };
    },
  });

  app.post("/api/v1/patients/:patientId/odontogram", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as {
        toothFdi: number;
        surface?: "OCCLUSAL" | "MESIAL" | "DISTAL" | "VESTIBULAR" | "LINGUAL";
        condition: string;
        status?: "EXISTING" | "PLANNED";
        notes?: string;
      };

      if (!body.toothFdi || !body.condition) {
        throw new AppError(400, "VALIDATION_ERROR", "toothFdi y condition son requeridos");
      }

      const finding = await prisma.odontogramFinding.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          toothFdi: body.toothFdi,
          surface: body.surface ?? null,
          condition: body.condition as any,
          status: body.status ?? "EXISTING",
          notes: body.notes ?? null,
          recordedBy: user.sub,
        },
      });

      return reply.status(201).send(finding);
    },
  });

  app.delete("/api/v1/patients/:patientId/odontogram/:findingId", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { patientId, findingId } = request.params as { patientId: string; findingId: string };

      const finding = await prisma.odontogramFinding.findFirst({
        where: { id: findingId, patientId, tenantId: user.tenantId },
      });
      if (!finding) throw new AppError(404, "NOT_FOUND", "Hallazgo no encontrado");

      await prisma.odontogramFinding.delete({ where: { id: findingId } });
      return reply.status(204).send();
    },
  });
}
