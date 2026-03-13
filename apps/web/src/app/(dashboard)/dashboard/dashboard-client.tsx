"use client";

import { StatsCard } from "@/components/dashboard/stats-card";
import { AppointmentsList } from "@/components/dashboard/appointments-list";

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  patient: { firstName: string; lastName: string; phone?: string };
  dentist: { name: string; color: string };
  treatmentType: { name: string } | null;
}

interface DashboardData {
  stats: {
    appointmentsToday: number;
    newPatientsThisMonth: number;
    totalPatients: number;
    openConversations: number;
    activeCampaigns: number;
  };
  appointmentsTodayList: Appointment[];
  upcomingAppointments: Appointment[];
  tenant: { name: string; plan: string; subscriptionStatus: string };
  user: { name: string; email: string; role: string };
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  DENTIST: "Dentista",
  RECEPTIONIST: "Recepcionista",
};

export function DashboardClient({ data }: { data: DashboardData }) {
  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bienvenido, {data.user.name.split(" ")[0]}
          </h2>
          <p className="text-gray-500 mt-0.5 capitalize">{today}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{data.tenant.name}</p>
          <span className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium mt-1">
            {PLAN_LABELS[data.tenant.plan] ?? data.tenant.plan} · {ROLE_LABELS[data.user.role] ?? data.user.role}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Citas hoy"
          value={data.stats.appointmentsToday}
          description={
            data.stats.appointmentsToday === 0
              ? "Sin citas programadas"
              : `${data.stats.appointmentsToday} paciente${data.stats.appointmentsToday > 1 ? "s" : ""} esperados`
          }
          accent="teal"
        />
        <StatsCard
          title="Pacientes totales"
          value={data.stats.totalPatients}
          description={
            data.stats.newPatientsThisMonth > 0
              ? `+${data.stats.newPatientsThisMonth} este mes`
              : "Sin altas este mes"
          }
          accent="blue"
        />
        <StatsCard
          title="Conversaciones abiertas"
          value={data.stats.openConversations}
          description={
            data.stats.openConversations === 0
              ? "Todo al día"
              : "Requieren atención"
          }
          accent={data.stats.openConversations > 0 ? "amber" : "teal"}
        />
        <StatsCard
          title="Campañas activas"
          value={data.stats.activeCampaigns}
          description={
            data.stats.activeCampaigns === 0
              ? "Sin campañas en curso"
              : "En ejecución"
          }
          accent="purple"
        />
      </div>

      {/* Appointments sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AppointmentsList
          title="Citas de hoy"
          appointments={data.appointmentsTodayList}
          emptyMessage="No hay citas programadas para hoy"
        />
        <AppointmentsList
          title="Próximas citas"
          appointments={data.upcomingAppointments}
          emptyMessage="No hay citas próximas"
          showDate
        />
      </div>
    </div>
  );
}
