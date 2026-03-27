import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";

export async function patientSummaryRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  app.get("/api/v1/patients/:patientId/summary", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string; sub: string };
      const { patientId } = request.params as { patientId: string };

      // Verify patient belongs to tenant
      const patient = await prisma.patient.findFirst({
        where: { id: patientId, tenantId: user.tenantId, isActive: true },
        include: {
          medicalHistory: true,
        },
      });
      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");

      // Latest completed appointment
      const latestAppointment = await prisma.appointment.findFirst({
        where: {
          patientId,
          tenantId: user.tenantId,
          status: "COMPLETED" as any,
        },
        orderBy: { startTime: "desc" },
        include: {
          dentist: { select: { id: true, name: true } },
          treatmentType: { select: { id: true, name: true } },
        },
      });

      // Upcoming appointments
      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          patientId,
          tenantId: user.tenantId,
          status: { in: ["CONFIRMED", "PENDING"] as any[] },
          startTime: { gt: new Date() },
        },
        orderBy: { startTime: "asc" },
        include: {
          dentist: { select: { id: true, name: true } },
          treatmentType: { select: { id: true, name: true } },
        },
      });

      // Stats
      const findingsCount = await prisma.odontogramFinding.count({
        where: { patientId, tenantId: user.tenantId },
      });

      const pendingItems = await prisma.treatmentPlanItem.findMany({
        where: {
          tenantId: user.tenantId,
          plan: { patientId },
          status: "PENDING" as any,
        },
        select: { unitCost: true, quantity: true },
      });
      const pendingTreatments = {
        count: pendingItems.length,
        totalCost: pendingItems.reduce(
          (sum, item) => sum + Number(item.unitCost) * item.quantity,
          0
        ),
      };

      const completedTreatments = await prisma.treatmentPlanItem.count({
        where: {
          tenantId: user.tenantId,
          plan: { patientId },
          status: "COMPLETED" as any,
        },
      });

      const evolutionsCount = await prisma.clinicalVisitNote.count({
        where: { patientId, tenantId: user.tenantId },
      });

      const imagesCount = await prisma.patientImage.count({
        where: { patientId, tenantId: user.tenantId },
      });

      // Active treatment plan
      const activePlan = await prisma.treatmentPlan.findFirst({
        where: {
          patientId,
          tenantId: user.tenantId,
          status: "ACTIVE",
        },
        orderBy: { createdAt: "desc" },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          dentist: { select: { id: true, name: true } },
        },
      });

      let activePlanWithProgress = null;
      if (activePlan) {
        const totalItems = activePlan.items.length;
        const completedItems = activePlan.items.filter(
          (item) => item.status === "COMPLETED"
        ).length;
        activePlanWithProgress = {
          ...activePlan,
          progress: totalItems > 0 ? completedItems / totalItems : 0,
          completedItems,
          totalItems,
        };
      }

      // Recent activity: last 10 from evolutions + completed appointments
      const recentEvolutions = await prisma.clinicalVisitNote.findMany({
        where: { patientId, tenantId: user.tenantId },
        orderBy: { visitDate: "desc" },
        take: 10,
        select: {
          id: true,
          visitDate: true,
          procedureName: true,
          authorId: true,
          content: true,
        },
      });

      const recentCompletedAppointments = await prisma.appointment.findMany({
        where: {
          patientId,
          tenantId: user.tenantId,
          status: "COMPLETED" as any,
        },
        orderBy: { startTime: "desc" },
        take: 10,
        include: {
          dentist: { select: { name: true } },
          treatmentType: { select: { name: true } },
        },
      });

      // Merge and sort recent activity
      const recentActivity = [
        ...recentEvolutions.map((e) => ({
          id: e.id,
          date: e.visitDate,
          type: "evolution" as const,
          description: e.procedureName || e.content.substring(0, 80),
          professionalId: e.authorId,
        })),
        ...recentCompletedAppointments.map((a) => ({
          id: a.id,
          date: a.startTime,
          type: "appointment" as const,
          description: a.treatmentType?.name || "Cita completada",
          professionalName: a.dentist.name,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      return {
        patient,
        medicalHistory: patient.medicalHistory ?? null,
        stats: {
          findingsCount,
          pendingTreatments: {
            count: pendingTreatments.count,
            value: pendingTreatments.totalCost,
            totalCost: pendingTreatments.totalCost,
          },
          completedTreatments,
          evolutionsCount,
          imagesCount,
        },
        activePlan: activePlanWithProgress,
        recentActivities: recentActivity,
        upcomingAppointments: upcomingAppointments ?? [],
        latestAppointment,
      };
    },
  });
}
