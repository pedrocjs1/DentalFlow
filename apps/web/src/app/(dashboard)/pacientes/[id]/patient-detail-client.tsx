"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Odontogram } from "@/components/clinical/odontogram/odontogram";
import { MedicalHistoryForm } from "@/components/clinical/medical-history/medical-history-form";
import { TreatmentPlanView } from "@/components/clinical/treatment-plan/treatment-plan";
import { VisitNotes } from "@/components/clinical/visit-notes/visit-notes";
import { Periodontogram } from "@/components/clinical/periodontogram/periodontogram";

type Tab = "odontograma" | "historia" | "tratamiento" | "evoluciones" | "periodoncia";

const TABS: { value: Tab; label: string }[] = [
  { value: "odontograma", label: "Odontograma" },
  { value: "historia", label: "Historia Médica" },
  { value: "tratamiento", label: "Plan de Tratamiento" },
  { value: "evoluciones", label: "Notas Clínicas" },
  { value: "periodoncia", label: "Periodontograma" },
];

function getAge(birthdate: string | null): string {
  if (!birthdate) return "";
  const age = Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} años`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  patient: any;
  medicalHistory: any;
  odontogramFindings: any[];
  treatmentPlan: any;
  visitNotes: any[];
  visitNotesTotal: number;
  periodontogramLatest: any;
  periodontogramHistory: any[];
}

export function PatientDetailClient({
  patient,
  medicalHistory,
  odontogramFindings,
  treatmentPlan,
  visitNotes,
  visitNotesTotal,
  periodontogramLatest,
  periodontogramHistory,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("odontograma");

  const fullName = patient.lastName ? `${patient.firstName} ${patient.lastName}` : patient.firstName;
  const initials = (`${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`).toUpperCase() || "?";
  const age = getAge(patient.birthdate);

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/pacientes"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a pacientes
      </Link>

      {/* Patient header card */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-primary-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500">
                  {age && <span>{age}</span>}
                  {patient.gender && (
                    <span className="capitalize">
                      {patient.gender === "MALE" ? "Masculino" : patient.gender === "FEMALE" ? "Femenino" : "Otro"}
                    </span>
                  )}
                  {patient.birthdate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(patient.birthdate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 space-y-0.5">
                <p className="flex items-center gap-1.5 justify-end">
                  <Phone className="h-3.5 w-3.5" />
                  {patient.phone}
                </p>
                {patient.email && (
                  <p className="flex items-center gap-1.5 justify-end">
                    <Mail className="h-3.5 w-3.5" />
                    {patient.email}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Última visita: {formatDate(patient.lastVisitAt)}
                </p>
              </div>
            </div>

            {/* Tags */}
            {patient.tags?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                {patient.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.value
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {activeTab === "odontograma" && (
            <Odontogram patientId={patient.id} initialFindings={odontogramFindings} />
          )}
          {activeTab === "historia" && (
            <MedicalHistoryForm patientId={patient.id} initial={medicalHistory ?? {}} />
          )}
          {activeTab === "tratamiento" && (
            <TreatmentPlanView patientId={patient.id} initialPlan={treatmentPlan} />
          )}
          {activeTab === "evoluciones" && (
            <VisitNotes patientId={patient.id} initialNotes={visitNotes} initialTotal={visitNotesTotal} />
          )}
          {activeTab === "periodoncia" && (
            <Periodontogram
              patientId={patient.id}
              initialLatest={periodontogramLatest}
              initialHistory={periodontogramHistory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
