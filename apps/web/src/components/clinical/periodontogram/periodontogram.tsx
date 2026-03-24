"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// 6 measurement labels per tooth
const DEPTH_LABELS = ["MV", "CV", "DV", "ML", "CL", "DL"];

// Teeth to measure (upper and lower arches)
const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

// Molar teeth that can have furcation data (FDI system)
const MOLAR_TEETH = new Set([16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48]);

type ToothFindings = {
  depths: number[];       // 6 values
  mobility: number;       // 0-3
  furcation: string;      // NONE | I | II | III
  bleeding: boolean[];    // 6 values
  plaque: boolean[];      // 6 values
  suppuration: boolean[]; // 6 values
  recession: number[];    // 6 values (mm)
};

type Findings = Record<string, ToothFindings>;

interface PeriodontogramMetrics {
  bop: number;
  avgPD: number;
  avgNIC: number;
  plaqueIndex: number;
}

interface PeriodontogramVersion {
  id: string;
  versionNumber: number;
  label: string | null;
  entries: unknown;
  metrics: PeriodontogramMetrics | null;
  createdAt: string;
}

function depthColor(d: number) {
  if (d <= 3) return "bg-green-400";
  if (d <= 5) return "bg-amber-400";
  return "bg-red-500";
}

function depthTextColor(d: number) {
  if (d > 3) return "text-red-600 font-bold";
  return "";
}

/** Ensure a ToothFindings object has all fields including new ones */
function normalizeToothData(data: Partial<ToothFindings>): ToothFindings {
  return {
    depths: data.depths ?? [0, 0, 0, 0, 0, 0],
    mobility: data.mobility ?? 0,
    furcation: data.furcation ?? "NONE",
    bleeding: data.bleeding ?? Array(6).fill(false),
    plaque: data.plaque ?? Array(6).fill(false),
    suppuration: data.suppuration ?? Array(6).fill(false),
    recession: data.recession ?? [0, 0, 0, 0, 0, 0],
  };
}

/** Calculate metrics from findings data client-side */
function calculateMetrics(findings: Findings): PeriodontogramMetrics {
  let totalSites = 0;
  let bleedingSites = 0;
  let totalPD = 0;
  let pdCount = 0;
  let totalNIC = 0;
  let nicCount = 0;
  let plaqueSites = 0;
  let plaqueTotal = 0;

  for (const toothKey of Object.keys(findings)) {
    const tooth = normalizeToothData(findings[toothKey]);
    for (let i = 0; i < 6; i++) {
      const d = tooth.depths[i] ?? 0;
      if (d > 0) {
        totalPD += d;
        pdCount++;
      }
      totalSites++;
      if (tooth.bleeding[i]) bleedingSites++;
      if (tooth.plaque[i]) plaqueSites++;
      plaqueTotal++;

      // NIC = probing depth + recession
      const rec = tooth.recession?.[i] ?? 0;
      if (d > 0 || rec > 0) {
        totalNIC += d + rec;
        nicCount++;
      }
    }
  }

  return {
    bop: totalSites > 0 ? Math.round((bleedingSites / totalSites) * 100 * 10) / 10 : 0,
    avgPD: pdCount > 0 ? Math.round((totalPD / pdCount) * 10) / 10 : 0,
    avgNIC: nicCount > 0 ? Math.round((totalNIC / nicCount) * 10) / 10 : 0,
    plaqueIndex: plaqueTotal > 0 ? Math.round((plaqueSites / plaqueTotal) * 100 * 10) / 10 : 0,
  };
}

// ─── Metrics Card ───────────────────────────────────────────────────────

function MetricCard({ label, value, unit, color }: {
  label: string;
  value: string;
  unit?: string;
  color: "green" | "yellow" | "red" | "gray";
}) {
  const colorMap = {
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    gray: "bg-gray-50 border-gray-200 text-gray-500",
  };
  const dotMap = {
    green: "bg-green-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
    gray: "bg-gray-400",
  };

  return (
    <div className={cn("rounded-xl border px-4 py-3 flex flex-col gap-1", colorMap[color])}>
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", dotMap[color])} />
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold">{value}</span>
        {unit && <span className="text-xs font-medium opacity-70">{unit}</span>}
      </div>
    </div>
  );
}

