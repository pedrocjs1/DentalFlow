"use client";

import { useMemo, useCallback, memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { PatientCard, type PipelinePatient } from "./patient-card";

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
    <div className="flex-shrink-0 w-64 flex flex-col bg-gray-50 rounded-xl border border-gray-200">
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="font-semibold text-sm text-gray-800 flex-1 truncate">{stage.name}</span>
        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-full font-medium">
          {stage.patientCount}
        </span>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 p-2 flex flex-col gap-2 min-h-[100px] transition-colors ${
          isOver ? "bg-primary-50 border-2 border-dashed border-primary-300 rounded-b-xl" : ""
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
