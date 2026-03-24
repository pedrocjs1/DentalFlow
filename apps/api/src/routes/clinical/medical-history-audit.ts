import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function medicalHistoryAuditRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET /api/v1/patients/:patientId/medical-history/audit
  app.get("/api/v1/patients/:patientId/medical-history/audit", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const audit = await prisma.medicalHistoryAudit.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return { audit };
    },
  });
}
