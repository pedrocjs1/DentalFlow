"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DashboardData {
  period: string;
  loginSuccess: number;
  loginFailed: number;
  rateLimited: number;
  webhookInvalid: number;
  promptInjection: number;
  unauthorizedAccess: number;
  totalEvents: number;
  recentEvents: LogEntry[];
}

interface LogEntry {
  id: string;
  type: string;
  ip: string | null;
  email: string | null;
  userId: string | null;
  tenantId: string | null;
  endpoint: string | null;
  details: string | null;
  success: boolean;
  userAgent: string | null;
  severity: string;
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function adminFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("df_admin_token") : null;
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`Error ${r.status}`);
    if (r.status === 204) return undefined as T;
    return r.json() as T;
  });
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  LOGIN_ATTEMPT: { label: "Login", color: "bg-green-900/50 text-green-400" },
  LOGIN_FAILED: { label: "Login fallido", color: "bg-red-900/50 text-red-400" },
  UNAUTHORIZED_ACCESS: { label: "Acceso no autorizado", color: "bg-red-900/50 text-red-400" },
  RATE_LIMITED: { label: "Rate limited", color: "bg-yellow-900/50 text-yellow-400" },
  WEBHOOK_INVALID_SIGNATURE: { label: "Webhook inválido", color: "bg-orange-900/50 text-orange-400" },
  PROMPT_INJECTION_ATTEMPT: { label: "Prompt injection", color: "bg-red-900/50 text-red-300" },
  SUSPICIOUS_ACTIVITY: { label: "Actividad sospechosa", color: "bg-red-900/60 text-red-300" },
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-700 text-gray-300",
  MEDIUM: "bg-yellow-900/50 text-yellow-400",
  HIGH: "bg-orange-900/50 text-orange-400",
  CRITICAL: "bg-red-900/60 text-red-300",
};

const PERIODS = [
  { value: "1h", label: "1 hora" },
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

const TYPE_FILTERS = [
  { value: "", label: "Todos" },
  { value: "LOGIN_ATTEMPT", label: "Login exitoso" },
  { value: "LOGIN_FAILED", label: "Login fallido" },
  { value: "UNAUTHORIZED_ACCESS", label: "No autorizado" },
  { value: "RATE_LIMITED", label: "Rate limited" },
  { value: "WEBHOOK_INVALID_SIGNATURE", label: "Webhook inválido" },
  { value: "PROMPT_INJECTION_ATTEMPT", label: "Prompt injection" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [period, setPeriod] = useState("24h");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await adminFetch<DashboardData>("/api/v1/admin/security/dashboard");
      setDashboard(data);
    } catch {
      // silent
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period, limit: "100" });
      if (typeFilter) params.set("type", typeFilter);
      const data = await adminFetch<{ logs: LogEntry[]; total: number }>(
        `/api/v1/admin/security/logs?${params}`
      );
      setLogs(data.logs);
      setLogsTotal(data.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [period, typeFilter]);

  useEffect(() => {
    loadDashboard();
    loadLogs();
  }, [loadDashboard, loadLogs]);

  // Polling every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadDashboard();
      loadLogs();
    }, 10_000);
    return () => clearInterval(interval);
  }, [loadDashboard, loadLogs]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-white">Seguridad</h1>

      {/* Stats cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard label="Login exitosos" value={dashboard.loginSuccess} color="text-green-400" />
          <StatCard label="Login fallidos" value={dashboard.loginFailed} color="text-red-400" />
          <StatCard label="Rate limited" value={dashboard.rateLimited} color="text-yellow-400" />
          <StatCard label="Webhook inválido" value={dashboard.webhookInvalid} color="text-orange-400" />
          <StatCard label="Prompt injection" value={dashboard.promptInjection} color="text-red-300" />
          <StatCard label="No autorizado" value={dashboard.unauthorizedAccess} color="text-red-400" />
          <StatCard label="Total eventos" value={dashboard.totalEvents} color="text-white" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p.value
                  ? "bg-primary-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-3 py-2"
        >
          {TYPE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <span className="text-xs text-gray-500 ml-auto">
          {logsTotal} eventos · actualización cada 10s
        </span>
      </div>

      {/* Logs table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Sin eventos en este período</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Severidad</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">IP</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Endpoint</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Detalles</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const typeInfo = TYPE_LABELS[log.type] ?? { label: log.type, color: "bg-gray-700 text-gray-400" };
                  const sevColor = SEVERITY_COLORS[log.severity] ?? SEVERITY_COLORS.LOW;

                  return (
                    <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sevColor}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 font-mono">{log.ip ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-300">{log.email ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-400 font-mono">{log.endpoint ?? "—"}</td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-[200px] truncate" title={log.details ?? ""}>
                        {log.details ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {log.success ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-red-400">✗</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
