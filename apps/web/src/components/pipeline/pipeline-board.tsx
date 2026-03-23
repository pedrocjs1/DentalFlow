"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Search, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PipelineColumn } from "./pipeline-column";
import { PatientCard, type PipelinePatient } from "./patient-card";
import { PatientPipelineModal } from "./patient-pipeline-modal";

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
  patientCount: number;
  stageValue: number;
  patients: PipelinePatient[];
}

interface PipelineData {
  stages: PipelineStage[];
}

export function PipelineBoard() {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Drag state
  const [activePatient, setActivePatient] = useState<PipelinePatient | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Tracks the stage the drag started from (immune to optimistic state updates)
  const dragOriginStageIdRef = useRef<string | null>(null);

  // Modal state
  const [selectedPatient, setSelectedPatient] = useState<PipelinePatient | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPipeline = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set("search", debouncedSearch);
      const data = await apiFetch<PipelineData>(`/api/v1/pipeline?${qs.toString()}`);
      setStages(data.stages);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Polling: refresh every 8s when tab is visible (silent — no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchPipeline(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchPipeline]);

  // Find which stage a patient belongs to (by pipelineId)
  function findStageByPipelineId(pipelineId: string): PipelineStage | undefined {
    return stages.find((s) => s.patients.some((p) => p.pipelineId === pipelineId));
  }

  function handleDragStart(event: DragStartEvent) {
    const pipelineId = event.active.id as string;
    for (const stage of stages) {
      const patient = stage.patients.find((p) => p.pipelineId === pipelineId);
      if (patient) {
        setActivePatient(patient);
        dragOriginStageIdRef.current = stage.id; // freeze origin — not affected by optimistic updates
        break;
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);

    if (!over || !activePatient) return;

    const overId = over.id as string;

    // Determine if over a stage or another patient card
    const overStage = stages.find((s) => s.id === overId);
    const overPatientStage = findStageByPipelineId(overId);
    const targetStageId = overStage?.id ?? overPatientStage?.id;

    if (!targetStageId) return;

    const fromStage = findStageByPipelineId(activePatient.pipelineId);
    if (!fromStage || fromStage.id === targetStageId) return;

    // Optimistically move patient to the new column
    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === fromStage.id) {
          return {
            ...stage,
            patients: stage.patients.filter((p) => p.pipelineId !== activePatient.pipelineId),
            patientCount: stage.patientCount - 1,
          };
        }
        if (stage.id === targetStageId) {
          // Insert at position of the over patient, or at end
          const overIndex = stage.patients.findIndex((p) => p.pipelineId === overId);
          const newPatients = [...stage.patients];
          if (overIndex >= 0) {
            newPatients.splice(overIndex, 0, activePatient);
          } else {
            newPatients.push(activePatient);
          }
          return {
            ...stage,
            patients: newPatients,
            patientCount: stage.patientCount + 1,
          };
        }
        return stage;
      })
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const originStageId = dragOriginStageIdRef.current;
    dragOriginStageIdRef.current = null;
    setActivePatient(null);
    setOverId(null);

    const { active, over } = event;
    if (!over || !activePatient || !originStageId) return;

    const overId = over.id as string;

    // Determine target stage — check if dropped on a column or another card
    const overStage = stages.find((s) => s.id === overId);
    const overPatientStage = findStageByPipelineId(overId);
    const targetStage = overStage ?? overPatientStage;
    if (!targetStage) return;

    // Same column: just reorder locally (no API needed)
    if (originStageId === targetStage.id) {
      const col = stages.find((s) => s.id === originStageId);
      if (!col) return;
      const oldIndex = col.patients.findIndex((p) => p.pipelineId === active.id);
      const newIndex = col.patients.findIndex((p) => p.pipelineId === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setStages((prev) =>
          prev.map((s) =>
            s.id === originStageId ? { ...s, patients: arrayMove(s.patients, oldIndex, newIndex) } : s
          )
        );
      }
      return;
    }

    // Cross-column: optimistic update already applied in handleDragOver — persist to API
    try {
      await apiFetch("/api/v1/pipeline/move", {
        method: "PATCH",
        body: JSON.stringify({ patientId: activePatient.id, stageId: targetStage.id }),
      });
      // Refresh to get accurate movedAt and server state
      fetchPipeline();
    } catch {
      fetchPipeline(); // revert on error
    }
  }

  function handlePatientClick(patient: PipelinePatient, stageId: string) {
    setSelectedPatient(patient);
    setSelectedStageId(stageId);
    setModalOpen(true);
  }

  function handleMoved(patientId: string, newStageId: string) {
    fetchPipeline();
  }

  function handleNotesUpdated(patientId: string, notes: string, interestTreatment: string | null) {
    setStages((prev) =>
      prev.map((stage) => ({
        ...stage,
        patients: stage.patients.map((p) =>
          p.id === patientId ? { ...p, notes, interestTreatment } : p
        ),
      }))
    );
    if (selectedPatient?.id === patientId) {
      setSelectedPatient((prev) => prev ? { ...prev, notes, interestTreatment } : prev);
    }
  }

  const totalPatients = stages.reduce((acc, s) => acc + s.patientCount, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pipeline CRM</h2>
          <p className="text-sm text-gray-500 mt-0.5">Seguimiento comercial de pacientes</p>
        </div>
        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full tabular-nums">
          {totalPatients} pacientes
        </span>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 w-52 transition-all duration-200"
          />
        </div>

        <button
          onClick={() => fetchPipeline()}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>

        <Link
          href="/configuracion?tab=pipeline"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title="Configurar pipeline"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto pb-4">
        {loading && stages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Cargando pipeline...</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full min-h-[500px]">
              {stages.map((stage) => (
                <PipelineColumn
                  key={stage.id}
                  stage={stage}
                  onPatientClick={handlePatientClick}
                  isOver={overId === stage.id}
                />
              ))}

              {stages.length === 0 && (
                <div className="flex items-center justify-center w-full text-gray-400">
                  <p>No hay etapas configuradas. Configuralas en Configuración → Pipeline.</p>
                </div>
              )}
            </div>

            <DragOverlay>
              {activePatient ? (
                <PatientCard patient={activePatient} onClick={() => {}} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <PatientPipelineModal
        patient={selectedPatient}
        currentStageId={selectedStageId}
        currentStageName={stages.find((s) => s.id === selectedStageId)?.name ?? null}
        stages={stages.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onMoved={handleMoved}
        onNotesUpdated={handleNotesUpdated}
      />
    </div>
  );
}
