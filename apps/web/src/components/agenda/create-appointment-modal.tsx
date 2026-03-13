"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { AgendaDentist } from "./calendar-utils";

interface TreatmentType {
  id: string;
  name: string;
  durationMin: number;
  price: string | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: Date | null;
  initialDentistId?: string | null;
  dentists: AgendaDentist[];
  treatmentTypes: TreatmentType[];
}

function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function CreateAppointmentModal({
  open,
  onClose,
  onCreated,
  initialDate,
  initialDentistId,
  dentists,
  treatmentTypes,
}: Props) {
  const [dentistId, setDentistId] = useState(initialDentistId ?? dentists[0]?.id ?? "");
  const [treatmentTypeId, setTreatmentTypeId] = useState("");
  const [startTime, setStartTime] = useState(
    toLocalISOString(initialDate ?? new Date())
  );
  const [endTime, setEndTime] = useState(
    toLocalISOString(addMinutes(initialDate ?? new Date(), 30))
  );
  const [notes, setNotes] = useState("");

  // Patient search
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync initialDate/dentist when modal opens
  useEffect(() => {
    if (open) {
      if (initialDate) {
        setStartTime(toLocalISOString(initialDate));
        const duration = treatmentTypeId
          ? treatmentTypes.find((t) => t.id === treatmentTypeId)?.durationMin ?? 30
          : 30;
        setEndTime(toLocalISOString(addMinutes(initialDate, duration)));
      }
      if (initialDentistId) setDentistId(initialDentistId);
      setErrorCode(null);
    }
  }, [open, initialDate, initialDentistId]);

  // A dentist with no assigned treatments is unrestricted (shows for any treatment).
  function dentistDoesTreatment(d: typeof dentists[0], ttId: string) {
    return !d.treatmentIds?.length || d.treatmentIds.includes(ttId);
  }

  // Treatments filtered by selected dentist
  const filteredTreatments = dentistId
    ? (() => {
        const d = dentists.find((x) => x.id === dentistId);
        if (!d?.treatmentIds?.length) return treatmentTypes; // no restrictions
        return treatmentTypes.filter((t) => d.treatmentIds!.includes(t.id));
      })()
    : treatmentTypes;

  // Dentists filtered by selected treatment
  const filteredDentists = treatmentTypeId
    ? dentists.filter((d) => dentistDoesTreatment(d, treatmentTypeId))
    : dentists;

  // When dentist changes: clear treatment if the new dentist doesn't do it
  function handleDentistChange(id: string) {
    setDentistId(id);
    if (treatmentTypeId) {
      const d = dentists.find((x) => x.id === id);
      if (d?.treatmentIds?.length && !d.treatmentIds.includes(treatmentTypeId)) {
        setTreatmentTypeId("");
      }
    }
  }

  // When treatment changes: adjust end time + switch dentist if needed
  function handleTreatmentChange(id: string) {
    setTreatmentTypeId(id);
    if (id) {
      const treatment = treatmentTypes.find((t) => t.id === id);
      if (treatment && startTime) {
        setEndTime(toLocalISOString(addMinutes(new Date(startTime), treatment.durationMin)));
      }
      // If current dentist doesn't do this treatment, switch to first one that does
      const currentDentist = dentists.find((d) => d.id === dentistId);
      if (currentDentist && !dentistDoesTreatment(currentDentist, id)) {
        const fallback = dentists.find((d) => dentistDoesTreatment(d, id));
        if (fallback) setDentistId(fallback.id);
      }
    }
  }

  // Auto-adjust end time when start time changes (keep duration)
  function handleStartTimeChange(value: string) {
    setStartTime(value);
    const start = new Date(value);
    const end = new Date(endTime);
    const duration = Math.max(15, (end.getTime() - new Date(startTime).getTime()) / 60_000);
    setEndTime(toLocalISOString(addMinutes(start, duration)));
  }

  // Debounced patient search
  function handlePatientSearch(value: string) {
    setPatientQuery(value);
    setSelectedPatient(null);
    clearTimeout(searchTimeout.current);
    if (!value.trim() || value.length < 2) {
      setPatientResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<{ patients: Patient[] }>(
          `/api/v1/patients?search=${encodeURIComponent(value)}&limit=8`
        );
        setPatientResults(data.patients);
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  async function handleSave() {
    if (!selectedPatient || !dentistId) return;
    setSaving(true);
    setErrorCode(null);
    try {
      await apiFetch("/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: selectedPatient.id,
          dentistId,
          treatmentTypeId: treatmentTypeId || undefined,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          notes: notes || undefined,
        }),
      });
      onCreated();
      onClose();
      // Reset
      setSelectedPatient(null);
      setPatientQuery("");
      setNotes("");
      setTreatmentTypeId("");
    } catch (err: any) {
      setErrorCode(err?.code ?? "UNKNOWN");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient search */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Paciente *</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-primary-800">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-xs text-primary-600">{selectedPatient.phone}</p>
                </div>
                <button
                  onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                  className="text-primary-400 hover:text-primary-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={patientQuery}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  placeholder="Buscar por nombre o teléfono..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {searching && (
                  <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                )}
                {patientResults.length > 0 && !selectedPatient && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatientQuery(""); setPatientResults([]); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors border-b last:border-b-0"
                      >
                        <p className="font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        <p className="text-xs text-gray-400">{p.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dentist */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Dentista *
              {treatmentTypeId && filteredDentists.length < dentists.length && (
                <span className="ml-1 text-primary-400">(filtrado por tratamiento)</span>
              )}
            </label>
            <select
              value={dentistId}
              onChange={(e) => handleDentistChange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {filteredDentists.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Treatment type */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Tipo de tratamiento
              {dentistId && filteredTreatments.length < treatmentTypes.length && (
                <span className="ml-1 text-primary-400">(filtrado por dentista)</span>
              )}
            </label>
            <select
              value={treatmentTypeId}
              onChange={(e) => handleTreatmentChange(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Sin especificar</option>
              {filteredTreatments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.durationMin} min)
                </option>
              ))}
            </select>
          </div>

          {/* Date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Inicio *</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fin *</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Observaciones, instrucciones previas..."
            />
          </div>

          {/* Validation errors */}
          {errorCode === "SLOT_TAKEN" && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              ⚠ Ya existe una cita en ese horario para este dentista. Elegí otro horario.
            </div>
          )}
          {errorCode === "GCAL_CONFLICT" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              🔒 El/la Dr/a. tiene un evento en Google Calendar en ese horario. Elegí otro horario.
            </div>
          )}
          {errorCode === "OUTSIDE_HOURS" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-sm text-orange-700">
              🕐 Fuera del horario de atención de la clínica. Verificá los horarios configurados.
            </div>
          )}
          {errorCode && !["SLOT_TAKEN", "GCAL_CONFLICT", "OUTSIDE_HOURS"].includes(errorCode) && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              ⚠ No se pudo crear la cita. Intentá de nuevo.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !selectedPatient || !dentistId || !startTime || !endTime}
          >
            {saving ? "Guardando..." : "Crear cita"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
