"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  trialEndsAt: string | null;
  counts: { patients: number; appointments: number; conversations: number; campaigns: number };
  whatsappStatus: string;
  whatsappDisplayNumber: string | null;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  usage: Record<string, number>;
  limits: Record<string, number>;
}

const PLANS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
const STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELLED", "PAUSED"];

export default function AdminTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  function getToken() {
    return localStorage.getItem("df_admin_token") ?? "";
  }

  useEffect(() => {
    fetch(
      `/api/v1/admin/tenants/${tenantId}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
      .then((r) => r.json())
      .then((d) => {
        setTenant(d);
        setEditPlan(d.plan);
        setEditStatus(d.subscriptionStatus);
      });
  }, [tenantId]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(
        `/api/v1/admin/tenants/${tenantId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: editPlan, subscriptionStatus: editStatus }),
        }
      );
      setTenant((prev) => prev ? { ...prev, plan: editPlan, subscriptionStatus: editStatus } : prev);
      alert("Cambios guardados");
    } finally {
      setSaving(false);
    }
  }

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await fetch(
        `/api/v1/admin/tenants/${tenantId}/impersonate`,
        { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      if (data.token) {
        window.open(`${window.location.origin}/?impersonate=${data.token}`, "_blank");
      }
    } finally {
      setImpersonating(false);
    }
  }

  if (!tenant) {
    return <div className="p-8 text-gray-500">Cargando...</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Volver
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
          <p className="text-gray-400 text-sm">{tenant.slug}</p>
        </div>
        <button
          onClick={handleImpersonate}
          disabled={impersonating}
          className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {impersonating ? "Abriendo..." : "Impersonar clínica"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-sm">Información</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Email</dt>
              <dd className="text-gray-200">{tenant.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Teléfono</dt>
              <dd className="text-gray-200">{tenant.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Ciudad</dt>
              <dd className="text-gray-200">{tenant.city ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">País</dt>
              <dd className="text-gray-200">{tenant.country ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Alta</dt>
              <dd className="text-gray-200">{new Date(tenant.createdAt).toLocaleDateString("es-AR")}</dd>
            </div>
            {tenant.trialEndsAt && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Trial hasta</dt>
                <dd className="text-yellow-400">{new Date(tenant.trialEndsAt).toLocaleDateString("es-AR")}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-400">Pacientes</dt>
              <dd className="text-gray-200">{tenant.counts?.patients ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Citas totales</dt>
              <dd className="text-gray-200">{tenant.counts?.appointments ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">WhatsApp</dt>
              <dd className={tenant.whatsappStatus === "CONNECTED" ? "text-green-400" : "text-gray-500"}>
                {tenant.whatsappStatus === "CONNECTED"
                  ? `Conectado (${tenant.whatsappDisplayNumber ?? ""})`
                  : tenant.whatsappStatus === "ERROR"
                  ? "Error"
                  : "No configurado"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Edit plan/status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Plan & Estado</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1.5">Estado de suscripción</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>

          {/* Usage this month */}
          {tenant.usage && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-gray-400 text-xs font-medium mb-2">Uso este mes</p>
              <div className="space-y-2">
                {Object.entries(tenant.usage).map(([type, count]) => {
                  const limit = tenant.limits[type];
                  const unlimited = limit === -1;
                  const pct = unlimited ? 0 : Math.min(Math.round((count / limit) * 100), 100);
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">{type.replace(/_/g, " ")}</span>
                        <span className="text-gray-300">
                          {count} {unlimited ? "" : `/ ${limit}`}
                        </span>
                      </div>
                      {!unlimited && (
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Usuarios ({tenant.users.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 font-medium px-5 py-2.5">Nombre</th>
              <th className="text-left text-gray-400 font-medium px-4 py-2.5">Email</th>
              <th className="text-left text-gray-400 font-medium px-4 py-2.5">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {tenant.users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800/20">
                <td className="px-5 py-3 text-gray-200">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
