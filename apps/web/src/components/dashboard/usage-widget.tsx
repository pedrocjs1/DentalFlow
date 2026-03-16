"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { BarChart3 } from "lucide-react";

interface UsageData {
  plan: string;
  usage: {
    whatsappMessages: number;
    aiInteractions: number;
    campaignSends: number;
  };
  limits: {
    whatsappMessages: number;
    aiInteractions: number;
    dentists: number;
  };
}

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);
  const over = !unlimited && used > limit;

  const barColor = over
    ? "bg-red-500"
    : pct >= 80
    ? "bg-amber-400"
    : pct >= 60
    ? "bg-amber-300"
    : "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className={over ? "text-red-500 font-semibold" : "text-gray-500"}>
          {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.max(pct, over ? 100 : 0)}%` }}
          />
        </div>
      )}
      {!unlimited && (
        <p className="text-[10px] text-gray-400 text-right">{pct}% utilizado</p>
      )}
    </div>
  );
}

const PLAN_LABEL: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  STARTER: "bg-gray-100 text-gray-700",
  PRO: "bg-primary-50 text-primary-700",
  ENTERPRISE: "bg-purple-50 text-purple-700",
};

export function UsageWidget() {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    apiFetch<UsageData>("/api/v1/dashboard/usage").then(setData).catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Uso del plan</h3>
        </div>
        <div className="space-y-3">
          <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-2 bg-gray-100 rounded-full animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  const { plan, usage, limits } = data;
  const hasLimits = limits.whatsappMessages !== -1 || limits.aiInteractions !== -1;

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900 text-sm">Uso del plan</h3>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            PLAN_COLORS[plan] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {PLAN_LABEL[plan] ?? plan}
        </span>
      </div>

      {hasLimits ? (
        <div className="space-y-4">
          <UsageRow
            label="Mensajes WhatsApp"
            used={usage.whatsappMessages}
            limit={limits.whatsappMessages}
          />
          <UsageRow
            label="Interacciones IA"
            used={usage.aiInteractions}
            limit={limits.aiInteractions}
          />
          {usage.campaignSends > 0 && (
            <UsageRow label="Envíos de campaña" used={usage.campaignSends} limit={-1} />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
          Plan Enterprise — uso ilimitado
        </div>
      )}

      {plan === "STARTER" && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          ¿Necesitás más?{" "}
          <a href="/configuracion" className="text-primary-600 hover:underline font-medium">
            Actualizar plan
          </a>
        </p>
      )}
    </div>
  );
}
