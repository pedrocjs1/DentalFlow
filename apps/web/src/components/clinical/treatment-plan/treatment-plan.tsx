"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type ItemStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface TreatmentPlanItem {
  id: string;
  toothFdi: number | null;
  procedureName: string;
  status: ItemStatus;
  unitCost: string | number;
  quantity: number;
  notes: string | null;
  completedAt: string | null;
}

interface TreatmentPlan {
  id: string;
  title: string;
  items: TreatmentPlanItem[];
}

interface Props {
  patientId: string;
  initialPlan: TreatmentPlan | null;
}

const STATUS_STYLES: Record<ItemStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-50 text-gray-400",
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export function TreatmentPlanView({ patientId, initialPlan }: Props) {
  const [plan, setPlan] = useState<TreatmentPlan | null>(initialPlan);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ toothFdi: "", procedureName: "", unitCost: "", quantity: "1", notes: "" });
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function refreshPlan() {
    const data = await apiFetch<{ plan: TreatmentPlan | null }>(
      `/api/v1/patients/${patientId}/treatment-plan`
    );
    setPlan(data.plan);
  }

  async function handleAddItem() {
    if (!newItem.procedureName.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/items`, {
        method: "POST",
        body: JSON.stringify({
          planId: plan?.id,
          toothFdi: newItem.toothFdi ? parseInt(newItem.toothFdi) : undefined,
          procedureName: newItem.procedureName,
          unitCost: newItem.unitCost ? parseFloat(newItem.unitCost) : 0,
          quantity: parseInt(newItem.quantity) || 1,
          notes: newItem.notes || undefined,
        }),
      });
      setNewItem({ toothFdi: "", procedureName: "", unitCost: "", quantity: "1", notes: "" });
      setAdding(false);
      await refreshPlan();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(itemId: string, status: ItemStatus) {
    setUpdatingId(itemId);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refreshPlan();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(itemId: string) {
    setUpdatingId(itemId);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/items/${itemId}`, {
        method: "DELETE",
      });
      await refreshPlan();
    } finally {
      setUpdatingId(null);
    }
  }

  const items = plan?.items ?? [];
  const total = items
    .filter((i) => i.status !== "CANCELLED")
    .reduce((acc, i) => acc + Number(i.unitCost) * i.quantity, 0);
  const completed = items
    .filter((i) => i.status === "COMPLETED")
    .reduce((acc, i) => acc + Number(i.unitCost) * i.quantity, 0);

  return (
    <div className="bg-white rounded-xl border">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Plan de Tratamiento</h3>
        <Button size="sm" onClick={() => setAdding(true)}>
          + Agregar tratamiento
        </Button>
      </div>

      {/* Add item form */}
      {adding && (
        <div className="px-5 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Pieza</label>
              <input
                type="number"
                value={newItem.toothFdi}
                onChange={(e) => setNewItem((p) => ({ ...p, toothFdi: e.target.value }))}
                placeholder="16"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-4">
              <label className="text-xs text-gray-500 mb-1 block">Procedimiento *</label>
              <input
                type="text"
                value={newItem.procedureName}
                onChange={(e) => setNewItem((p) => ({ ...p, procedureName: e.target.value }))}
                placeholder="Endodoncia, corona, extracción..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Costo unit. ($)</label>
              <input
                type="number"
                value={newItem.unitCost}
                onChange={(e) => setNewItem((p) => ({ ...p, unitCost: e.target.value }))}
                placeholder="0"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">Cant.</label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                min={1}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Notas</label>
              <input
                type="text"
                value={newItem.notes}
                onChange={(e) => setNewItem((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Observaciones..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="col-span-1 flex gap-1.5">
              <Button size="sm" onClick={handleAddItem} disabled={saving}>
                {saving ? "..." : "OK"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>✕</Button>
            </div>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-gray-400 text-sm">
          No hay tratamientos en el plan. Haga click en "Agregar tratamiento".
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                  <th className="text-left px-5 py-2.5 font-medium">Pieza</th>
                  <th className="text-left px-3 py-2.5 font-medium">Procedimiento</th>
                  <th className="text-right px-3 py-2.5 font-medium">Costo</th>
                  <th className="text-right px-3 py-2.5 font-medium">Cant.</th>
                  <th className="text-right px-3 py-2.5 font-medium">Total</th>
                  <th className="text-center px-3 py-2.5 font-medium">Estado</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={cn("hover:bg-gray-50 transition-colors", item.status === "CANCELLED" && "opacity-50")}
                  >
                    <td className="px-5 py-3">
                      {item.toothFdi ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-xs font-bold">
                          {item.toothFdi}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-900">{item.procedureName}</span>
                      {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">
                      ${Number(item.unitCost).toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">
                      ${(Number(item.unitCost) * item.quantity).toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as ItemStatus)}
                        disabled={updatingId === item.id}
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-primary-500",
                          STATUS_STYLES[item.status]
                        )}
                      >
                        {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={updatingId === item.id}
                        className="text-xs text-gray-300 hover:text-red-500 transition-colors"
                      >
                        {updatingId === item.id ? "..." : "✕"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <span className="mr-4">
                <span className="font-medium text-green-700">${completed.toLocaleString("es-AR")}</span> cobrado
              </span>
              <span>
                <span className="font-medium text-amber-700">
                  ${(total - completed).toLocaleString("es-AR")}
                </span> pendiente
              </span>
            </div>
            <div className="text-sm font-bold text-gray-900">
              Total: ${total.toLocaleString("es-AR")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
