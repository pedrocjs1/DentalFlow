import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { createNotification } from "../../services/notifications.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns a Prisma select object for a patient card.
 *  appointments = next upcoming CONFIRMED/PENDING appointment (for "Próxima cita" indicator).
 */
function buildPatientCardSelect(now: Date) {
  return {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    tags: true,
    birthdate: true,
    lastVisitAt: true,
    nextVisitDue: true,
    createdAt: true,
    appointments: {
      where: {
        startTime: { gte: now },
        status: { in: ["CONFIRMED" as const, "PENDING" as const] },
      },
      orderBy: { startTime: "asc" as const },
      take: 1 as const,
      select: {
        startTime: true,
        status: true,
        treatmentType: { select: { name: true } },
        dentist: { select: { id: true, name: true, color: true } },
      },
    },
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function pipelineRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // GET full pipeline board: stages with their patients
  app.get("/api/v1/pipeline", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as { search?: string; tag?: string; dentistId?: string };

      const stages = await prisma.pipelineStage.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { order: "asc" },
      });

      // Build patient filter
      const patientWhere: any = { tenantId: user.tenantId, isActive: true };
      if (query.search) {
        patientWhere.OR = [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
        ];
      }
      if (query.tag) {
        patientWhere.tags = { has: query.tag };
      }
      if (query.dentistId) {
        patientWhere.appointments = { some: { dentistId: query.dentistId, tenantId: user.tenantId } };
      }

      const now = new Date();
      const [entries, treatmentTypes] = await Promise.all([
        prisma.patientPipeline.findMany({
          where: { patient: patientWhere },
          include: {
            patient: { select: buildPatientCardSelect(now) },
          },
          orderBy: { movedAt: "asc" },
        }),
        // Fetch treatment prices once for value computation
        prisma.treatmentType.findMany({
          where: { tenantId: user.tenantId },
          select: { name: true, price: true },
        }),
      ]);

      // Build normalized name → price map (lowercase key)
      const priceByName = new Map<string, number>();
      for (const tt of treatmentTypes) {
        if (tt.price) {
          priceByName.set(tt.name.toLowerCase().trim(), parseFloat(tt.price.toString()));
        }
      }

      // Group by stageId
      const byStage = new Map<string, typeof entries>(stages.map((s) => [s.id, []]));
      for (const entry of entries) {
        byStage.get(entry.stageId)?.push(entry);
      }

      return {
        stages: stages.map((s) => {
          const stageEntries = byStage.get(s.id) ?? [];

          // Compute potential monetary value for this stage
          let stageValue = 0;
          for (const entry of stageEntries) {
            if (entry.interestTreatment) {
              // Patient told us which treatment they're interested in
              stageValue += priceByName.get(entry.interestTreatment.toLowerCase().trim()) ?? 0;
            } else {
              // Fall back to their next upcoming appointment treatment
              const apptTreatmentName = (entry.patient as { appointments?: Array<{ treatmentType?: { name: string } | null }> })
                .appointments?.[0]?.treatmentType?.name;
              if (apptTreatmentName) {
                stageValue += priceByName.get(apptTreatmentName.toLowerCase().trim()) ?? 0;
              }
            }
          }

          return {
            ...s,
            stageValue,
            patients: stageEntries.map((e) => ({
              pipelineId: e.id,
              movedAt: e.movedAt,
              notes: e.notes,
              interestTreatment: e.interestTreatment,
              lastAutoMessageSentAt: e.lastAutoMessageSentAt,
              ...e.patient,
            })),
            patientCount: stageEntries.length,
          };
        }),
      };
    },
  });

  // PATCH move patient to another stage
  app.patch("/api/v1/pipeline/move", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const body = request.body as { patientId: string; stageId: string };

      const [patient, stage] = await Promise.all([
        prisma.patient.findFirst({ where: { id: body.patientId, tenantId: user.tenantId } }),
        prisma.pipelineStage.findFirst({ where: { id: body.stageId, tenantId: user.tenantId } }),
      ]);
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");
      if (!stage) throw new AppError(404, "STAGE_NOT_FOUND", "Stage no encontrado");

      const entry = await prisma.patientPipeline.upsert({
        where: { patientId: body.patientId },
        create: { patientId: body.patientId, stageId: body.stageId, movedAt: new Date() },
        update: { stageId: body.stageId, movedAt: new Date() },
      });

      createNotification(user.tenantId, {
        type: "pipeline_move",
        title: "Pipeline actualizado",
        message: `${patient.firstName} ${patient.lastName} movido a ${stage.name}`,
        link: "/pipeline",
        metadata: { patientId: body.patientId, stageId: body.stageId },
      }).catch(() => {});

      return entry;
    },
  });

  // PATCH update pipeline entry notes / interestTreatment
  app.patch("/api/v1/pipeline/patients/:patientId", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { patientId } = request.params as { patientId: string };
      const body = request.body as { notes?: string; interestTreatment?: string | null };

      const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId: user.tenantId } });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      const entry = await prisma.patientPipeline.upsert({
        where: { patientId },
        create: {
          patientId,
          stageId: (await prisma.pipelineStage.findFirst({ where: { tenantId: user.tenantId, isDefault: true }, orderBy: { order: "asc" } }))!.id,
          notes: body.notes,
          interestTreatment: body.interestTreatment,
        },
        update: {
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.interestTreatment !== undefined && { interestTreatment: body.interestTreatment }),
        },
      });

      return entry;
    },
  });

  // GET pipeline stages only (for config UI)
  app.get("/api/v1/pipeline/stages", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const stages = await prisma.pipelineStage.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { order: "asc" },
        include: { _count: { select: { patients: true } } },
      });
      return { stages: stages.map((s) => ({ ...s, patientCount: s._count.patients, _count: undefined })) };
    },
  });

  // POST create stage
  app.post("/api/v1/pipeline/stages", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as { name: string; color?: string; order?: number };

      const maxOrder = await prisma.pipelineStage.aggregate({
        where: { tenantId: user.tenantId },
        _max: { order: true },
      });
      const order = body.order ?? (maxOrder._max.order ?? 0) + 1;

      // Shift existing stages up if inserting in middle
      if (body.order) {
        await prisma.pipelineStage.updateMany({
          where: { tenantId: user.tenantId, order: { gte: order } },
          data: { order: { increment: 1 } },
        });
      }

      const stage = await prisma.pipelineStage.create({
        data: { tenantId: user.tenantId, name: body.name, color: body.color ?? "#6B7280", order },
      });
      return reply.status(201).send(stage);
    },
  });

  // PATCH update stage (name, color, automation config)
  app.patch("/api/v1/pipeline/stages/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        color?: string;
        autoMessageEnabled?: boolean;
        autoMessageDelayHours?: number;
        autoMessageTemplate?: string;
        autoMessageMaxRetries?: number;
        autoMoveEnabled?: boolean;
        autoMoveDelayHours?: number;
        autoMoveTargetStageId?: string | null;
        discountEnabled?: boolean;
        discountPercent?: number;
        discountMessage?: string;
        discountTemplate?: string;
      };

      const existing = await prisma.pipelineStage.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!existing) throw new AppError(404, "STAGE_NOT_FOUND", "Stage no encontrado");

      const stage = await prisma.pipelineStage.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.color !== undefined && { color: body.color }),
          ...(body.autoMessageEnabled !== undefined && { autoMessageEnabled: body.autoMessageEnabled }),
          ...(body.autoMessageDelayHours !== undefined && { autoMessageDelayHours: body.autoMessageDelayHours }),
          ...(body.autoMessageTemplate !== undefined && { autoMessageTemplate: body.autoMessageTemplate }),
          ...(body.autoMessageMaxRetries !== undefined && { autoMessageMaxRetries: body.autoMessageMaxRetries }),
          ...(body.autoMoveEnabled !== undefined && { autoMoveEnabled: body.autoMoveEnabled }),
          ...(body.autoMoveDelayHours !== undefined && { autoMoveDelayHours: body.autoMoveDelayHours }),
          ...(body.autoMoveTargetStageId !== undefined && { autoMoveTargetStageId: body.autoMoveTargetStageId }),
          ...(body.discountEnabled !== undefined && { discountEnabled: body.discountEnabled }),
          ...(body.discountPercent !== undefined && { discountPercent: body.discountPercent }),
          ...(body.discountMessage !== undefined && { discountMessage: body.discountMessage }),
          ...(body.discountTemplate !== undefined && { discountTemplate: body.discountTemplate }),
        },
      });
      return stage;
    },
  });

  // DELETE stage (only if no patients)
  app.delete("/api/v1/pipeline/stages/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const existing = await prisma.pipelineStage.findFirst({
        where: { id, tenantId: user.tenantId },
        include: { _count: { select: { patients: true } } },
      });
      if (!existing) throw new AppError(404, "STAGE_NOT_FOUND", "Stage no encontrado");
      if (existing._count.patients > 0) {
        throw new AppError(409, "STAGE_HAS_PATIENTS", `Este stage tiene ${existing._count.patients} paciente(s). Movelos a otro stage antes de eliminarlo.`);
      }

      await prisma.pipelineStage.delete({ where: { id } });
      return reply.status(204).send();
    },
  });

  // PUT reorder stages
  app.put("/api/v1/pipeline/stages/reorder", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const body = request.body as Array<{ id: string; order: number }>;

      await prisma.$transaction(
        body.map(({ id, order }) =>
          prisma.pipelineStage.updateMany({
            where: { id, tenantId: user.tenantId },
            data: { order },
          })
        )
      );
      return { ok: true };
    },
  });
}

