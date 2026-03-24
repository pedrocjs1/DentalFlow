"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  LogOut, Bell, UserPlus, Calendar, XCircle, ArrowRightLeft,
  MessageCircle, AlertTriangle, CheckCheck, CheckCircle, Ban,
  ArrowRight, FileText, Clock, Bot,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Inicio",
  "/agenda": "Agenda",
  "/pacientes": "Pacientes",
  "/pipeline": "Pipeline CRM",
  "/campanas": "Campañas",
  "/estadisticas": "Estadísticas",
  "/conversaciones": "Conversaciones",
  "/configuracion": "Configuración",
};

const PAGE_SUBTITLES: Record<string, string> = {
  "/dashboard": "Resumen general de tu clínica",
  "/agenda": "Gestiona las citas de tus pacientes",
  "/pacientes": "Historial y fichas de pacientes",
  "/pipeline": "Seguimiento comercial de pacientes",
  "/campanas": "Marketing y comunicaciones masivas",
  "/estadisticas": "Métricas, gráficos y análisis de rendimiento",
  "/conversaciones": "Mensajes de WhatsApp",
  "/configuracion": "Ajustes de tu clínica",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Dueño",
  ADMIN: "Admin",
  DENTIST: "Dentista",
  RECEPTIONIST: "Recepcionista",
};

interface StoredUser { name: string; email: string; role: string; }

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

interface UnreadCounts {
  total: number;
  messages: number;
  system: number;
  pipeline: number;
  ai: number;
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  new_patient: <UserPlus className="h-4 w-4 text-blue-500" />,
  new_appointment: <Calendar className="h-4 w-4 text-green-500" />,
  cancelled_appointment: <XCircle className="h-4 w-4 text-red-500" />,
  rescheduled_appointment: <ArrowRightLeft className="h-4 w-4 text-yellow-500" />,
  appointment_completed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  appointment_no_show: <Ban className="h-4 w-4 text-red-400" />,
  appointment_end_reminder: <Clock className="h-4 w-4 text-orange-500" />,
  human_needed: <MessageCircle className="h-4 w-4 text-red-600" />,
  usage_warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  usage_limit: <AlertTriangle className="h-4 w-4 text-red-500" />,
  pipeline_move: <ArrowRight className="h-4 w-4 text-blue-500" />,
  pipeline_stale: <AlertTriangle className="h-4 w-4 text-orange-400" />,
  template_status: <FileText className="h-4 w-4 text-purple-500" />,
};

