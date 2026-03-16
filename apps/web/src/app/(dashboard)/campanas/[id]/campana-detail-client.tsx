"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "SENDING"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED";

type SendStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "SKIPPED";

interface Campaign {
  id: string;
  name: string;
  type: string;
  channel: string;
  status: CampaignStatus;
  messageContent: string | null;
  subject: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalReplied: number;
  totalClicked: number;
  triggerType: string | null;
  triggerConfig: unknown;
  segmentFilter: unknown;
  createdAt: string;
  _count: { sends: number };
  statsByStatus: Record<string, number>;
}

interface CampaignSend {
  id: string;
  status: SendStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  errorMessage: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
}

interface SendsPage {
  sends: CampaignSend[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  MANUAL: { label: "Manual", icon: "📢" },
  BIRTHDAY: { label: "Cumpleaños", icon: "🎂" },
  REMINDER_6M: { label: "Recordatorio 6M", icon: "🦷" },
  REMINDER_24H: { label: "Recordatorio 24h", icon: "📅" },
  REACTIVATION: { label: "Reactivación", icon: "🔄" },
  PROMO: { label: "Promoción", icon: "✨" },
  WELCOME: { label: "Bienvenida", icon: "👋" },
  POST_VISIT: { label: "Post-Visita", icon: "💬" },
  CUSTOM: { label: "Personalizada", icon: "⚙️" },
};

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Borrador", color: "text-gray-600", bg: "bg-gray-100" },
  SCHEDULED: { label: "Programada", color: "text-blue-700", bg: "bg-blue-100" },
  SENDING: { label: "Enviando", color: "text-amber-700", bg: "bg-amber-100" },
  COMPLETED: { label: "Completada", color: "text-green-700", bg: "bg-green-100" },
  PAUSED: { label: "Pausada", color: "text-orange-700", bg: "bg-orange-100" },
  CANCELLED: { label: "Cancelada", color: "text-red-700", bg: "bg-red-100" },
};

const SEND_STATUS_CONFIG: Record<SendStatus, { label: string; color: string; bg: string; icon: string }> = {
  PENDING: { label: "Pendiente", color: "text-gray-600", bg: "bg-gray-100", icon: "⏳" },
  SENT: { label: "Enviado", color: "text-blue-700", bg: "bg-blue-100", icon: "📤" },
  DELIVERED: { label: "Entregado", color: "text-primary-700", bg: "bg-primary-100", icon: "✅" },
  READ: { label: "Leído", color: "text-green-700", bg: "bg-green-100", icon: "👁️" },
  FAILED: { label: "Fallido", color: "text-red-700", bg: "bg-red-100", icon: "❌" },
  SKIPPED: { label: "Saltado", color: "text-gray-500", bg: "bg-gray-50", icon: "⏭️" },
};

const SEND_TABS: Array<{ key: string; label: string }> = [
  { key: "", label: "Todos" },
  { key: "DELIVERED", label: "Entregados" },
  { key: "READ", label: "Leídos" },
  { key: "FAILED", label: "Fallidos" },
  { key: "PENDING", label: "Pendientes" },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, showToast: setToast };
}

