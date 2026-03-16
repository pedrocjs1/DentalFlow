"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  patientCount: number;
  hasWhatsApp: boolean;
  createdAt: string;
}

const PLAN_BADGE: Record<string, string> = {
  STARTER: "bg-gray-700 text-gray-300",
  PRO: "bg-blue-500/20 text-blue-300",
  ENTERPRISE: "bg-purple-500/20 text-purple-300",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-400",
  TRIALING: "bg-yellow-500/20 text-yellow-400",
  PAST_DUE: "bg-red-500/20 text-red-400",
  CANCELLED: "bg-gray-700 text-gray-400",
  PAUSED: "bg-gray-700 text-gray-400",
};

export default function AdminClinicasPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
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

    try {
      const res = await fetch(
        `/api/v1/admin/tenants?${params}`,
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
  }, [search, planFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImpersonate(tenantId: string) {
    setImpersonating(tenantId);
    try {
      const res = await fetch(
        `/api/v1/admin/tenants/${tenantId}/impersonate`,
        { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (data.token) {
        // Open tenant dashboard in new tab with impersonation token
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clínicas</h1>
          <p className="text-gray-400 text-sm mt-1">{tenants.length} clínicas registradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Todos los planes</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 font-medium px-5 py-3">Clínica</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Plan</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Estado</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Pacientes</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">WhatsApp</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Alta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-10">
                  Cargando...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-10">
                  No se encontraron clínicas
                </td>
              </tr>
            ) : (
              tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-white font-medium">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.slug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[t.plan] ?? "bg-gray-700 text-gray-300"}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[t.subscriptionStatus] ?? "bg-gray-700 text-gray-300"}`}>
                      {t.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-300">{t.patientCount}</td>
                  <td className="px-4 py-3.5">
                    {t.hasWhatsApp ? (
                      <span className="text-green-400 text-xs">✓ Conectado</span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">
                    {new Date(t.createdAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/admin/clinicas/${t.id}`)}
                        className="text-gray-400 hover:text-white text-xs transition-colors"
                      >
                        Ver
                      </button>
                      <button
                        onClick={() => handleImpersonate(t.id)}
                        disabled={impersonating === t.id}
                        className="text-primary-400 hover:text-primary-300 text-xs transition-colors disabled:opacity-50"
                      >
                        {impersonating === t.id ? "..." : "Impersonar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
