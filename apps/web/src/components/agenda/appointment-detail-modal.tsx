"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { AgendaAppointment } from "./calendar-utils";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-green-100 text-green-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

interface Props {
  appointment: AgendaAppointment | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function AppointmentDetailModal({ appointment, open, onClose, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  if (!appointment) return null;

  async function handleStatusChange(status: string) {
    if (!appointment) return;
    setLoading(true);
    try {
      await apiFetch(`/api/v1/appointments/${appointment.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(status === "CANCELLED" && cancelReason ? { cancelReason } : {}),
        }),
      });
      onRefresh();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const isCancelled = appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";
  const isCompleted = appointment.status === "COMPLETED";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle de cita</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: appointment.dentist.color }}
            >
              {appointment.patient.firstName[0]}{appointment.patient.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {appointment.patient.firstName} {appointment.patient.lastName}
              </p>
              <p className="text-sm text-gray-500">{appointment.patient.phone}</p>
            </div>
            <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[appointment.status]}`}>
              {STATUS_LABELS[appointment.status]}
            </span>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Dentista</span>
              <span className="font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: appointment.dentist.color }} />
                {appointment.dentist.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Inicio</span>
              <span className="font-medium capitalize">{formatDateTime(appointment.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fin</span>
              <span className="font-medium">{formatTime(appointment.endTime)}</span>
            </div>
            {appointment.treatmentType && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tratamiento</span>
                <span className="font-medium">{appointment.treatmentType.name}</span>
              </div>
            )}
            {appointment.chair && (
              <div className="flex justify-between">
                <span className="text-gray-500">Sillón</span>
                <span className="font-medium">{appointment.chair.name}</span>
              </div>
            )}
            {appointment.notes && (
              <div className="pt-2 border-t">
                <p className="text-gray-500 mb-1">Notas</p>
                <p className="text-gray-700">{appointment.notes}</p>
              </div>
            )}
          </div>

          {/* Cancel form */}
          {showCancelForm && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Motivo de cancelación (opcional)</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Paciente no disponible, reagendó..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleStatusChange("CANCELLED")}
                  disabled={loading}
                >
                  Confirmar cancelación
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCancelForm(false)}>
                  Volver
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          {!isCancelled && !isCompleted && !showCancelForm && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {appointment.status !== "CONFIRMED" && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange("CONFIRMED")}
                  disabled={loading}
                >
                  ✓ Confirmar
                </Button>
              )}
              {appointment.status !== "IN_PROGRESS" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  disabled={loading}
                >
                  ▶ Iniciar
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => handleStatusChange("COMPLETED")}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                ✓✓ Completar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange("NO_SHOW")}
                disabled={loading}
              >
                No asistió
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCancelForm(true)}
                disabled={loading}
              >
                Cancelar cita
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
