"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Tooth } from "./tooth";
import { ToothModal } from "./tooth-modal";
import { OdontogramLegend } from "./legend";
import {
  type OdontogramFinding,
  type OdontogramVersion,
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

  // Quadrant labels
  const quadrantLabels = isPediatric
    ? { ur: "CUADRANTE V (Der)", ul: "CUADRANTE VI (Izq)", lr: "CUADRANTE VIII (Der)", ll: "CUADRANTE VII (Izq)" }
    : { ur: "CUADRANTE I (Der)", ul: "CUADRANTE II (Izq)", lr: "CUADRANTE IV (Der)", ll: "CUADRANTE III (Izq)" };

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
    } catch {
      // Silently fail — versions are optional
    }
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
      if (version) {
        setVersionFindings(version.findings as OdontogramFinding[]);
      }
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

  function handleToothClick(fdi: number) {
    if (isViewingVersion) return; // Read-only when viewing a version
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

  const toothSize = 44;

  return (
    <div className="bg-white rounded-xl border p-5">
      {/* Header with title + controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-900">Odontograma</h3>
        <span className="text-xs text-gray-400">Haga click en una pieza para registrar un hallazgo</span>
      </div>

      {/* Version selector + Pediatric toggle row */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Version selector */}
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

        {/* Pediatric toggle */}
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
          <button
            onClick={() => handleVersionChange("current")}
            className="ml-auto text-xs text-primary-600 hover:text-primary-800 font-medium underline"
          >
            Volver al estado actual
          </button>
        </div>
      )}

      {/* New version modal/popover */}
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
            <button
              onClick={() => { setShowNewVersionModal(false); setNewVersionLabel(""); }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateVersion}
              disabled={creatingVersion}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 font-medium"
            >
              {creatingVersion ? "Guardando..." : "Guardar version"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {/* Upper arch label */}
        <div className="flex items-center justify-center mb-1">
          <span className="text-xs text-gray-400 font-medium">SUPERIOR</span>
        </div>

        {/* Upper arch: quadrant separator line */}
        <div className="flex items-end justify-center gap-1">
          {/* Upper right (patient's right = viewer's left) */}
          <div className="flex items-end gap-0.5">
            {upperRight.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
                orientation="upper"
              />
            ))}
          </div>

          {/* Midline */}
          <div className="flex flex-col items-center self-stretch px-1.5">
            <div className="w-px bg-gray-300 flex-1" />
          </div>

          {/* Upper left */}
          <div className="flex items-end gap-0.5">
            {upperLeft.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
                orientation="upper"
              />
            ))}
          </div>
        </div>

        {/* Arch separator */}
        <div className="relative flex items-center my-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="mx-4 text-[10px] text-gray-300 font-medium tracking-widest">ARCADA</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Lower arch */}
        <div className="flex items-start justify-center gap-1">
          {/* Lower right (patient's right = viewer's left) */}
          <div className="flex items-start gap-0.5">
            {lowerRight.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
                orientation="lower"
              />
            ))}
          </div>

          {/* Midline */}
          <div className="flex flex-col items-center self-stretch px-1.5">
            <div className="w-px bg-gray-300 flex-1" />
          </div>

          {/* Lower left */}
          <div className="flex items-start gap-0.5">
            {lowerLeft.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
                orientation="lower"
              />
            ))}
          </div>
        </div>

        {/* Lower arch label */}
        <div className="flex items-center justify-center mt-1">
          <span className="text-xs text-gray-400 font-medium">INFERIOR</span>
        </div>
      </div>

      {/* Quadrant labels */}
      <div className="mt-3 grid grid-cols-2 text-[10px] text-gray-300 font-medium">
        <div className="text-right pr-4">{quadrantLabels.ur}</div>
        <div className="text-left pl-4">{quadrantLabels.ul}</div>
        <div className="text-right pr-4">{quadrantLabels.lr}</div>
        <div className="text-left pl-4">{quadrantLabels.ll}</div>
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
