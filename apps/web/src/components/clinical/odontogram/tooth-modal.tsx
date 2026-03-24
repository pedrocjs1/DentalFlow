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
  const [diagnosis, setDiagnosis] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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
          diagnosis: diagnosis || undefined,
        }),
      });
      setNotes("");
      setDiagnosis("");
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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  <div key={f.id} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
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
                    {/* Show diagnosis and notes inline if present */}
                    {(f.diagnosis || f.notes) && (
                      <div className="mt-1 pl-5 space-y-0.5">
                        {f.diagnosis && (
                          <p className="text-xs text-gray-600">
                            <span className="font-medium text-gray-500">Dx:</span> {f.diagnosis}
                          </p>
                        )}
                        {f.notes && (
                          <p className="text-xs text-gray-500 italic">{f.notes}</p>
                        )}
                      </div>
                    )}
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
              <label className="text-xs text-gray-500 mb-1.5 block">Condicion</label>
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

            {/* Diagnosis */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Diagnostico (opcional)</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: Caries oclusal profunda, pulpitis reversible..."
              />
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

          {/* Tooth history section */}
          {toothFindings.length > 0 && (
            <div className="border-t pt-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Historial de la pieza ({toothFindings.length} registro{toothFindings.length !== 1 ? "s" : ""})
              </button>
              {showHistory && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {toothFindings
                    .slice()
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((f) => (
                      <div key={f.id} className="flex items-start gap-2 text-xs py-1.5 border-l-2 border-gray-200 pl-3">
                        <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">{formatDate(f.createdAt)}</span>
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: CONDITION_COLORS[f.condition] }}
                        />
                        <div className="min-w-0">
                          <span className="font-medium text-gray-700">{CONDITION_LABELS[f.condition]}</span>
                          {f.surface && (
                            <span className="text-gray-400 ml-1">
                              ({SURFACES.find((s) => s.value === f.surface)?.label})
                            </span>
                          )}
                          {f.diagnosis && (
                            <p className="text-gray-500 mt-0.5">Dx: {f.diagnosis}</p>
                          )}
                          {f.notes && (
                            <p className="text-gray-400 italic mt-0.5">{f.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
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
