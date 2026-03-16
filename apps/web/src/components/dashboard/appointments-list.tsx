import { cn } from "@/lib/utils";
import { CalendarCheck } from "lucide-react";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  patient: { firstName: string; lastName: string };
  dentist: { name: string; color: string };
  treatmentType: { name: string } | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string; borderColor: string }> = {
  PENDING: { label: "Pendiente", className: "bg-amber-50 text-amber-700", borderColor: "border-l-amber-400" },
  CONFIRMED: { label: "Confirmada", className: "bg-blue-50 text-blue-700", borderColor: "border-l-blue-400" },
  IN_PROGRESS: { label: "En curso", className: "bg-primary-50 text-primary-700", borderColor: "border-l-primary-400" },
  COMPLETED: { label: "Completada", className: "bg-emerald-50 text-emerald-700", borderColor: "border-l-emerald-400" },
  CANCELLED: { label: "Cancelada", className: "bg-red-50 text-red-600", borderColor: "border-l-red-400" },
  NO_SHOW: { label: "No asistió", className: "bg-gray-100 text-gray-600", borderColor: "border-l-gray-400" },
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

interface Props {
  title: string;
  appointments: Appointment[];
  emptyMessage: string;
  showDate?: boolean;
}

export function AppointmentsList({ title, appointments, emptyMessage, showDate }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      {appointments.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CalendarCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {appointments.map((appt) => {
            const status = STATUS_LABELS[appt.status] ?? { label: appt.status, className: "bg-gray-50 text-gray-600", borderColor: "border-l-gray-400" };
            return (
              <li
                key={appt.id}
                className={cn(
                  "px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/80 transition-colors cursor-pointer border-l-[3px]",
                  status.borderColor
                )}
              >
                {/* Time */}
                <div className="text-center min-w-[52px]">
                  <p className="text-sm font-bold text-gray-900">{formatTime(appt.startTime)}</p>
                  {showDate && (
                    <p className="text-xs text-gray-400 capitalize">{formatDate(appt.startTime)}</p>
                  )}
                </div>

                {/* Color bar */}
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: appt.dentist.color }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appt.patient.firstName} {appt.patient.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {appt.treatmentType?.name ?? "Sin tratamiento"} · {appt.dentist.name}
                  </p>
                </div>

                {/* Status badge */}
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0", status.className)}>
                  {status.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
