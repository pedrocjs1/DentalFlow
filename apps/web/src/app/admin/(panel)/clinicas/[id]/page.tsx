"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscriptionStatus: string;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
  createdAt: string;
  trialEndsAt: string | null;
  counts: { patients: number; appointments: number; conversations: number; campaigns: number };
  whatsappStatus: string;
  whatsappDisplayNumber: string | null;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  usage: Record<string, number>;
  limits: Record<string, number>;
}

interface PatientRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  source: string;
  createdAt: string;
}

type MappableField = "firstName" | "lastName" | "phone" | "email" | "birthdate" | "insurance" | "address" | "notes";

interface ColumnMapping {
  [csvColumn: string]: MappableField | "skip";
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLANS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
const STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELLED", "PAUSED"];
const PAYMENT_METHODS = ["pending", "transfer", "mercadopago", "stripe"];

const TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "pacientes", label: "Pacientes" },
  { key: "configuracion", label: "Configuración" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const MAPPABLE_FIELDS: { value: MappableField | "skip"; label: string }[] = [
  { value: "skip", label: "— Omitir —" },
  { value: "firstName", label: "Nombre" },
  { value: "lastName", label: "Apellido" },
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "birthdate", label: "Fecha nacimiento" },
  { value: "insurance", label: "Obra social" },
  { value: "address", label: "Dirección" },
  { value: "notes", label: "Notas" },
];

// Auto-detect mapping from common CSV column header names
const AUTO_MAP: Record<string, MappableField> = {
  nombre: "firstName",
  name: "firstName",
  first_name: "firstName",
  firstname: "firstName",
  primer_nombre: "firstName",
  apellido: "lastName",
  last_name: "lastName",
  lastname: "lastName",
  surname: "lastName",
  telefono: "phone",
  teléfono: "phone",
  phone: "phone",
  celular: "phone",
  cel: "phone",
  mobile: "phone",
  whatsapp: "phone",
  email: "email",
  correo: "email",
  mail: "email",
  correo_electronico: "email",
  fecha_nacimiento: "birthdate",
  birthdate: "birthdate",
  nacimiento: "birthdate",
  fecha_nac: "birthdate",
  birth_date: "birthdate",
  obra_social: "insurance",
  insurance: "insurance",
  prevision: "insurance",
  previsión: "insurance",
  mutual: "insurance",
  direccion: "address",
  dirección: "address",
  address: "address",
  domicilio: "address",
  notas: "notes",
  notes: "notes",
  observaciones: "notes",
  comentarios: "notes",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken() {
  return localStorage.getItem("df_admin_token") ?? "";
}

function detectSeparator(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const sep = detectSeparator(lines[0]);
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(sep).map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
  );

  return { headers, rows };
}

