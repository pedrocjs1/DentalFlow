"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_API_BASE } from "@/lib/admin-api";

/* ───────── types ───────── */

interface WorkingDay {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

type MappableField = "firstName" | "lastName" | "phone" | "email" | "birthdate" | "insurance" | "address" | "notes";
type ColumnMapping = Record<number, MappableField | "skip">;

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  total: number;
}

interface FormData {
  // Step 1
  name: string;
  slug: string;
  address: string;
  phone: string;
  contactEmail: string;
  timezone: string;
  // Step 2
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  subscriptionStatus: "TRIALING" | "ACTIVE";
  trialDays: number;
  paymentMethod: string;
  billingNotes: string;
  // Step 3
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  // Step 4
  workingHours: Record<string, WorkingDay>;
  botTone: string;
  botLanguage: string;
  messageDebounceSeconds: number;
  createDefaultPipeline: boolean;
  createDefaultTreatments: boolean;
}

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Mexico_City",
  "America/Santiago",
  "America/Lima",
  "America/Sao_Paulo",
  "America/Caracas",
  "America/Montevideo",
  "America/Guayaquil",
  "America/La_Paz",
  "America/Asuncion",
  "America/Panama",
  "America/Costa_Rica",
  "UTC",
];

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

const PLAN_INFO = [
  {
    key: "STARTER" as const,
    label: "Starter",
    price: 99,
    desc: "Odontólogo independiente",
    msgs: "2,000",
    ia: "2,000",
    dentists: "2",
  },
  {
    key: "PROFESSIONAL" as const,
    label: "Professional",
    price: 199,
    desc: "Clínica mediana (<5 sillas)",
    msgs: "5,000",
    ia: "5,000",
    dentists: "Ilimitados",
  },
  {
    key: "ENTERPRISE" as const,
    label: "Enterprise",
    price: 299,
    desc: "Clínica grande (5+ sillas)",
    msgs: "10,000",
    ia: "10,000",
    dentists: "Ilimitados",
  },
];

const STEPS = [
  { label: "Datos de la clínica", short: "Clínica" },
  { label: "Plan y facturación", short: "Plan" },
  { label: "Usuario administrador", short: "Admin" },
  { label: "Configuración inicial", short: "Config" },
  { label: "Importar pacientes (opcional)", short: "Importar" },
];

/* ── CSV helpers ── */

const AUTO_MAP: Record<string, MappableField> = {
  nombre: "firstName", name: "firstName", first_name: "firstName", firstname: "firstName", primer_nombre: "firstName",
  apellido: "lastName", last_name: "lastName", lastname: "lastName", surname: "lastName", segundo_nombre: "lastName",
  telefono: "phone", "teléfono": "phone", phone: "phone", celular: "phone", cel: "phone", mobile: "phone", whatsapp: "phone", movil: "phone", "móvil": "phone",
  email: "email", correo: "email", mail: "email", correo_electronico: "email",
  fecha_nacimiento: "birthdate", birthdate: "birthdate", nacimiento: "birthdate", fecha_nac: "birthdate", birth_date: "birthdate",
  obra_social: "insurance", insurance: "insurance", prevision: "insurance", "previsión": "insurance", mutual: "insurance",
  direccion: "address", "dirección": "address", address: "address", domicilio: "address",
  notas: "notes", notes: "notes", observaciones: "notes", comentarios: "notes",
};

const FIELD_LABELS: Record<MappableField | "skip", string> = {
  firstName: "Nombre", lastName: "Apellido", phone: "Teléfono", email: "Email",
  birthdate: "Fecha nacimiento", insurance: "Obra social", address: "Dirección", notes: "Notas", skip: "— Omitir —",
};

function detectSeparator(text: string): string {
  const firstLine = text.split("\n")[0] || "";
  return (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const sep = detectSeparator(text);
  const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parse = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === sep && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}

function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((h, i) => {
    const key = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
    mapping[i] = AUTO_MAP[key] ?? "skip";
  });
  return mapping;
}

const DAY_TO_NUMBER: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/* ───────── helpers ───────── */

