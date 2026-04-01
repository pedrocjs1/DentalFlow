"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { Phone, Clock, Tag, GripVertical, Calendar, MessageCircle } from "lucide-react";

export interface PipelinePatient {
  pipelineId: string;
  movedAt: string;
  notes: string | null;
  interestTreatment: string | null;
  interestTreatmentId: string | null;
  interestTreatmentPrice: number | null;
  lastAutoMessageSentAt: string | null;
  treatmentPlanProgress: {
    planId: string;
    planTitle: string;
    totalItems: number;
    completedItems: number;
  } | null;
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
  compact?: boolean;
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

// Tag color indicator — small dot showing tag category
function tagIndicatorColor(tags: string[]): string | null {
  if (!tags?.length) return null;
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.includes("whatsapp")) return "#22c55e"; // green
  if (lower.includes("nuevo")) return "#3b82f6"; // blue
  if (lower.includes("urgente")) return "#ef4444"; // red
  if (lower.includes("vip")) return "#f59e0b"; // amber
  return "#6b7280"; // gray for other tags
}

// ─── Full card (normal view) ─────────────────────────────────────────────────

function FullCardContent({ patient }: { patient: PipelinePatient }) {
  const nextAppt = patient.appointments?.[0] ?? null;
  const initials = `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <>
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

      {/* Interest treatment + price */}
      {patient.interestTreatment && (
        <div className="mt-1.5 pl-9 flex items-center gap-1.5">
          <span className="inline-flex items-center text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full font-medium">
            {patient.interestTreatment}
          </span>
          {patient.interestTreatmentPrice != null && patient.interestTreatmentPrice > 0 && (
            <span className="text-[10px] text-emerald-600 font-medium">
              ${patient.interestTreatmentPrice.toLocaleString("es-AR")}
            </span>
          )}
        </div>
      )}

      {/* Treatment plan progress */}
      {patient.treatmentPlanProgress && (
        <div className="mt-1.5 pl-9">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 truncate">
              {patient.treatmentPlanProgress.planTitle}:
            </span>
            <span className="text-[10px] font-medium text-primary-700">
              {patient.treatmentPlanProgress.completedItems}/{patient.treatmentPlanProgress.totalItems}
            </span>
          </div>
          <div className="mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{
                width: `${patient.treatmentPlanProgress.totalItems > 0
                  ? (patient.treatmentPlanProgress.completedItems / patient.treatmentPlanProgress.totalItems) * 100
                  : 0}%`,
              }}
            />
          </div>
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
      {patient.tags?.length > 0 && (
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
    </>
  );
}

// ─── Compact card (filing tab view) ──────────────────────────────────────────

function CompactCardContent({ patient }: { patient: PipelinePatient }) {
  const tagColor = tagIndicatorColor(patient.tags);
  const nextAppt = patient.appointments?.[0] ?? null;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* Tag color indicator dot */}
      {tagColor && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: tagColor }}
        />
      )}
      {/* Name */}
      <span className="text-sm font-medium text-gray-800 truncate flex-1">
        {patient.firstName} {patient.lastName}
      </span>
      {/* Appointment indicator */}
      {nextAppt ? (
        <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" title="Sin cita" />
      )}
    </div>
  );
}

// ─── Main PatientCard ────────────────────────────────────────────────────────

export function PatientCard({ patient, onClick, isDragging, compact }: Props) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: patient.pipelineId });

  const transformStr = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined;

  const nextAppt = patient.appointments?.[0] ?? null;
  const dentistColor = nextAppt?.dentist?.color ?? "#e5e7eb";

  // Expanded = not compact, or compact but hovered
  const isExpanded = !compact || hovered;

  const style: React.CSSProperties = {
    transform: transformStr,
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
    // When compact+hovered, lift the card above siblings
    ...(compact && hovered
      ? { zIndex: 50, position: "relative" as const }
      : compact
        ? { position: "relative" as const }
        : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "bg-white rounded-lg border cursor-pointer select-none overflow-hidden",
        "transition-[box-shadow,margin] duration-200 ease-out",
        compact && !hovered
          ? "border-gray-200/60 shadow-none -mb-1.5"
          : "border-gray-200/80 shadow-sm hover:shadow-md",
        compact && hovered ? "shadow-lg ring-1 ring-primary-300 -mt-1 mb-1" : "",
        isDragging ? "shadow-lg ring-2 ring-primary-400" : "",
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      onMouseEnter={compact ? () => setHovered(true) : undefined}
      onMouseLeave={compact ? () => setHovered(false) : undefined}
    >
      {/* Color stripe */}
      <div
        className={compact && !hovered ? "h-[2px] w-full" : "h-[3px] w-full"}
        style={{ backgroundColor: dentistColor }}
      />

      <div className={compact && !hovered ? "px-3 py-1.5" : "p-3"}>
        {compact && !hovered ? (
          /* Compact: just the filing tab */
          <div className="flex items-center gap-1.5">
            <button
              {...attributes}
              {...listeners}
              className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <CompactCardContent patient={patient} />
          </div>
        ) : (
          /* Full: normal card content */
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <FullCardContent patient={patient} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
