"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarCheck,
  Users,
  MessageSquare,
  Megaphone,
  TrendingUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AppointmentsList } from "@/components/dashboard/appointments-list";
import { UsageWidget } from "@/components/dashboard/usage-widget";
import { apiFetch } from "@/lib/api";

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
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Administrador",
  DENTIST: "Dentista",
  RECEPTIONIST: "Recepcionista",
};

interface MetricCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: string;
  accentClass: string;
}

function MetricCard({ title, value, description, icon, trend, accentClass }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 p-5 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1.5">{value}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            {trend && (
              <span className="inline-flex items-center text-emerald-600 font-medium">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                {trend}
              </span>
            )}
            {description}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function DashboardClient({ data: initialData }: { data: DashboardData | null }) {
  const [data, setData] = useState(initialData);

  // Polling: refresh stats every 30s when tab is visible
  const refreshDashboard = useCallback(async () => {
    try {
      const fresh = await apiFetch<DashboardData>("/api/v1/dashboard");
      setData(fresh);
    } catch {}
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) refreshDashboard();
    }, 60000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isOffline = !data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {data ? `Bienvenido, ${data.user.name.split(" ")[0]}` : "Bienvenido"}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{today}</p>
        </div>
        <div className="text-left sm:text-right">
          {data ? (
            <>
              <p className="text-sm font-medium text-gray-900">{data.tenant.name}</p>
              <span className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full font-medium mt-1">
                {PLAN_LABELS[data.tenant.plan] ?? data.tenant.plan} ·{" "}
                {ROLE_LABELS[data.user.role] ?? data.user.role}
              </span>
            </>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-medium">
              <WifiOff className="h-3 w-3" />
              Conectando con el servidor...
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Citas hoy"
          value={data?.stats.appointmentsToday ?? "—"}
          description={
            isOffline
              ? ""
              : data.stats.appointmentsToday === 0
              ? "Sin citas programadas"
              : `${data.stats.appointmentsToday} paciente${data.stats.appointmentsToday > 1 ? "s" : ""} esperados`
          }
          icon={<CalendarCheck className="h-5 w-5 text-blue-600" />}
          accentClass="bg-blue-50"
        />
        <MetricCard
          title="Pacientes totales"
          value={data?.stats.totalPatients ?? "—"}
          description={
            isOffline
              ? ""
              : data.stats.newPatientsThisMonth > 0
              ? `este mes`
              : "Sin altas este mes"
          }
          trend={
            !isOffline && data.stats.newPatientsThisMonth > 0
              ? `+${data.stats.newPatientsThisMonth}`
              : undefined
          }
          icon={<Users className="h-5 w-5 text-emerald-600" />}
          accentClass="bg-emerald-50"
        />
        <MetricCard
          title="Conversaciones abiertas"
          value={data?.stats.openConversations ?? "—"}
          description={
            isOffline
              ? ""
              : data.stats.openConversations === 0
              ? "Todo al día"
              : "Requieren atención"
          }
          icon={<MessageSquare className="h-5 w-5 text-amber-600" />}
          accentClass="bg-amber-50"
        />
        <MetricCard
          title="Campañas activas"
          value={data?.stats.activeCampaigns ?? "—"}
          description={
            isOffline
              ? ""
              : data.stats.activeCampaigns === 0
              ? "Sin campañas en curso"
              : "En ejecución"
          }
          icon={<Megaphone className="h-5 w-5 text-purple-600" />}
          accentClass="bg-purple-50"
        />
      </div>

      {/* Appointments + usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {isOffline ? (
            <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Wifi className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                No se pudieron cargar las citas
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Verificá que el servidor esté corriendo en localhost:3001
              </p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
        <div>
          <UsageWidget />
        </div>
      </div>
    </div>
  );
}