function generatePassword(length = 12): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    pw += chars[arr[i] % chars.length];
  }
  return pw;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function defaultWorkingHours(): Record<string, WorkingDay> {
  return {
    monday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    tuesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    thursday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    friday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    saturday: { enabled: true, startTime: "09:00", endTime: "13:00" },
    sunday: { enabled: false, startTime: "09:00", endTime: "13:00" },
  };
}

/* ───────── component ───────── */

export default function CrearClinicaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    tenantId: string;
    email: string;
    password: string;
    clinicName: string;
  } | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  // Step 5: Import patients (optional)
  const [wantsImport, setWantsImport] = useState<boolean | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "",
    slug: "",
    address: "",
    phone: "",
    contactEmail: "",
    timezone: "America/Argentina/Buenos_Aires",
    plan: "STARTER",
    subscriptionStatus: "TRIALING",
    trialDays: 14,
    paymentMethod: "pending",
    billingNotes: "",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: generatePassword(),
    workingHours: defaultWorkingHours(),
    botTone: "friendly",
    botLanguage: "es",
    messageDebounceSeconds: 12,
    createDefaultPipeline: true,
    createDefaultTreatments: true,
  });

  function getToken() {
    return localStorage.getItem("df_admin_token") ?? "";
  }

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && typeof value === "string") {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function updateWorkingDay(day: string, field: keyof WorkingDay, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: { ...prev.workingHours[day], [field]: value },
      },
    }));
  }

  /* ── CSV processing ── */

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Solo se permiten archivos CSV");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsvText(text);
      if (headers.length === 0) {
        setError("El archivo CSV está vacío o no tiene formato válido");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setColumnMapping(autoDetectMapping(headers));
      setError("");
    };
    reader.readAsText(file, "utf-8");
  }, []);

  /* ── validation ── */

  const canNext = useMemo(() => {
    if (step === 0) return form.name.trim().length > 0 && form.slug.trim().length > 0;
    if (step === 1) return true;
    if (step === 2)
      return (
        form.ownerName.trim().length > 0 &&
        form.ownerEmail.trim().length > 0 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)
      );
    if (step === 3) return true;
    // Step 4: always can proceed (import is optional)
    return true;
  }, [step, form]);

  /* ── submit ── */

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      // Convert workingHours from Record<day, WorkingDay> to Array format expected by backend
      const workingHoursArray = Object.entries(form.workingHours).map(([day, wh]) => ({
        dayOfWeek: DAY_TO_NUMBER[day] ?? 0,
        startTime: wh.startTime,
        endTime: wh.endTime,
        isActive: wh.enabled,
      }));

      const res = await fetch(`${ADMIN_API_BASE}/api/v1/admin/clinicas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          address: form.address.trim(),
          phone: form.phone.trim(),
          email: form.contactEmail.trim(),
          timezone: form.timezone,
          plan: form.plan,
          subscriptionStatus: form.subscriptionStatus,
          trialDays: form.trialDays,
          paymentMethod: form.paymentMethod,
          billingNotes: form.billingNotes.trim(),
          adminName: form.ownerName.trim(),
          adminEmail: form.ownerEmail.trim().toLowerCase(),
          adminPassword: form.ownerPassword,
          workingHours: workingHoursArray,
          botTone: form.botTone,
          botLanguage: form.botLanguage,
          messageDebounceSeconds: form.messageDebounceSeconds,
          createDefaultStages: form.createDefaultPipeline,
          createDefaultTreatments: form.createDefaultTreatments,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Error desconocido" }));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      const tenantId = data.tenant?.id ?? data.tenantId ?? data.id;

      // If user uploaded CSV patients, import them now
      if (wantsImport && csvRows.length > 0) {
        const patients = csvRows
          .map((row) => {
            const p: Record<string, string> = {};
            row.forEach((val, i) => {
              const field = columnMapping[i];
              if (field && field !== "skip" && val.trim()) p[field] = val.trim();
            });
            return p;
          })
          .filter((p) => p.firstName || p.phone);

        if (patients.length > 0) {
          const importRes = await fetch(`${ADMIN_API_BASE}/api/v1/admin/clinicas/${tenantId}/import-patients`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ patients }),
          });
          if (importRes.ok) {
            const result = await importRes.json();
            setImportResult(result);
          }
        }
      }

      setCreated({
        tenantId,
        email: form.ownerEmail.trim().toLowerCase(),
        password: form.ownerPassword,
        clinicName: form.name.trim(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear la clínica");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, field: "email" | "password") {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  /* ───────── success screen ───────── */

  if (created) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-6">
          {/* Check icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Clinica creada</h2>
            <p className="text-gray-400 text-sm mt-1">{created.clinicName}</p>
          </div>

          {/* Credentials */}
          <div className="space-y-3 text-left">
            <label className="block text-xs text-gray-500 uppercase tracking-wider">Credenciales de acceso</label>

            <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-500">Email</p>
                <p className="text-white text-sm font-mono truncate">{created.email}</p>
              </div>
              <button
                onClick={() => handleCopy(created.email, "email")}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                title="Copiar email"
              >
                {copied === "email" ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-lg px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-500">Contrasena</p>
                <p className="text-white text-sm font-mono truncate">{created.password}</p>
              </div>
              <button
                onClick={() => handleCopy(created.password, "password")}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                title="Copiar contrasena"
              >
                {copied === "password" ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {importResult && (
            <div className="text-left space-y-2">
              <label className="block text-xs text-gray-500 uppercase tracking-wider">Importacion de pacientes</label>
              <div className="flex gap-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-medium">
                  {importResult.imported} importados
                </span>
                {importResult.skipped > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs font-medium">
                    {importResult.skipped} omitidos
                  </span>
                )}
                {importResult.errors > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">
                    {importResult.errors} errores
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="text-yellow-500/80 text-xs">
            Guarda estas credenciales. La contrasena no se puede recuperar.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/admin/clinicas")}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 text-sm transition-colors"
            >
              Volver a clinicas
            </button>
            <button
              onClick={() => router.push(`/admin/clinicas/${created.tenantId}`)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
            >
              Ver clinica
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ───────── wizard ───────── */

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/clinicas")}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Crear clinica</h1>
          <p className="text-gray-400 text-sm mt-0.5">Paso {step + 1} de 5 &mdash; {STEPS[step].label}</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => {
                if (i < step) setStep(i);
              }}
              disabled={i > step}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
                i === step
                  ? "bg-primary-500 text-white"
                  : i < step
                  ? "bg-primary-500/20 text-primary-400 cursor-pointer hover:bg-primary-500/30"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {i < step ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </button>
            <span
              className={`text-xs font-medium hidden sm:block ${
                i === step ? "text-white" : i < step ? "text-primary-400" : "text-gray-500"
              }`}
            >
              {s.short}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${i < step ? "bg-primary-500/40" : "bg-gray-800"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        {/* ── Step 1: Clinic Data ── */}
        {step === 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Nombre de la clinica <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ej: Clinica Dental Sonrisa"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Slug <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) =>
                    update(
                      "slug",
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                    )
                  }
                  placeholder="clinica-dental-sonrisa"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-gray-600 text-xs mt-1">Solo minusculas, numeros y guiones</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Direccion</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Av. Corrientes 1234, CABA"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Telefono</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+54 9 11 1234-5678"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email de contacto</label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail", e.target.value)}
                  placeholder="info@clinica.com"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Zona horaria</label>
                <select
                  value={form.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* ── Step 2: Plan & Billing ── */}
        {step === 1 && (
          <>
            <label className="block text-sm font-medium text-gray-300 mb-3">Plan</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAN_INFO.map((p) => {
                const selected = form.plan === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => update("plan", p.key)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      selected
                        ? "border-primary-500 bg-primary-500/10 ring-1 ring-primary-500/30"
                        : "border-gray-800 bg-gray-950 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-white">${p.price}</span>
                      <span className="text-gray-500 text-xs">/mes</span>
                    </div>
                    <p className="text-white font-medium text-sm mt-2">{p.label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{p.desc}</p>
                    <div className="mt-3 space-y-1 text-xs text-gray-400">
                      <p>{p.msgs} msgs WhatsApp</p>
                      <p>{p.ia} interacciones IA</p>
                      <p>{p.dentists} dentistas</p>
                    </div>
                    {selected && (
                      <div className="mt-3 flex items-center gap-1 text-primary-400 text-xs font-medium">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Seleccionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Estado de suscripcion</label>
                <select
                  value={form.subscriptionStatus}
                  onChange={(e) => update("subscriptionStatus", e.target.value as "TRIALING" | "ACTIVE")}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="TRIALING">Trial</option>
                  <option value="ACTIVE">Activa</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Dias de trial</label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={form.trialDays}
                  onChange={(e) => update("trialDays", parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Metodo de pago</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => update("paymentMethod", e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="pending">Pendiente</option>
                  <option value="transfer">Transferencia</option>
                  <option value="mercadopago">MercadoPago</option>
                  <option value="stripe">Stripe</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Notas de facturacion</label>
                <textarea
                  value={form.billingNotes}
                  onChange={(e) => update("billingNotes", e.target.value)}
                  rows={3}
                  placeholder="Notas internas sobre facturacion..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </>
        )}

        {/* ── Step 3: Admin User ── */}
        {step === 2 && (
          <>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Nombre del propietario <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  placeholder="Dr. Juan Perez"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.ownerEmail}
                  onChange={(e) => update("ownerEmail", e.target.value)}
                  placeholder="doctor@clinica.com"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-gray-600 text-xs mt-1">Este sera el email de inicio de sesion</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Contrasena</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5">
                    <code className="text-white text-sm font-mono flex-1">{form.ownerPassword}</code>
                    <button
                      type="button"
                      onClick={() => handleCopy(form.ownerPassword, "password")}
                      className="text-gray-400 hover:text-white transition-colors ml-2"
                      title="Copiar"
                    >
                      {copied === "password" ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => update("ownerPassword", generatePassword())}
                    className="px-3 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 text-sm transition-colors flex-shrink-0"
                    title="Regenerar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-1">Generada automaticamente. Se puede copiar o regenerar.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Rol</label>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-medium">
                  OWNER
                </span>
                <p className="text-gray-600 text-xs mt-1">Acceso completo a la clinica</p>
              </div>
            </div>
          </>
        )}

        {/* ── Step 4: Initial Config ── */}
        {step === 3 && (
          <>
            {/* Working hours */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Horarios de atencion</label>
              <div className="space-y-2">
                {Object.entries(DAY_LABELS).map(([day, label]) => {
                  const wh = form.workingHours[day];
                  return (
                    <div
                      key={day}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${
                        wh.enabled ? "bg-gray-950" : "bg-gray-950/50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => updateWorkingDay(day, "enabled", !wh.enabled)}
                        className={`w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${
                          wh.enabled ? "bg-primary-500" : "bg-gray-700"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            wh.enabled ? "left-[18px]" : "left-0.5"
                          }`}
                        />
                      </button>
                      <span
                        className={`w-24 text-sm ${wh.enabled ? "text-white" : "text-gray-600"}`}
                      >
                        {label}
                      </span>
                      {wh.enabled ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={wh.startTime}
                            onChange={(e) => updateWorkingDay(day, "startTime", e.target.value)}
                            className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                          <span className="text-gray-600 text-sm">a</span>
                          <input
                            type="time"
                            value={wh.endTime}
                            onChange={(e) => updateWorkingDay(day, "endTime", e.target.value)}
                            className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs">Cerrado</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bot config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Tono del bot</label>
                <select
                  value={form.botTone}
                  onChange={(e) => update("botTone", e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="friendly">Amigable</option>
                  <option value="formal">Formal</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Idioma del bot</label>
                <select
                  value={form.botLanguage}
                  onChange={(e) => update("botLanguage", e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="es">Espanol</option>
                  <option value="pt">Portugues</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Debounce</label>
                <select
                  value={form.messageDebounceSeconds}
                  onChange={(e) => update("messageDebounceSeconds", parseInt(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={10}>10 segundos</option>
                  <option value={12}>12 segundos</option>
                  <option value={15}>15 segundos</option>
                  <option value={20}>20 segundos</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.createDefaultPipeline}
                  onChange={(e) => update("createDefaultPipeline", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-950 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    Crear etapas de pipeline por defecto
                  </span>
                  <p className="text-xs text-gray-600">8 etapas: Nuevo Contacto, Interesado, Primera Cita, etc.</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.createDefaultTreatments}
                  onChange={(e) => update("createDefaultTreatments", e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-950 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    Crear tratamientos por defecto
                  </span>
                  <p className="text-xs text-gray-600">5 tratamientos: Limpieza, Blanqueamiento, Ortodoncia, etc.</p>
                </div>
              </label>
            </div>
          </>
        )}

        {/* ── Step 5: Import Patients (optional) ── */}
        {step === 4 && (
          <>
            {wantsImport === null && (
              <div className="text-center space-y-6 py-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-primary-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">¿La clinica tiene pacientes existentes?</h3>
                  <p className="text-gray-400 text-sm mt-1">Podes importar una base de pacientes desde un archivo CSV</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setWantsImport(true)}
                    className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
                  >
                    Si, importar desde archivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setWantsImport(false)}
                    className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 text-sm transition-colors"
                  >
                    No, empezar de cero
                  </button>
                </div>
              </div>
            )}

            {wantsImport === false && (
              <div className="text-center space-y-4 py-6">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-300 text-sm">Todo listo. Hace click en &quot;Crear clinica&quot; para finalizar.</p>
                <button
                  type="button"
                  onClick={() => setWantsImport(null)}
                  className="text-primary-400 hover:text-primary-300 text-xs underline transition-colors"
                >
                  Cambiar de opinion
                </button>
              </div>
            )}

            {wantsImport === true && csvHeaders.length === 0 && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setWantsImport(null); setCsvHeaders([]); setCsvRows([]); }}
                  className="text-primary-400 hover:text-primary-300 text-xs underline transition-colors"
                >
                  &larr; Volver
                </button>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) processFile(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                    dragOver ? "border-primary-500 bg-primary-500/5" : "border-gray-700 hover:border-gray-600"
                  }`}
                  onClick={() => document.getElementById("csv-input")?.click()}
                >
                  <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-300 text-sm">Arrastra un archivo CSV aqui o hace click para seleccionar</p>
                  <p className="text-gray-600 text-xs mt-1">Formato: CSV (separado por comas o punto y coma)</p>
                  <input
                    id="csv-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                    }}
                  />
                </div>
              </div>
            )}

            {wantsImport === true && csvHeaders.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{csvRows.length} filas detectadas, {csvHeaders.length} columnas</p>
                    <p className="text-gray-500 text-xs mt-0.5">Mapea cada columna al campo correspondiente</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCsvHeaders([]); setCsvRows([]); setColumnMapping({}); }}
                    className="text-gray-400 hover:text-white text-xs transition-colors"
                  >
                    Cambiar archivo
                  </button>
                </div>

                {/* Column mapping */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {csvHeaders.map((h, i) => (
                    <div key={i}>
                      <label className="block text-xs text-gray-500 mb-1 truncate" title={h}>{h}</label>
                      <select
                        value={columnMapping[i] ?? "skip"}
                        onChange={(e) => setColumnMapping((prev) => ({ ...prev, [i]: e.target.value as MappableField | "skip" }))}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {(Object.keys(FIELD_LABELS) as (MappableField | "skip")[]).map((f) => (
                          <option key={f} value={f}>{FIELD_LABELS[f]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        {csvHeaders.map((h, i) => (
                          <th key={i} className="text-left text-gray-500 font-medium pb-2 pr-3 whitespace-nowrap">
                            {h}
                            {columnMapping[i] && columnMapping[i] !== "skip" && (
                              <span className="text-primary-400 ml-1">({FIELD_LABELS[columnMapping[i] as MappableField]})</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, ri) => (
                        <tr key={ri} className="border-t border-gray-800/50">
                          {row.map((cell, ci) => (
                            <td key={ci} className="text-gray-300 py-1.5 pr-3 whitespace-nowrap max-w-[200px] truncate">
                              {cell || <span className="text-gray-700">&mdash;</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 5 && (
                    <p className="text-gray-600 text-xs mt-2">...y {csvRows.length - 5} filas mas</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Atras
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={loading || !canNext}
            className="px-6 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg
                className="animate-spin w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {loading ? "Creando..." : wantsImport && csvRows.length > 0 ? "Crear clinica e importar" : "Crear clinica"}
          </button>
        )}
      </div>
    </div>
  );
}
