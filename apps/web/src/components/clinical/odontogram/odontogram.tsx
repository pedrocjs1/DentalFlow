"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { ToothFrontalSVG } from "./tooth-frontal";
import { ToothOcclusalSVG } from "./tooth-occlusal";
import { ToothModal } from "./tooth-modal";
import { OdontogramLegend } from "./legend";
import {
  type OdontogramFinding,
  type OdontogramVersion,
  type ToothSurface,
  UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT,
  PED_UPPER_RIGHT, PED_UPPER_LEFT, PED_LOWER_LEFT, PED_LOWER_RIGHT,
} from "./types";

interface OdontogramProps {
  patientId: string;
  initialFindings: OdontogramFinding[];
}

export function Odontogram({ patientId, initialFindings }: OdontogramProps) {
  const [findings, setFindings] = useState<OdontogramFinding[]>(initialFindings);
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Version management
  const [versions, setVersions] = useState<OdontogramVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("current");
  const [versionFindings, setVersionFindings] = useState<OdontogramFinding[] | null>(null);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState("");
  const [creatingVersion, setCreatingVersion] = useState(false);

  // Pediatric toggle
  const [isPediatric, setIsPediatric] = useState(false);

  const isViewingVersion = selectedVersionId !== "current";
  const displayFindings = isViewingVersion && versionFindings ? versionFindings : findings;

  // Tooth arrays based on dentition type
  const upperRight = isPediatric ? PED_UPPER_RIGHT : UPPER_RIGHT;
  const upperLeft = isPediatric ? PED_UPPER_LEFT : UPPER_LEFT;
  const lowerRight = isPediatric ? PED_LOWER_RIGHT : LOWER_RIGHT;
  const lowerLeft = isPediatric ? PED_LOWER_LEFT : LOWER_LEFT;

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, [patientId]);

  async function fetchVersions() {
    try {
      const data = await apiFetch<{ versions: OdontogramVersion[] }>(
        `/api/v1/patients/${patientId}/odontogram/versions`
      );
      setVersions(data.versions);
    } catch { /* versions are optional */ }
  }

  const refresh = useCallback(async () => {
    const data = await apiFetch<{ findings: OdontogramFinding[] }>(
      `/api/v1/patients/${patientId}/odontogram`
    );
    setFindings(data.findings);
  }, [patientId]);

  function handleVersionChange(versionId: string) {
    setSelectedVersionId(versionId);
    if (versionId === "current") {
      setVersionFindings(null);
    } else {
      const version = versions.find((v) => v.id === versionId);
      if (version) setVersionFindings(version.findings as OdontogramFinding[]);
    }
  }

  async function handleCreateVersion() {
    if (creatingVersion) return;
    setCreatingVersion(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/odontogram/versions`, {
        method: "POST",
        body: JSON.stringify({ label: newVersionLabel || undefined }),
      });
      setNewVersionLabel("");
      setShowNewVersionModal(false);
      await fetchVersions();
    } finally {
      setCreatingVersion(false);
    }
  }

  function handleFrontalClick(fdi: number) {
    if (isViewingVersion) return;
    setSelectedFdi(fdi);
    setModalOpen(true);
  }

  function handleZoneClick(fdi: number, _surface: ToothSurface) {
    if (isViewingVersion) return;
    setSelectedFdi(fdi);
    setModalOpen(true);
  }

  function getFindingsForTooth(fdi: number) {
    return displayFindings.filter((f) => f.toothFdi === fdi);
  }

  function formatVersionDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // ─── Render helpers for tooth rows ───────────────────────────────────────────

  // Frontal widths per tooth type (must match getDimensions in tooth-frontal.tsx)
  function toothWidth(fdi: number): number {
    const pos = fdi % 10;
    if (pos >= 6) return 50; // molar
    if (pos >= 4) return 42; // premolar
    if (pos === 3) return 36; // canine
    return 34; // incisor
  }

  function renderNumberRow(teeth: number[]) {
    return (
      <div className="flex items-center gap-[3px]">
        {teeth.map((fdi) => (
          <div key={fdi} className="flex-shrink-0 text-center" style={{ width: toothWidth(fdi) }}>
            <span className="text-[10px] font-bold text-gray-500 select-none">{fdi}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderOcclusalRow(teeth: number[]) {
    return (
      <div className="flex items-center gap-[3px]">
        {teeth.map((fdi) => (
          <div key={fdi} className="flex-shrink-0 flex justify-center" style={{ width: toothWidth(fdi) }}>
            <ToothOcclusalSVG
              fdi={fdi}
              findings={getFindingsForTooth(fdi)}
              onZoneClick={handleZoneClick}
            />
          </div>
        ))}
      </div>
    );
  }

  function renderFrontalRow(teeth: number[], orientation: "upper" | "lower") {
    return (
      <div className="flex items-center gap-[3px]">
        {teeth.map((fdi) => (
          <div key={fdi} className="flex-shrink-0 flex justify-center" style={{ width: toothWidth(fdi) }}>
            <ToothFrontalSVG
              fdi={fdi}
              findings={getFindingsForTooth(fdi)}
              onClick={handleFrontalClick}
              orientation={orientation}
            />
          </div>
        ))}
      </div>
    );
  }

  // ─── Midline separator (dashed vertical line) ──────────────────────────────

  function Midline({ height }: { height: string }) {
    return (
      <div className="flex flex-col items-center self-stretch px-2" style={{ minHeight: height }}>
        <div className="w-px flex-1" style={{ backgroundImage: "repeating-linear-gradient(to bottom, #CBD5E1 0px, #CBD5E1 4px, transparent 4px, transparent 8px)" }} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900">Odontograma</h3>
        <span className="text-xs text-gray-400">
          Vista oclusal: click en zona | Vista frontal: click en diente
        </span>
      </div>

      {/* Version selector + Pediatric toggle */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedVersionId}
            onChange={(e) => handleVersionChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="current">Estado actual</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                V{v.versionNumber} — {v.label || `Version ${v.versionNumber}`} — {formatVersionDate(v.createdAt)}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewVersionModal(true)}
            className="text-xs px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-medium"
          >
            + Nueva version
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${!isPediatric ? "text-primary-700" : "text-gray-400"}`}>
            Permanente
          </span>
          <button
            onClick={() => setIsPediatric(!isPediatric)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              isPediatric ? "bg-primary-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                isPediatric ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className={`text-xs font-medium ${isPediatric ? "text-primary-700" : "text-gray-400"}`}>
            Temporal
          </span>
        </div>
      </div>

      {/* Version badge */}
      {isViewingVersion && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-amber-700 font-medium">Viendo version historica (solo lectura)</span>
          <button onClick={() => handleVersionChange("current")} className="ml-auto text-xs text-primary-600 hover:text-primary-800 font-medium underline">
            Volver al estado actual
          </button>
        </div>
      )}

      {/* New version modal */}
      {showNewVersionModal && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Crear nueva version</p>
          <p className="text-xs text-gray-500 mb-3">Se guardara una copia del estado actual del odontograma.</p>
          <input
            type="text"
            value={newVersionLabel}
            onChange={(e) => setNewVersionLabel(e.target.value)}
            placeholder="Etiqueta (ej: Control 3 meses)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => { setShowNewVersionModal(false); setNewVersionLabel(""); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button onClick={handleCreateVersion} disabled={creatingVersion} className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium">
              {creatingVersion ? "Guardando..." : "Guardar version"}
            </button>
          </div>
        </div>
      )}

      {/* ════════════ ODONTOGRAM CHART ════════════ */}
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0 min-w-fit">

          {/* ─── UPPER ARCH ─── */}
          <div className="text-center mb-1">
            <span className="text-[10px] text-gray-400 font-medium tracking-wider">SUPERIOR</span>
          </div>

          {/* Numbers */}
          <div className="flex items-center justify-center">
            {renderNumberRow(upperRight)}
            <div className="px-2" />
            {renderNumberRow(upperLeft)}
          </div>

          {/* Occlusal views */}
          <div className="flex items-center justify-center mt-1">
            {renderOcclusalRow(upperRight)}
            <Midline height="46px" />
            {renderOcclusalRow(upperLeft)}
          </div>

          {/* Frontal views (roots up, crown down → toward midline) */}
          <div className="flex items-center justify-center mt-0.5">
            {renderFrontalRow(upperRight, "upper")}
            <Midline height="70px" />
            {renderFrontalRow(upperLeft, "upper")}
          </div>

          {/* ─── LINE MEDIA ─── */}
          <div className="relative flex items-center my-2">
            <div className="flex-1 border-t-2 border-gray-300" />
          </div>

          {/* ─── LOWER ARCH ─── */}

          {/* Frontal views (roots down, crown up → toward midline) */}
          <div className="flex items-center justify-center">
            {renderFrontalRow(lowerRight, "lower")}
            <Midline height="70px" />
            {renderFrontalRow(lowerLeft, "lower")}
          </div>

          {/* Occlusal views */}
          <div className="flex items-center justify-center mt-0.5">
            {renderOcclusalRow(lowerRight)}
            <Midline height="46px" />
            {renderOcclusalRow(lowerLeft)}
          </div>

          {/* Numbers */}
          <div className="flex items-center justify-center mt-1">
            {renderNumberRow(lowerRight)}
            <div className="px-2" />
            {renderNumberRow(lowerLeft)}
          </div>

          <div className="text-center mt-1">
            <span className="text-[10px] text-gray-400 font-medium tracking-wider">INFERIOR</span>
          </div>
        </div>
      </div>

      <OdontogramLegend />

      {!isViewingVersion && (
        <ToothModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          fdi={selectedFdi}
          findings={findings}
          patientId={patientId}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
