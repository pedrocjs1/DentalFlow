"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  FileText,
  Camera,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  User,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MedicalAlert {
  label: string;
  severity: "high" | "medium";
}

interface StatCard {
  label: string;
  value: number;
  extra?: string;
  icon: React.ReactNode;
  bg: string;
  iconBg: string;
}

interface TreatmentPlanItem {
  id: string;
  procedureName: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  toothFdi: number | null;
  unitCost: number;
  quantity: number;
}

interface ActivePlan {
  id: string;
  title: string;
  totalItems: number;
  completedItems: number;
  items: TreatmentPlanItem[];
}

interface UpcomingAppointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  dentistName: string;
  treatmentName: string | null;
}

interface RecentActivity {
  id: string;
  type: "evolution" | "appointment" | "treatment" | "finding" | "image" | "medical_history";
  description: string;
  date: string;
}

interface MedicalHistory {
  allergies?: string[];
  latexAllergy?: boolean;
  anestheticAllergy?: boolean;
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasHeartDisease?: boolean;
  hasAsthma?: boolean;
  hasHIV?: boolean;
  hasEpilepsy?: boolean;
  isPregnant?: boolean;
  hasBruxism?: boolean;
  isSmoker?: boolean;
  medications?: string[];
}

interface SummaryData {
  medicalHistory: MedicalHistory | null;
  stats: {
    findingsCount: number;
    pendingTreatments: { count: number; value: number };
    evolutionsCount: number;
    imagesCount: number;
  };
  activePlan: ActivePlan | null;
  upcomingAppointments: UpcomingAppointment[];
  recentActivities: RecentActivity[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  // Handle both ISO strings and HH:mm formats
  if (timeStr.includes("T")) {
    return new Date(timeStr).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return timeStr;
}

function buildMedicalAlerts(mh: MedicalHistory | null): MedicalAlert[] {
  if (!mh) return [];
  const alerts: MedicalAlert[] = [];

  if (mh.allergies && mh.allergies.length > 0) {
    mh.allergies.forEach((a) => alerts.push({ label: `Alergia: ${a}`, severity: "high" }));
  }
  if (mh.latexAllergy) alerts.push({ label: "Alergia al latex", severity: "high" });
  if (mh.anestheticAllergy) alerts.push({ label: "Alergia a anestesia", severity: "high" });
  if (mh.hasDiabetes) alerts.push({ label: "Diabetes", severity: "medium" });
  if (mh.hasHypertension) alerts.push({ label: "Hipertension", severity: "medium" });
  if (mh.hasHeartDisease) alerts.push({ label: "Cardiopatia", severity: "high" });
  if (mh.hasAsthma) alerts.push({ label: "Asma", severity: "medium" });
  if (mh.hasHIV) alerts.push({ label: "HIV+", severity: "high" });
  if (mh.hasEpilepsy) alerts.push({ label: "Epilepsia", severity: "high" });
  if (mh.isPregnant) alerts.push({ label: "Embarazo", severity: "high" });
  if (mh.hasBruxism) alerts.push({ label: "Bruxismo", severity: "medium" });
  if (mh.isSmoker) alerts.push({ label: "Fumador/a", severity: "medium" });
  if (mh.medications && mh.medications.length > 0) {
    alerts.push({ label: `Medicamentos: ${mh.medications.join(", ")}`, severity: "medium" });
  }

  return alerts;
}

const ITEM_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-600",
};

const ITEM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const APPOINTMENT_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-600",
  COMPLETED: "bg-blue-50 text-blue-700",
  NO_SHOW: "bg-gray-100 text-gray-500",
};

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
  NO_SHOW: "No asistio",
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  evolution: <FileText className="h-4 w-4 text-green-600" />,
  appointment: <Calendar className="h-4 w-4 text-blue-600" />,
  treatment: <ClipboardList className="h-4 w-4 text-amber-600" />,
  finding: <Stethoscope className="h-4 w-4 text-purple-600" />,
  image: <Camera className="h-4 w-4 text-pink-600" />,
  medical_history: <Activity className="h-4 w-4 text-red-600" />,
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-100 rounded w-1/2" />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-100 rounded-full w-24" />
          <div className="h-6 bg-gray-100 rounded-full w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="bg-white rounded-xl border shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SummaryTab({ patientId }: { patientId: string }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const result = await apiFetch<SummaryData>(
          `/api/v1/patients/${patientId}/summary`
        );
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Error al cargar el resumen");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-8 text-center">
        <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={() => { setLoading(true); setError(null); }}
          className="mt-3 text-sm text-[#2563eb] hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const alerts = buildMedicalAlerts(data.medicalHistory ?? null);
  const stats = data.stats ?? { findingsCount: 0, pendingTreatments: { count: 0, value: 0 }, completedTreatments: 0, evolutionsCount: 0, imagesCount: 0 };
  const upcoming = data.upcomingAppointments ?? [];
  const activities = data.recentActivities ?? [];

  const statCards: StatCard[] = [
    {
      label: "Hallazgos",
      value: stats.findingsCount ?? 0,
      icon: <Stethoscope className="h-5 w-5" />,
      bg: "bg-blue-50",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      label: "Tratamientos pendientes",
      value: stats.pendingTreatments?.count ?? 0,
      extra: (stats.pendingTreatments?.value ?? 0) > 0
        ? `$${(stats.pendingTreatments.value ?? 0).toLocaleString("es-AR")}`
        : undefined,
      icon: <ClipboardList className="h-5 w-5" />,
      bg: "bg-amber-50",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      label: "Evoluciones",
      value: stats.evolutionsCount ?? 0,
      icon: <FileText className="h-5 w-5" />,
      bg: "bg-green-50",
      iconBg: "bg-green-100 text-green-600",
    },
    {
      label: "Imagenes",
      value: stats.imagesCount ?? 0,
      icon: <Camera className="h-5 w-5" />,
      bg: "bg-purple-50",
      iconBg: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Section 1: Alertas Medicas ── */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-gray-400" />
          Alertas Medicas
        </h3>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              Sin alertas medicas
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {alerts.map((alert, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  alert.severity === "high"
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                    : "bg-orange-50 text-orange-700 ring-1 ring-orange-200"
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {alert.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Resumen Clinico — Stats Cards ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          Resumen Clinico
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={cn(
                "rounded-xl border shadow-sm p-4 flex items-start gap-3",
                card.bg
              )}
            >
              <div className={cn("rounded-lg p-2", card.iconBg)}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 truncate">
                  {card.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">
                  {card.value}
                </p>
                {card.extra && (
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    {card.extra}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Plan de Tratamiento Activo ── */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-gray-400" />
          Plan de Tratamiento Activo
        </h3>

        {!data?.activePlan ? (
          <div className="text-center py-6">
            <ClipboardList className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin plan de tratamiento activo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plan header + progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">
                  {data?.activePlan.title}
                </p>
                <span className="text-xs text-gray-500">
                  {data?.activePlan.completedItems}/{data?.activePlan.totalItems} completados
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      data?.activePlan.totalItems > 0
                        ? Math.round(
                            (data?.activePlan.completedItems / data?.activePlan.totalItems) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Plan items (first 5) */}
            <div className="divide-y">
              {data?.activePlan.items.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2.5 first:pt-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : item.status === "CANCELLED" ? (
                      <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex-shrink-0",
                        item.status === "IN_PROGRESS"
                          ? "border-blue-500 bg-blue-100"
                          : "border-gray-300"
                      )} />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      item.status === "COMPLETED" && "text-gray-400 line-through",
                      item.status === "CANCELLED" && "text-gray-400 line-through",
                    )}>
                      {item.toothFdi ? `#${item.toothFdi} — ` : ""}
                      {item.procedureName}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2",
                      ITEM_STATUS_STYLES[item.status] ?? "bg-gray-100 text-gray-600"
                    )}
                  >
                    {ITEM_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
              ))}
              {data?.activePlan.items.length > 5 && (
                <p className="text-xs text-gray-400 pt-2">
                  +{data?.activePlan.items.length - 5} items mas
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 4: Proximas Citas ── */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          Proximas Citas
        </h3>

        {upcoming.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin citas programadas</p>
          </div>
        ) : (
          <div className="divide-y">
            {upcoming.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-[#2563eb]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {apt.treatmentName ?? "Consulta"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span>{formatDate(apt.date)}</span>
                      <span className="text-gray-300">|</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(apt.startTime)}
                        {apt.endTime ? ` - ${formatTime(apt.endTime)}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <User className="h-3 w-3" />
                      {apt.dentistName}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2",
                    APPOINTMENT_STATUS_STYLES[apt.status] ?? "bg-gray-100 text-gray-600"
                  )}
                >
                  {APPOINTMENT_STATUS_LABELS[apt.status] ?? apt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Section 5: Ultimas Actividades — Timeline ── */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          Ultimas Actividades
        </h3>

        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Sin actividad reciente</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

            <div className="space-y-0">
              {activities.slice(0, 10).map((activity, idx) => (
                <div key={activity.id} className="relative flex items-start gap-3 py-2.5">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 h-[30px] w-[30px] rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                    {ACTIVITY_ICONS[activity.type] ?? (
                      <Activity className="h-4 w-4 text-gray-400" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-gray-700 leading-snug">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