function MetricsRow({ metrics }: { metrics: PeriodontogramMetrics }) {
  const bopColor = metrics.bop > 30 ? "red" : metrics.bop > 15 ? "yellow" : "green";
  const pdColor = metrics.avgPD > 4 ? "red" : metrics.avgPD > 3 ? "yellow" : "green";
  const nicColor = metrics.avgNIC > 0
    ? (metrics.avgNIC > 4 ? "red" : metrics.avgNIC > 3 ? "yellow" : "green")
    : "gray";
  const plaqueColor = metrics.plaqueIndex > 30 ? "red" : metrics.plaqueIndex > 15 ? "yellow" : "green";

  // Check if NIC has meaningful data (recession was entered somewhere)
  const hasNIC = metrics.avgNIC > 0;
  const hasPlaque = metrics.plaqueIndex > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <MetricCard
        label="% Sangrado (BOP)"
        value={`${metrics.bop}`}
        unit="%"
        color={bopColor}
      />
      <MetricCard
        label="Prof. Sondaje Prom."
        value={metrics.avgPD > 0 ? `${metrics.avgPD}` : "\u2014"}
        unit={metrics.avgPD > 0 ? "mm" : undefined}
        color={pdColor}
      />
      <MetricCard
        label="NIC Promedio"
        value={hasNIC ? `${metrics.avgNIC}` : "\u2014"}
        unit={hasNIC ? "mm" : undefined}
        color={nicColor}
      />
      <MetricCard
        label="% Sitios con Placa"
        value={hasPlaque ? `${metrics.plaqueIndex}` : "\u2014"}
        unit={hasPlaque ? "%" : undefined}
        color={hasPlaque ? plaqueColor : "gray"}
      />
    </div>
  );
}

// ─── Tooth Column ───────────────────────────────────────────────────────

