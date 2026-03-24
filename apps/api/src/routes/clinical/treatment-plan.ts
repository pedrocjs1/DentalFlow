import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function treatmentPlanRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // List ALL treatment plans for a patient
  app.get("/api/v1/patients/:patientId/treatment-plans", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };

      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const plans = await prisma.treatmentPlan.findMany({
        where: { patientId, tenantId: user.tenantId },
        include: {
          items: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          dentist: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return { plans };
    },
  });

  // Get active treatment plan (kept for backward compatibility)
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
          dentist: { select: { id: true, name: true } },
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

      const body = request.body as { title?: string; notes?: string; dentistId?: string; discountPercent?: number };

      const plan = await prisma.treatmentPlan.create({
        data: {
          patientId,
          tenantId: user.tenantId,
          title: body.title ?? "Plan de Tratamiento",
          notes: body.notes ?? null,
          dentistId: body.dentistId ?? null,
          discountPercent: body.discountPercent ?? 0,
        },
        include: {
          items: true,
          dentist: { select: { id: true, name: true } },
        },
      });

      return reply.status(201).send({ plan });
    },
  });

  // Update treatment plan (plan-level fields)
  app.patch("/api/v1/patients/:patientId/treatment-plan/:planId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId, planId } = request.params as { patientId: string; planId: string };

      const body = request.body as {
        title?: string;
        notes?: string;
        status?: string;
        dentistId?: string | null;
        discountPercent?: number;
      };

      const existing = await prisma.treatmentPlan.findFirst({
        where: { id: planId, patientId, tenantId: user.tenantId },
      });
      if (!existing) throw new AppError(404, "NOT_FOUND", "Plan no encontrado");

      const plan = await prisma.treatmentPlan.update({
        where: { id: planId },
        data: {
          ...(body.title !== undefined && { title: body.title }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.status !== undefined && { status: body.status }),
          ...(body.dentistId !== undefined && { dentistId: body.dentistId }),
          ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
        },
        include: {
          items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          dentist: { select: { id: true, name: true } },
        },
      });

      return { plan };
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
        discountPercent?: number;
        section?: string;
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
          discountPercent: body.discountPercent ?? 0,
          section: body.section ?? null,
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
        discountPercent?: number;
        section?: string;
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
          ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
          ...(body.section !== undefined && { section: body.section }),
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
