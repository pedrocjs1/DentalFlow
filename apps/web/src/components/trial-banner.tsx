"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { X, Zap, AlertTriangle, CreditCard } from "lucide-react";

interface SubInfo {
  status: string;
  trialEndDate?: string;
  plan: string;
}

export function TrialBanner() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    apiFetch<SubInfo>("/api/v1/billing/subscription")
      .then(setSub)
      .catch(() => {});
  }, []);

  if (!sub || dismissed) return null;

  const { status } = sub;

  // Active subscription — no banner needed
  if (status === "ACTIVE") return null;

  // Trial
  if (status === "TRIALING" && sub.trialEndDate) {
    const daysLeft = Math.max(0, Math.ceil((new Date(sub.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return (
      <div className="bg-primary-50 border-b border-primary-200 px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary-600" />
          <span className="text-primary-800">
            Prueba gratuita — <strong>{daysLeft} días restantes</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/configuracion?tab=facturacion" className="text-xs font-semibold text-primary-700 hover:text-primary-900 bg-primary-100 px-3 py-1 rounded-full">
            Activar plan
          </a>
          <button onClick={() => setDismissed(true)} className="text-primary-400 hover:text-primary-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Trial expired
  if (status === "TRIAL_EXPIRED") {
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <span className="text-orange-800">
            <strong>Tu prueba gratuita ha vencido.</strong> Activá tu plan para seguir usando DentalFlow.
          </span>
        </div>
        <a href="/configuracion?tab=facturacion" className="text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 px-4 py-1.5 rounded-lg">
          Activar plan
        </a>
      </div>
    );
  }

  // Past due
  if (status === "PAST_DUE") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-red-600" />
          <span className="text-red-800">
            <strong>Hay un problema con tu pago.</strong> Actualizá tu método de pago para no perder acceso.
          </span>
        </div>
        <a href="/configuracion?tab=facturacion" className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg">
          Actualizar pago
        </a>
      </div>
    );
  }

  // Cancelled
  if (status === "CANCELLED") {
    return (
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center justify-between text-sm">
        <span className="text-gray-700">
          Tu suscripción está cancelada. <strong>Reactivá tu plan</strong> para acceder a todas las funcionalidades.
        </span>
        <a href="/configuracion?tab=facturacion" className="text-xs font-semibold text-white bg-gray-800 hover:bg-gray-900 px-4 py-1.5 rounded-lg">
          Reactivar
        </a>
      </div>
    );
  }

  return null;
}
