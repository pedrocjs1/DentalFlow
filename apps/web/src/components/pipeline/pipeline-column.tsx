"use client";

import { useMemo, useCallback, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PatientCard, type PipelinePatient } from "./patient-card";
import { DollarSign } from "lucide-react";

const PatientCardWrapper = memo(function PatientCardWrapper({
  patient,
  stageId,
  onPatientClick,
}: {
  patient: PipelinePatient;
  stageId: string;
  onPatientClick: (patient: PipelinePatient, stageId: string) => void;
}) {
  const handleClick = useCallback(() => onPatientClick(patient, stageId), [patient, stageId, onPatientClick]);
  return <PatientCard patient={patient} onClick={handleClick} />;
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

  return (
    <div className="flex-shrink-0 w-[272px] flex flex-col bg-gray-50/80 rounded-xl border border-gray-200/80">
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
          {stage.patients.map((patient) => (
            <PatientCardWrapper
              key={patient.pipelineId}
              patient={patient}
              stageId={stage.id}
              onPatientClick={onPatientClick}
            />
          ))}
        </SortableContext>

        {stage.patients.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-xs py-4">
            Sin pacientes
          </div>
        )}
      </div>
    </div>
  );
}
