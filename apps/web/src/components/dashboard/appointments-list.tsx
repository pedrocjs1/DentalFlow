import { cn } from "@/lib/utils";

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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-amber-50 text-amber-700" },
  CONFIRMED: { label: "Confirmada", className: "bg-green-50 text-green-700" },
  IN_PROGRESS: { label: "En curso", className: "bg-blue-50 text-blue-700" },
  COMPLETED: { label: "Completada", className: "bg-gray-50 text-gray-600" },
  CANCELLED: { label: "Cancelada", className: "bg-red-50 text-red-600" },
  NO_SHOW: { label: "No asistió", className: "bg-red-50 text-red-600" },
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
    <div className="bg-white rounded-xl border">
      <div className="px-5 py-4 border-b">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>

      {appointments.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-400 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <ul className="divide-y">
          {appointments.map((appt) => {
            const status = STATUS_LABELS[appt.status] ?? { label: appt.status, className: "bg-gray-50 text-gray-600" };
            return (
              <li key={appt.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
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
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0", status.className)}>
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