// ── Auto-pipeline helpers (called from other routes) ──────────────────────────

/** Assign a new patient to the first (default) stage */
export async function autoAssignToFirstStage(tenantId: string, patientId: string) {
  const firstStage = await prisma.pipelineStage.findFirst({
    where: { tenantId },
    orderBy: { order: "asc" },
  });
  if (!firstStage) return;

  await prisma.patientPipeline.upsert({
    where: { patientId },
    create: { patientId, stageId: firstStage.id, movedAt: new Date() },
    update: {}, // don't overwrite if already exists
  });
}

/** Move patient to the stage named exactly `stageName` (case-insensitive) */
export async function autoMoveToStageByName(tenantId: string, patientId: string, stageName: string) {
  const stage = await prisma.pipelineStage.findFirst({
    where: { tenantId, name: { equals: stageName, mode: "insensitive" } },
    orderBy: { order: "asc" },
  });
  if (!stage) return;

  await prisma.patientPipeline.upsert({
    where: { patientId },
    create: { patientId, stageId: stage.id, movedAt: new Date() },
    update: { stageId: stage.id, movedAt: new Date() },
  });
}

/**
 * Sync pipeline stage when an appointment status changes.
 * Called from the appointments PATCH route.
 *
 * Rules:
 *   CONFIRMED  → "Primera Cita Agendada"  (only if patient is still in an early stage)
 *   COMPLETED  → "En Tratamiento" (first ever completed) or "Seguimiento" (subsequent)
 *   NO_SHOW    → "Interesado - No Agendó"
 *   CANCELLED  → "Interesado - No Agendó"
 */