function ToothColumn({
  fdi,
  data,
  onChange,
  readOnly,
}: {
  fdi: number;
  data: ToothFindings;
  onChange: (d: ToothFindings) => void;
  readOnly?: boolean;
}) {
  const isMolar = MOLAR_TEETH.has(fdi);
  const hasSuppuration = data.suppuration?.some(Boolean);
  const hasPlaque = data.plaque?.some(Boolean);

  return (
    <div className="flex flex-col items-center min-w-[48px]">
      {/* Tooth number + indicator dots */}
      <div className="flex items-center gap-0.5 mb-1">
        <span className="text-[9px] font-medium text-gray-400">{fdi}</span>
        {hasSuppuration && <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Supuración" />}
        {hasPlaque && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Placa" />}
      </div>

      {/* Depth chart bars */}
      <div className="flex gap-px h-16 items-end mb-1">
        {data.depths.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-px justify-end h-full">
            {data.bleeding[i] && (
              <div className="w-2 h-2 rounded-full bg-red-500 mb-0.5 flex-shrink-0" title={`Sangrado ${DEPTH_LABELS[i]}`} />
            )}
            {data.suppuration?.[i] && (
              <div className="w-2 h-2 rounded-full bg-yellow-400 mb-0.5 flex-shrink-0" title={`Supuración ${DEPTH_LABELS[i]}`} />
            )}
            <div
              className={cn("w-1.5 rounded-sm transition-all", depthColor(d))}
              style={{ height: `${Math.min(d * 10, 48)}px` }}
              title={`${DEPTH_LABELS[i]}: ${d}mm`}
            />
          </div>
        ))}
      </div>

      {/* Depth input fields */}
      <div className="grid grid-cols-3 gap-px">
        {data.depths.map((d, i) => (
          <input
            key={i}
            type="number"
            min={0}
            max={12}
            value={d || ""}
            readOnly={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              const newDepths = [...data.depths];
              newDepths[i] = parseInt(e.target.value) || 0;
              onChange({ ...data, depths: newDepths });
            }}
            className={cn(
              "w-4 text-center text-[10px] border border-gray-200 rounded focus:outline-none focus:border-primary-400 p-0 h-5",
              depthTextColor(d),
              readOnly && "bg-gray-50 cursor-default"
            )}
          />
        ))}
      </div>

      {/* Bleeding toggles */}
      <div className="grid grid-cols-3 gap-px mt-1">
        {data.bleeding.map((b, i) => (
          <button
            key={i}
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              const newBleeding = [...data.bleeding];
              newBleeding[i] = !b;
              onChange({ ...data, bleeding: newBleeding });
            }}
            className={cn(
              "w-4 h-4 rounded-full transition-colors border",
              b ? "bg-red-400 border-red-500" : "bg-gray-50 border-gray-200",
              readOnly && "cursor-default"
            )}
            title={`Sangrado ${DEPTH_LABELS[i]}`}
          />
        ))}
      </div>

      {/* Plaque toggles */}
      <div className="grid grid-cols-3 gap-px mt-0.5">
        {(data.plaque ?? Array(6).fill(false)).map((p: boolean, i: number) => (
          <button
            key={i}
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              const newPlaque = [...(data.plaque ?? Array(6).fill(false))];
              newPlaque[i] = !p;
              onChange({ ...data, plaque: newPlaque });
            }}
            className={cn(
              "w-4 h-4 rounded-full transition-colors border",
              p ? "bg-blue-400 border-blue-500" : "bg-gray-50 border-gray-200",
              readOnly && "cursor-default"
            )}
            title={`Placa ${DEPTH_LABELS[i]}`}
          />
        ))}
      </div>

      {/* Suppuration toggles */}
      <div className="grid grid-cols-3 gap-px mt-0.5">
        {(data.suppuration ?? Array(6).fill(false)).map((s: boolean, i: number) => (
          <button
            key={i}
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              const newSupp = [...(data.suppuration ?? Array(6).fill(false))];
              newSupp[i] = !s;
              onChange({ ...data, suppuration: newSupp });
            }}
            className={cn(
              "w-4 h-4 rounded-full transition-colors border",
              s ? "bg-yellow-400 border-yellow-500" : "bg-gray-50 border-gray-200",
              readOnly && "cursor-default"
            )}
            title={`Supuración ${DEPTH_LABELS[i]}`}
          />
        ))}
      </div>

      {/* Mobility */}
      <div className="mt-1">
        <select
          value={data.mobility}
          disabled={readOnly}
          onChange={(e) => onChange({ ...data, mobility: parseInt(e.target.value) })}
          className={cn(
            "text-[10px] border border-gray-200 rounded w-full p-0.5 focus:outline-none",
            readOnly && "bg-gray-50 cursor-default"
          )}
          title="Movilidad"
        >
          <option value={0}>M0</option>
          <option value={1}>M1</option>
          <option value={2}>M2</option>
          <option value={3}>M3</option>
        </select>
      </div>

      {/* Furcation (molars only) */}
      {isMolar && (
        <div className="mt-0.5">
          <select
            value={data.furcation ?? "NONE"}
            disabled={readOnly}
            onChange={(e) => onChange({ ...data, furcation: e.target.value })}
            className={cn(
              "text-[10px] border border-gray-200 rounded w-full p-0.5 focus:outline-none",
              data.furcation !== "NONE" && "bg-orange-50 border-orange-300 text-orange-700",
              readOnly && "bg-gray-50 cursor-default"
            )}
            title="Furca"
          >
            <option value="NONE">F\u2014</option>
            <option value="I">FI</option>
            <option value="II">FII</option>
            <option value="III">FIII</option>
          </select>
        </div>
      )}
    </div>
  );
}

