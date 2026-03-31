"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { getStoredUser } from "@/lib/permissions";
import { CalendarGrid } from "@/components/agenda/calendar-grid";
import { CreateAppointmentModal } from "@/components/agenda/create-appointment-modal";
import { AppointmentDetailModal } from "@/components/agenda/appointment-detail-modal";
import {
  getWeekDates,
  getDayDate,
  getCalendarBounds,
  DAY_NAMES_FULL,
  MONTH_NAMES,
  type AgendaAppointment,
  type AgendaDentist,
  type WorkingHoursEntry,
} from "@/components/agenda/calendar-utils";

interface TreatmentType {
  id: string;
  name: string;
  durationMin: number;
  price: string | null;
}

interface Props {
  initialDentists: AgendaDentist[];
  initialTreatmentTypes: TreatmentType[];
  initialTenantHours: WorkingHoursEntry[];
}

type ViewMode = "week" | "day";

export function AgendaClient({ initialDentists, initialTreatmentTypes, initialTenantHours }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDentistId, setSelectedDentistId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [dentistHours, setDentistHours] = useState<Array<WorkingHoursEntry & { dentistId: string }>>([]);
  const [googleBlockedSlots, setGoogleBlockedSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-lock to own dentist profile for DENTIST role
  const [isDentistLocked, setIsDentistLocked] = useState(false);
  useEffect(() => {
    const user = getStoredUser();
    if (user?.role === "DENTIST") {
      // Use the direct dentistId link from the user's JWT/stored data
      const dentistIdFromUser = (user as any).dentistId as string | undefined;
      const match = dentistIdFromUser
        ? initialDentists.find((d) => d.id === dentistIdFromUser)
        : initialDentists.find((d) => d.userId === user.id || d.email === user.email);
      if (match) {
        setSelectedDentistId(match.id);
        setIsDentistLocked(true);
      }
    }
  }, [initialDentists]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<Date | null>(null);
  const [createInitialDentist, setCreateInitialDentist] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaAppointment | null>(null);

  const days = viewMode === "week" ? getWeekDates(currentDate) : getDayDate(currentDate);
  const { startHour, endHour } = getCalendarBounds(initialTenantHours);

  const fetchAppointments = useCallback(async () => {
    if (days.length === 0) return;
    setLoading(true);
    try {
      const startDate = new Date(days[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(days[days.length - 1]);
      endDate.setHours(23, 59, 59, 999);

      const qs = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      if (selectedDentistId) qs.set("dentistId", selectedDentistId);

      const data = await apiFetch<AgendaAppointment[]>(`/api/v1/appointments?${qs.toString()}`);
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  }, [days[0]?.toISOString(), selectedDentistId]);

  const fetchDentistHours = useCallback(async () => {
    const data = await apiFetch<{ dentistHours: Array<WorkingHoursEntry & { dentistId: string }> }>(
      "/api/v1/agenda/working-hours"
    );
    setDentistHours(data.dentistHours);
  }, []);

  const fetchGoogleBlockedSlots = useCallback(async () => {
    if (days.length === 0) return;
    try {
      const startDate = new Date(days[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(days[days.length - 1]);
      endDate.setHours(23, 59, 59, 999);

      const qs = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      // If a dentist is selected, filter by them; otherwise fetch for all dentists.
      if (selectedDentistId) qs.set("dentistId", selectedDentistId);

      const data = await apiFetch<{
        slots: Array<{ start: string; end: string; summary: string; type: string; dentistId: string }>;
      }>(`/api/v1/google-calendar/blocked-slots?${qs.toString()}`);
      setGoogleBlockedSlots(data.slots);
    } catch {
      setGoogleBlockedSlots([]);
    }
  }, [selectedDentistId, days[0]?.toISOString()]);

  useEffect(() => {
    fetchAppointments();
    fetchDentistHours();
  }, [fetchAppointments, fetchDentistHours]);

  useEffect(() => {
    fetchGoogleBlockedSlots();
  }, [fetchGoogleBlockedSlots]);

  // Polling: refresh appointments every 30s when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchAppointments();
        fetchGoogleBlockedSlots();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAppointments, fetchGoogleBlockedSlots]);

  function navigate(direction: -1 | 1) {
    const d = new Date(currentDate);
    if (viewMode === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setDate(d.getDate() + direction);
    }
    setCurrentDate(d);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function handleSlotClick(date: Date, dentistId: string | null) {
    setCreateInitialDate(date);
    setCreateInitialDentist(dentistId ?? selectedDentistId);
    setCreateOpen(true);
  }

  function handleAppointmentClick(appt: AgendaAppointment) {
    setSelectedAppointment(appt);
    setDetailOpen(true);
  }

  // Format header title
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  let headerTitle: string;
  if (viewMode === "day") {
    headerTitle = `${DAY_NAMES_FULL[firstDay.getDay()]}, ${firstDay.getDate()} de ${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  } else if (firstDay.getMonth() === lastDay.getMonth()) {
    headerTitle = `${firstDay.getDate()} – ${lastDay.getDate()} de ${MONTH_NAMES[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  } else {
    headerTitle = `${firstDay.getDate()} ${MONTH_NAMES[firstDay.getMonth()]} – ${lastDay.getDate()} ${MONTH_NAMES[lastDay.getMonth()]} ${firstDay.getFullYear()}`;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-2xl font-bold text-gray-900 mr-2">Agenda</h2>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <h3 className="text-base font-semibold text-gray-700 flex-1 capitalize">{headerTitle}</h3>

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode("day")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "day"
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Día
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l ${
              viewMode === "week"
                ? "bg-primary-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Semana
          </button>
        </div>

        {/* Dentist filter */}
        <div className={`flex items-center gap-2 ${isDentistLocked ? "opacity-60 pointer-events-none" : ""}`}>
          <button
            onClick={() => setSelectedDentistId(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              selectedDentistId === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>

          {initialDentists.length <= 3 ? (
            // Few dentists: individual buttons with full name
            initialDentists.map((d) => {
              const isBirthday = d.birthdate
                ? (() => {
                    const bd = new Date(d.birthdate);
                    const today = new Date();
                    return bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate();
                  })()
                : false;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDentistId(d.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    selectedDentistId === d.id
                      ? "text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  style={selectedDentistId === d.id ? { backgroundColor: d.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedDentistId === d.id ? "white" : d.color }}
                  />
                  {d.name}
                  {isBirthday && <span title="¡Cumpleaños hoy!">🎂</span>}
                </button>
              );
            })
          ) : (
            // Many dentists: dropdown
            <div className="relative">
              <select
                value={selectedDentistId ?? ""}
                onChange={(e) => setSelectedDentistId(e.target.value || null)}
                className="appearance-none text-sm border border-gray-200 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-gray-700 cursor-pointer"
                style={
                  selectedDentistId
                    ? {
                        backgroundColor:
                          initialDentists.find((d) => d.id === selectedDentistId)?.color + "22",
                        borderColor:
                          initialDentists.find((d) => d.id === selectedDentistId)?.color,
                      }
                    : {}
                }
              >
                <option value="">Seleccionar dentista...</option>
                {initialDentists.map((d) => {
                  const isBirthday = d.birthdate
                    ? (() => {
                        const bd = new Date(d.birthdate);
                        const today = new Date();
                        return bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate();
                      })()
                    : false;
                  return (
                    <option key={d.id} value={d.id}>
                      {isBirthday ? "🎂 " : ""}{d.name}
                    </option>
                  );
                })}
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
            </div>
          )}
        </div>

        <Button size="sm" onClick={() => { setCreateInitialDate(null); setCreateOpen(true); }}>
          + Nueva cita
        </Button>
      </div>

      {/* Calendar */}
      <div className="flex-1 bg-white rounded-xl border overflow-auto relative">
        {loading && (
          <div className="absolute top-2 right-3 z-50">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="p-3">
          <CalendarGrid
            days={days}
            appointments={appointments}
            dentists={initialDentists}
            selectedDentistId={selectedDentistId}
            tenantHours={initialTenantHours}
            dentistHours={dentistHours}
            googleBlockedSlots={googleBlockedSlots}
            startHour={startHour}
            endHour={endHour}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
            onRefresh={fetchAppointments}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateAppointmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchAppointments}
        initialDate={createInitialDate}
        initialDentistId={createInitialDentist}
        dentists={initialDentists}
        treatmentTypes={initialTreatmentTypes}
      />

      <AppointmentDetailModal
        appointment={selectedAppointment}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRefresh={fetchAppointments}
      />
    </div>
  );
}
