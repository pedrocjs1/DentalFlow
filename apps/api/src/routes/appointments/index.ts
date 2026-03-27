import type { FastifyInstance } from "fastify";
import { prisma } from "@dentiqa/db";
import { authMiddleware } from "../../middleware/auth-middleware.js";
import { tenantMiddleware } from "../../middleware/tenant-middleware.js";
import { AppError } from "../../errors/app-error.js";
import { syncPipelineFromAppointment } from "../pipeline/index.js";
import { createNotification } from "../../services/notifications.js";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getBlockedSlots,
  isGoogleCalendarConfigured,
} from "../../services/google-calendar.js";

// Convert a UTC date to local day-of-week and HH:MM time string in a given timezone
function getLocalInfo(date: Date, timezone: string): { dayOfWeek: number; timeStr: string } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  // Some Intl implementations return "24" for midnight
  const h = hour === "24" ? "00" : hour.padStart(2, "0");
  return {
    dayOfWeek: weekdayMap[weekday] ?? 1,
    timeStr: `${h}:${minute.padStart(2, "0")}`,
  };
}

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  const preHandler = [authMiddleware, tenantMiddleware];

  // Get appointments (by date range)
  app.get("/api/v1/appointments", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const query = request.query as {
        startDate?: string;
        endDate?: string;
        dentistId?: string;
        status?: string;
      };

      const appointments = await prisma.appointment.findMany({
        where: {
          tenantId: user.tenantId,
          ...(query.dentistId && { dentistId: query.dentistId }),
          ...(query.status && { status: query.status as any }),
          ...(query.startDate && query.endDate && {
            startTime: {
              gte: new Date(query.startDate),
              lte: new Date(query.endDate),
            },
          }),
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          dentist: { select: { id: true, name: true, color: true } },
          chair: { select: { id: true, name: true } },
          treatmentType: { select: { id: true, name: true, color: true, durationMin: true } },
        },
        orderBy: { startTime: "asc" },
      });

      return appointments;
    },
  });

  // Create appointment
  app.post("/api/v1/appointments", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const body = request.body as {
        patientId: string;
        dentistId: string;
        chairId?: string;
        treatmentTypeId?: string;
        startTime: string;
        endTime: string;
        notes?: string;
        source?: string;
      };

      const startTime = new Date(body.startTime);
      const endTime = new Date(body.endTime);

      // (c) Check for existing appointment conflicts
      const conflict = await prisma.appointment.findFirst({
        where: {
          tenantId: user.tenantId,
          dentistId: body.dentistId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          OR: [
            { startTime: { gte: startTime, lt: endTime } },
            { endTime: { gt: startTime, lte: endTime } },
            { startTime: { lte: startTime }, endTime: { gte: endTime } },
          ],
        },
      });

      if (conflict) {
        throw new AppError(409, "SLOT_TAKEN", "Ya existe una cita en ese horario para este dentista");
      }

      const [patient, dentist, treatmentType, tenant, tenantWorkingHours, gcalToken] = await Promise.all([
        prisma.patient.findFirst({ where: { id: body.patientId, tenantId: user.tenantId } }),
        prisma.dentist.findFirst({ where: { id: body.dentistId, tenantId: user.tenantId } }),
        body.treatmentTypeId
          ? prisma.treatmentType.findFirst({ where: { id: body.treatmentTypeId } })
          : null,
        prisma.tenant.findUnique({ where: { id: user.tenantId } }),
        prisma.workingHours.findMany({ where: { tenantId: user.tenantId, isActive: true } }),
        isGoogleCalendarConfigured()
          ? prisma.googleCalendarToken.findUnique({ where: { dentistId: body.dentistId } })
          : null,
      ]);

      if (!patient) throw new AppError(404, "PATIENT_NOT_FOUND", "Paciente no encontrado");
      if (!dentist) throw new AppError(404, "DENTIST_NOT_FOUND", "Dentista no encontrado");

      // (b) Working hours validation
      const tenantTimezone = tenant?.timezone ?? "America/Argentina/Buenos_Aires";
      const { dayOfWeek, timeStr: startTimeStr } = getLocalInfo(startTime, tenantTimezone);
      const { timeStr: endTimeStr } = getLocalInfo(endTime, tenantTimezone);
      const dayHours = tenantWorkingHours.find((wh) => wh.dayOfWeek === dayOfWeek);

      if (!dayHours) {
        throw new AppError(409, "OUTSIDE_HOURS", "Fuera del horario de atención de la clínica");
      }
      if (startTimeStr < dayHours.startTime || endTimeStr > dayHours.endTime) {
        throw new AppError(409, "OUTSIDE_HOURS", "Fuera del horario de atención de la clínica");
      }

      // (a) Google Calendar event conflict check
      if (gcalToken?.syncEnabled) {
        const blockedSlots = await getBlockedSlots({
          accessToken: gcalToken.accessToken,
          refreshToken: gcalToken.refreshToken,
          calendarId: gcalToken.calendarId,
          timeMin: startTime,
          timeMax: endTime,
        });
        const gcalConflict = blockedSlots.some(
          (slot) => slot.type === "event" && slot.start < endTime && slot.end > startTime
        );
        if (gcalConflict) {
          throw new AppError(
            409,
            "GCAL_CONFLICT",
            `El/la Dr/a. ${dentist.name} tiene un evento en ese horario`
          );
        }
      }

      const appointment = await prisma.appointment.create({
        data: {
          tenantId: user.tenantId,
          patientId: body.patientId,
          dentistId: body.dentistId,
          chairId: body.chairId,
          treatmentTypeId: body.treatmentTypeId,
          startTime,
          endTime,
          notes: body.notes,
          source: (body.source as any) ?? "MANUAL",
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          dentist: { select: { id: true, name: true, color: true } },
          treatmentType: { select: { id: true, name: true, durationMin: true } },
        },
      });

      // Google Calendar sync (reuse gcalToken already fetched above)
      if (gcalToken?.syncEnabled) {
        const eventId = await createCalendarEvent({
          accessToken: gcalToken.accessToken,
          refreshToken: gcalToken.refreshToken,
          calendarId: gcalToken.calendarId,
          summary: `${patient.firstName} ${patient.lastName}${treatmentType ? ` — ${treatmentType.name}` : ""}`,
          description: `Paciente: ${patient.firstName} ${patient.lastName}\nTel: ${patient.phone}${treatmentType ? `\nTratamiento: ${treatmentType.name}` : ""}${body.notes ? `\nNotas: ${body.notes}` : ""}`,
          startTime,
          endTime,
          timezone: tenant?.timezone ?? "America/Argentina/Buenos_Aires",
        });

        if (eventId) {
          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { googleEventId: eventId },
          });
        }
      }

      // Notification for manually created appointment
      createNotification(user.tenantId, {
        type: "new_appointment",
        title: "Nueva cita agendada",
        message: `${patient.firstName} ${patient.lastName} — ${treatmentType?.name ?? "Consulta"}`,
        link: "/agenda",
        metadata: { appointmentId: appointment.id, patientId: patient.id },
      }).catch(() => {});

      return reply.status(201).send(appointment);
    },
  });

  // Update appointment (status, reschedule, notes)
  app.patch("/api/v1/appointments/:id", {
    preHandler,
    handler: async (request) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };
      const body = request.body as {
        status?: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
        cancelReason?: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
        chairId?: string;
      };

      const appointment = await prisma.appointment.findFirst({
        where: { id, tenantId: user.tenantId },
      });
      if (!appointment) throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Cita no encontrada");

      // Validations when rescheduling
      if (body.startTime && body.endTime) {
        const startTime = new Date(body.startTime);
        const endTime = new Date(body.endTime);

        // (c) Existing appointment conflict
        const conflict = await prisma.appointment.findFirst({
          where: {
            tenantId: user.tenantId,
            dentistId: appointment.dentistId,
            id: { not: id },
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            OR: [
              { startTime: { gte: startTime, lt: endTime } },
              { endTime: { gt: startTime, lte: endTime } },
              { startTime: { lte: startTime }, endTime: { gte: endTime } },
            ],
          },
        });
        if (conflict) throw new AppError(409, "SLOT_TAKEN", "Ese horario ya está ocupado");

        // Fetch tenant, working hours and GCal token in parallel
        const [tenant, tenantWorkingHours, gcalToken] = await Promise.all([
          prisma.tenant.findUnique({ where: { id: user.tenantId } }),
          prisma.workingHours.findMany({ where: { tenantId: user.tenantId, isActive: true } }),
          isGoogleCalendarConfigured()
            ? prisma.googleCalendarToken.findUnique({ where: { dentistId: appointment.dentistId } })
            : null,
        ]);

        // (b) Working hours check
        const tenantTimezone = tenant?.timezone ?? "America/Argentina/Buenos_Aires";
        const { dayOfWeek, timeStr: startTimeStr } = getLocalInfo(startTime, tenantTimezone);
        const { timeStr: endTimeStr } = getLocalInfo(endTime, tenantTimezone);
        const dayHours = tenantWorkingHours.find((wh) => wh.dayOfWeek === dayOfWeek);
        if (!dayHours) {
          throw new AppError(409, "OUTSIDE_HOURS", "Fuera del horario de atención de la clínica");
        }
        if (startTimeStr < dayHours.startTime || endTimeStr > dayHours.endTime) {
          throw new AppError(409, "OUTSIDE_HOURS", "Fuera del horario de atención de la clínica");
        }

        // (a) Google Calendar conflict check
        if (gcalToken?.syncEnabled) {
          const blockedSlots = await getBlockedSlots({
            accessToken: gcalToken.accessToken,
            refreshToken: gcalToken.refreshToken,
            calendarId: gcalToken.calendarId,
            timeMin: startTime,
            timeMax: endTime,
          });
          const gcalConflict = blockedSlots.some(
            (slot) => slot.type === "event" && slot.start < endTime && slot.end > startTime
          );
          if (gcalConflict) {
            throw new AppError(409, "GCAL_CONFLICT", "El/la Dr/a tiene un evento en ese horario");
          }
        }
      }

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          ...(body.status !== undefined && { status: body.status }),
          ...(body.cancelReason !== undefined && { cancelReason: body.cancelReason }),
          ...(body.notes !== undefined && { notes: body.notes }),
          ...(body.chairId !== undefined && { chairId: body.chairId }),
          ...(body.startTime !== undefined && { startTime: new Date(body.startTime) }),
          ...(body.endTime !== undefined && { endTime: new Date(body.endTime) }),
          ...(body.status === "CANCELLED" && { cancelledAt: new Date() }),
          ...(body.status === "CONFIRMED" && { confirmedAt: new Date() }),
        },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
          dentist: { select: { id: true, name: true, color: true } },
          treatmentType: { select: { id: true, name: true, durationMin: true } },
        },
      });

      // Sync pipeline stage on any relevant appointment status change
      if (body.status && ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"].includes(body.status)) {
        let priorCompleted = 0;
        if (body.status === "COMPLETED") {
          priorCompleted = await prisma.appointment.count({
            where: { tenantId: user.tenantId, patientId: appointment.patientId, status: "COMPLETED", id: { not: id } },
          });
        }
        await syncPipelineFromAppointment(user.tenantId, appointment.patientId, body.status, priorCompleted);

        // Notifications for status changes from agenda
        const patientName = `${updated.patient.firstName} ${updated.patient.lastName}`.trim();
        const treatmentName = updated.treatmentType?.name ?? "Consulta";
        if (body.status === "COMPLETED") {
          createNotification(user.tenantId, {
            type: "appointment_completed",
            title: "Cita completada",
            message: `${patientName} — ${treatmentName}`,
            link: `/pacientes/${appointment.patientId}`,
            metadata: { appointmentId: id, patientId: appointment.patientId },
          }).catch(() => {});
        } else if (body.status === "NO_SHOW") {
          createNotification(user.tenantId, {
            type: "appointment_no_show",
            title: "No asistió",
            message: `${patientName} no se presentó a su cita`,
            link: `/pacientes/${appointment.patientId}`,
            metadata: { appointmentId: id, patientId: appointment.patientId },
          }).catch(() => {});
        } else if (body.status === "CANCELLED") {
          createNotification(user.tenantId, {
            type: "cancelled_appointment",
            title: "Cita cancelada",
            message: `${patientName} — cita cancelada desde agenda`,
            link: `/pacientes/${appointment.patientId}`,
            metadata: { appointmentId: id, patientId: appointment.patientId },
          }).catch(() => {});
        }
      }

      // Sync Google Calendar deletions
      if (
        isGoogleCalendarConfigured() &&
        appointment.googleEventId &&
        (body.status === "CANCELLED" || body.status === "NO_SHOW")
      ) {
        const gcalToken = await prisma.googleCalendarToken.findUnique({
          where: { dentistId: appointment.dentistId },
        });
        if (gcalToken?.syncEnabled) {
          await deleteCalendarEvent({
            accessToken: gcalToken.accessToken,
            refreshToken: gcalToken.refreshToken,
            calendarId: gcalToken.calendarId,
            eventId: appointment.googleEventId,
          });
        }
      }

      return updated;
    },
  });

  // Delete appointment
  app.delete("/api/v1/appointments/:id", {
    preHandler,
    handler: async (request, reply) => {
      const user = request.user as { tenantId: string };
      const { id } = request.params as { id: string };

      const appt = await prisma.appointment.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!appt) throw new AppError(404, "APPOINTMENT_NOT_FOUND", "Cita no encontrada");

      await prisma.appointment.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
}
