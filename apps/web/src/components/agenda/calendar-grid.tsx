"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import {
  PIXELS_PER_MINUTE,
  getTopOffset,
  getHeight,
  formatHour,
  isSameDay,
  DAY_NAMES_SHORT,
  MONTH_NAMES,
  type AgendaAppointment,
  type AgendaDentist,
  type WorkingHoursEntry,
  isDentistAvailable,
  timeToMinutes,
  minutesToTime,
  snapTo15Min,
} from "./calendar-utils";

const STATUS_OPACITY: Record<string, number> = {
  PENDING: 0.8,
  CONFIRMED: 1,
  IN_PROGRESS: 1,
  COMPLETED: 0.55,
  CANCELLED: 0.35,
  NO_SHOW: 0.35,
};

const STATUS_LABELS_SHORT: Record<string, string> = {
  PENDING: "Pend.",
  CONFIRMED: "",
  IN_PROGRESS: "En curso",
  COMPLETED: "Compl.",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

interface DragState {
  appointmentId: string;
  offsetMinutes: number; // minutes from appointment start to where user grabbed
}

interface Props {
  days: Date[];
  appointments: AgendaAppointment[];
  dentists: AgendaDentist[];
  selectedDentistId: string | null; // null = show all
  tenantHours: WorkingHoursEntry[];
  dentistHours: Array<WorkingHoursEntry & { dentistId: string }>;
  googleBlockedSlots: Array<{ start: string; end: string; summary: string; dentistId: string }>;
  startHour: number;
  endHour: number;
  onSlotClick: (date: Date, dentistId: string | null) => void;
  onAppointmentClick: (appointment: AgendaAppointment) => void;
  onRefresh: () => void;
}

export function CalendarGrid({
  days,
  appointments,
  dentists,
  selectedDentistId,
  tenantHours,
  dentistHours,
  googleBlockedSlots,
  startHour,
  endHour,
  onSlotClick,
  onAppointmentClick,
  onRefresh,
}: Props) {
  const gridHeight = (endHour - startHour) * 60 * PIXELS_PER_MINUTE;
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const dragState = useRef<DragState | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);

  // Auto-dismiss drag error toast after 3s
  useEffect(() => {
    if (!dragError) return;
    const t = setTimeout(() => setDragError(null), 3000);
    return () => clearTimeout(t);
  }, [dragError]);

  const visibleDentists = selectedDentistId
    ? dentists.filter((d) => d.id === selectedDentistId)
    : dentists;

  // Group appointments by day
  function getAppointmentsForDay(day: Date): AgendaAppointment[] {
    return appointments.filter((a) => {
      const apptDay = new Date(a.startTime);
      return (
        isSameDay(apptDay, day) &&
        (!selectedDentistId || a.dentist.id === selectedDentistId)
      );
    });
  }

  // Get Google blocked slots for a specific dentist's day.
  // Never shown in "Todos" view (dentistId === null) — private events are personal.
  function getBlockedForDay(day: Date, dentistId: string | null) {
    if (dentistId === null) return [];
    return googleBlockedSlots.filter(
      (s) => isSameDay(new Date(s.start), day) && s.dentistId === dentistId
    );
  }

  // Drag handlers
  function handleDragStart(e: React.DragEvent, appt: AgendaAppointment) {
    const start = new Date(appt.startTime);
    const grabMinutes = start.getHours() * 60 + start.getMinutes();
    dragState.current = { appointmentId: appt.id, offsetMinutes: 0 };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", appt.id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, day: Date) {
    e.preventDefault();
    if (!dragState.current) return;

    const apptId = e.dataTransfer.getData("text/plain");
    const appt = appointments.find((a) => a.id === apptId);
    if (!appt) return;

    const dayColumn = e.currentTarget as HTMLElement;
    const rect = dayColumn.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesFromStart = Math.round(y / PIXELS_PER_MINUTE / 15) * 15;
    const newStartMinutes = startHour * 60 + minutesFromStart;

    const duration = (new Date(appt.endTime).getTime() - new Date(appt.startTime).getTime()) / 60_000;

    const newStart = new Date(day);
    newStart.setHours(Math.floor(newStartMinutes / 60), newStartMinutes % 60, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration * 60_000);

    // Don't do anything if same time same day
    const oldStart = new Date(appt.startTime);
    if (newStart.getTime() === oldStart.getTime()) return;

    // Client-side: working hours check
    const localDay = newStart.getDay();
    const pad = (n: number) => String(n).padStart(2, "0");
    const newStartStr = `${pad(newStart.getHours())}:${pad(newStart.getMinutes())}`;
    const newEndStr = `${pad(newEnd.getHours())}:${pad(newEnd.getMinutes())}`;
    const dayHours = tenantHours.find((wh) => wh.dayOfWeek === localDay);
    if (!dayHours || newStartStr < dayHours.startTime || newEndStr > dayHours.endTime) {
      setDragError("Fuera del horario de atención de la clínica");
      dragState.current = null;
      return;
    }

    // Client-side: Google Calendar conflict check — only blocks if SAME dentist
    const gcalConflict = googleBlockedSlots.find((slot) => {
      if (slot.dentistId !== appt.dentist.id) return false;
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      return slotStart < newEnd && slotEnd > newStart;
    });
    if (gcalConflict) {
      setDragError(
        `No se puede mover la cita: ${appt.dentist.name} tiene un evento privado en ese horario`
      );
      dragState.current = null;
      return;
    }

    try {
      await apiFetch(`/api/v1/appointments/${apptId}`, {
        method: "PATCH",
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        }),
      });
      onRefresh();
    } catch (err: any) {
      const code = err?.code;
      if (code === "GCAL_CONFLICT") {
        setDragError(`${appt.dentist.name} tiene un evento en ese horario`);
      } else if (code === "OUTSIDE_HOURS") {
        setDragError("Fuera del horario de atención de la clínica");
      }
      // UI stays unchanged (no refresh) — appointment returns to original position
    }

    dragState.current = null;
  }

  const isToday = (day: Date) => isSameDay(day, new Date());
  const isWeekView = days.length > 1;

  return (
    <div className="relative">
      {/* Drag error toast */}
      {dragError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 pointer-events-none animate-in fade-in slide-in-from-bottom-2">
          <span>⚠</span>
          {dragError}
        </div>
      )}
    <div className="flex overflow-x-auto">
      {/* Time column */}
      <div className="flex-shrink-0 w-14" style={{ marginTop: isWeekView ? 52 : 0 }}>
        <div className="relative" style={{ height: gridHeight }}>
          {hours.map((hour) => (
            <div
              key={hour}
              className="absolute w-full text-right pr-2"
              style={{ top: (hour - startHour) * 60 * PIXELS_PER_MINUTE - 8 }}
            >
              <span className="text-[11px] text-gray-400 font-medium">{formatHour(hour)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div className="flex flex-1 min-w-0">
        {days.map((day) => {
          const dayOfWeek = day.getDay(); // 0=Sun
          const fdiDay = dayOfWeek === 0 ? 0 : dayOfWeek; // keep as-is
          const dayAppts = getAppointmentsForDay(day);

          return (
            <div key={day.toISOString()} className="flex-1 min-w-[120px] border-l first:border-l-0">
              {/* Day header (week view only) */}
              {isWeekView && (
                <div
                  className={cn(
                    "h-[52px] flex flex-col items-center justify-center border-b sticky top-0 bg-white z-10",
                    isToday(day) && "bg-primary-50"
                  )}
                >
                  <span className="text-xs font-medium text-gray-500">
                    {DAY_NAMES_SHORT[dayOfWeek]}
                  </span>
                  <span
                    className={cn(
                      "text-lg font-bold leading-tight",
                      isToday(day) ? "text-primary-600" : "text-gray-900"
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
              )}

              {/* Grid */}
              <div
                className="relative"
                style={{ height: gridHeight }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-gray-100"
                    style={{ top: (hour - startHour) * 60 * PIXELS_PER_MINUTE }}
                  />
                ))}

                {/* Half-hour lines */}
                {hours.map((hour) => (
                  <div
                    key={`${hour}-half`}
                    className="absolute w-full border-t border-dashed border-gray-50"
                    style={{ top: ((hour - startHour) * 60 + 30) * PIXELS_PER_MINUTE }}
                  />
                ))}

                {/* Clickable slot overlay */}
                <div
                  className="absolute inset-0 z-0"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const minutesFromStart = Math.round(y / PIXELS_PER_MINUTE / 15) * 15;
                    const slotMinutes = startHour * 60 + minutesFromStart;
                    const slotDate = new Date(day);
                    slotDate.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0);
                    onSlotClick(slotDate, selectedDentistId);
                  }}
                />

                {/* Unavailable dentist overlay */}
                {selectedDentistId && !isDentistAvailable(fdiDay, selectedDentistId, dentistHours, tenantHours) && (
                  <div className="absolute inset-0 bg-gray-100/80 z-1 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-medium bg-white px-2 py-1 rounded shadow-sm">
                      No disponible
                    </span>
                  </div>
                )}

                {/* Google Calendar blocked slots — title is always hidden for privacy */}
                {getBlockedForDay(day, selectedDentistId).map((slot, i) => {
                  const top = getTopOffset(new Date(slot.start), startHour * 60);
                  const height = getHeight(new Date(slot.start), new Date(slot.end));
                  return (
                    <div
                      key={i}
                      className="absolute left-0.5 right-0.5 rounded bg-gray-200/80 border border-gray-300 z-1 overflow-hidden"
                      style={{ top, height }}
                      title="Evento privado de Google Calendar"
                    >
                      <div className="px-1.5 py-0.5">
                        <p className="text-[10px] text-gray-500 font-medium truncate">
                          🔒 Evento privado — No disponible
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Appointments */}
                {dayAppts.map((appt, idx) => {
                  const start = new Date(appt.startTime);
                  const end = new Date(appt.endTime);
                  const top = getTopOffset(start, startHour * 60);
                  const height = getHeight(start, end);
                  const opacity = STATUS_OPACITY[appt.status] ?? 1;
                  const statusLabel = STATUS_LABELS_SHORT[appt.status];

                  // Overlap offset for same-day same-dentist
                  const sameSlot = dayAppts.slice(0, idx).filter((a) => {
                    const as = new Date(a.startTime).getTime();
                    const ae = new Date(a.endTime).getTime();
                    const bs = start.getTime();
                    const be = end.getTime();
                    return as < be && ae > bs;
                  });
                  const leftOffset = sameSlot.length * 4;

                  return (
                    <div
                      key={appt.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appt)}
                      onClick={(e) => { e.stopPropagation(); onAppointmentClick(appt); }}
                      className="absolute rounded-lg border cursor-pointer hover:z-20 transition-shadow hover:shadow-md select-none"
                      style={{
                        top,
                        height: Math.max(height, 24),
                        left: `${2 + leftOffset}px`,
                        right: "2px",
                        backgroundColor: appt.dentist.color + "22",
                        borderColor: appt.dentist.color,
                        borderLeftWidth: 3,
                        opacity,
                        zIndex: 10,
                      }}
                    >
                      <div className="px-1.5 py-0.5 overflow-hidden">
                        <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: appt.dentist.color }}>
                          {new Date(appt.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}
                          {statusLabel && <span className="ml-1 font-normal opacity-70">{statusLabel}</span>}
                        </p>
                        {height > 28 && (
                          <p className="text-[11px] text-gray-800 truncate leading-tight font-medium">
                            {appt.patient.firstName} {appt.patient.lastName}
                          </p>
                        )}
                        {height > 44 && appt.treatmentType && (
                          <p className="text-[10px] text-gray-500 truncate leading-tight">
                            {appt.treatmentType.name}
                          </p>
                        )}
                        {!isWeekView && height > 60 && (
                          <p className="text-[10px] text-gray-400 truncate leading-tight">
                            {appt.dentist.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {isToday(day) && (() => {
                  const now = new Date();
                  const nowMinutes = now.getHours() * 60 + now.getMinutes();
                  if (nowMinutes < startHour * 60 || nowMinutes > endHour * 60) return null;
                  const top = getTopOffset(now, startHour * 60);
                  return (
                    <div
                      key="now"
                      className="absolute left-0 right-0 z-30 pointer-events-none"
                      style={{ top }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        <div className="flex-1 h-px bg-red-400" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