function Toast({ toast }: { toast: { type: "success" | "error"; message: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === "success" ? "bg-primary-600" : "bg-red-500"}`}>
      {toast.type === "success" ? "✓ " : "✕ "}{toast.message}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-900">
          {value.toLocaleString()}
          {total > 0 && (
            <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CampanaDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { toast, showToast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [sendsPage, setSendsPage] = useState<SendsPage | null>(null);
  const [sendsLoading, setSendsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [retrying, setRetrying] = useState(false);

  // ── Load campaign detail ──────────────────────────────────────────────────

  const loadCampaign = useCallback(async () => {
    try {
      const data = await apiFetch<Campaign>(`/api/v1/campaigns/${id}`);
      setCampaign(data);
    } catch {
      showToast({ type: "error", message: "Error al cargar la campaña" });
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // ── Load sends ────────────────────────────────────────────────────────────

  const loadSends = useCallback(async () => {
    setSendsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "50",
      });
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiFetch<SendsPage>(
        `/api/v1/campaigns/${id}/sends?${params}`
      );
      setSends(data.sends);
      setSendsPage(data);
    } catch {
      showToast({ type: "error", message: "Error al cargar envíos" });
    } finally {
      setSendsLoading(false);
    }
  }, [id, currentPage, statusFilter, showToast]);

  useEffect(() => {
    loadSends();
  }, [loadSends]);

  // ── Retry failed ──────────────────────────────────────────────────────────

  async function retryFailed() {
    setRetrying(true);
    try {
      const result = await apiFetch<{ retried: number }>(
        `/api/v1/campaigns/${id}/retry-failed`,
        { method: "POST" }
      );
      showToast({
        type: "success",
        message: `${result.retried} envíos puestos en cola nuevamente`,
      });
      await Promise.all([loadCampaign(), loadSends()]);
    } catch {
      showToast({ type: "error", message: "Error al reintentar envíos" });
    } finally {
      setRetrying(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <div className="text-center">
          <div className="animate-spin text-3xl mb-3">⏳</div>
          <p>Cargando campaña...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-24 text-gray-500">
        <p className="text-lg font-medium mb-4">Campaña no encontrada</p>
        <button
          onClick={() => router.push("/campanas")}
          className="text-primary-600 hover:underline text-sm"
        >
          ← Volver a campañas
        </button>
      </div>
    );
  }

  const typeConf = TYPE_LABELS[campaign.type] ?? { label: campaign.type, icon: "📢" };
  const statusConf = STATUS_CONFIG[campaign.status];
  const failedCount = campaign.statsByStatus?.FAILED ?? 0;
  const totalSent = campaign.totalSent;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <button
          onClick={() => router.push("/campanas")}
          className="text-sm text-gray-500 hover:text-primary-600 mb-4 flex items-center gap-1"
        >
          ← Campañas
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{typeConf.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{typeConf.label}</span>
                <span className="text-gray-300">·</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConf.bg} ${statusConf.color}`}
                >
                  {statusConf.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {failedCount > 0 && (
              <button
                onClick={retryFailed}
                disabled={retrying}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                {retrying
                  ? "Reintentando..."
                  : `🔄 Reintentar fallidos (${failedCount})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Creada"
          value={new Date(campaign.createdAt).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        />
        <InfoCard
          label={campaign.scheduledAt ? "Programada para" : "Enviada"}
          value={
            campaign.scheduledAt
              ? new Date(campaign.scheduledAt).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : campaign.sentAt
              ? new Date(campaign.sentAt).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
        />
        <InfoCard label="Canal" value={campaign.channel} />
        <InfoCard label="Total envíos" value={campaign._count.sends.toString()} />
      </div>

      {/* Message preview */}
      {campaign.messageContent && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Mensaje
          </h3>
          <div className="bg-gray-50 rounded-xl p-4 max-w-sm">
            <p className="text-sm text-gray-800 whitespace-pre-line">
              {campaign.messageContent}
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-700">
            Métricas de rendimiento
          </h3>
          {totalSent === 0 && (
            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
              Aún no se enviaron mensajes
            </span>
          )}
        </div>

        {/* Big numbers */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard
            label="Enviados"
            value={campaign.totalSent}
            icon="📤"
            color="text-gray-700"
          />
          <MetricCard
            label="Entregados"
            value={campaign.totalDelivered}
            icon="✅"
            color="text-primary-700"
            pct={totalSent > 0 ? Math.round((campaign.totalDelivered / totalSent) * 100) : null}
          />
          <MetricCard
            label="Leídos"
            value={campaign.totalRead}
            icon="👁️"
            color="text-blue-700"
            pct={totalSent > 0 ? Math.round((campaign.totalRead / totalSent) * 100) : null}
          />
          <MetricCard
            label="Respondidos"
            value={campaign.totalReplied}
            icon="💬"
            color="text-purple-700"
            pct={totalSent > 0 ? Math.round((campaign.totalReplied / totalSent) * 100) : null}
          />
          <MetricCard
            label="Fallidos"
            value={failedCount}
            icon="❌"
            color="text-red-600"
            pct={totalSent > 0 ? Math.round((failedCount / totalSent) * 100) : null}
          />
        </div>

        {/* Progress bars */}
        {totalSent > 0 && (
          <div className="space-y-4 border-t pt-5">
            <MetricBar
              label="Tasa de entrega"
              value={campaign.totalDelivered}
              total={totalSent}
              color="bg-primary-500"
            />
            <MetricBar
              label="Tasa de lectura"
              value={campaign.totalRead}
              total={totalSent}
              color="bg-blue-500"
            />
            <MetricBar
              label="Tasa de respuesta"
              value={campaign.totalReplied}
              total={totalSent}
              color="bg-purple-500"
            />
            {failedCount > 0 && (
              <MetricBar
                label="Fallidos"
                value={failedCount}
                total={totalSent}
                color="bg-red-400"
              />
            )}
          </div>
        )}
      </div>

      {/* Sends list */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
            Detalle de envíos
            {sendsPage && (
              <span className="text-gray-400 font-normal ml-2">
                ({sendsPage.total.toLocaleString()} total)
              </span>
            )}
          </h3>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 px-4 pt-3 border-b overflow-x-auto">
          {SEND_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                setStatusFilter(key);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                statusFilter === key
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {key === "FAILED" && failedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                  {failedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {sendsLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Cargando envíos...
          </div>
        ) : sends.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {statusFilter
              ? `No hay envíos con estado "${SEND_STATUS_CONFIG[statusFilter as SendStatus]?.label}"`
              : "Aún no hay envíos registrados para esta campaña"}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Paciente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Teléfono
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Enviado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Entregado
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sends.map((send) => {
                  const sc = SEND_STATUS_CONFIG[send.status];
                  return (
                    <tr key={send.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {send.patient.firstName} {send.patient.lastName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {send.patient.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}
                        >
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {send.sentAt
                          ? new Date(send.sentAt).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {send.deliveredAt
                          ? new Date(send.deliveredAt).toLocaleString("es-AR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-red-500 text-xs max-w-48 truncate">
                        {send.errorMessage ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {sendsPage && sendsPage.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-gray-500">
                  Mostrando {(currentPage - 1) * sendsPage.limit + 1}–
                  {Math.min(currentPage * sendsPage.limit, sendsPage.total)} de{" "}
                  {sendsPage.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(sendsPage.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === sendsPage.totalPages}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-900 text-sm">{value}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
  pct,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  pct?: number | null;
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-gray-50">
      <div className="text-xl mb-1">{icon}</div>
      <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
      {pct !== null && pct !== undefined && (
        <p className="text-xs text-gray-400 mt-0.5">{pct}%</p>
      )}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
