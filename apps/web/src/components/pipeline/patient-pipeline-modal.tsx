"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Phone, Mail, Calendar, Tag, Clock, Edit2, Check, AlertCircle, MessageCircle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { PipelinePatient } from "./patient-card";
import Link from "next/link";

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface Props {
  patient: PipelinePatient | null;
  currentStageId: string | null;
  currentStageName: string | null;
  stages: Stage[];
  open: boolean;
  onClose: () => void;
  onMoved: (patientId: string, newStageId: string) => void;
  onNotesUpdated: (patientId: string, notes: string, interestTreatment: string | null) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
  IN_PROGRESS: "En curso",
};

export function PatientPipelineModal({
  patient,
  currentStageId,
  currentStageName,
  stages,
  open,
  onClose,
  onMoved,
  onNotesUpdated,
}: Props) {
  const [movingTo, setMovingTo] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [interestTreatment, setInterestTreatment] = useState("");
  const [saving, setSaving] = useState(false);

  if (!patient) return null;

  async function handleMove(stageId: string) {
    if (!patient || stageId === currentStageId) return;
    setMovingTo(stageId);
    try {
      await apiFetch("/api/v1/pipeline/move", {
        method: "PATCH",
        body: JSON.stringify({ patientId: patient.id, stageId }),
      });
      onMoved(patient.id, stageId);
      onClose();
    } finally {
      setMovingTo(null);
    }
  }

  function startEditNotes() {
    setNotes(patient?.notes ?? "");
    setInterestTreatment(patient?.interestTreatment ?? "");
    setEditingNotes(true);
  }

  async function saveNotes() {
    if (!patient) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/pipeline/patients/${patient.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          notes: notes || undefined,
          interestTreatment: interestTreatment || null,
        }),
      });
      onNotesUpdated(patient.id, notes, interestTreatment || null);
      setEditingNotes(false);
    } finally {
      setSaving(false);
    }
  }

  const lastAppt = patient.appointments[0];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <Dialog.Title className="font-semibold text-gray-900">
              {patient.firstName} {patient.lastName}
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Contact info */}
            <div className="px-4 py-3 border-b space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{patient.phone}</span>
              </div>
              {patient.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>Paciente desde {formatDate(patient.createdAt)}</span>
              </div>
              {patient.lastVisitAt && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>Última visita: {formatDate(patient.lastVisitAt)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {patient.tags.length > 0 && (
              <div className="px-4 py-3 border-b">
                <p className="text-xs font-medium text-gray-500 mb-2">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5">
                  {patient.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Próxima cita / sin cita */}
            <div className="px-4 py-3 border-b">
              <p className="text-xs font-medium text-gray-500 mb-2">Próxima cita</p>
              {lastAppt ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1">
                  <p className="text-sm font-medium text-blue-800">
                    {lastAppt.treatmentType?.name ?? "Sin tipo especificado"}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">{formatDate(lastAppt.startTime)}</p>
                  <p className="text-xs text-gray-500">Dr/a. {lastAppt.dentist.name}</p>
                  <span
                    className="inline-block text-xs px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: lastAppt.dentist.color + "22", color: lastAppt.dentist.color }}
                  >
                    {STATUS_LABELS[lastAppt.status] ?? lastAppt.status}
                  </span>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 font-medium">Sin cita agendada</p>
                    <p className="text-xs text-red-500 mt-0.5">Este paciente no tiene una cita próxima</p>
                    <Link
                      href="/agenda"
                      className="inline-flex items-center gap-1 mt-2 text-xs bg-red-600 text-white px-2.5 py-1 rounded-lg hover:bg-red-700 transition-colors"
                      onClick={onClose}
                    >
                      <Calendar className="h-3 w-3" />
                      Agendar cita
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Notes & Interest treatment */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">Notas del pipeline</p>
                {!editingNotes && (
                  <button
                    onClick={startEditNotes}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    Editar
                  </button>
                )}
              </div>

              {editingNotes ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500">Tratamiento de interés</label>
                    <input
                      type="text"
                      value={interestTreatment}
                      onChange={(e) => setInterestTreatment(e.target.value)}
                      placeholder="Ej: Ortodoncia, implante..."
                      className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Notas</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Agregar notas sobre este paciente..."
                      rows={3}
                      className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveNotes}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" />
                      {saving ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {patient.interestTreatment ? (
                    <p className="text-sm text-primary-600 font-medium">
                      🦷 {patient.interestTreatment}
                    </p>
                  ) : null}
                  {patient.notes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{patient.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin notas</p>
                  )}
                </div>
              )}
            </div>

            {/* Move to stage */}
            <div className="px-4 py-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Mover a etapa</p>
              <div className="flex flex-col gap-1.5">
                {stages.map((stage) => {
                  const isCurrent = stage.id === currentStageId;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => handleMove(stage.id)}
                      disabled={isCurrent || movingTo !== null}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        isCurrent
                          ? "bg-gray-100 text-gray-400 cursor-default"
                          : "hover:bg-gray-50 text-gray-700 border border-gray-200"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="flex-1">{stage.name}</span>
                      {isCurrent && (
                        <span className="text-xs text-gray-400 font-medium">Actual</span>
                      )}
                      {movingTo === stage.id && (
                        <div className="w-3 h-3 border border-primary-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t flex gap-2">
            <a
              href={`https://wa.me/${patient.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <Link
              href="/conversaciones"
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={onClose}
              title="Abrir conversación"
            >
              <MessageCircle className="h-4 w-4" />
              Chat
            </Link>
            <Link
              href={`/pacientes/${patient.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              onClick={onClose}
            >
              Ver ficha completa
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
