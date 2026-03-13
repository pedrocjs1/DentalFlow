"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import {
  type OdontogramFinding,
  type ToothCondition,
  type ToothSurface,
  CONDITION_COLORS,
  CONDITION_LABELS,
  WHOLE_TOOTH_CONDITIONS,
  SURFACE_CONDITIONS,
} from "./types";

const SURFACES: { value: ToothSurface; label: string }[] = [
  { value: "VESTIBULAR", label: "Vestibular" },
  { value: "LINGUAL", label: "Lingual/Palatino" },
  { value: "MESIAL", label: "Mesial" },
  { value: "DISTAL", label: "Distal" },
  { value: "OCCLUSAL", label: "Oclusal/Incisal" },
];

interface ToothModalProps {
  open: boolean;
  onClose: () => void;
  fdi: number | null;
  findings: OdontogramFinding[];
  patientId: string;
  onRefresh: () => void;
}

export function ToothModal({ open, onClose, fdi, findings, patientId, onRefresh }: ToothModalProps) {
  const [condition, setCondition] = useState<ToothCondition>("CARIES");
  const [surface, setSurface] = useState<ToothSurface>("OCCLUSAL");
  const [status, setStatus] = useState<"EXISTING" | "PLANNED">("EXISTING");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isWholeTooth = WHOLE_TOOTH_CONDITIONS.includes(condition);

  async function handleAdd() {
    if (!fdi) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/odontogram`, {
        method: "POST",
        body: JSON.stringify({
          toothFdi: fdi,
          surface: isWholeTooth ? undefined : surface,
          condition,
          status,
          notes: notes || undefined,
        }),
      });
      setNotes("");
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(findingId: string) {
    setDeletingId(findingId);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/odontogram/${findingId}`, {
        method: "DELETE",
      });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  const toothFindings = findings.filter((f) => f.toothFdi === fdi);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pieza {fdi}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing findings */}
          {toothFindings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Hallazgos registrados</p>
              <div className="space-y-1.5">
                {toothFindings.map((f) => (
                  <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CONDITION_COLORS[f.condition] }}
                      />
                      <span className="text-sm font-medium">{CONDITION_LABELS[f.condition]}</span>
                      {f.surface && (
                        <span className="text-xs text-gray-400">
                          · {SURFACES.find((s) => s.value === f.surface)?.label}
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        f.status === "PLANNED" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                      }`}>
                        {f.status === "PLANNED" ? "Planificado" : "Existente"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(f.id)}
                      disabled={deletingId === f.id}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === f.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new finding */}
          <div className="border-t pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">Agregar hallazgo</p>

            {/* Condition selector */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1.5 block">Condición</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(CONDITION_LABELS) as ToothCondition[])
                  .filter((c) => c !== "HEALTHY")
                  .map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors border ${
                        condition === c
                          ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CONDITION_COLORS[c] }}
                      />
                      {CONDITION_LABELS[c]}
                    </button>
                  ))}
              </div>
            </div>

            {/* Surface selector (only for surface conditions) */}
            {!isWholeTooth && (
              <div className="mb-3">
                <label className="text-xs text-gray-500 mb-1.5 block">Cara</label>
                <div className="flex flex-wrap gap-1.5">
                  {SURFACES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSurface(s.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                        surface === s.value
                          ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1.5 block">Estado</label>
              <div className="flex gap-2">
                {(["EXISTING", "PLANNED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      status === s
                        ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {s === "EXISTING" ? "Existente" : "Planificado"}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Guardando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
