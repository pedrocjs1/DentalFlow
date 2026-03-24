"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

// --- Types for new detailed sections ---

interface AllergyDetail {
  name: string;
  severity: "Leve" | "Moderada" | "Severa";
}

interface MedicationDetail {
  name: string;
  dose: string;
  frequency: string;
  since: string;
}

interface ConditionDetail {
  name: string;
  type: string;
  since: string;
  currentTreatment: string;
  isActive: boolean;
}

interface FamilyHistory {
  diabetes: boolean;
  hypertension: boolean;
  cancer: boolean;
  heartDisease: boolean;
  other: string;
}

interface SurgeryHistoryItem {
  name: string;
  date: string;
  hospital: string;
  notes: string;
}

interface AuditEntry {
  id: string;
  createdAt: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy?: string;
}

interface MedicalHistory {
  bloodType?: string | null;
  rhFactor?: string | null;
  primaryDoctor?: string | null;
  primaryDoctorPhone?: string | null;
  allergies?: string[];
  latexAllergy?: boolean;
  anestheticAllergy?: boolean;
  allergyDetails?: AllergyDetail[];
  medications?: string[];
  medicationDetails?: MedicationDetail[];
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasHeartDisease?: boolean;
  hasAsthma?: boolean;
  hasHIV?: boolean;
  hasEpilepsy?: boolean;
  otherDiseases?: string | null;
  conditionDetails?: ConditionDetail[];
  familyHistory?: FamilyHistory;
  hasBruxism?: boolean;
  isSmoker?: boolean;
  smokingDetails?: string | null;
  smokingAmount?: string | null;
  alcoholFrequency?: string | null;
  isPregnant?: boolean;
  pregnancyWeeks?: number | null;
  breastfeeding?: boolean;
  surgicalHistory?: string | null;
  hospitalizations?: string | null;
  surgeryHistory?: SurgeryHistoryItem[];
  lastDoctorVisit?: string | null;
  consentSigned?: boolean;
  consentSignedAt?: string | null;
  consentNotes?: string | null;
}

interface Props {
  patientId: string;
  initial: MedicalHistory;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const FIELD_TRANSLATIONS: Record<string, string> = {
  bloodType: "Grupo sanguíneo",
  rhFactor: "Factor RH",
  primaryDoctor: "Médico de cabecera",
  primaryDoctorPhone: "Teléfono médico",
  allergies: "Alergias",
  latexAllergy: "Alergia al látex",
  anestheticAllergy: "Alergia a anestésicos",
  allergyDetails: "Detalle de alergias",
  medications: "Medicamentos",
  medicationDetails: "Detalle de medicamentos",
  hasDiabetes: "Diabetes",
  hasHypertension: "Hipertensión",
  hasHeartDisease: "Cardiopatía",
  hasAsthma: "Asma",
  hasHIV: "VIH/SIDA",
  hasEpilepsy: "Epilepsia",
  otherDiseases: "Otras enfermedades",
  conditionDetails: "Detalle de condiciones",
  familyHistory: "Antecedentes familiares",
  hasBruxism: "Bruxismo",
  isSmoker: "Fumador",
  smokingDetails: "Detalles tabaquismo",
  smokingAmount: "Cantidad de cigarrillos",
  alcoholFrequency: "Consumo de alcohol",
  isPregnant: "Embarazada",
  pregnancyWeeks: "Semanas de embarazo",
  breastfeeding: "Lactancia",
  surgicalHistory: "Cirugías previas",
  hospitalizations: "Hospitalizaciones",
  surgeryHistory: "Historial quirúrgico",
  lastDoctorVisit: "Última visita médica",
  consentSigned: "Consentimiento firmado",
  consentNotes: "Notas consentimiento",
};

// --- Reusable sub-components ---

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");
  return (
    <div className="border border-gray-200 rounded-lg p-2 min-h-[44px] flex flex-wrap gap-1.5">
      {value.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">
          {tag}
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-400 hover:text-gray-600">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && input.trim()) {
            e.preventDefault();
            onChange([...value, input.trim()]);
            setInput("");
          }
        }}
        className="flex-1 min-w-[120px] text-sm outline-none"
        placeholder={value.length === 0 ? placeholder : "Agregar más..."}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-sm font-medium text-gray-700 border-b pb-2">{children}</h4>;
}

function SubSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-2">{children}</p>;
}

const inputClass = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500";
const checkboxClass = "w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500";

// --- Main form ---

export function MedicalHistoryForm({ patientId, initial }: Props) {
  const [form, setForm] = useState<MedicalHistory>({
    bloodType: initial.bloodType ?? null,
    rhFactor: initial.rhFactor ?? null,
    primaryDoctor: initial.primaryDoctor ?? "",
    primaryDoctorPhone: initial.primaryDoctorPhone ?? "",
    allergies: initial.allergies ?? [],
    latexAllergy: initial.latexAllergy ?? false,
    anestheticAllergy: initial.anestheticAllergy ?? false,
    allergyDetails: initial.allergyDetails ?? [],
    medications: initial.medications ?? [],
    medicationDetails: initial.medicationDetails ?? [],
    hasDiabetes: initial.hasDiabetes ?? false,
    hasHypertension: initial.hasHypertension ?? false,
    hasHeartDisease: initial.hasHeartDisease ?? false,
    hasAsthma: initial.hasAsthma ?? false,
    hasHIV: initial.hasHIV ?? false,
    hasEpilepsy: initial.hasEpilepsy ?? false,
    otherDiseases: initial.otherDiseases ?? "",
    conditionDetails: initial.conditionDetails ?? [],
    familyHistory: initial.familyHistory ?? { diabetes: false, hypertension: false, cancer: false, heartDisease: false, other: "" },
    hasBruxism: initial.hasBruxism ?? false,
    isSmoker: initial.isSmoker ?? false,
    smokingDetails: initial.smokingDetails ?? "",
    smokingAmount: initial.smokingAmount ?? "",
    alcoholFrequency: initial.alcoholFrequency ?? "",
    isPregnant: initial.isPregnant ?? false,
    pregnancyWeeks: initial.pregnancyWeeks ?? null,
    breastfeeding: initial.breastfeeding ?? false,
    surgicalHistory: initial.surgicalHistory ?? "",
    hospitalizations: initial.hospitalizations ?? "",
    surgeryHistory: initial.surgeryHistory ?? [],
    lastDoctorVisit: initial.lastDoctorVisit ? initial.lastDoctorVisit.split("T")[0] : "",
    consentSigned: initial.consentSigned ?? false,
    consentNotes: initial.consentNotes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  function set<K extends keyof MedicalHistory>(key: K, value: MedicalHistory[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  // --- Allergy details helpers ---
  function addAllergyDetail() {
    set("allergyDetails", [...(form.allergyDetails ?? []), { name: "", severity: "Leve" }]);
  }
  function updateAllergyDetail(index: number, field: keyof AllergyDetail, value: string) {
    const updated = [...(form.allergyDetails ?? [])];
    updated[index] = { ...updated[index], [field]: value };
    set("allergyDetails", updated);
  }
  function removeAllergyDetail(index: number) {
    set("allergyDetails", (form.allergyDetails ?? []).filter((_, i) => i !== index));
  }

  // --- Medication details helpers ---
  function addMedicationDetail() {
    set("medicationDetails", [...(form.medicationDetails ?? []), { name: "", dose: "", frequency: "", since: "" }]);
  }
  function updateMedicationDetail(index: number, field: keyof MedicationDetail, value: string) {
    const updated = [...(form.medicationDetails ?? [])];
    updated[index] = { ...updated[index], [field]: value };
    set("medicationDetails", updated);
  }
  function removeMedicationDetail(index: number) {
    set("medicationDetails", (form.medicationDetails ?? []).filter((_, i) => i !== index));
  }

  // --- Condition details helpers ---
  function addConditionDetail() {
    set("conditionDetails", [...(form.conditionDetails ?? []), { name: "", type: "", since: "", currentTreatment: "", isActive: true }]);
  }
  function updateConditionDetail(index: number, field: keyof ConditionDetail, value: string | boolean) {
    const updated = [...(form.conditionDetails ?? [])];
    updated[index] = { ...updated[index], [field]: value };
    set("conditionDetails", updated);
  }
  function removeConditionDetail(index: number) {
    set("conditionDetails", (form.conditionDetails ?? []).filter((_, i) => i !== index));
  }

  // --- Surgery history helpers ---
  function addSurgeryItem() {
    set("surgeryHistory", [...(form.surgeryHistory ?? []), { name: "", date: "", hospital: "", notes: "" }]);
  }
  function updateSurgeryItem(index: number, field: keyof SurgeryHistoryItem, value: string) {
    const updated = [...(form.surgeryHistory ?? [])];
    updated[index] = { ...updated[index], [field]: value };
    set("surgeryHistory", updated);
  }
  function removeSurgeryItem(index: number) {
    set("surgeryHistory", (form.surgeryHistory ?? []).filter((_, i) => i !== index));
  }

  // --- Family history helper ---
  function setFamilyHistory<K extends keyof FamilyHistory>(key: K, value: FamilyHistory[K]) {
    set("familyHistory", { ...(form.familyHistory as FamilyHistory), [key]: value });
  }

  // --- Audit log ---
  async function fetchAuditLog() {
    if (auditLog.length > 0) return; // already fetched
    setAuditLoading(true);
    try {
      const data = await apiFetch(`/api/v1/patients/${patientId}/medical-history/audit`);
      setAuditLog(Array.isArray(data) ? data : []);
    } catch {
      setAuditLog([]);
    } finally {
      setAuditLoading(false);
    }
  }

  function toggleAudit() {
    const next = !auditOpen;
    setAuditOpen(next);
    if (next) fetchAuditLog();
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/medical-history`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          lastDoctorVisit: form.lastDoctorVisit ? new Date(form.lastDoctorVisit).toISOString() : null,
          consentSignedAt: form.consentSigned ? new Date().toISOString() : null,
        }),
      });
      setSaved(true);
      // Reset audit cache so next open fetches fresh data
      setAuditLog([]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border p-5 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Historia Médica</h3>
        {saved && <span className="text-xs text-green-600 font-medium">✓ Guardado</span>}
      </div>

      {/* ===== Datos generales ===== */}
      <section className="space-y-4">
        <SectionLabel>Datos Generales</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Grupo sanguíneo</label>
            <select
              value={form.bloodType ?? ""}
              onChange={(e) => set("bloodType", e.target.value || null)}
              className={inputClass}
            >
              <option value="">No especificado</option>
              {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Factor RH</label>
            <select
              value={form.rhFactor ?? ""}
              onChange={(e) => set("rhFactor", e.target.value || null)}
              className={inputClass}
            >
              <option value="">No especificado</option>
              <option value="+">+</option>
              <option value="-">-</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Médico de cabecera</label>
            <input
              type="text"
              value={form.primaryDoctor ?? ""}
              onChange={(e) => set("primaryDoctor", e.target.value)}
              className={inputClass}
              placeholder="Dr. Juan Pérez"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Teléfono médico</label>
            <input
              type="text"
              value={form.primaryDoctorPhone ?? ""}
              onChange={(e) => set("primaryDoctorPhone", e.target.value)}
              className={inputClass}
              placeholder="+54 261 555-1234"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Última visita médica</label>
            <input
              type="date"
              value={form.lastDoctorVisit ?? ""}
              onChange={(e) => set("lastDoctorVisit", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* ===== Alergias ===== */}
      <section className="space-y-4">
        <SectionLabel>Alergias</SectionLabel>

        {/* Prominent allergy checkboxes */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={!!form.latexAllergy}
              onChange={(e) => set("latexAllergy", e.target.checked)}
              className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-red-700">Alergia al látex</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={!!form.anestheticAllergy}
              onChange={(e) => set("anestheticAllergy", e.target.checked)}
              className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm font-medium text-red-700">Alergia a anestésicos</span>
          </label>
        </div>

        {/* Simple tags */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Alergias (Enter para agregar)</label>
          <TagInput value={form.allergies ?? []} onChange={(v) => set("allergies", v)} placeholder="Penicilina, aspirina..." />
        </div>

        {/* Allergy details dynamic list */}
        <div>
          <SubSectionLabel>Detalle de alergias</SubSectionLabel>
          <div className="space-y-2 mt-2">
            {(form.allergyDetails ?? []).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateAllergyDetail(i, "name", e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder="Nombre de la alergia"
                />
                <select
                  value={item.severity}
                  onChange={(e) => updateAllergyDetail(i, "severity", e.target.value)}
                  className={`${inputClass} w-36`}
                >
                  <option value="Leve">Leve</option>
                  <option value="Moderada">Moderada</option>
                  <option value="Severa">Severa</option>
                </select>
                <button onClick={() => removeAllergyDetail(i)} className="text-gray-400 hover:text-red-500 text-lg px-1">×</button>
              </div>
            ))}
          </div>
          <button onClick={addAllergyDetail} className="text-xs text-primary-600 hover:text-primary-700 mt-2 font-medium">
            + Agregar detalle de alergia
          </button>
        </div>
      </section>

      {/* ===== Medicamentos ===== */}
      <section className="space-y-4">
        <SectionLabel>Medicamentos Actuales</SectionLabel>

        {/* Simple tags */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Medicamentos (Enter para agregar)</label>
          <TagInput value={form.medications ?? []} onChange={(v) => set("medications", v)} placeholder="Metformina, enalapril..." />
        </div>

        {/* Medication details dynamic list */}
        <div>
          <SubSectionLabel>Detalle de medicamentos</SubSectionLabel>
          <div className="space-y-2 mt-2">
            {(form.medicationDetails ?? []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateMedicationDetail(i, "name", e.target.value)}
                  className={`${inputClass} flex-1 min-w-[120px]`}
                  placeholder="Nombre"
                />
                <input
                  type="text"
                  value={item.dose}
                  onChange={(e) => updateMedicationDetail(i, "dose", e.target.value)}
                  className={`${inputClass} w-24`}
                  placeholder="Dosis"
                />
                <input
                  type="text"
                  value={item.frequency}
                  onChange={(e) => updateMedicationDetail(i, "frequency", e.target.value)}
                  className={`${inputClass} w-28`}
                  placeholder="Frecuencia"
                />
                <input
                  type="date"
                  value={item.since}
                  onChange={(e) => updateMedicationDetail(i, "since", e.target.value)}
                  className={`${inputClass} w-36`}
                  title="Desde"
                />
                <button onClick={() => removeMedicationDetail(i)} className="text-gray-400 hover:text-red-500 text-lg px-1">×</button>
              </div>
            ))}
          </div>
          <button onClick={addMedicationDetail} className="text-xs text-primary-600 hover:text-primary-700 mt-2 font-medium">
            + Agregar detalle de medicamento
          </button>
        </div>
      </section>

      {/* ===== Enfermedades sistémicas ===== */}
      <section className="space-y-3">
        <SectionLabel>Enfermedades Sistémicas</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            ["hasDiabetes", "Diabetes"],
            ["hasHypertension", "Hipertensión"],
            ["hasHeartDisease", "Cardiopatía"],
            ["hasAsthma", "Asma"],
            ["hasHIV", "VIH/SIDA"],
            ["hasEpilepsy", "Epilepsia"],
          ] as [keyof MedicalHistory, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form[key]}
                onChange={(e) => set(key, e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Otras enfermedades</label>
          <input
            type="text"
            value={form.otherDiseases ?? ""}
            onChange={(e) => set("otherDiseases", e.target.value)}
            className={inputClass}
            placeholder="Hipotiroidismo, artritis..."
          />
        </div>

        {/* Condition details dynamic list */}
        <div>
          <SubSectionLabel>Detalle de condiciones</SubSectionLabel>
          <div className="space-y-2 mt-2">
            {(form.conditionDetails ?? []).map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateConditionDetail(i, "name", e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="Nombre de la condición"
                  />
                  <button onClick={() => removeConditionDetail(i)} className="text-gray-400 hover:text-red-500 text-lg px-1">×</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.type}
                    onChange={(e) => updateConditionDetail(i, "type", e.target.value)}
                    className={inputClass}
                    placeholder="Tipo"
                  />
                  <input
                    type="text"
                    value={item.since}
                    onChange={(e) => updateConditionDetail(i, "since", e.target.value)}
                    className={inputClass}
                    placeholder="Desde cuándo"
                  />
                  <input
                    type="text"
                    value={item.currentTreatment}
                    onChange={(e) => updateConditionDetail(i, "currentTreatment", e.target.value)}
                    className={inputClass}
                    placeholder="Tratamiento actual"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(e) => updateConditionDetail(i, "isActive", e.target.checked)}
                    className={checkboxClass}
                  />
                  <span className="text-xs text-gray-600">Condición activa</span>
                </label>
              </div>
            ))}
          </div>
          <button onClick={addConditionDetail} className="text-xs text-primary-600 hover:text-primary-700 mt-2 font-medium">
            + Agregar detalle de condición
          </button>
        </div>
      </section>

      {/* ===== Antecedentes Familiares ===== */}
      <section className="space-y-3">
        <SectionLabel>Antecedentes Familiares</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            ["diabetes", "Diabetes familiar"],
            ["hypertension", "Hipertensión familiar"],
            ["cancer", "Cáncer"],
            ["heartDisease", "Cardiopatía"],
          ] as [keyof FamilyHistory, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!(form.familyHistory as FamilyHistory)?.[key]}
                onChange={(e) => setFamilyHistory(key, e.target.checked)}
                className={checkboxClass}
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Otro antecedente familiar</label>
          <input
            type="text"
            value={(form.familyHistory as FamilyHistory)?.other ?? ""}
            onChange={(e) => setFamilyHistory("other", e.target.value)}
            className={inputClass}
            placeholder="Especificar..."
          />
        </div>
      </section>

      {/* ===== Hábitos ===== */}
      <section className="space-y-3">
        <SectionLabel>Hábitos</SectionLabel>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.hasBruxism}
              onChange={(e) => set("hasBruxism", e.target.checked)}
              className={checkboxClass}
            />
            <span className="text-sm text-gray-700">Bruxismo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isSmoker}
              onChange={(e) => set("isSmoker", e.target.checked)}
              className={checkboxClass}
            />
            <span className="text-sm text-gray-700">Fumador</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isPregnant}
              onChange={(e) => set("isPregnant", e.target.checked)}
              className={checkboxClass}
            />
            <span className="text-sm text-gray-700">Embarazada</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.breastfeeding}
              onChange={(e) => set("breastfeeding", e.target.checked)}
              className={checkboxClass}
            />
            <span className="text-sm text-gray-700">Lactancia</span>
          </label>
        </div>

        {/* Smoker detail */}
        {form.isSmoker && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cantidad de cigarrillos/día</label>
              <input
                type="text"
                value={form.smokingAmount ?? ""}
                onChange={(e) => set("smokingAmount", e.target.value)}
                className={inputClass}
                placeholder="Ej: 10"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Detalles adicionales</label>
              <input
                type="text"
                value={form.smokingDetails ?? ""}
                onChange={(e) => set("smokingDetails", e.target.value)}
                className={inputClass}
                placeholder="Años fumando, intentos de dejar..."
              />
            </div>
          </div>
        )}

        {/* Pregnancy detail */}
        {form.isPregnant && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Semanas de embarazo</label>
              <input
                type="number"
                min={0}
                max={45}
                value={form.pregnancyWeeks ?? ""}
                onChange={(e) => set("pregnancyWeeks", e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
                placeholder="Ej: 20"
              />
            </div>
          </div>
        )}

        {/* Alcohol */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Consumo de alcohol</label>
            <select
              value={form.alcoholFrequency ?? ""}
              onChange={(e) => set("alcoholFrequency", e.target.value || null)}
              className={inputClass}
            >
              <option value="">No especificado</option>
              <option value="Nunca">Nunca</option>
              <option value="Ocasional">Ocasional</option>
              <option value="Semanal">Semanal</option>
              <option value="Diario">Diario</option>
            </select>
          </div>
        </div>
      </section>

      {/* ===== Antecedentes quirúrgicos ===== */}
      <section className="space-y-3">
        <SectionLabel>Antecedentes Quirúrgicos</SectionLabel>

        {/* Keep legacy text fields */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cirugías previas (texto libre)</label>
          <textarea
            rows={2}
            value={form.surgicalHistory ?? ""}
            onChange={(e) => set("surgicalHistory", e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Apendicectomía 2015, cirugía cardíaca..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Hospitalizaciones</label>
          <textarea
            rows={2}
            value={form.hospitalizations ?? ""}
            onChange={(e) => set("hospitalizations", e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Internación por neumonía 2020..."
          />
        </div>

        {/* Surgery history dynamic list */}
        <div>
          <SubSectionLabel>Detalle de cirugías</SubSectionLabel>
          <div className="space-y-2 mt-2">
            {(form.surgeryHistory ?? []).map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateSurgeryItem(i, "name", e.target.value)}
                    className={`${inputClass} flex-1`}
                    placeholder="Nombre de la cirugía"
                  />
                  <button onClick={() => removeSurgeryItem(i)} className="text-gray-400 hover:text-red-500 text-lg px-1">×</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.date}
                    onChange={(e) => updateSurgeryItem(i, "date", e.target.value)}
                    className={inputClass}
                    placeholder="Fecha (ej: 2020)"
                  />
                  <input
                    type="text"
                    value={item.hospital}
                    onChange={(e) => updateSurgeryItem(i, "hospital", e.target.value)}
                    className={inputClass}
                    placeholder="Hospital/clínica"
                  />
                  <input
                    type="text"
                    value={item.notes}
                    onChange={(e) => updateSurgeryItem(i, "notes", e.target.value)}
                    className={inputClass}
                    placeholder="Notas"
                  />
                </div>
              </div>
            ))}
          </div>
          <button onClick={addSurgeryItem} className="text-xs text-primary-600 hover:text-primary-700 mt-2 font-medium">
            + Agregar cirugía
          </button>
        </div>
      </section>

      {/* ===== Consentimiento ===== */}
      <section className="space-y-3">
        <SectionLabel>Consentimiento Informado</SectionLabel>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.consentSigned}
            onChange={(e) => set("consentSigned", e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">El paciente firmó el consentimiento informado</span>
        </label>
        {form.consentSigned && (
          <textarea
            rows={2}
            value={form.consentNotes ?? ""}
            onChange={(e) => set("consentNotes", e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Observaciones del consentimiento..."
          />
        )}
      </section>

      {/* ===== Audit Trail ===== */}
      <section className="space-y-2">
        <button
          onClick={toggleAudit}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          <span className={`transition-transform ${auditOpen ? "rotate-90" : ""}`}>▶</span>
          Historial de cambios
        </button>
        {auditOpen && (
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50 max-h-60 overflow-y-auto">
            {auditLoading && <p className="text-xs text-gray-400">Cargando...</p>}
            {!auditLoading && auditLog.length === 0 && (
              <p className="text-xs text-gray-400">No hay cambios registrados.</p>
            )}
            {!auditLoading && auditLog.length > 0 && (
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-gray-600">
                      <strong>{FIELD_TRANSLATIONS[entry.field] ?? entry.field}</strong>:{" "}
                      <span className="text-red-500 line-through">{entry.oldValue || "(vacío)"}</span>
                      {" → "}
                      <span className="text-green-600">{entry.newValue || "(vacío)"}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar historia médica"}
        </Button>
      </div>
    </div>
  );
}
