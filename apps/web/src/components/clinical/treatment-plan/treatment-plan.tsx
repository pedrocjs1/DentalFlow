"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  FileText,
  Pencil,
  Check,
  X,
  Activity,
  DollarSign,
  User,
  ClipboardList,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type PlanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

interface TreatmentPlanItem {
  id: string;
  toothFdi: number | null;
  procedureName: string;
  status: ItemStatus;
  unitCost: string | number;
  quantity: number;
  notes: string | null;
  completedAt: string | null;
  discountPercent: number;
  section: string | null;
  sortOrder: number;
}

interface Dentist {
  id: string;
  name: string;
}

interface TreatmentPlan {
  id: string;
  title: string;
  status: PlanStatus;
  notes: string | null;
  isActive: boolean;
  discountPercent: number;
  dentistId: string | null;
  dentist: Dentist | null;
  items: TreatmentPlanItem[];
  createdAt: string;
}

interface Props {
  patientId: string;
  initialPlan: TreatmentPlan | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<ItemStatus, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-red-50 text-red-500",
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const PLAN_STATUS_STYLES: Record<PlanStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  COMPLETED: "bg-blue-50 text-blue-700 border-blue-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  ACTIVE: "Activo",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcItemSubtotal(item: TreatmentPlanItem): number {
  const gross = Number(item.unitCost) * item.quantity;
  return gross * (1 - (item.discountPercent || 0) / 100);
}

function groupBySection(items: TreatmentPlanItem[]): { section: string | null; items: TreatmentPlanItem[] }[] {
  const groups: Map<string | null, TreatmentPlanItem[]> = new Map();
  for (const item of items) {
    const key = item.section || null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const result: { section: string | null; items: TreatmentPlanItem[] }[] = [];
  // items without section first, then sorted sections
  if (groups.has(null)) {
    result.push({ section: null, items: groups.get(null)! });
    groups.delete(null);
  }
  const sorted = [...groups.entries()].sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));
  for (const [section, sectionItems] of sorted) {
    result.push({ section, items: sectionItems });
  }
  return result;
}

