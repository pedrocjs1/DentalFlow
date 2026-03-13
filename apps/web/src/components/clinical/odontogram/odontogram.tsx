"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { Tooth } from "./tooth";
import { ToothModal } from "./tooth-modal";
import { OdontogramLegend } from "./legend";
import {
  type OdontogramFinding,
  UPPER_RIGHT, UPPER_LEFT, LOWER_LEFT, LOWER_RIGHT,
} from "./types";

interface OdontogramProps {
  patientId: string;
  initialFindings: OdontogramFinding[];
}

export function Odontogram({ patientId, initialFindings }: OdontogramProps) {
  const [findings, setFindings] = useState<OdontogramFinding[]>(initialFindings);
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    const data = await apiFetch<{ findings: OdontogramFinding[] }>(
      `/api/v1/patients/${patientId}/odontogram`
    );
    setFindings(data.findings);
  }, [patientId]);

  function handleToothClick(fdi: number) {
    setSelectedFdi(fdi);
    setModalOpen(true);
  }

  function getFindingsForTooth(fdi: number) {
    return findings.filter((f) => f.toothFdi === fdi);
  }

  const toothSize = 42;

  return (
    <div className="bg-white rounded-xl border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Odontograma</h3>
        <span className="text-xs text-gray-400">Haga click en una pieza para registrar un hallazgo</span>
      </div>

      <div className="space-y-1">
        {/* Upper arch label */}
        <div className="flex items-center justify-center mb-1">
          <span className="text-xs text-gray-400 font-medium">SUPERIOR</span>
        </div>

        {/* Upper arch: quadrant separator line */}
        <div className="flex items-end justify-center gap-0.5">
          {/* Upper right (patient's right = viewer's left) */}
          <div className="flex items-end gap-0.5">
            {UPPER_RIGHT.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
              />
            ))}
          </div>

          {/* Midline */}
          <div className="flex flex-col items-center self-stretch px-1">
            <div className="w-px bg-gray-300 flex-1" />
          </div>

          {/* Upper left */}
          <div className="flex items-end gap-0.5">
            {UPPER_LEFT.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
              />
            ))}
          </div>
        </div>

        {/* Arch separator */}
        <div className="relative flex items-center my-3">
          <div className="flex-1 border-t border-dashed border-gray-200" />
          <span className="mx-3 text-[10px] text-gray-300 font-medium tracking-widest">ARCADA</span>
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>

        {/* Lower arch */}
        <div className="flex items-start justify-center gap-0.5">
          {/* Lower right (patient's right = viewer's left) */}
          <div className="flex items-start gap-0.5">
            {LOWER_RIGHT.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
              />
            ))}
          </div>

          {/* Midline */}
          <div className="flex flex-col items-center self-stretch px-1">
            <div className="w-px bg-gray-300 flex-1" />
          </div>

          {/* Lower left */}
          <div className="flex items-start gap-0.5">
            {LOWER_LEFT.map((fdi) => (
              <Tooth
                key={fdi}
                fdi={fdi}
                findings={getFindingsForTooth(fdi)}
                onClick={handleToothClick}
                size={toothSize}
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
        <div className="text-right pr-4">CUADRANTE I (Der)</div>
        <div className="text-left pl-4">CUADRANTE II (Izq)</div>
        <div className="text-right pr-4">CUADRANTE IV (Der)</div>
        <div className="text-left pl-4">CUADRANTE III (Izq)</div>
      </div>

      <OdontogramLegend />

      <ToothModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fdi={selectedFdi}
        findings={findings}
        patientId={patientId}
        onRefresh={refresh}
      />
    </div>
  );
}
