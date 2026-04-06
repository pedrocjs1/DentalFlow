"use client";

import { useEffect, useState } from "react";
import { ADMIN_API_BASE } from "@/lib/admin-api";

interface TenantWhatsApp {
  id: string;
  name: string;
  slug: string;
  whatsappPhoneNumberId: string | null;
  whatsappDisplayNumber: string | null;
  wabaId: string | null;
  whatsappStatus: "DISCONNECTED" | "CONNECTED" | "ERROR";
  whatsappConnectedAt: string | null;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  CONNECTED: { bg: "bg-green-500/20", text: "text-green-400", label: "Conectado" },
  DISCONNECTED: { bg: "bg-gray-700", text: "text-gray-400", label: "Desconectado" },
  ERROR: { bg: "bg-red-500/20", text: "text-red-400", label: "Error" },
};

export default function AdminWhatsAppPage() {
  const [tenants, setTenants] = useState<TenantWhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  function getToken() {
    return localStorage.getItem("df_admin_token") ?? "";
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(
        `${ADMIN_API_BASE}/api/v1/admin/whatsapp-numbers`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      const data = await res.json();
      setTenants(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadData();
    }, 15_000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleForceDisconnect(tenantId: string) {
    if (!confirm("¿Desconectar forzosamente el WhatsApp de esta clínica?")) return;
    setDisconnecting(tenantId);
    try {
      await fetch(
        `${ADMIN_API_BASE}/api/v1/admin/whatsapp-numbers/${tenantId}/force-disconnect`,
        { method: "POST", headers: { Authorization: `Bearer ${getToken()}` } }
      );
      loadData();
    } finally {
      setDisconnecting(null);
    }
  }

  const connected = tenants.filter((t) => t.whatsappStatus === "CONNECTED");
  const disconnected = tenants.filter((t) => t.whatsappStatus !== "CONNECTED");

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">WhatsApp — Monitoreo</h1>
        <p className="text-gray-400 text-sm mt-1">
          Cada clínica conecta su propio WhatsApp via Embedded Signup.
          Desde acá podés monitorear el estado y desconectar forzosamente si es necesario.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Conectadas</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{connected.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Sin conectar</p>
          <p className="text-3xl font-bold text-gray-500 mt-1">{disconnected.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">Total clínicas</p>
          <p className="text-3xl font-bold text-white mt-1">{tenants.length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 font-medium px-5 py-3">Clínica</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Número</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Estado</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Conectado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-10">Cargando...</td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-10">No hay clínicas</td>
              </tr>
            ) : (
              tenants.map((t) => {
                const badge = STATUS_BADGE[t.whatsappStatus] ?? STATUS_BADGE.DISCONNECTED;
                return (
                  <tr key={t.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-white font-medium">{t.name}</p>
                        <p className="text-gray-500 text-xs">{t.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.whatsappDisplayNumber ? (
                        <span className="text-gray-300 font-mono text-xs">{t.whatsappDisplayNumber}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {t.whatsappConnectedAt
                        ? new Date(t.whatsappConnectedAt).toLocaleDateString("es-AR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {t.whatsappStatus === "CONNECTED" && (
                        <button
                          onClick={() => handleForceDisconnect(t.id)}
                          disabled={disconnecting === t.id}
                          className="text-red-500 hover:text-red-400 text-xs transition-colors disabled:opacity-50"
                        >
                          {disconnecting === t.id ? "..." : "Desconectar"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