function formatCurrency(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TreatmentPlanView({ patientId, initialPlan }: Props) {
  // Plans state
  const [plans, setPlans] = useState<TreatmentPlan[]>(initialPlan ? [initialPlan as TreatmentPlan] : []);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlan?.id ?? null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Dentists for selector
  const [dentists, setDentists] = useState<Dentist[]>([]);

  // Adding item
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    toothFdi: "",
    procedureName: "",
    unitCost: "",
    quantity: "1",
    notes: "",
    discountPercent: "0",
    section: "",
  });
  const [saving, setSaving] = useState(false);

  // Updating
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Creating new plan
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("Plan de Tratamiento");
  const [newPlanDentistId, setNewPlanDentistId] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  // Editing plan header
  const [editingPlanHeader, setEditingPlanHeader] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDentistId, setEditDentistId] = useState("");
  const [editDiscountPercent, setEditDiscountPercent] = useState("0");
  const [savingPlanHeader, setSavingPlanHeader] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const data = await apiFetch<{ plans: TreatmentPlan[] }>(
        `/api/v1/patients/${patientId}/treatment-plans`
      );
      setPlans(data.plans ?? []);
      // If no plan selected or current plan gone, select first
      if (data.plans.length > 0) {
        const ids = data.plans.map((p) => p.id);
        setSelectedPlanId((prev) => (prev && ids.includes(prev) ? prev : data.plans[0].id));
      } else {
        setSelectedPlanId(null);
      }
    } catch {
      // fallback: keep existing
    } finally {
      setLoadingPlans(false);
    }
  }, [patientId]);

  const fetchDentists = useCallback(async () => {
    try {
      const data = await apiFetch<{ dentists: Dentist[] }>(`/api/v1/dentists`);
      setDentists(data.dentists ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchDentists();
  }, [fetchPlans, fetchDentists]);

  // ---------------------------------------------------------------------------
  // Current plan
  // ---------------------------------------------------------------------------

  const currentPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const items = currentPlan?.items ?? [];
  const sections = groupBySection(items);

  // ---------------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------------

  const activeItems = items.filter((i) => i.status !== "CANCELLED");
  const subtotalBruto = activeItems.reduce((acc, i) => acc + Number(i.unitCost) * i.quantity, 0);
  const subtotalWithItemDiscounts = activeItems.reduce((acc, i) => acc + calcItemSubtotal(i), 0);
  const itemDiscountTotal = subtotalBruto - subtotalWithItemDiscounts;
  const planDiscountPercent = currentPlan?.discountPercent ?? 0;
  const planDiscountAmount = subtotalWithItemDiscounts * (planDiscountPercent / 100);
  const grandTotal = subtotalWithItemDiscounts - planDiscountAmount;
  const completedTotal = items
    .filter((i) => i.status === "COMPLETED")
    .reduce((acc, i) => acc + calcItemSubtotal(i), 0);

  // ---------------------------------------------------------------------------
  // Handlers — Plan CRUD
  // ---------------------------------------------------------------------------

  async function handleCreatePlan() {
    if (!newPlanTitle.trim()) return;
    setSavingPlan(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan`, {
        method: "POST",
        body: JSON.stringify({
          title: newPlanTitle,
          dentistId: newPlanDentistId || undefined,
        }),
      });
      setCreatingPlan(false);
      setNewPlanTitle("Plan de Tratamiento");
      setNewPlanDentistId("");
      await fetchPlans();
      // Select the newly created (first in list since ordered by createdAt desc)
      setSelectedPlanId((prev) => prev); // will be updated by fetchPlans
    } finally {
      setSavingPlan(false);
    }
  }

  async function handleUpdatePlanHeader() {
    if (!currentPlan) return;
    setSavingPlanHeader(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/${currentPlan.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          dentistId: editDentistId || null,
          discountPercent: parseFloat(editDiscountPercent) || 0,
        }),
      });
      setEditingPlanHeader(false);
      await fetchPlans();
    } finally {
      setSavingPlanHeader(false);
    }
  }

  async function handlePlanStatusChange(status: PlanStatus) {
    if (!currentPlan) return;
    setUpdatingId("plan-status");
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/${currentPlan.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await fetchPlans();
    } finally {
      setUpdatingId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Handlers — Item CRUD
  // ---------------------------------------------------------------------------

  async function handleAddItem() {
    if (!newItem.procedureName.trim() || !currentPlan) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/items`, {
        method: "POST",
        body: JSON.stringify({
          planId: currentPlan.id,
          toothFdi: newItem.toothFdi ? parseInt(newItem.toothFdi) : undefined,
          procedureName: newItem.procedureName,
          unitCost: newItem.unitCost ? parseFloat(newItem.unitCost) : 0,
          quantity: parseInt(newItem.quantity) || 1,
          notes: newItem.notes || undefined,
          discountPercent: parseFloat(newItem.discountPercent) || 0,
          section: newItem.section || undefined,
        }),
      });
      setNewItem({ toothFdi: "", procedureName: "", unitCost: "", quantity: "1", notes: "", discountPercent: "0", section: "" });
      setAdding(false);
      await fetchPlans();
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
      await fetchPlans();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleItemFieldChange(itemId: string, field: string, value: string | number) {
    setUpdatingId(itemId);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/treatment-plan/items/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: value }),
      });
      await fetchPlans();
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
      await fetchPlans();
    } finally {
      setUpdatingId(null);
    }
  }

  function handleEvolucionar() {
    alert("Funcion disponible desde el tab Evoluciones");
  }

  function startEditPlanHeader() {
    if (!currentPlan) return;
    setEditTitle(currentPlan.title);
    setEditDentistId(currentPlan.dentistId ?? "");
    setEditDiscountPercent(String(currentPlan.discountPercent ?? 0));
    setEditingPlanHeader(true);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* ================================================================= */}
      {/* Plan selector bar */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600 mr-1">Planes:</span>

          {/* Plan tabs */}
          <div className="flex gap-1.5 flex-wrap flex-1">
            {plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  p.id === selectedPlanId
                    ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200 shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}
              >
                <span className="truncate max-w-[180px]">{p.title}</span>
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none border",
                    PLAN_STATUS_STYLES[p.status as PlanStatus] ?? PLAN_STATUS_STYLES.ACTIVE
                  )}
                >
                  {PLAN_STATUS_LABELS[p.status as PlanStatus] ?? p.status}
                </span>
              </button>
            ))}

            {plans.length === 0 && !loadingPlans && (
              <span className="text-sm text-gray-400 py-1.5">Sin planes</span>
            )}
          </div>

          {/* New plan button */}
          <Button size="sm" variant="outline" onClick={() => setCreatingPlan(true)} className="shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Nuevo plan
          </Button>
        </div>

        {/* Create plan form */}
        {creatingPlan && (
          <div className="px-5 py-4 border-t bg-gray-50">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-500 mb-1 block">Titulo del plan *</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(e) => setNewPlanTitle(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="w-[200px]">
                <label className="text-xs text-gray-500 mb-1 block">Profesional responsable</label>
                <select
                  value={newPlanDentistId}
                  onChange={(e) => setNewPlanDentistId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sin asignar</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={handleCreatePlan} disabled={savingPlan}>
                  {savingPlan ? "Creando..." : "Crear"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setCreatingPlan(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Selected plan content */}
      {/* ================================================================= */}
      {currentPlan && (
        <div className="bg-white rounded-xl border">
          {/* Plan header */}
          <div className="px-5 py-4 border-b">
            {editingPlanHeader ? (
              /* Editing plan header */
              <div className="space-y-3">
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 block">Titulo</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="w-[200px]">
                    <label className="text-xs text-gray-500 mb-1 block">Profesional</label>
                    <select
                      value={editDentistId}
                      onChange={(e) => setEditDentistId(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Sin asignar</option>
                      {dentists.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-[120px]">
                    <label className="text-xs text-gray-500 mb-1 block">Desc. global (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editDiscountPercent}
                      onChange={(e) => setEditDiscountPercent(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={handleUpdatePlanHeader} disabled={savingPlanHeader}>
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPlanHeader(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Display plan header */
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{currentPlan.title}</h3>
                      <button
                        onClick={startEditPlanHeader}
                        className="text-gray-300 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {currentPlan.dentist && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Dr. {currentPlan.dentist.name}
                        </span>
                      )}
                      {planDiscountPercent > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <DollarSign className="w-3 h-3" />
                          {planDiscountPercent}% desc. global
                        </span>
                      )}
                      <span>
                        {new Date(currentPlan.createdAt).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Plan status selector */}
                  <select
                    value={currentPlan.status}
                    onChange={(e) => handlePlanStatusChange(e.target.value as PlanStatus)}
                    disabled={updatingId === "plan-status"}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer focus:ring-2 focus:ring-primary-500",
                      PLAN_STATUS_STYLES[currentPlan.status as PlanStatus] ?? PLAN_STATUS_STYLES.ACTIVE
                    )}
                  >
                    {(Object.keys(PLAN_STATUS_LABELS) as PlanStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {PLAN_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>

                  <Button size="sm" onClick={() => setAdding(true)} disabled={currentPlan.status === "CANCELLED"}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Agregar tratamiento
                  </Button>
                </div>
              </div>
            )}
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
                <div className="col-span-3">
                  <label className="text-xs text-gray-500 mb-1 block">Procedimiento *</label>
                  <input
                    type="text"
                    value={newItem.procedureName}
                    onChange={(e) => setNewItem((p) => ({ ...p, procedureName: e.target.value }))}
                    placeholder="Endodoncia, corona..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Fase / Seccion</label>
                  <input
                    type="text"
                    value={newItem.section}
                    onChange={(e) => setNewItem((p) => ({ ...p, section: e.target.value }))}
                    placeholder="Fase 1: Urgencia"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-gray-500 mb-1 block">Costo ($)</label>
                  <input
                    type="number"
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem((p) => ({ ...p, unitCost: e.target.value }))}
                    placeholder="0"
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <div className="col-span-1">
                  <label className="text-xs text-gray-500 mb-1 block">Desc. %</label>
                  <input
                    type="number"
                    value={newItem.discountPercent}
                    onChange={(e) => setNewItem((p) => ({ ...p, discountPercent: e.target.value }))}
                    min={0}
                    max={100}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
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
                  <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Items table */}
          {items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No hay tratamientos en este plan.
              </p>
              <p className="text-gray-300 text-xs mt-1">
                Haga click en "Agregar tratamiento" para comenzar.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 border-b uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-medium">Pieza</th>
                      <th className="text-left px-3 py-2.5 font-medium">Procedimiento</th>
                      <th className="text-left px-3 py-2.5 font-medium">Fase</th>
                      <th className="text-right px-3 py-2.5 font-medium">Costo</th>
                      <th className="text-right px-3 py-2.5 font-medium">Cant.</th>
                      <th className="text-right px-3 py-2.5 font-medium">Desc.%</th>
                      <th className="text-right px-3 py-2.5 font-medium">Subtotal</th>
                      <th className="text-center px-3 py-2.5 font-medium">Estado</th>
                      <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((group, gi) => (
                      <SectionGroup
                        key={gi}
                        section={group.section}
                        items={group.items}
                        updatingId={updatingId}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onFieldChange={handleItemFieldChange}
                        onEvolucionar={handleEvolucionar}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals footer */}
              <div className="px-5 py-4 bg-gray-50 border-t space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal bruto</span>
                  <span>{formatCurrency(subtotalBruto)}</span>
                </div>
                {itemDiscountTotal > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuentos por item</span>
                    <span>-{formatCurrency(itemDiscountTotal)}</span>
                  </div>
                )}
                {planDiscountPercent > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento global ({planDiscountPercent}%)</span>
                    <span>-{formatCurrency(planDiscountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-200">
                  <span>TOTAL</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>
                    <span className="font-medium text-green-600">{formatCurrency(completedTotal)}</span> cobrado
                    {" / "}
                    <span className="font-medium text-amber-600">
                      {formatCurrency(grandTotal - completedTotal)}
                    </span>{" "}
                    pendiente
                  </span>
                  <span>
                    {items.filter((i) => i.status === "COMPLETED").length}/{activeItems.length} completados
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* No plan selected empty state */}
      {!currentPlan && !loadingPlans && plans.length === 0 && !creatingPlan && (
        <div className="bg-white rounded-xl border px-5 py-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium">Sin planes de tratamiento</p>
          <p className="text-gray-400 text-xs mt-1 mb-4">
            Cree un plan para armar el presupuesto del paciente.
          </p>
          <Button size="sm" onClick={() => setCreatingPlan(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Crear primer plan
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section group sub-component
// ---------------------------------------------------------------------------

function SectionGroup({
  section,
  items,
  updatingId,
  onStatusChange,
  onDelete,
  onFieldChange,
  onEvolucionar,
}: {
  section: string | null;
  items: TreatmentPlanItem[];
  updatingId: string | null;
  onStatusChange: (id: string, s: ItemStatus) => void;
  onDelete: (id: string) => void;
  onFieldChange: (id: string, field: string, value: string | number) => void;
  onEvolucionar: () => void;
}) {
  return (
    <>
      {section && (
        <tr className="bg-blue-50/50">
          <td colSpan={9} className="px-4 py-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              {section}
            </span>
          </td>
        </tr>
      )}
      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          updatingId={updatingId}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onFieldChange={onFieldChange}
          onEvolucionar={onEvolucionar}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Item row sub-component
// ---------------------------------------------------------------------------

function ItemRow({
  item,
  updatingId,
  onStatusChange,
  onDelete,
  onFieldChange,
  onEvolucionar,
}: {
  item: TreatmentPlanItem;
  updatingId: string | null;
  onStatusChange: (id: string, s: ItemStatus) => void;
  onDelete: (id: string) => void;
  onFieldChange: (id: string, field: string, value: string | number) => void;
  onEvolucionar: () => void;
}) {
  const [editingSection, setEditingSection] = useState(false);
  const [sectionValue, setSectionValue] = useState(item.section ?? "");

  const subtotal = calcItemSubtotal(item);
  const isUpdating = updatingId === item.id;
  const canEvolve = item.status === "PENDING" || item.status === "IN_PROGRESS";

  function commitSection() {
    onFieldChange(item.id, "section", sectionValue || "");
    setEditingSection(false);
  }

  return (
    <tr
      className={cn(
        "hover:bg-gray-50/50 transition-colors border-b border-gray-100",
        item.status === "CANCELLED" && "opacity-40"
      )}
    >
      {/* Pieza */}
      <td className="px-4 py-3">
        {item.toothFdi ? (
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-xs font-bold">
            {item.toothFdi}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">--</span>
        )}
      </td>

      {/* Procedimiento */}
      <td className="px-3 py-3">
        <span className="font-medium text-gray-900">{item.procedureName}</span>
        {item.notes && <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>}
      </td>

      {/* Fase */}
      <td className="px-3 py-3">
        {editingSection ? (
          <input
            autoFocus
            type="text"
            value={sectionValue}
            onChange={(e) => setSectionValue(e.target.value)}
            onBlur={commitSection}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitSection();
              if (e.key === "Escape") setEditingSection(false);
            }}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        ) : (
          <button
            onClick={() => {
              setSectionValue(item.section ?? "");
              setEditingSection(true);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {item.section || "--"}
          </button>
        )}
      </td>

      {/* Costo */}
      <td className="px-3 py-3 text-right text-gray-600">
        {formatCurrency(Number(item.unitCost))}
      </td>

      {/* Cantidad */}
      <td className="px-3 py-3 text-right text-gray-600">{item.quantity}</td>

      {/* Descuento */}
      <td className="px-3 py-3 text-right">
        {item.discountPercent > 0 ? (
          <span className="text-green-600 text-xs font-medium">{item.discountPercent}%</span>
        ) : (
          <span className="text-gray-300 text-xs">0%</span>
        )}
      </td>

      {/* Subtotal */}
      <td className="px-3 py-3 text-right font-semibold text-gray-900">
        {formatCurrency(subtotal)}
      </td>

      {/* Estado */}
      <td className="px-3 py-3 text-center">
        <select
          value={item.status}
          onChange={(e) => onStatusChange(item.id, e.target.value as ItemStatus)}
          disabled={isUpdating}
          className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 appearance-none text-center",
            STATUS_STYLES[item.status]
          )}
        >
          {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {canEvolve && (
            <button
              onClick={onEvolucionar}
              title="Evolucionar"
              className="p-1 rounded text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onDelete(item.id)}
            disabled={isUpdating}
            title="Eliminar"
            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            {isUpdating ? (
              <span className="text-[10px]">...</span>
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
