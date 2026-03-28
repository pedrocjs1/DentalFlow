"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_API_BASE } from "@/lib/admin-api";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  patientCount: number;
  hasWhatsApp: boolean;
  whatsappDisplayNumber: string | null;
  createdAt: string;
  trialEndsAt?: string | null;
}

const PLAN_BADGE: Record<string, string> = {
  STARTER: "bg-gray-700 text-gray-300",
  PROFESSIONAL: "bg-blue-500/20 text-blue-300",
  ENTERPRISE: "bg-purple-500/20 text-purple-300",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  TRIALING: "bg-yellow-500/20 text-yellow-400",
  PAST_DUE: "bg-red-500/20 text-red-400",
  CANCELLED: "bg-gray-700 text-gray-400",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "TRIALING", label: "Trialing" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAST_DUE", label: "Past Due" },
  { value: "CANCELLED", label: "Cancelled" },
];

function getTrialDaysRemaining(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const days = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000));
  return days;
}

export default function AdminClinicasPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  function getToken() {
    return localStorage.getItem("df_admin_token") ?? "";
  }

  async function loadTenants() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (planFilter) params.set("plan", planFilter);
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(
        `${ADMIN_API_BASE}/api/v1/admin/tenants?${params}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : (data.tenants ?? []));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, [search, planFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadTenants();
    }, 30_000);
    return () => clearInterval(interval);
  }, [search, planFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImpersonate(tenantId: string) {
    setImpersonating(tenantId);
    try {
      const res = await fetch(
        `${ADMIN_API_BASE}/api/v1/admin/tenants/${tenantId}/impersonate`,
        { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (data.token) {
        const url = `${window.location.origin}/?impersonate=${data.token}`;
        window.open(url, "_blank");
      }
    } catch {
      alert("Error al impersonar el tenant");
    } finally {
      setImpersonating(null);
    }
  }

  return (
    <div className="p-8 space-y-6 bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clinicas</h1>
          <p className="text-gray-400 text-sm mt-1">
            {tenants.length} clinica{tenants.length !== 1 ? "s" : ""} registrada{tenants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/clinicas/crear")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Crear clinica
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los planes</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">Cargando...</div>
      ) : tenants.length === 0 ? (
        <div className="text-center text-gray-500 py-16">No se encontraron clinicas</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((t) => {
            const trialDays = getTrialDaysRemaining(t.trialEndsAt);

            return (
              <div
                key={t.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors"
              >
                {/* Row 1: Clinic name */}
                <h2 className="text-white font-semibold text-lg truncate">{t.name}</h2>

                {/* Row 2: slug + badges + trial */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500 text-xs font-mono">{t.slug}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[t.plan] ?? "bg-gray-700 text-gray-300"}`}
                  >
                    {t.plan}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[t.subscriptionStatus] ?? "bg-gray-700 text-gray-300"}`}
                  >
                    {t.subscriptionStatus}
                  </span>
                  {t.subscriptionStatus === "TRIALING" && trialDays !== null && (
                    <span className="text-yellow-400 text-xs">
                      {trialDays === 0
                        ? "Expira hoy"
                        : `${trialDays} dia${trialDays !== 1 ? "s" : ""} restante${trialDays !== 1 ? "s" : ""}`}
                    </span>
                  )}
                </div>

                {/* Row 3: Stats */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    {t.hasWhatsApp ? (
                      <>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-green-400">
                          WA {t.whatsappDisplayNumber ? t.whatsappDisplayNumber : "Conectado"}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-600" />
                        <span className="text-gray-600">WA no conectado</span>
                      </>
                    )}
                  </span>
                  <span>
                    {t.patientCount} paciente{t.patientCount !== 1 ? "s" : ""}
                  </span>
                  <span>
                    Creada {new Date(t.createdAt).toLocaleDateString("es-AR")}
                  </span>
                </div>

                {/* Row 4: Actions */}
                <div className="flex items-center gap-2 pt-1 mt-auto">
                  <button
                    onClick={() => router.push(`/admin/clinicas/${t.id}`)}
                    className="flex-1 text-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium py-2 rounded-lg transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleImpersonate(t.id)}
                    disabled={impersonating === t.id}
                    className="flex-1 text-center bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {impersonating === t.id ? "Abriendo..." : "Impersonar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