function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const normalized = h.toLowerCase().replace(/\s+/g, "_").replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");
    mapping[h] = AUTO_MAP[normalized] ?? "skip";
  }
  return mapping;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UsageBars({ usage, limits }: { usage: Record<string, number>; limits: Record<string, number> }) {
  return (
    <div className="space-y-3">
      {Object.entries(usage).map(([type, count]) => {
        const limit = limits[type] ?? 0;
        const unlimited = limit === -1;
        const pct = unlimited || limit <= 0 ? 0 : Math.min(Math.round(((count ?? 0) / limit) * 100), 100);
        return (
          <div key={type}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400 capitalize">{type.replace(/_/g, " ")}</span>
              <span className="text-gray-300">
                {(count ?? 0).toLocaleString()} {unlimited ? "(ilimitado)" : `/ ${(limit ?? 0).toLocaleString()}`}
              </span>
            </div>
            {!unlimited && (
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Resumen
// ---------------------------------------------------------------------------

function TabResumen({ tenant }: { tenant: TenantDetail }) {
  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-400 border-green-500/30",
    TRIALING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    PAST_DUE: "bg-red-500/10 text-red-400 border-red-500/30",
    CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/30",
    PAUSED: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  };

  const waStatusLabel = tenant.whatsappStatus === "CONNECTED"
    ? `Conectado (${tenant.whatsappDisplayNumber ?? ""})`
    : tenant.whatsappStatus === "ERROR"
    ? "Error"
    : "No configurado";

  const waStatusColor = tenant.whatsappStatus === "CONNECTED"
    ? "text-green-400"
    : tenant.whatsappStatus === "ERROR"
    ? "text-red-400"
    : "text-gray-500";

  return (
    <div className="space-y-6">
      {/* Top row: Info + Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clinic info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            Información de la clínica
          </h2>
          <dl className="space-y-2.5 text-sm">
            {[
              { label: "Nombre", value: tenant.name },
              { label: "Slug", value: tenant.slug },
              { label: "Email", value: tenant.email },
              { label: "Teléfono", value: tenant.phone },
              { label: "Dirección", value: tenant.address },
              { label: "Ciudad", value: tenant.city },
              { label: "País", value: tenant.country },
              { label: "Zona horaria", value: tenant.timezone },
              { label: "Fecha de alta", value: formatDate(tenant.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-gray-400 shrink-0">{label}</dt>
                <dd className="text-gray-200 text-right truncate">{value ?? "—"}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400 shrink-0">WhatsApp</dt>
              <dd className={`${waStatusColor} text-right truncate`}>{waStatusLabel}</dd>
            </div>
          </dl>
        </div>

        {/* Subscription */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            Suscripción
          </h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-400">Plan</dt>
              <dd>
                <span className="bg-primary-500/10 text-primary-400 border border-primary-500/30 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {tenant.plan}
                </span>
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-400">Estado</dt>
              <dd>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColor[tenant.subscriptionStatus] ?? statusColor.CANCELLED}`}>
                  {tenant.subscriptionStatus}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Activa</dt>
              <dd className={tenant.isActive ? "text-green-400" : "text-red-400"}>
                {tenant.isActive ? "Sí" : "No"}
              </dd>
            </div>
            {tenant.trialEndsAt && (
              <div className="flex justify-between">
                <dt className="text-gray-400">Trial hasta</dt>
                <dd className="text-yellow-400">{formatDate(tenant.trialEndsAt)}</dd>
              </div>
            )}
          </dl>

          {/* Usage bars */}
          {tenant.usage && Object.keys(tenant.usage).length > 0 && (
            <div className="pt-3 border-t border-gray-800">
              <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Uso este mes</p>
              <UsageBars usage={tenant.usage} limits={tenant.limits} />
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pacientes", value: tenant.counts?.patients ?? 0, icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", color: "text-blue-400 bg-blue-500/10" },
          { label: "Citas", value: tenant.counts?.appointments ?? 0, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-green-400 bg-green-500/10" },
          { label: "Conversaciones", value: tenant.counts?.conversations ?? 0, icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z", color: "text-purple-400 bg-purple-500/10" },
          { label: "Campañas", value: tenant.counts?.campaigns ?? 0, icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z", color: "text-orange-400 bg-orange-500/10" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} /></svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
              <p className="text-gray-400 text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800">
          <h2 className="text-white font-semibold text-sm">Usuarios ({tenant.users.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-gray-400 font-medium px-5 py-2.5 text-xs uppercase tracking-wider">Nombre</th>
              <th className="text-left text-gray-400 font-medium px-4 py-2.5 text-xs uppercase tracking-wider">Email</th>
              <th className="text-left text-gray-400 font-medium px-4 py-2.5 text-xs uppercase tracking-wider">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {tenant.users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800/20 transition-colors">
                <td className="px-5 py-3 text-gray-200">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{u.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Pacientes
// ---------------------------------------------------------------------------

function TabPacientes({ tenantId }: { tenantId: string }) {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Import state
  const [importStep, setImportStep] = useState<"idle" | "mapping" | "importing" | "done">("idle");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPatients = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const url = `/api/v1/admin/clinicas/${tenantId}/patients${q ? `?search=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPatients(Array.isArray(data) ? data : data.patients ?? []);
        }
      } finally {
        setLoading(false);
      }
    },
    [tenantId]
  );

  useEffect(() => {
    fetchPatients("");
  }, [fetchPatients]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(
      setTimeout(() => {
        fetchPatients(value);
      }, 400)
    );
  }

  // ---- CSV Import ----

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Solo se admiten archivos CSV (.csv)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const { headers, rows } = parseCsvText(text);
      if (headers.length === 0) {
        alert("El archivo CSV está vacío o no tiene encabezados.");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setColumnMapping(autoDetectMapping(headers));
      setImportResult(null);
      setImportStep("mapping");
    };
    reader.readAsText(file, "utf-8");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function updateMapping(header: string, field: MappableField | "skip") {
    setColumnMapping((prev) => ({ ...prev, [header]: field }));
  }

  async function handleImport() {
    // Build patient objects from csvRows using columnMapping
    const mappedPatients: Record<string, string>[] = [];
    for (const row of csvRows) {
      const patient: Record<string, string> = {};
      let hasData = false;
      csvHeaders.forEach((header, idx) => {
        const field = columnMapping[header];
        if (field && field !== "skip" && row[idx]) {
          patient[field] = row[idx];
          hasData = true;
        }
      });
      if (hasData) mappedPatients.push(patient);
    }

    if (mappedPatients.length === 0) {
      alert("No hay pacientes para importar. Verifique el mapeo de columnas.");
      return;
    }

    setImporting(true);
    setImportStep("importing");
    try {
      const res = await fetch(`/api/v1/admin/clinicas/${tenantId}/import-patients`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patients: mappedPatients }),
      });
      const data = await res.json();
      setImportResult({
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      setImportStep("done");
      // Refresh patient list
      fetchPatients(search);
    } catch {
      setImportResult({ imported: 0, skipped: 0, errors: ["Error de conexión al importar."] });
      setImportStep("done");
    } finally {
      setImporting(false);
    }
  }

  function resetImport() {
    setImportStep("idle");
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setImportResult(null);
  }

  // Preview rows for mapping step
  const previewRows = csvRows.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Import section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importar pacientes
          </h2>
          {importStep !== "idle" && (
            <button onClick={resetImport} className="text-gray-400 hover:text-white text-xs transition-colors">
              Cancelar importación
            </button>
          )}
        </div>

        {importStep === "idle" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary-500 bg-primary-500/5" : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <svg className="w-10 h-10 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 0l3-3m-3 3l3 3m-8 4V5a2 2 0 012-2h6l2 2h4a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-400 text-sm">Arrastrá un archivo CSV aquí o hacé clic para seleccionar</p>
            <p className="text-gray-500 text-xs mt-1">Solo archivos .csv (separados por coma o punto y coma)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {importStep === "mapping" && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Se detectaron <span className="text-white font-medium">{csvRows.length}</span> filas y{" "}
              <span className="text-white font-medium">{csvHeaders.length}</span> columnas. Mapeá cada columna al campo correspondiente:
            </p>

            {/* Column mapping selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {csvHeaders.map((header) => (
                <div key={header} className="bg-gray-800 rounded-lg p-3">
                  <label className="block text-gray-300 text-xs font-medium mb-1.5 truncate" title={header}>
                    {header}
                  </label>
                  <select
                    value={columnMapping[header] ?? "skip"}
                    onChange={(e) => updateMapping(header, e.target.value as MappableField | "skip")}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {MAPPABLE_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {previewRows.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider font-medium">Vista previa (primeras {previewRows.length} filas)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700">
                        {csvHeaders.map((h) => (
                          <th key={h} className="text-left text-gray-400 font-medium px-3 py-2 whitespace-nowrap">
                            {h}
                            {columnMapping[h] && columnMapping[h] !== "skip" && (
                              <span className="ml-1 text-primary-400">({columnMapping[h]})</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {previewRows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-[200px] truncate">
                              {cell || <span className="text-gray-600">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleImport}
                className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Importar {csvRows.length} pacientes
              </button>
              <button
                onClick={resetImport}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {importStep === "importing" && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Importando pacientes...</p>
          </div>
        )}

        {importStep === "done" && importResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              {importResult.imported > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2">
                  <span className="text-green-400 text-sm font-medium">{importResult.imported} importados</span>
                </div>
              )}
              {importResult.skipped > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                  <span className="text-yellow-400 text-sm font-medium">{importResult.skipped} omitidos</span>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                  <span className="text-red-400 text-sm font-medium">{importResult.errors.length} errores</span>
                </div>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-red-400 text-xs">{err}</p>
                ))}
              </div>
            )}
            <button
              onClick={resetImport}
              className="text-primary-400 hover:text-primary-300 text-sm transition-colors"
            >
              Importar otro archivo
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Patient table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Cargando pacientes...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <p className="text-gray-500 text-sm">{search ? "No se encontraron pacientes" : "No hay pacientes registrados"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium px-5 py-2.5 text-xs uppercase tracking-wider">Nombre</th>
                <th className="text-left text-gray-400 font-medium px-4 py-2.5 text-xs uppercase tracking-wider">Teléfono</th>
                <th className="text-left text-gray-400 font-medium px-4 py-2.5 text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="text-left text-gray-400 font-medium px-4 py-2.5 text-xs uppercase tracking-wider hidden md:table-cell">Origen</th>
                <th className="text-left text-gray-400 font-medium px-4 py-2.5 text-xs uppercase tracking-wider hidden lg:table-cell">Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {patients.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/20 transition-colors">
                  <td className="px-5 py-3 text-gray-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {p.firstName?.[0]?.toUpperCase() ?? ""}{p.lastName?.[0]?.toUpperCase() ?? ""}
                      </div>
                      <span>{p.firstName} {p.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{p.source}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Configuración
// ---------------------------------------------------------------------------

function TabConfiguracion({
  tenant,
  onUpdate,
}: {
  tenant: TenantDetail;
  onUpdate: (updates: Partial<TenantDetail>) => void;
}) {
  const [editPlan, setEditPlan] = useState(tenant.plan);
  const [editStatus, setEditStatus] = useState(tenant.subscriptionStatus);
  const [paymentMethod, setPaymentMethod] = useState("pending");
  const [billingNotes, setBillingNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/v1/admin/clinicas/${tenant.id}/subscription`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: editPlan,
          subscriptionStatus: editStatus,
          paymentMethod,
          billingNotes,
        }),
      });

      if (!res.ok) {
        // Fallback: try the existing endpoint
        const res2 = await fetch(`/api/v1/admin/tenants/${tenant.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: editPlan, subscriptionStatus: editStatus }),
        });
        if (!res2.ok) throw new Error("Error al guardar");
      }

      onUpdate({ plan: editPlan, subscriptionStatus: editStatus });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
        <h2 className="text-white font-semibold text-sm flex items-center gap-2">
          <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Plan y suscripción
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">Plan</label>
            <select
              value={editPlan}
              onChange={(e) => setEditPlan(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">Estado de suscripción</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">Método de pago</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m === "pending" ? "Pendiente" : m === "transfer" ? "Transferencia" : m === "mercadopago" ? "MercadoPago" : "Stripe"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">Notas de facturación</label>
            <textarea
              value={billingNotes}
              onChange={(e) => setBillingNotes(e.target.value)}
              rows={3}
              placeholder="Notas internas sobre facturación, acuerdos especiales, etc."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {saved && (
            <span className="text-green-400 text-sm flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Guardado
            </span>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-gray-900 border border-red-900/30 rounded-xl p-5 space-y-3">
        <h2 className="text-red-400 font-semibold text-sm">Zona peligrosa</h2>
        <p className="text-gray-400 text-xs">
          Desactivar la clínica bloqueará el acceso al dashboard y detendrá el chatbot. Esta acción es reversible.
        </p>
        <button
          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          onClick={() => {
            if (confirm("¿Seguro que querés desactivar esta clínica?")) {
              fetch(`/api/v1/admin/tenants/${tenant.id}`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ isActive: false }),
              }).then(() => {
                onUpdate({ isActive: false });
              });
            }
          }}
        >
          Desactivar clínica
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminTenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/admin/tenants/${tenantId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setTenant(d);
      });
  }, [tenantId]);

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await fetch(`/api/v1/admin/tenants/${tenantId}/impersonate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.token) {
        window.open(`${window.location.origin}/?impersonate=${data.token}`, "_blank");
      }
    } finally {
      setImpersonating(false);
    }
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1 self-start"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                tenant.isActive
                  ? "bg-green-500/10 text-green-400 border border-green-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}>
                {tenant.isActive ? "Activa" : "Inactiva"}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-0.5">{tenant.slug} &middot; {tenant.plan}</p>
          </div>
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {impersonating ? "Abriendo..." : "Impersonar clínica"}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  activeTab === tab.key
                    ? "text-primary-400"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        {activeTab === "resumen" && <TabResumen tenant={tenant} />}
        {activeTab === "pacientes" && <TabPacientes tenantId={tenantId} />}
        {activeTab === "configuracion" && (
          <TabConfiguracion
            tenant={tenant}
            onUpdate={(updates) => setTenant((prev) => (prev ? { ...prev, ...updates } : prev))}
          />
        )}
      </div>
    </div>
  );
}