function emptyFindings(teeth: number[]): Findings {
  return Object.fromEntries(
    teeth.map((fdi) => [
      fdi.toString(),
      normalizeToothData({}),
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
    initialLatest?.findings
      ? normalizeAllFindings(initialLatest.findings, allTeeth)
      : emptyFindings(allTeeth)
  );
  const [notes, setNotes] = useState(initialLatest?.notes ?? "");
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState<string | null>(null);

  // Version state
  const [versions, setVersions] = useState<PeriodontogramVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [viewingVersion, setViewingVersion] = useState<PeriodontogramVersion | null>(null);
  const [savingVersion, setSavingVersion] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, [patientId]);

  async function fetchVersions() {
    setLoadingVersions(true);
    try {
      const data = await apiFetch<{ versions: PeriodontogramVersion[] }>(
        `/api/v1/patients/${patientId}/periodontogram/versions`
      );
      setVersions(data.versions ?? []);
    } catch {
      // Silently ignore — versions endpoint may not exist yet
    } finally {
      setLoadingVersions(false);
    }
  }

  // Calculate live metrics from current findings
  const metrics = useMemo(() => calculateMetrics(findings), [findings]);

  // Displayed metrics: from version if viewing one, otherwise live
  const displayedMetrics = viewingVersion?.metrics ?? metrics;

  const readOnly = !!viewingVersion;

  function updateTooth(fdi: number, data: ToothFindings) {
    if (readOnly) return;
    setFindings((prev) => ({ ...prev, [fdi.toString()]: data }));
    setSaved(false);
  }

  const getOrDefault = useCallback((fdi: number): ToothFindings => {
    return normalizeToothData(findings[fdi.toString()] ?? {});
  }, [findings]);

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

  async function handleSaveVersion() {
    setSavingVersion(true);
    try {
      // Save current data first
      await apiFetch(`/api/v1/patients/${patientId}/periodontogram`, {
        method: "POST",
        body: JSON.stringify({ findings, notes: notes || undefined }),
      });
      // Then create version snapshot
      await apiFetch(`/api/v1/patients/${patientId}/periodontogram/versions`, {
        method: "POST",
        body: JSON.stringify({
          label: `Registro ${new Date().toLocaleDateString("es-AR")}`,
        }),
      });
      await fetchVersions();
      setSaved(true);
    } finally {
      setSavingVersion(false);
    }
  }

  function handleVersionSelect(versionId: string) {
    setSelectedVersionId(versionId);
    if (!versionId) {
      // Return to current data
      setViewingVersion(null);
      if (initialLatest) {
        setFindings(normalizeAllFindings(initialLatest.findings, allTeeth));
        setNotes(initialLatest.notes ?? "");
      }
      return;
    }
    const version = versions.find((v) => v.id === versionId);
    if (version) {
      setViewingVersion(version);
      // Load version entries into the view
      const versionEntries = version.entries as PeriodontogramEntry[] | Findings;
      if (Array.isArray(versionEntries) && versionEntries.length > 0) {
        // entries is an array of PeriodontogramEntry snapshots — use the latest
        const latestEntry = versionEntries[0];
        const f = typeof latestEntry.findings === "string"
          ? JSON.parse(latestEntry.findings)
          : latestEntry.findings;
        setFindings(normalizeAllFindings(f, allTeeth));
        setNotes(latestEntry.notes ?? "");
      } else if (typeof versionEntries === "object" && !Array.isArray(versionEntries)) {
        // entries might be the findings object directly
        setFindings(normalizeAllFindings(versionEntries as Findings, allTeeth));
      }
    }
  }

  function handleReturnToCurrent() {
    setSelectedVersionId("");
    setViewingVersion(null);
    if (initialLatest) {
      setFindings(normalizeAllFindings(initialLatest.findings, allTeeth));
      setNotes(initialLatest.notes ?? "");
    } else {
      setFindings(emptyFindings(allTeeth));
      setNotes("");
    }
  }

  async function loadEntry(id: string) {
    setLoadingEntry(id);
    try {
      const data = await apiFetch<{ entry: PeriodontogramEntry }>(
        `/api/v1/patients/${patientId}/periodontogram/${id}`
      );
      setFindings(normalizeAllFindings(data.entry.findings, allTeeth));
      setNotes(data.entry.notes ?? "");
      setSaved(false);
      // Clear version viewing when loading a history entry
      setViewingVersion(null);
      setSelectedVersionId("");
    } finally {
      setLoadingEntry(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Periodontograma</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ingrese la profundidad de sondaje en mm. Use los indicadores para sangrado, placa y supuración.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Version selector */}
          <select
            value={selectedVersionId}
            onChange={(e) => handleVersionSelect(e.target.value)}
            disabled={loadingVersions}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Registro actual</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                V{v.versionNumber} — {v.label || new Date(v.createdAt).toLocaleDateString("es-AR")}
              </option>
            ))}
          </select>

          {/* History selector */}
          {history.length > 0 && !readOnly && (
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

          {saved && <span className="text-xs text-green-600 font-medium">Guardado</span>}

          {!readOnly && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveVersion}
                disabled={savingVersion}
              >
                {savingVersion ? "Guardando..." : "Guardar version"}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : "Guardar examen"}
              </Button>
            </>
          )}

          {readOnly && (
            <Button size="sm" variant="outline" onClick={handleReturnToCurrent}>
              Volver al actual
            </Button>
          )}
        </div>
      </div>

      {/* Version badge */}
      {viewingVersion && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          <span className="text-sm text-amber-800 font-medium">
            Viendo version historica: V{viewingVersion.versionNumber}
            {viewingVersion.label ? ` — ${viewingVersion.label}` : ""}
            {" "}({new Date(viewingVersion.createdAt).toLocaleDateString("es-AR")})
          </span>
          <span className="text-xs text-amber-600 ml-auto">Solo lectura</span>
        </div>
      )}

      {/* Metrics cards */}
      <MetricsRow metrics={displayedMetrics} />

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-gray-500 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-px h-4 items-end">
            {[3, 4, 6].map((d) => (
              <div key={d} className={cn("w-1.5 rounded-sm", depthColor(d))} style={{ height: `${d * 3}px` }} />
            ))}
          </div>
          <span>Sondaje (mm)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Sangrado (BOP)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <span>Placa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <span>Supuracion</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">MV/CV/DV</span>
          <span>= Mesio/Centro/Disto-Vestibular</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium">ML/CL/DL</span>
          <span>= Mesio/Centro/Disto-Lingual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-orange-600">FI-III</span>
          <span>= Furca (solo molares)</span>
        </div>
      </div>

      {/* Row labels */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-gray-400 text-center flex-1">SUPERIOR</p>
          <div className="flex gap-2 text-[9px] text-gray-400">
            <span>Profundidad</span>
            <span className="text-red-400">Sangrado</span>
            <span className="text-blue-400">Placa</span>
            <span className="text-yellow-500">Supurac.</span>
            <span>Movilidad</span>
            <span className="text-orange-500">Furca</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {UPPER_TEETH.map((fdi) => (
              <ToothColumn
                key={fdi}
                fdi={fdi}
                data={getOrDefault(fdi)}
                onChange={(d) => updateTooth(fdi, d)}
                readOnly={readOnly}
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
                readOnly={readOnly}
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
          readOnly={readOnly}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          className={cn(
            "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none",
            readOnly && "bg-gray-50 cursor-default"
          )}
          placeholder="Diagnostico periodontal, observaciones generales..."
        />
      </div>

      {/* Bottom legend: color coding explanation */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">Referencias de colores</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px] text-gray-600">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <div className="w-2 h-4 rounded-sm bg-green-400" />
              <div className="w-2 h-5 rounded-sm bg-amber-400" />
              <div className="w-2 h-6 rounded-sm bg-red-500" />
            </div>
            <div>
              <span className="font-medium">Sondaje:</span> Verde 1-3mm, Amarillo 4-5mm, Rojo 6+mm
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <div>
              <span className="font-medium">Sangrado:</span> Punto rojo = BOP positivo
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400 flex-shrink-0" />
            <div>
              <span className="font-medium">Supuracion:</span> Punto amarillo = exudado
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0" />
            <div>
              <span className="font-medium">Placa:</span> Punto azul = biofilm presente
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px] text-gray-600 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-600">4+</span>
            <div>Valores &gt;3mm resaltados en rojo en las celdas</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1 rounded">FII</span>
            <div>Furca: grado I-III (solo molares)</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold">M0-M3</span>
            <div>Movilidad: 0 (no) a 3 (severa)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Normalize all tooth findings in a Findings object to ensure new fields exist */
function normalizeAllFindings(findings: Findings, allTeeth: number[]): Findings {
  const result: Findings = {};
  for (const fdi of allTeeth) {
    const key = fdi.toString();
    result[key] = normalizeToothData(findings[key] ?? {});
  }
  return result;
}
