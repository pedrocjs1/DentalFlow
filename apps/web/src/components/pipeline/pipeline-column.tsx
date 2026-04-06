"use client";

import { useMemo, useCallback, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PatientCard, type PipelinePatient } from "./patient-card";
import { DollarSign } from "lucide-react";

/** Number of cards shown in full size before switching to compact tabs */
const FULL_CARD_COUNT = 3;

const PatientCardWrapper = memo(function PatientCardWrapper({
  patient,
  stageId,
  compact,
  onPatientClick,
}: {
  patient: PipelinePatient;
  stageId: string;
  compact: boolean;
  onPatientClick: (patient: PipelinePatient, stageId: string) => void;
}) {
  const handleClick = useCallback(() => onPatientClick(patient, stageId), [patient, stageId, onPatientClick]);
  return <PatientCard patient={patient} onClick={handleClick} compact={compact} />;
});

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  patientCount: number;
  stageValue: number;
  patients: PipelinePatient[];
}

interface Props {
  stage: PipelineStage;
  onPatientClick: (patient: PipelinePatient, stageId: string) => void;
  isOver?: boolean;
}

export function PipelineColumn({ stage, onPatientClick, isOver }: Props) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const sortableItems = useMemo(() => stage.patients.map((p) => p.pipelineId), [stage.patients]);

  // Show compact tabs when there are enough cards to overflow
  const useCompact = stage.patients.length > FULL_CARD_COUNT + 2;

  return (
    <div className="flex-shrink-0 w-[85vw] sm:w-[272px] snap-start flex flex-col bg-gray-50/80 rounded-xl border border-gray-200/80 overflow-hidden">
      {/* Color top border */}
      <div className="h-1 w-full" style={{ backgroundColor: stage.color }} />
      {/* Column header */}
      <div className="px-3 py-3 border-b border-gray-200/80">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
            style={{ backgroundColor: stage.color }}
          />
          <span className="font-semibold text-sm text-gray-800 flex-1 truncate">{stage.name}</span>
          <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full font-semibold tabular-nums shadow-sm">
            {stage.patientCount}
          </span>
        </div>
        {stage.stageValue > 0 && (
          <div className="flex items-center gap-1 mt-1.5 pl-[18px]">
            <DollarSign className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-semibold">
              {stage.stageValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </span>
          </div>
        )}
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 flex flex-col gap-2 min-h-[100px] transition-all duration-200 scrollbar-thin overflow-y-auto ${
          isOver ? "bg-primary-50/50 border-2 border-dashed border-primary-300 rounded-b-xl" : ""
        }`}
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          {stage.patients.map((patient, index) => (
            <PatientCardWrapper
              key={patient.pipelineId}
              patient={patient}
              stageId={stage.id}
              compact={useCompact && index >= FULL_CARD_COUNT}
              onPatientClick={onPatientClick}
            />
          ))}
        </SortableContext>

        {stage.patients.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs py-6 gap-1">
            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <span>Sin pacientes en esta etapa</span>
          </div>
        )}
      </div>
    </div>
  );
}
