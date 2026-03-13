"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface MedicalHistory {
  bloodType?: string | null;
  allergies?: string[];
  medications?: string[];
  hasDiabetes?: boolean;
  hasHypertension?: boolean;
  hasHeartDisease?: boolean;
  hasAsthma?: boolean;
  hasHIV?: boolean;
  hasEpilepsy?: boolean;
  otherDiseases?: string | null;
  hasBruxism?: boolean;
  isSmoker?: boolean;
  smokingDetails?: string | null;
  surgicalHistory?: string | null;
  hospitalizations?: string | null;
  isPregnant?: boolean;
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

export function MedicalHistoryForm({ patientId, initial }: Props) {
  const [form, setForm] = useState<MedicalHistory>({
    bloodType: initial.bloodType ?? null,
    allergies: initial.allergies ?? [],
    medications: initial.medications ?? [],
    hasDiabetes: initial.hasDiabetes ?? false,
    hasHypertension: initial.hasHypertension ?? false,
    hasHeartDisease: initial.hasHeartDisease ?? false,
    hasAsthma: initial.hasAsthma ?? false,
    hasHIV: initial.hasHIV ?? false,
    hasEpilepsy: initial.hasEpilepsy ?? false,
    otherDiseases: initial.otherDiseases ?? "",
    hasBruxism: initial.hasBruxism ?? false,
    isSmoker: initial.isSmoker ?? false,
    smokingDetails: initial.smokingDetails ?? "",
    surgicalHistory: initial.surgicalHistory ?? "",
    hospitalizations: initial.hospitalizations ?? "",
    isPregnant: initial.isPregnant ?? false,
    lastDoctorVisit: initial.lastDoctorVisit ? initial.lastDoctorVisit.split("T")[0] : "",
    consentSigned: initial.consentSigned ?? false,
    consentNotes: initial.consentNotes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof MedicalHistory>(key: K, value: MedicalHistory[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
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

      {/* Datos generales */}
      <section className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Datos Generales</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Grupo sanguíneo</label>
            <select
              value={form.bloodType ?? ""}
              onChange={(e) => set("bloodType", e.target.value || null)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">No especificado</option>
              {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Última visita médica</label>
            <input
              type="date"
              value={form.lastDoctorVisit ?? ""}
              onChange={(e) => set("lastDoctorVisit", e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Alergias (Enter para agregar)</label>
          <TagInput value={form.allergies ?? []} onChange={(v) => set("allergies", v)} placeholder="Penicilina, látex, aspirina..." />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Medicamentos actuales (Enter para agregar)</label>
          <TagInput value={form.medications ?? []} onChange={(v) => set("medications", v)} placeholder="Metformina, enalapril..." />
        </div>
      </section>

      {/* Enfermedades sistémicas */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Enfermedades Sistémicas</h4>
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
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Hipotiroidismo, artritis..."
          />
        </div>
      </section>

      {/* Hábitos */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Hábitos</h4>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.hasBruxism}
              onChange={(e) => set("hasBruxism", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Bruxismo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isSmoker}
              onChange={(e) => set("isSmoker", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Fumador</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.isPregnant}
              onChange={(e) => set("isPregnant", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Embarazada</span>
          </label>
        </div>
        {form.isSmoker && (
          <input
            type="text"
            value={form.smokingDetails ?? ""}
            onChange={(e) => set("smokingDetails", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Cantidad de cigarrillos/día, años fumando..."
          />
        )}
      </section>

      {/* Antecedentes quirúrgicos */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Antecedentes Quirúrgicos</h4>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Cirugías previas</label>
          <textarea
            rows={2}
            value={form.surgicalHistory ?? ""}
            onChange={(e) => set("surgicalHistory", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Apendicectomía 2015, cirugía cardíaca..."
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Hospitalizaciones</label>
          <textarea
            rows={2}
            value={form.hospitalizations ?? ""}
            onChange={(e) => set("hospitalizations", e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Internación por neumonía 2020..."
          />
        </div>
      </section>

      {/* Consentimiento */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 border-b pb-2">Consentimiento Informado</h4>
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
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Observaciones del consentimiento..."
          />
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