type NotifTab = "messages" | "system" | "pipeline" | "ai";
const TABS: { key: NotifTab; icon: string; label: string }[] = [
  { key: "messages", icon: "💬", label: "Msgs" },
  { key: "system", icon: "⚙️", label: "Sist." },
  { key: "pipeline", icon: "📊", label: "Pipel." },
  { key: "ai", icon: "🤖", label: "IA" },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [counts, setCounts] = useState<UnreadCounts>({ total: 0, messages: 0, system: 0, pipeline: 0, ai: 0 });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotifTab>("messages");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("df_user");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const fetchCounts = useCallback(async () => {
    try {
      const data = await apiFetch<UnreadCounts>("/api/v1/notifications/unread-count");
      setCounts(data);
    } catch {}
  }, []);

  // Polling: counts every 10s + check ended appointments every 60s
  useEffect(() => {
    fetchCounts();
    const countInterval = setInterval(() => { if (!document.hidden) fetchCounts(); }, 10000);
    const checkInterval = setInterval(() => {
      if (!document.hidden) apiFetch("/api/v1/notifications/check-ended-appointments").catch(() => {});
    }, 60000);
    // Initial check
    apiFetch("/api/v1/notifications/check-ended-appointments").catch(() => {});
    return () => { clearInterval(countInterval); clearInterval(checkInterval); };
  }, [fetchCounts]);

  const fetchNotifications = useCallback(async (category?: string) => {
    try {
      const qs = category ? `?category=${category}` : "";
      const data = await apiFetch<{ notifications: NotificationItem[] }>(`/api/v1/notifications${qs}`);
      setNotifications(data.notifications);
    } catch {}
  }, []);

  // Fetch when panel opens or tab changes
  useEffect(() => {
    if (panelOpen) fetchNotifications(activeTab);
  }, [panelOpen, activeTab, fetchNotifications]);

  // Click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setPanelOpen(false);
    }
    if (panelOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [panelOpen]);

  async function markAsRead(id: string) {
    await apiFetch(`/api/v1/notifications/${id}/read`, { method: "PATCH", body: JSON.stringify({}) }).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    fetchCounts();
  }

  async function markAllRead() {
    await apiFetch("/api/v1/notifications/read-all", { method: "PATCH", body: JSON.stringify({ category: activeTab }) }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    fetchCounts();
  }

  // Quick action: complete or no-show an appointment from the notification
  async function handleQuickAction(notif: NotificationItem, action: "complete" | "no_show") {
    const appointmentId = (notif.metadata as Record<string, unknown>)?.appointmentId as string | undefined;
    if (!appointmentId) return;
    setActionLoading(`${notif.id}-${action}`);
    try {
      const status = action === "complete" ? "COMPLETED" : "NO_SHOW";
      await apiFetch(`/api/v1/appointments/${appointmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await markAsRead(notif.id);
      fetchNotifications(activeTab);
    } catch {}
    setActionLoading(null);
  }

  function handleNotifClick(notif: NotificationItem) {
    if (!notif.isRead) markAsRead(notif.id);
    if (notif.link) router.push(notif.link);
    setPanelOpen(false);
  }

  const handleLogout = () => {
    document.cookie = "df_token=; path=/; max-age=0";
    localStorage.removeItem("df_token");
    localStorage.removeItem("df_user");
    router.push("/login");
    router.refresh();
  };

  const title = PAGE_TITLES[pathname] ?? "DentalFlow";
  const subtitle = PAGE_SUBTITLES[pathname];
  const initials = user?.name?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";
  const hasHumanNeeded = notifications.some((n) => n.type === "human_needed" && !n.isRead);

  const filteredNotifs = notifications;

  return (
    <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 flex-shrink-0">
      <div className="min-w-0 pl-10 md:pl-0">
        <h1 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 hidden sm:block">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="Notificaciones"
          >
            <Bell className="h-[18px] w-[18px]" />
            {counts.total > 0 && (
              <span className={`absolute top-1 right-1 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse ${hasHumanNeeded ? "bg-red-500" : "bg-primary-500"}`}>
                {counts.total > 99 ? "99+" : counts.total}
              </span>
            )}
          </button>

          {/* Panel with 4 tabs */}
          {panelOpen && (
            <div className="absolute right-0 top-12 w-[420px] bg-white rounded-xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Notificaciones</span>
                {counts[activeTab] > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    <CheckCheck className="h-3 w-3" />
                    Marcar todo leído
                  </button>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors border-b-2 ${
                      activeTab === tab.key
                        ? "border-primary-600 text-primary-700 bg-primary-50/50"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span className="block text-base leading-none mb-0.5">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {counts[tab.key] > 0 && (
                      <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1.5 rounded-full font-bold">
                        {counts[tab.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="max-h-[400px] overflow-y-auto">
                {activeTab === "ai" ? (
                  <div className="py-10 px-6 text-center">
                    <Bot className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-700 mb-1">Proximamente</p>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Recomendaciones inteligentes basadas en las estadisticas de tu clinica.
                      Analisis semanal de tasa de conversion, tratamientos mas demandados,
                      horarios con mas demanda y pacientes en riesgo de inactividad.
                    </p>
                  </div>
                ) : filteredNotifs.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">
                    Sin notificaciones
                  </div>
                ) : (
                  filteredNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                        notif.type === "human_needed" && !notif.isRead ? "bg-red-50" : !notif.isRead ? "bg-primary-50/30" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {NOTIF_ICONS[notif.type] ?? <Bell className="h-4 w-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => handleNotifClick(notif)}
                            className="text-left w-full"
                          >
                            <p className={`text-sm ${!notif.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                          </button>

                          {/* Quick actions */}
                          <div className="flex gap-2 mt-2">
                            {notif.type === "appointment_end_reminder" && !notif.isRead && (
                              <>
                                <button
                                  onClick={() => handleQuickAction(notif, "complete")}
                                  disabled={actionLoading === `${notif.id}-complete`}
                                  className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === `${notif.id}-complete` ? "..." : "✅ Completar"}
                                </button>
                                <button
                                  onClick={() => handleQuickAction(notif, "no_show")}
                                  disabled={actionLoading === `${notif.id}-no_show`}
                                  className="text-[11px] px-2.5 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 font-medium disabled:opacity-50 transition-colors"
                                >
                                  {actionLoading === `${notif.id}-no_show` ? "..." : "🚫 No asistio"}
                                </button>
                              </>
                            )}
                            {notif.type === "human_needed" && !notif.isRead && (
                              <button
                                onClick={() => { handleNotifClick(notif); }}
                                className="text-[11px] px-2.5 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors"
                              >
                                Abrir chat →
                              </button>
                            )}
                            {notif.type === "new_patient" && notif.link && (
                              <button
                                onClick={() => { handleNotifClick(notif); }}
                                className="text-[11px] px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                              >
                                Ver conversacion →
                              </button>
                            )}
                            {(notif.type === "new_appointment" || notif.type === "cancelled_appointment") && notif.link && (
                              <button
                                onClick={() => { handleNotifClick(notif); }}
                                className="text-[11px] px-2.5 py-1 rounded-md bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                              >
                                {notif.type === "new_appointment" ? "Ver en agenda →" : "Ver paciente →"}
                              </button>
                            )}
                            {notif.type === "pipeline_move" && notif.link && (
                              <button
                                onClick={() => { handleNotifClick(notif); }}
                                className="text-[11px] px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors"
                              >
                                Ver en pipeline →
                              </button>
                            )}
                          </div>
                        </div>
                        {!notif.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block" />

        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user.name}</p>
            <p className="text-[11px] text-gray-400">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        )}

        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>

        <button
          onClick={handleLogout}
          title="Cerrar sesion"
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
