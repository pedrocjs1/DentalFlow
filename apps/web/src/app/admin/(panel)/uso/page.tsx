"use client";

import { useEffect, useState } from "react";
import { ADMIN_API_BASE } from "@/lib/admin-api";

interface UsageRow {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  plan: string;
  whatsappMessages: number;
  aiInteractions: number;
  campaignSends: number;
  limits: { whatsappMessages: number; aiInteractions: number };
  overWhatsApp: boolean;
  overAi: boolean;
}

function usagePct(used: number, limit: number) {
  if (limit === -1) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  if (limit === -1) {
    return <span className="text-green-500 text-xs">∞ ilimitado</span>;
  }
  const pct = usagePct(used, limit);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 bg-gray-800 rounded-full overflow-hidden flex-shrink-0">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-400 text-xs">
        {used}/{limit}
      </span>
    </div>
  );
}

export default function AdminUsoPage() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);

  function getToken() {
    return localStorage.getItem("df_admin_token") ?? "";
  }

  useEffect(() => {
    setLoading(true);
    fetch(
      `${ADMIN_API_BASE}/api/v1/admin/usage?period=${period}`,
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [period]);

  const overLimit = rows.filter((r) => r.overWhatsApp || r.overAi);

  // Generate last 6 months for period picker
  const periodOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    return { val, label };
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Uso & Límites</h1>
          <p className="text-gray-400 text-sm mt-1">Consumo por clínica del período seleccionado</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {periodOptions.map((o) => (
            <option key={o.val} value={o.val}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {overLimit.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-medium text-sm">
            ⚠ {overLimit.length} clínica{overLimit.length > 1 ? "s" : ""} sobre el límite del plan:{" "}
            {overLimit.map((r) => r.tenantName).join(", ")}
          </p>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 font-medium px-5 py-3">Clínica</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Plan</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">WhatsApp</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">IA Interacciones</th>
              <th className="text-left text-gray-400 font-medium px-4 py-3">Campañas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-10">
                  Cargando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-10">
                  Sin datos para este período
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.tenantId}
                  className={`hover:bg-gray-800/30 transition-colors ${r.overWhatsApp || r.overAi ? "bg-red-500/5" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-white font-medium">{r.tenantName}</p>
                      <p className="text-gray-500 text-xs">{r.tenantSlug}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <UsageBar used={r.whatsappMessages} limit={r.limits.whatsappMessages} />
                      {r.overWhatsApp && <span className="text-red-400 text-xs">OVER</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <UsageBar used={r.aiInteractions} limit={r.limits.aiInteractions} />
                      {r.overAi && <span className="text-red-400 text-xs">OVER</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-300">{r.campaignSends}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
