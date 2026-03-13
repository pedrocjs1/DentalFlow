import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function treatmentPlanRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // Get active treatment plan (create one if none exists)
  app.get("/api/v1/patients/:patientId/treatment-plan", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const plan = await prisma.treatmentPlan.findFirst({
        where: { patientId, tenantId: user.tenantId, isActive: true },
        include: {
          items: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });

      return { plan };
    },
  });

  // Create treatment plan
  app.post("/api/v1/patients/:patientId/treatment-plan", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const body = request.body as { title?: string; notes?: string };

      const plan = await prisma.treatmentPlan.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          title: body.title ?? "Plan de Tratamiento",
          notes: body.notes ?? null,
        },
        include: { items: true },
      });

      return reply.status(201).send({ plan });
    },
  });

  // Add item to plan
  app.post("/api/v1/patients/:patientId/treatment-plan/items", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const body = request.body as {
        planId?: string;
        toothFdi?: number;
        procedureName: string;
        unitCost?: number;
        quantity?: number;
        notes?: string;
      };

      if (!body.procedureName) {
        throw new AppError(400, "VALIDATION_ERROR", "procedureName es requerido");
      }

      // Get or create active plan
      let plan = body.planId
        ? await prisma.treatmentPlan.findFirst({ where: { id: body.planId, patientId, tenantId: user.tenantId } })
        : await prisma.treatmentPlan.findFirst({ where: { patientId, tenantId: user.tenantId, isActive: true } });

      if (!plan) {
        plan = await prisma.treatmentPlan.create({
          data: { patientId, tenantId: user.tenantId, title: "Plan de Tratamiento" },
        });
      }

      const unitCost = body.unitCost ?? 0;
      const quantity = body.quantity ?? 1;

      const item = await prisma.treatmentPlanItem.create({
        data: {
          planId: plan.id,
          tenantId: user.tenantId,
          toothFdi: body.toothFdi ?? null,
          procedureName: body.procedureName,
          unitCost,
          quantity,
          notes: body.notes ?? null,
        },
      });

      return reply.status(201).send({ item });
    },
  });

  // Update item
  app.patch("/api/v1/patients/:patientId/treatment-plan/items/:itemId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, itemId } = request.params as { patientId: string; itemId: string };

      const body = request.body as {
        status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
        unitCost?: number;
        quantity?: number;
        procedureName?: string;
        notes?: string;
        toothFdi?: number;
      };

      const item = await prisma.treatmentPlanItem.findFirst({
        where: { id: itemId, tenantId: user.tenantId, plan: { patientId } },
      });
      if (!item) throw new AppError(404, "NOT_FOUND", "Item no encontrado");

      const updated = await prisma.treatmentPlanItem.update({
        where: { id: itemId },
        data: {
          ...(body.status !== undefined && { status: body.status }),
          ...(body.unitCost !== undefined && { unitCost: body.unitCost }),
          ...(body.quantity !== undefined && { quantity: body.quantity }),
          ...(body.procedureName !== undefined && { procedureName: body.procedureName }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.toothFdi !== undefined && { toothFdi: body.toothFdi }),
          ...(body.status === "COMPLETED" && { completedAt: new Date() }),
        },
      });

      return { item: updated };
    },
  });

  // Delete item
  app.delete("/api/v1/patients/:patientId/treatment-plan/items/:itemId", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { patientId, itemId } = request.params as { patientId: string; itemId: string };

      const item = await prisma.treatmentPlanItem.findFirst({
        where: { id: itemId, tenantId: user.tenantId, plan: { patientId } },
      });
      if (!item) throw new AppError(404, "NOT_FOUND", "Item no encontrado");

      await prisma.treatmentPlanItem.delete({ where: { id: itemId } });
      return reply.status(204).send();
    },
  });
}
