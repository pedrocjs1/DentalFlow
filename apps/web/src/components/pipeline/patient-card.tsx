"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Clock, Tag, GripVertical, Calendar, MessageCircle } from "lucide-react";

export interface PipelinePatient {
  pipelineId: string;
  movedAt: string;
  notes: string | null;
  interestTreatment: string | null;
  lastAutoMessageSentAt: string | null;
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  tags: string[];
  birthdate: string | null;
  lastVisitAt: string | null;
  nextVisitDue: string | null;
  createdAt: string;
  // Next upcoming CONFIRMED/PENDING appointment
  appointments: Array<{
    startTime: string;
    status: string;
    treatmentType: { name: string } | null;
    dentist: { id: string; name: string; color: string };
  }>;
}

interface Props {
  patient: PipelinePatient;
  onClick: () => void;
  isDragging?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days}d`;
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)}m`;
  return `hace ${Math.floor(days / 365)}a`;
}

function formatApptDate(dateStr: string): string {
  const d = new Date(dateStr);
  const DAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const MON = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${hh}:${mm}`;
}

function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export function PatientCard({ patient, onClick, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: patient.pipelineId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  };

  const nextAppt = patient.appointments[0] ?? null;
  const dentistColor = nextAppt?.dentist.color ?? null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none overflow-hidden ${
        isDragging ? "shadow-lg ring-2 ring-primary-400" : ""
      }`}
      onClick={onClick}
    >
      {/* Dentist color stripe */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: dentistColor ?? "#e5e7eb" }}
      />

      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Name + WhatsApp */}
            <div className="flex items-center justify-between gap-1">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {patient.firstName} {patient.lastName}
              </p>
              <a
                href={whatsappUrl(patient.phone)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-green-500 hover:text-green-600 transition-colors"
                title={`WhatsApp ${patient.phone}`}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-xs">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{patient.phone}</span>
            </div>

            {/* Interest treatment */}
            {patient.interestTreatment && (
              <p className="text-xs text-primary-600 mt-1 font-medium truncate">
                🦷 {patient.interestTreatment}
              </p>
            )}

            {/* Next appointment */}
            <div className="mt-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3 flex-shrink-0 text-gray-400" />
              {nextAppt ? (
                <span className="text-xs text-gray-600 truncate">
                  {formatApptDate(nextAppt.startTime)}
                </span>
              ) : (
                <span className="text-xs text-red-500 font-medium">Sin cita agendada</span>
              )}
            </div>

            {/* Tags */}
            {patient.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                {patient.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {patient.tags.length > 2 && (
                  <span className="text-xs text-gray-400">+{patient.tags.length - 2}</span>
                )}
              </div>
            )}

            {/* Time in stage */}
            <div className="flex items-center gap-1 mt-1.5 text-gray-400 text-xs">
              <Clock className="h-3 w-3" />
              <span>en etapa {timeAgo(patient.movedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
