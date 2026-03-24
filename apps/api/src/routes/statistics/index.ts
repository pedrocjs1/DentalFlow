import type { FastifyInstance } from "fastify";
import { prisma } from "@dentalflow/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";

type UserPayload = { tenantId: string; sub: string };

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "12m":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function getPreviousPeriodStart(period: string, periodStart: Date): Date {
  const diff = Date.now() - periodStart.getTime();
  return new Date(periodStart.getTime() - diff);
}

export async function statisticsRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // ─── Overview ─────────────────────────────────────────────────────────────
  app.get("/api/v1/statistics/overview", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const prevStart = getPreviousPeriodStart(period, periodStart);
      const tid = user.tenantId;

      const [
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        noShowAppointments,
        prevCompleted,
        totalPatients,
        newPatients,
        prevNewPatients,
        activeInTreatment,
        pipelineByStage,
        newContactsCount,
        appointedCount,
        whatsappSent,
        whatsappReceived,
        aiInteractions,
        humanEscalations,
        completedItems,
        pendingItems,
      ] = await Promise.all([
        prisma.appointment.count({
          where: { tenantId: tid, startTime: { gte: periodStart } },
        }),
        prisma.appointment.count({
          where: { tenantId: tid, startTime: { gte: periodStart }, status: "COMPLETED" },
        }),
        prisma.appointment.count({
          where: { tenantId: tid, startTime: { gte: periodStart }, status: "CANCELLED" },
        }),
        prisma.appointment.count({
          where: { tenantId: tid, startTime: { gte: periodStart }, status: "NO_SHOW" },
        }),
        prisma.appointment.count({
          where: { tenantId: tid, startTime: { gte: prevStart, lt: periodStart }, status: "COMPLETED" },
        }),
        prisma.patient.count({ where: { tenantId: tid, isActive: true } }),
        prisma.patient.count({
          where: { tenantId: tid, isActive: true, createdAt: { gte: periodStart } },
        }),
        prisma.patient.count({
          where: { tenantId: tid, isActive: true, createdAt: { gte: prevStart, lt: periodStart } },
        }),
        // Active in treatment = patients with IN_PROGRESS treatment plan items
        prisma.treatmentPlanItem.groupBy({
          by: ["planId"],
          where: { tenantId: tid, status: "IN_PROGRESS" },
        }).then((r) => r.length),
        // Pipeline by stage
        prisma.pipelineStage.findMany({
          where: { tenantId: tid },
          orderBy: { order: "asc" },
          include: {
            patients: {
              include: {
                patient: {
                  select: {
                    treatmentPlans: {
                      where: { isActive: true },
                      select: { totalAmount: true },
                    },
                  },
                },
              },
            },
          },
        }),
        // Pipeline conversion: new contacts
        prisma.pipelineStage.findFirst({
          where: { tenantId: tid, order: 0 },
          include: { _count: { select: { patients: true } } },
        }).then((s) => s?._count?.patients ?? 0),
        // Pipeline conversion: those who got an appointment
        prisma.pipelineStage.findFirst({
          where: { tenantId: tid, order: 2 },
          include: { _count: { select: { patients: true } } },
        }).then((s) => s?._count?.patients ?? 0),
        // WhatsApp messages sent
        prisma.usageRecord.aggregate({
          where: { tenantId: tid, type: "WHATSAPP_MESSAGE", createdAt: { gte: periodStart } },
          _sum: { quantity: true },
        }).then((r) => r._sum.quantity ?? 0),
        // WhatsApp received (count inbound messages)
        prisma.message.count({
          where: {
            direction: "INBOUND",
            sentAt: { gte: periodStart },
            conversation: { tenantId: tid },
          },
        }),
        // AI interactions
        prisma.usageRecord.aggregate({
          where: { tenantId: tid, type: "AI_INTERACTION", createdAt: { gte: periodStart } },
          _sum: { quantity: true },
        }).then((r) => r._sum.quantity ?? 0),
        // Human escalations
        prisma.notification.count({
          where: { tenantId: tid, type: "human_needed", createdAt: { gte: periodStart } },
        }),
        // Revenue: completed treatment items
        prisma.treatmentPlanItem.findMany({
          where: { tenantId: tid, status: "COMPLETED", completedAt: { gte: periodStart } },
          select: { unitCost: true, quantity: true, discountPercent: true },
        }),
        // Revenue: pending treatment items
        prisma.treatmentPlanItem.findMany({
          where: { tenantId: tid, status: { in: ["PENDING", "IN_PROGRESS"] } },
          select: { unitCost: true, quantity: true, discountPercent: true },
        }),
      ]);

      // Calculate revenue
      const totalBilled = completedItems.reduce((sum, i) => {
        const cost = Number(i.unitCost) * i.quantity * (1 - (i.discountPercent ?? 0) / 100);
        return sum + cost;
      }, 0);
      const totalPending = pendingItems.reduce((sum, i) => {
        const cost = Number(i.unitCost) * i.quantity * (1 - (i.discountPercent ?? 0) / 100);
        return sum + cost;
      }, 0);

      const completionRate = totalAppointments > 0
        ? Math.round((completedAppointments / totalAppointments) * 100)
        : 0;

      const prevCompletedChange = prevCompleted > 0
        ? Math.round(((completedAppointments - prevCompleted) / prevCompleted) * 100)
        : 0;

      const prevNewPatientsChange = prevNewPatients > 0
        ? Math.round(((newPatients - prevNewPatients) / prevNewPatients) * 100)
        : 0;

      // Pipeline by stage
      const byStage = pipelineByStage.map((stage) => ({
        stageId: stage.id,
        stageName: stage.name,
        color: stage.color,
        count: stage.patients.length,
        value: stage.patients.reduce((sum, pp) => {
          const plans = pp.patient.treatmentPlans;
          return sum + plans.reduce((s, p) => s + p.totalAmount, 0);
        }, 0),
      }));

      // Conversion rate
      const totalPipelinePatients = byStage.reduce((s, st) => s + st.count, 0);
      const conversionRate = totalPipelinePatients > 0
        ? Math.round((appointedCount / totalPipelinePatients) * 100)
        : 0;

      return {
        appointments: {
          total: totalAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          noShow: noShowAppointments,
          completionRate,
          changePercent: prevCompletedChange,
        },
        patients: {
          total: totalPatients,
          newThisPeriod: newPatients,
          activeInTreatment,
          changePercent: prevNewPatientsChange,
        },
        revenue: {
          totalBilled: Math.round(totalBilled * 100) / 100,
          totalPending: Math.round(totalPending * 100) / 100,
          averageTicket: completedItems.length > 0
            ? Math.round((totalBilled / completedItems.length) * 100) / 100
            : 0,
        },
        pipeline: { byStage, conversionRate },
        whatsapp: {
          messagesSent: whatsappSent,
          messagesReceived: whatsappReceived,
          aiInteractions,
          humanEscalations,
        },
      };
    },
  });

  // ─── Appointments Chart ───────────────────────────────────────────────────
  app.get("/api/v1/statistics/appointments-chart", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const tid = user.tenantId;

      const appointments = await prisma.appointment.findMany({
        where: { tenantId: tid, startTime: { gte: periodStart } },
        select: { startTime: true, status: true },
        orderBy: { startTime: "asc" },
      });

      // Group by date (or week/month depending on period)
      const groupBy = period === "7d" ? "day" : period === "12m" ? "month" : "week";
      const grouped = new Map<string, { completed: number; cancelled: number; noShow: number }>();

      for (const apt of appointments) {
        let key: string;
        const d = apt.startTime;
        if (groupBy === "day") {
          key = d.toISOString().split("T")[0];
        } else if (groupBy === "month") {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } else {
          // Week: use Monday of the week
          const day = d.getDay();
          const monday = new Date(d);
          monday.setDate(d.getDate() - ((day + 6) % 7));
          key = monday.toISOString().split("T")[0];
        }

        if (!grouped.has(key)) {
          grouped.set(key, { completed: 0, cancelled: 0, noShow: 0 });
        }
        const g = grouped.get(key)!;
        if (apt.status === "COMPLETED") g.completed++;
        else if (apt.status === "CANCELLED") g.cancelled++;
        else if (apt.status === "NO_SHOW") g.noShow++;
      }

      return Array.from(grouped.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // ─── Revenue Chart ────────────────────────────────────────────────────────
  app.get("/api/v1/statistics/revenue-chart", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const tid = user.tenantId;

      const items = await prisma.treatmentPlanItem.findMany({
        where: {
          tenantId: tid,
          OR: [
            { status: "COMPLETED", completedAt: { gte: periodStart } },
            { status: { in: ["PENDING", "IN_PROGRESS"] }, createdAt: { gte: periodStart } },
          ],
        },
        select: { unitCost: true, quantity: true, discountPercent: true, status: true, completedAt: true, createdAt: true },
      });

      const groupBy = period === "7d" ? "day" : period === "12m" ? "month" : "week";
      const grouped = new Map<string, { billed: number; pending: number }>();

      for (const item of items) {
        const d = item.status === "COMPLETED" ? (item.completedAt ?? item.createdAt) : item.createdAt;
        let key: string;
        if (groupBy === "day") {
          key = d.toISOString().split("T")[0];
        } else if (groupBy === "month") {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } else {
          const day = d.getDay();
          const monday = new Date(d);
          monday.setDate(d.getDate() - ((day + 6) % 7));
          key = monday.toISOString().split("T")[0];
        }

        if (!grouped.has(key)) grouped.set(key, { billed: 0, pending: 0 });
        const g = grouped.get(key)!;
        const cost = Number(item.unitCost) * item.quantity * (1 - (item.discountPercent ?? 0) / 100);
        if (item.status === "COMPLETED") g.billed += cost;
        else g.pending += cost;
      }

      return Array.from(grouped.entries())
        .map(([date, val]) => ({
          date,
          billed: Math.round(val.billed * 100) / 100,
          pending: Math.round(val.pending * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // ─── Patients Chart ───────────────────────────────────────────────────────
  app.get("/api/v1/statistics/patients-chart", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const tid = user.tenantId;

      const patients = await prisma.patient.findMany({
        where: { tenantId: tid, createdAt: { gte: periodStart } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const appointments = await prisma.appointment.findMany({
        where: { tenantId: tid, startTime: { gte: periodStart } },
        select: { startTime: true },
        orderBy: { startTime: "asc" },
      });

      const groupBy = period === "7d" ? "day" : period === "12m" ? "month" : "week";
      const grouped = new Map<string, { newPatients: number; appointments: number }>();

      const getKey = (d: Date) => {
        if (groupBy === "day") return d.toISOString().split("T")[0];
        if (groupBy === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((day + 6) % 7));
        return monday.toISOString().split("T")[0];
      };

      for (const p of patients) {
        const key = getKey(p.createdAt);
        if (!grouped.has(key)) grouped.set(key, { newPatients: 0, appointments: 0 });
        grouped.get(key)!.newPatients++;
      }

      for (const a of appointments) {
        const key = getKey(a.startTime);
        if (!grouped.has(key)) grouped.set(key, { newPatients: 0, appointments: 0 });
        grouped.get(key)!.appointments++;
      }

      return Array.from(grouped.entries())
        .map(([date, val]) => ({ date, ...val }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // ─── Top Treatments ───────────────────────────────────────────────────────
  app.get("/api/v1/statistics/top-treatments", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const tid = user.tenantId;

      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId: tid,
          startTime: { gte: periodStart },
          treatmentTypeId: { not: null },
        },
        include: {
          treatmentType: { select: { name: true, price: true } },
        },
      });

      const treatmentMap = new Map<string, { name: string; count: number; revenue: number }>();
      for (const apt of appointments) {
        if (!apt.treatmentType) continue;
        const name = apt.treatmentType.name;
        if (!treatmentMap.has(name)) {
          treatmentMap.set(name, { name, count: 0, revenue: 0 });
        }
        const t = treatmentMap.get(name)!;
        t.count++;
        if (apt.status === "COMPLETED") {
          t.revenue += Number(apt.treatmentType.price ?? 0);
        }
      }

      return Array.from(treatmentMap.values())
        .map((t) => ({
          ...t,
          revenue: Math.round(t.revenue * 100) / 100,
          avgCost: t.count > 0 ? Math.round((t.revenue / t.count) * 100) / 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    },
  });

  // ─── Dentist Performance ──────────────────────────────────────────────────
  app.get("/api/v1/statistics/dentist-performance", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const tid = user.tenantId;

      const dentists = await prisma.dentist.findMany({
        where: { tenantId: tid, isActive: true },
        select: {
          id: true,
          name: true,
          color: true,
          appointments: {
            where: { startTime: { gte: periodStart } },
            select: { status: true, treatmentType: { select: { price: true } } },
          },
        },
      });

      return dentists.map((d) => ({
        dentistId: d.id,
        name: d.name,
        color: d.color,
        appointments: d.appointments.length,
        completed: d.appointments.filter((a) => a.status === "COMPLETED").length,
        cancelled: d.appointments.filter((a) => a.status === "CANCELLED").length,
        noShow: d.appointments.filter((a) => a.status === "NO_SHOW").length,
        revenue: Math.round(
          d.appointments
            .filter((a) => a.status === "COMPLETED")
            .reduce((sum, a) => sum + Number(a.treatmentType?.price ?? 0), 0) * 100
        ) / 100,
      })).sort((a, b) => b.completed - a.completed);
    },
  });

  // ─── Hours Heatmap ────────────────────────────────────────────────────────
  app.get("/api/v1/statistics/hours-heatmap", {
    preHandler,
    handler: async (request) => {
      const user = request.user as UserPayload;
      const { period = "30d" } = request.query as { period?: string };
      const periodStart = getPeriodStart(period);
      const tid = user.tenantId;

      const tenant = await prisma.tenant.findUnique({
        where: { id: tid },
        select: { timezone: true },
      });
      const tz = tenant?.timezone ?? "America/Argentina/Buenos_Aires";

      const appointments = await prisma.appointment.findMany({
        where: { tenantId: tid, startTime: { gte: periodStart } },
        select: { startTime: true },
      });

      // Build heatmap: dayOfWeek (0-6) x hour (8-20)
      const heatmap: { dayOfWeek: number; hour: number; count: number }[] = [];
      const map = new Map<string, number>();

      for (const apt of appointments) {
        const localTime = apt.startTime.toLocaleString("en-US", { timeZone: tz });
        const localDate = new Date(localTime);
        const day = localDate.getDay(); // 0=Sun
        const hour = localDate.getHours();
        const key = `${day}-${hour}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }

      for (let day = 0; day <= 6; day++) {
        for (let hour = 7; hour <= 21; hour++) {
          heatmap.push({
            dayOfWeek: day,
            hour,
            count: map.get(`${day}-${hour}`) ?? 0,
          });
        }
      }

      return heatmap;
    },
  });
}
