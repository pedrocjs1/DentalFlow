"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, Calendar, Tag, AlertTriangle, Shield,
  ClipboardList, Stethoscope, FileText, HeartPulse, Camera, FileCheck, BarChart3, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Odontogram } from "@/components/clinical/odontogram/odontogram";
import { MedicalHistoryForm } from "@/components/clinical/medical-history/medical-history-form";
import { TreatmentPlanView } from "@/components/clinical/treatment-plan/treatment-plan";
import { VisitNotes } from "@/components/clinical/visit-notes/visit-notes";
import { Periodontogram } from "@/components/clinical/periodontogram/periodontogram";
import { SummaryTab } from "@/components/clinical/summary/summary-tab";
import { ImagesTab } from "@/components/clinical/images/images-tab";
import { DocumentsTab } from "@/components/clinical/documents/documents-tab";

type Tab = "resumen" | "odontograma" | "periodoncia" | "tratamiento" | "evoluciones" | "historia" | "imagenes" | "documentos";

const TABS: { value: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "resumen", label: "Resumen", icon: BarChart3 },
  { value: "odontograma", label: "Odontograma", icon: Stethoscope },
  { value: "periodoncia", label: "Periodontograma", icon: BarChart3 },
  { value: "tratamiento", label: "Plan de Tratamiento", icon: ClipboardList },
  { value: "evoluciones", label: "Evoluciones", icon: FileText },
  { value: "historia", label: "Historia Médica", icon: HeartPulse },
  { value: "imagenes", label: "Imágenes", icon: Camera },
  { value: "documentos", label: "Recetas y Documentos", icon: FileCheck },
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

function getMedicalAlerts(mh: any): string[] {
  if (!mh) return [];
  const alerts: string[] = [];
  if (mh.latexAllergy) alerts.push("Alergia al látex");
  if (mh.anestheticAllergy) alerts.push("Alergia a anestésicos");
  if (mh.allergies?.length > 0) mh.allergies.forEach((a: string) => alerts.push(`Alergia: ${a}`));
  if (mh.hasDiabetes) alerts.push("Diabetes");
  if (mh.hasHypertension) alerts.push("Hipertensión");
  if (mh.hasHeartDisease) alerts.push("Cardiopatía");
  if (mh.hasAsthma) alerts.push("Asma");
  if (mh.hasHIV) alerts.push("VIH/SIDA");
  if (mh.hasEpilepsy) alerts.push("Epilepsia");
  if (mh.isPregnant) alerts.push("Embarazada");
  // Check for anticoagulants in medications
  const anticoagulants = ["warfarina", "aspirina", "heparina", "clopidogrel", "rivaroxaban"];
  if (mh.medications?.some((m: string) => anticoagulants.some(a => m.toLowerCase().includes(a)))) {
    alerts.push("Anticoagulantes");
  }
  return alerts;
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
  const [activeTab, setActiveTab] = useState<Tab>("resumen");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fullName = patient.lastName ? `${patient.firstName} ${patient.lastName}` : patient.firstName;
  const initials = (`${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`).toUpperCase() || "?";
  const age = getAge(patient.birthdate);
  const alerts = getMedicalAlerts(medicalHistory);

  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

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
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-white">{initials}</span>
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
                  {patient.insurance && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      {patient.insurance}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-gray-500 space-y-0.5">
                <button
                  onClick={() => copyToClipboard(patient.phone, "phone")}
                  className="flex items-center gap-1.5 justify-end hover:text-gray-700 transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {patient.phone}
                  {copiedField === "phone" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 opacity-40" />}
                </button>
                {patient.email && (
                  <button
                    onClick={() => copyToClipboard(patient.email, "email")}
                    className="flex items-center gap-1.5 justify-end hover:text-gray-700 transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {patient.email}
                    {copiedField === "email" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 opacity-40" />}
                  </button>
                )}
                <p className="text-xs text-gray-400">
                  Última visita: {formatDate(patient.lastVisitAt)}
                </p>
              </div>
            </div>

            {/* Medical alerts */}
            {alerts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                {alerts.map((alert) => (
                  <span key={alert} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    {alert}
                  </span>
                ))}
              </div>
            ) : medicalHistory ? (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Sin alertas médicas
                </span>
              </div>
            ) : null}

            {/* Tags */}
            {patient.tags?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
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

      {/* 8 Tabs */}
      <div>
        <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  activeTab === tab.value
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="mt-5">
          {activeTab === "resumen" && (
            <SummaryTab patientId={patient.id} />
          )}
          {activeTab === "odontograma" && (
            <Odontogram patientId={patient.id} initialFindings={odontogramFindings} />
          )}
          {activeTab === "periodoncia" && (
            <Periodontogram
              patientId={patient.id}
              initialLatest={periodontogramLatest}
              initialHistory={periodontogramHistory}
            />
          )}
          {activeTab === "tratamiento" && (
            <TreatmentPlanView patientId={patient.id} initialPlan={treatmentPlan} />
          )}
          {activeTab === "evoluciones" && (
            <VisitNotes patientId={patient.id} initialNotes={visitNotes} initialTotal={visitNotesTotal} />
          )}
          {activeTab === "historia" && (
            <MedicalHistoryForm patientId={patient.id} initial={medicalHistory ?? {}} />
          )}
          {activeTab === "imagenes" && (
            <ImagesTab patientId={patient.id} />
          )}
          {activeTab === "documentos" && (
            <DocumentsTab patientId={patient.id} />
          )}
        </div>
      </div>
    </div>
  );
}