export async function syncPipelineFromAppointment(
  tenantId: string,
  patientId: string,
  newStatus: string,
  priorCompletedCount: number = 0
): Promise<void> {
  // Early stages: only move "forward" when confirming, not backward
  const EARLY_STAGE_NAMES = [
    "nuevo contacto",
    "interesado",
    "interesado - no agendó",
    "lead",
  ];

  switch (newStatus) {
    case "CONFIRMED": {
      const entry = await prisma.patientPipeline.findUnique({
        where: { patientId },
        include: { stage: { select: { name: true } } },
      });
      const currentName = entry?.stage.name.toLowerCase() ?? "";
      const isEarlyStage = EARLY_STAGE_NAMES.some((s) => currentName.includes(s.split(" ")[0]));
      if (isEarlyStage || !entry) {
        await autoMoveToStageByName(tenantId, patientId, "Primera Cita Agendada");
      }
      break;
    }

    case "COMPLETED": {
      // Use isMultiSession to decide target stage
      const lastCompleted = await prisma.appointment.findFirst({
        where: { tenantId, patientId, status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
        select: { treatmentTypeId: true },
      });
      let isMulti = false;
      if (lastCompleted?.treatmentTypeId) {
        const tt = await prisma.treatmentType.findUnique({
          where: { id: lastCompleted.treatmentTypeId },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        isMulti = (tt as any)?.isMultiSession ?? false;
      }
      const targetStage = isMulti ? "En Tratamiento" : "Seguimiento";
      await autoMoveToStageByName(tenantId, patientId, targetStage);
      break;
    }

    case "NO_SHOW":
    case "CANCELLED": {
      await autoMoveToStageByName(tenantId, patientId, "Interesado - No Agendó");
      break;
    }

    default:
      break;
  }
}
