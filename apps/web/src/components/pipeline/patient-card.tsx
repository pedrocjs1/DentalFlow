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
  const dentistColor = nextAppt?.dentist.color ?? "#e5e7eb";
  const initials = `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border border-gray-200/80 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer select-none overflow-hidden ${
        isDragging ? "shadow-lg ring-2 ring-primary-400 scale-[1.02]" : ""
      }`}
      onClick={onClick}
    >
      {/* Color stripe */}
      <div
        className="h-[3px] w-full"
        style={{ backgroundColor: dentistColor }}
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
            {/* Name + Avatar + WhatsApp */}
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-primary-700">{initials}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm truncate flex-1">
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
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs pl-9">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{patient.phone}</span>
            </div>

            {/* Interest treatment */}
            {patient.interestTreatment && (
              <div className="mt-1.5 pl-9">
                <span className="inline-flex items-center text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full font-medium">
                  {patient.interestTreatment}
                </span>
              </div>
            )}

            {/* Next appointment */}
            <div className="mt-1.5 flex items-center gap-1 pl-9">
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
              <div className="flex items-center gap-1 mt-1.5 flex-wrap pl-9">
                <Tag className="h-3 w-3 text-gray-400 flex-shrink-0" />
                {patient.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {patient.tags.length > 2 && (
                  <span className="text-[10px] text-gray-400">+{patient.tags.length - 2}</span>
                )}
              </div>
            )}

            {/* Time in stage */}
            <div className="flex items-center gap-1 mt-1.5 text-gray-400 text-[10px] pl-9">
              <Clock className="h-3 w-3" />
              <span>en etapa {timeAgo(patient.movedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
