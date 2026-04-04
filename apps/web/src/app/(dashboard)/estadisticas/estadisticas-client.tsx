"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import {
  CalendarCheck,
  UserPlus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Overview {
  appointments: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    completionRate: number;
    changePercent: number;
  };
  patients: {
    total: number;
    newThisPeriod: number;
    activeInTreatment: number;
    changePercent: number;
  };
  revenue: {
    totalBilled: number;
    totalPending: number;
    averageTicket: number;
  };
  pipeline: {
    byStage: { stageId: string; stageName: string; color: string; count: number; value: number }[];
    conversionRate: number;
  };
  whatsapp: {
    messagesSent: number;
    messagesReceived: number;
    aiInteractions: number;
    humanEscalations: number;
  };
}

interface ChartPoint {
  date: string;
  [key: string]: string | number;
}

interface TopTreatment {
  name: string;
  count: number;
  revenue: number;
  avgCost: number;
}

interface DentistPerf {
  dentistId: string;
  name: string;
  color: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
}

interface HeatmapPoint {
  dayOfWeek: number;
  hour: number;
  count: number;
}

const PERIODS = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "12m", label: "12 meses" },
];

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function EstadisticasClient() {
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [appointmentsChart, setAppointmentsChart] = useState<ChartPoint[]>([]);
  const [revenueChart, setRevenueChart] = useState<ChartPoint[]>([]);
  const [topTreatments, setTopTreatments] = useState<TopTreatment[]>([]);
  const [dentistPerf, setDentistPerf] = useState<DentistPerf[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await apiFetch<{
        overview: Overview;
        appointmentsChart: ChartPoint[];
        revenueChart: ChartPoint[];
        patientsChart: ChartPoint[];
        topTreatments: TopTreatment[];
        dentistPerformance: DentistPerf[];
        hoursHeatmap: HeatmapPoint[];
      }>(`/api/v1/statistics/all?period=${period}`);
      setOverview(all.overview);
      setAppointmentsChart(all.appointmentsChart);
      setRevenueChart(all.revenueChart);
      setTopTreatments(all.topTreatments);
      setDentistPerf(all.dentistPerformance);
      setHeatmap(all.hoursHeatmap);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12 text-gray-500">
        No se pudieron cargar las estadísticas
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Métricas y análisis de tu clínica
          </p>
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                period === p.value
                  ? "bg-primary-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Citas completadas"
          value={overview.appointments.completed}
          changePercent={overview.appointments.changePercent}
          icon={CalendarCheck}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          label="Pacientes nuevos"
          value={overview.patients.newThisPeriod}
          changePercent={overview.patients.changePercent}
          icon={UserPlus}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          label="Ingresos facturados"
          value={`$${overview.revenue.totalBilled.toLocaleString()}`}
          icon={DollarSign}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <MetricCard
          label="Tasa de asistencia"
          value={`${overview.appointments.completionRate}%`}
          icon={BarChart3}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Row 2: Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Citas por período</h3>
          {appointmentsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={appointmentsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDate} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(l) => formatDate(String(l))} />
                <Legend />
                <Line type="monotone" dataKey="completed" name="Completadas" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cancelled" name="Canceladas" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="noShow" name="No asistió" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Ingresos</h3>
          {revenueChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={formatDate} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip labelFormatter={(l) => formatDate(String(l))} formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="billed" name="Facturado" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pendiente" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Row 3: Treatments + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Treatments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top tratamientos</h3>
          {topTreatments.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topTreatments} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Bar dataKey="revenue" name="Ingresos" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Pipeline</h3>
            <span className="text-xs text-gray-500">
              Conversión: {overview.pipeline.conversionRate}%
            </span>
          </div>
          {overview.pipeline.byStage.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview.pipeline.byStage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="stageName" tick={{ fontSize: 11 }} width={130} />
                <Tooltip />
                <Bar dataKey="count" name="Pacientes" radius={[0, 4, 4, 0]}>
                  {overview.pipeline.byStage.map((stage) => (
                    <Cell key={stage.stageId} fill={stage.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Row 4: Dentist Performance + Hours Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dentist Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Rendimiento por dentista</h3>
          {dentistPerf.length > 0 ? (
            <div className="space-y-3">
              {dentistPerf.map((d) => {
                const maxAppts = Math.max(...dentistPerf.map((x) => x.appointments), 1);
                return (
                  <div key={d.dentistId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{d.name}</span>
                      <span className="text-gray-500">
                        {d.completed}/{d.appointments} citas · ${d.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${(d.appointments / maxAppts) * 100}%`,
                          backgroundColor: d.color || "#2563eb",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart />
          )}
        </div>

        {/* Hours Heatmap */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Horarios más ocupados</h3>
          {heatmap.length > 0 ? (
            <HeatmapGrid data={heatmap} />
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Row 5: WhatsApp Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">WhatsApp e IA</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat label="Mensajes enviados" value={overview.whatsapp.messagesSent} />
          <MiniStat label="Mensajes recibidos" value={overview.whatsapp.messagesReceived} />
          <MiniStat label="Interacciones IA" value={overview.whatsapp.aiInteractions} />
          <MiniStat label="Escalaciones humanas" value={overview.whatsapp.humanEscalations} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  changePercent,
  icon: Icon,
  color,
  bgColor,
}: {
  label: string;
  value: string | number;
  changePercent?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`${bgColor} p-2 rounded-lg`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {changePercent !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {changePercent >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              changePercent >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {changePercent > 0 ? "+" : ""}
            {changePercent}% vs anterior
          </span>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
      Sin datos en este período
    </div>
  );
}

function HeatmapGrid({ data }: { data: HeatmapPoint[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7-20

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[400px]">
        {/* Header */}
        <div className="flex gap-0.5 mb-1 ml-10">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] text-gray-400">
              {h}
            </div>
          ))}
        </div>
        {/* Grid rows */}
        {DAY_NAMES.map((day, dayIdx) => (
          <div key={day} className="flex gap-0.5 items-center mb-0.5">
            <span className="w-9 text-[10px] text-gray-500 text-right pr-1">{day}</span>
            {hours.map((hour) => {
              const point = data.find((d) => d.dayOfWeek === dayIdx && d.hour === hour);
              const count = point?.count ?? 0;
              const intensity = count / maxCount;
              return (
                <div
                  key={hour}
                  className="flex-1 aspect-square rounded-sm"
                  style={{
                    backgroundColor:
                      count === 0
                        ? "#f3f4f6"
                        : `rgba(37, 99, 235, ${0.15 + intensity * 0.85})`,
                  }}
                  title={`${day} ${hour}:00 — ${count} citas`}
                />
              );
            })}
          </div>
        ))}
        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 ml-10">
          <span className="text-[10px] text-gray-400">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <div
              key={v}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor:
                  v === 0 ? "#f3f4f6" : `rgba(37, 99, 235, ${0.15 + v * 0.85})`,
              }}
            />
          ))}
          <span className="text-[10px] text-gray-400">Más</span>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (dateStr.length === 7) {
    // YYYY-MM format
    const [y, m] = dateStr.split("-");
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return months[parseInt(m) - 1] ?? dateStr;
  }
  // YYYY-MM-DD format
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}
