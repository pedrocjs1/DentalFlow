"use client";

import { useEffect, useState } from "react";
import { ADMIN_API_BASE } from "@/lib/admin-api";

interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  pastDueTenants: number;
  totalPatients: number;
  appointmentsToday: number;
  appointmentsThisMonth: number;
  messagesToday: number;
  messagesThisMonth: number;
  mrr: number;
  growth: Array<{ month: string; count: number }>;
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("df_admin_token");
    if (!token) return;

    fetch(
      `${ADMIN_API_BASE}/api/v1/admin/dashboard/stats`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Error cargando estadísticas"));
  }, []);

  if (error) {
    return (
      <div className="p-4 md:p-8 text-red-400">{error}</div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 md:p-8 text-gray-500">Cargando...</div>
    );
  }

  const mrrFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(stats.mrr);

  const maxGrowth = Math.max(...stats.growth.map((g) => g.count), 1);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Global</h1>
        <p className="text-gray-400 text-sm mt-1">Métricas globales de la plataforma Dentiqa</p>
      </div>

      {/* MRR hero */}
      <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/10 border border-primary-500/30 rounded-2xl p-6">
        <p className="text-primary-400 text-sm font-medium">Monthly Recurring Revenue</p>
        <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mt-1">{mrrFormatted}</p>
        <p className="text-gray-400 text-sm mt-2">
          {stats.activeTenants} clínicas activas ·{" "}
          {stats.pastDueTenants > 0 && (
            <span className="text-red-400">{stats.pastDueTenants} con pago vencido</span>
          )}
          {stats.pastDueTenants === 0 && <span className="text-green-400">0 con pago vencido</span>}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clínicas" value={stats.totalTenants} sub={`${stats.activeTenants} activas`} />
        <StatCard label="Total Pacientes" value={stats.totalPatients.toLocaleString("es-AR")} />
        <StatCard label="Citas hoy" value={stats.appointmentsToday} sub={`${stats.appointmentsThisMonth} este mes`} />
        <StatCard
          label="Mensajes hoy"
          value={stats.messagesToday}
          sub={`${stats.messagesThisMonth.toLocaleString()} este mes`}
          accent="text-primary-400"
        />
      </div>

      {/* Growth chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-6">Crecimiento de Clínicas (6 meses)</h2>
        <div className="flex items-end gap-3 h-32">
          {stats.growth.map((g) => {
            const heightPct = Math.round((g.count / maxGrowth) * 100);
            return (
              <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-white text-xs font-medium">{g.count}</span>
                <div
                  className="w-full bg-primary-500 rounded-t-md transition-all"
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
                <span className="text-gray-500 text-xs">{g.month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
