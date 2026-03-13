"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// 6 measurement labels per tooth
const DEPTH_LABELS = ["MV", "CV", "DV", "ML", "CL", "DL"];

// Teeth to measure (upper and lower arches)
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

type ToothFindings = {
  depths: number[];       // 6 values
  mobility: number;       // 0-3
  furcation: string;      // NONE | GRADE_I | GRADE_II | GRADE_III
  bleeding: boolean[];    // 6 values
  plaque: boolean[];      // 6 values
};

type Findings = Record<string, ToothFindings>;

function depthColor(d: number) {
  if (d <= 3) return "bg-green-400";
  if (d <= 5) return "bg-amber-400";
  return "bg-red-500";
}

function ToothColumn({
  fdi,
  data,
  onChange,
}: {
  fdi: number;
  data: ToothFindings;
  onChange: (d: ToothFindings) => void;
}) {
  return (
    <div className="flex flex-col items-center min-w-[48px]">
      <span className="text-[9px] font-medium text-gray-400 mb-1">{fdi}</span>
      {/* Depth chart bars */}
      <div className="flex gap-px h-16 items-end mb-1">
        {data.depths.map((d, i) => (
          <div
            key={i}
            className={cn("w-1.5 rounded-sm transition-all", depthColor(d))}
            style={{ height: `${Math.min(d * 10, 64)}px` }}
            title={`${DEPTH_LABELS[i]}: ${d}mm`}
          />
        ))}
      </div>
      {/* Input fields */}
      <div className="grid grid-cols-3 gap-px">
        {data.depths.map((d, i) => (
          <input
            key={i}
            type="number"
            min={0}
            max={12}
            value={d || ""}
            onChange={(e) => {
              const newDepths = [...data.depths];
              newDepths[i] = parseInt(e.target.value) || 0;
              onChange({ ...data, depths: newDepths });
            }}
            className="w-4 text-center text-[10px] border border-gray-200 rounded focus:outline-none focus:border-primary-400 p-0 h-5"
          />
        ))}
      </div>
      {/* Bleeding indicators */}
      <div className="grid grid-cols-3 gap-px mt-1">
        {data.bleeding.map((b, i) => (
          <button
            key={i}
            onClick={() => {
              const newBleeding = [...data.bleeding];
              newBleeding[i] = !b;
              onChange({ ...data, bleeding: newBleeding });
            }}
            className={cn(
              "w-4 h-4 rounded-sm transition-colors border",
              b ? "bg-red-400 border-red-500" : "bg-gray-50 border-gray-200"
            )}
            title={`Sangrado ${DEPTH_LABELS[i]}`}
          />
        ))}
      </div>
      {/* Mobility */}
      <div className="mt-1">
        <select
          value={data.mobility}
          onChange={(e) => onChange({ ...data, mobility: parseInt(e.target.value) })}
          className="text-[10px] border border-gray-200 rounded w-full p-0.5 focus:outline-none"
          title="Movilidad"
        >
          <option value={0}>M0</option>
          <option value={1}>M1</option>
          <option value={2}>M2</option>
          <option value={3}>M3</option>
        </select>
      </div>
    </div>
  );
}

function emptyFindings(teeth: number[]): Findings {
  return Object.fromEntries(
    teeth.map((fdi) => [
      fdi.toString(),
      { depths: [0, 0, 0, 0, 0, 0], mobility: 0, furcation: "NONE", bleeding: Array(6).fill(false), plaque: Array(6).fill(false) },
    ])
  );
}

interface PeriodontogramEntry {
  id: string;
  recordedAt: string;
  notes: string | null;
  findings: Findings;
}

interface HistoryEntry {
  id: string;
  recordedAt: string;
  notes: string | null;
}

interface Props {
  patientId: string;
  initialLatest: PeriodontogramEntry | null;
  initialHistory: HistoryEntry[];
}

export function Periodontogram({ patientId, initialLatest, initialHistory }: Props) {
  const allTeeth = [...UPPER_TEETH, ...LOWER_TEETH];
  const [findings, setFindings] = useState<Findings>(
    initialLatest?.findings ?? emptyFindings(allTeeth)
  );
  const [notes, setNotes] = useState(initialLatest?.notes ?? "");
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState<string | null>(null);

  function updateTooth(fdi: number, data: ToothFindings) {
    setFindings((prev) => ({ ...prev, [fdi.toString()]: data }));
    setSaved(false);
  }

  function getOrDefault(fdi: number): ToothFindings {
    return findings[fdi.toString()] ?? {
      depths: [0, 0, 0, 0, 0, 0],
      mobility: 0,
      furcation: "NONE",
      bleeding: Array(6).fill(false),
      plaque: Array(6).fill(false),
    };
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/periodontogram`, {
        method: "POST",
        body: JSON.stringify({ findings, notes: notes || undefined }),
      });
      setSaved(true);
      // Refresh history
      const data = await apiFetch<{ history: HistoryEntry[] }>(
        `/api/v1/patients/${patientId}/periodontogram`
      );
      setHistory(data.history);
    } finally {
      setSaving(false);
    }
  }

  async function loadEntry(id: string) {
    setLoadingEntry(id);
    try {
      const data = await apiFetch<{ entry: PeriodontogramEntry }>(
        `/api/v1/patients/${patientId}/periodontogram/${id}`
      );
      setFindings(data.entry.findings);
      setNotes(data.entry.notes ?? "");
      setSaved(false);
    } finally {
      setLoadingEntry(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Periodontograma</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ingrese la profundidad de sondaje en mm. Haga click en los cuadrados rojos para marcar sangrado.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <select
              onChange={(e) => e.target.value && loadEntry(e.target.value)}
              disabled={!!loadingEntry}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Ver historial...</option>
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {new Date(h.recordedAt).toLocaleDateString("es-AR")}
                </option>
              ))}
            </select>
          )}
          {saved && <span className="text-xs text-green-600 font-medium">✓ Guardado</span>}
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar examen"}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-px h-4 items-end">
            {[3, 4, 6].map((d) => (
              <div key={d} className={cn("w-1.5 rounded-sm", depthColor(d))} style={{ height: `${d * 3}px` }} />
            ))}
          </div>
          <span>Sondaje (mm)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-red-400" />
          <span>Sangrado al sondaje</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">MV/CV/DV</span>
          <span>= Mesio/Centro/Disto-Vestibular</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">ML/CL/DL</span>
          <span>= Mesio/Centro/Disto-Lingual</span>
        </div>
      </div>

      {/* Upper arch */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-medium text-gray-400 mb-3 text-center">SUPERIOR</p>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {UPPER_TEETH.map((fdi) => (
              <ToothColumn
                key={fdi}
                fdi={fdi}
                data={getOrDefault(fdi)}
                onChange={(d) => updateTooth(fdi, d)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Lower arch */}
      <div className="bg-white rounded-xl border p-4">
        <p className="text-xs font-medium text-gray-400 mb-3 text-center">INFERIOR</p>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {LOWER_TEETH.map((fdi) => (
              <ToothColumn
                key={fdi}
                fdi={fdi}
                data={getOrDefault(fdi)}
                onChange={(d) => updateTooth(fdi, d)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notas del examen periodontal</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Diagnóstico periodontal, observaciones generales..."
        />
      </div>
    </div>
  );
}
