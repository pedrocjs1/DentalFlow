"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string;
  timezone: string;
  logoUrl: string | null;
  welcomeMessage: string | null;
  currency: string;
}

interface Dentist {
  id: string;
  name: string;
  specialty: string | null;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
  color: string;
  birthdate: string | null;
  isActive: boolean;
  treatmentIds: string[];
}

interface TreatmentType {
  id: string;
  name: string;
  durationMin: number;
  price: string | null;
  color: string | null;
  isActive: boolean;
  followUpEnabled: boolean;
  followUpMonths: number;
  postProcedureCheck: boolean;
  postProcedureDays: number;
  followUpMessage: string | null;
}

interface Chair {
  id: string;
  name: string;
  isActive: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
}

interface GCalStatus {
  configured: boolean;
  connected: Array<{ dentistId: string; syncEnabled: boolean; calendarId: string }>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function useToast() {
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  return { toast, showToast: setToast };
}

function Toast({ toast }: { toast: { type: "success" | "error"; message: string } | null }) {
  if (!toast) return null;
  return (
    <div
      className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
        toast.type === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      {toast.message}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden mb-5">
      <div className="px-6 py-4 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Tab: Datos de la Clínica ─────────────────────────────────────────────────

function TabClinica() {
  const { toast, showToast } = useToast();
  const [data, setData] = useState<Tenant | null>(null);
  const [form, setForm] = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);
  const [workingHours, setWorkingHours] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string; breakStart: string; breakEnd: string; isActive: boolean }>
  >([]);
  const [savingHours, setSavingHours] = useState(false);

  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  useEffect(() => {
    Promise.all([
      apiFetch<Tenant>("/api/v1/configuracion/clinica"),
      apiFetch<{ hours: any[] }>("/api/v1/configuracion/working-hours"),
    ]).then(([clinic, wh]) => {
      setData(clinic);
      setForm(clinic);
      // Build 7-day grid (0=Sun..6=Sat)
      const hoursMap = Object.fromEntries(wh.hours.map((h) => [h.dayOfWeek, h]));
      setWorkingHours(
        Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          startTime: hoursMap[i]?.startTime ?? "09:00",
          endTime: hoursMap[i]?.endTime ?? "18:00",
          breakStart: hoursMap[i]?.breakStart ?? "",
          breakEnd: hoursMap[i]?.breakEnd ?? "",
          isActive: hoursMap[i]?.isActive ?? false,
        }))
      );
    }).catch(() => showToast({ type: "error", message: "Error cargando configuración." }));
  }, []);

  async function saveClinic() {
    setSaving(true);
    try {
      await apiFetch("/api/v1/configuracion/clinica", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      showToast({ type: "success", message: "Datos de la clínica guardados." });
    } catch {
      showToast({ type: "error", message: "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    setSavingHours(true);
    try {
      await apiFetch("/api/v1/configuracion/working-hours", {
        method: "PUT",
        body: JSON.stringify(
          workingHours.map((h) => ({
            ...h,
            breakStart: h.breakStart || null,
            breakEnd: h.breakEnd || null,
          }))
        ),
      });
      showToast({ type: "success", message: "Horarios guardados." });
    } catch {
      showToast({ type: "error", message: "Error al guardar horarios." });
    } finally {
      setSavingHours(false);
    }
  }

  function updateHour(dayOfWeek: number, field: string, value: any) {
    setWorkingHours((prev) => prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h)));
  }

  if (!data) return <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>;

  return (
    <>
      <Toast toast={toast} />

      <Section title="Información de la clínica">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Nombre de la clínica *", key: "name", type: "text" },
            { label: "Teléfono", key: "phone", type: "tel" },
            { label: "Email", key: "email", type: "email" },
            { label: "Dirección", key: "address", type: "text" },
            { label: "Ciudad", key: "city", type: "text" },
            { label: "Moneda", key: "currency", type: "text", placeholder: "ARS" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input
                type={type}
                value={(form as any)[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Zona horaria</label>
            <select
              value={form.timezone ?? "America/Argentina/Buenos_Aires"}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="America/Argentina/Buenos_Aires">Argentina (BUE)</option>
              <option value="America/Mexico_City">México (CDT)</option>
              <option value="America/Bogota">Colombia (COT)</option>
              <option value="America/Santiago">Chile (CLT)</option>
              <option value="America/Lima">Perú (PET)</option>
              <option value="America/Caracas">Venezuela (VET)</option>
              <option value="America/Sao_Paulo">Brasil (BRT)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs text-gray-500 mb-1 block">Mensaje de bienvenida (chatbot)</label>
          <textarea
            rows={2}
            value={form.welcomeMessage ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="¡Bienvenido/a a nuestra clínica!"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveClinic} disabled={saving} size="sm">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </Section>

      <Section title="Horarios de atención">
        <div className="space-y-2">
          {workingHours.map((h) => (
            <div key={h.dayOfWeek} className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2 w-28 cursor-pointer">
                <input
                  type="checkbox"
                  checked={h.isActive}
                  onChange={(e) => updateHour(h.dayOfWeek, "isActive", e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary-600"
                />
                <span className={h.isActive ? "text-gray-900 font-medium" : "text-gray-400"}>
                  {DAY_NAMES[h.dayOfWeek]}
                </span>
              </label>
              {h.isActive ? (
                <>
                  <input
                    type="time"
                    value={h.startTime}
                    onChange={(e) => updateHour(h.dayOfWeek, "startTime", e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={h.endTime}
                    onChange={(e) => updateHour(h.dayOfWeek, "endTime", e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-gray-400 text-xs ml-2">Descanso:</span>
                  <input
                    type="time"
                    value={h.breakStart}
                    onChange={(e) => updateHour(h.dayOfWeek, "breakStart", e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-gray-400">–</span>
                  <input
                    type="time"
                    value={h.breakEnd}
                    onChange={(e) => updateHour(h.dayOfWeek, "breakEnd", e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </>
              ) : (
                <span className="text-gray-300 text-xs italic">Cerrado</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={saveHours} disabled={savingHours} size="sm">
            {savingHours ? "Guardando..." : "Guardar horarios"}
          </Button>
        </div>
      </Section>
    </>
  );
}

// ─── Tab: Profesionales ───────────────────────────────────────────────────────

function TabProfesionales() {
  const { toast, showToast } = useToast();
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Partial<Dentist> & { treatmentIds: string[] }>({ treatmentIds: [] });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [d, t] = await Promise.all([
      apiFetch<{ dentists: Dentist[] }>("/api/v1/dentists?includeInactive=true"),
      apiFetch<{ treatmentTypes: TreatmentType[] }>("/api/v1/treatment-types"),
    ]);
    setDentists(d.dentists);
    setTreatmentTypes(t.treatmentTypes);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ name: "", specialty: "", licenseNumber: "", phone: "", email: "", color: "#3B82F6", birthdate: "", treatmentIds: [] });
    setEditingId("new");
  }

  function openEdit(d: Dentist) {
    setForm({ ...d, birthdate: d.birthdate ? d.birthdate.slice(0, 10) : "", treatmentIds: d.treatmentIds ?? [] });
    setEditingId(d.id);
  }

  async function save() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, birthdate: form.birthdate || null };
      if (editingId === "new") {
        await apiFetch("/api/v1/dentists", { method: "POST", body: JSON.stringify(payload) });
        showToast({ type: "success", message: "Profesional creado." });
      } else {
        await apiFetch(`/api/v1/dentists/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast({ type: "success", message: "Cambios guardados." });
      }
      setEditingId(null);
      load();
    } catch {
      showToast({ type: "error", message: "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(d: Dentist) {
    try {
      await apiFetch(`/api/v1/dentists/${d.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !d.isActive }) });
      showToast({ type: "success", message: d.isActive ? "Profesional desactivado." : "Profesional reactivado." });
      load();
    } catch {
      showToast({ type: "error", message: "Error al actualizar." });
    }
  }

  function toggleTreatment(ttId: string) {
    setForm((f) => {
      const ids = f.treatmentIds ?? [];
      return { ...f, treatmentIds: ids.includes(ttId) ? ids.filter((x) => x !== ttId) : [...ids, ttId] };
    });
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{dentists.filter((d) => d.isActive).length} profesionales activos</p>
        <Button size="sm" onClick={openNew}>+ Agregar profesional</Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {dentists.map((d) => (
            <div key={d.id} className={`bg-white rounded-xl border px-5 py-3.5 flex items-center gap-4 ${!d.isActive ? "opacity-50" : ""}`}>
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p>
                <p className="text-xs text-gray-400">{d.specialty ?? "—"}{d.licenseNumber ? ` · MP ${d.licenseNumber}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(d)}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(d)} className={d.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-700 border-green-200 hover:bg-green-50"}>
                  {d.isActive ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create form */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingId === "new" ? "Nuevo profesional" : "Editar profesional"}
            </h3>
            <div className="space-y-3">
              {([
                ["Nombre *", "name", "text"],
                ["Especialidad", "specialty", "text"],
                ["Matrícula (MP/MN)", "licenseNumber", "text"],
                ["Teléfono", "phone", "tel"],
                ["Email", "email", "email"],
                ["Fecha de nacimiento", "birthdate", "date"],
              ] as [string, string, string][]).map(([label, key, type]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color en agenda</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color ?? "#3B82F6"}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="w-10 h-9 rounded border border-gray-200 cursor-pointer"
                  />
                  <span className="text-xs text-gray-400">{form.color}</span>
                </div>
              </div>
              {treatmentTypes.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Tratamientos que realiza</label>
                  <div className="flex flex-wrap gap-2">
                    {treatmentTypes.map((t) => {
                      const selected = (form.treatmentIds ?? []).includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTreatment(t.id)}
                          className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${selected ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-400"}`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !form.name?.trim()}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Tratamientos ────────────────────────────────────────────────────────

function TabTratamientos() {
  const { toast, showToast } = useToast();
  const [items, setItems] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Partial<TreatmentType>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await apiFetch<{ treatmentTypes: TreatmentType[] }>("/api/v1/treatment-types?includeInactive=true");
    setItems(d.treatmentTypes);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ name: "", durationMin: 30, price: "", color: "" });
    setEditingId("new");
  }

  function openEdit(t: TreatmentType) {
    setForm({ ...t, price: t.price ?? "" });
    setEditingId(t.id);
  }

  async function save() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        durationMin: Number(form.durationMin) || 30,
        price: form.price ? Number(form.price) : null,
        color: form.color || null,
      };
      if (editingId === "new") {
        await apiFetch("/api/v1/treatment-types", { method: "POST", body: JSON.stringify(payload) });
        showToast({ type: "success", message: "Tratamiento creado." });
      } else {
        await apiFetch(`/api/v1/treatment-types/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast({ type: "success", message: "Cambios guardados." });
      }
      setEditingId(null);
      load();
    } catch {
      showToast({ type: "error", message: "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: TreatmentType) {
    try {
      await apiFetch(`/api/v1/treatment-types/${t.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !t.isActive }) });
      showToast({ type: "success", message: t.isActive ? "Tratamiento desactivado." : "Tratamiento reactivado." });
      load();
    } catch {
      showToast({ type: "error", message: "Error al actualizar." });
    }
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{items.filter((i) => i.isActive).length} tratamientos activos</p>
        <Button size="sm" onClick={openNew}>+ Agregar tratamiento</Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <div key={t.id} className={`bg-white rounded-xl border px-5 py-3.5 flex items-center gap-4 ${!t.isActive ? "opacity-50" : ""}`}>
              {t.color ? <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} /> : <span className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                <p className="text-xs text-gray-400">
                  {t.durationMin} min
                  {t.price ? ` · $${Number(t.price).toLocaleString("es-AR")}` : ""}
                  {t.followUpEnabled ? ` · Seguimiento c/${t.followUpMonths}m` : ""}
                  {t.postProcedureCheck ? ` · Control ${t.postProcedureDays}d` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(t)} className={t.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-700 border-green-200 hover:bg-green-50"}>
                  {t.isActive ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingId === "new" ? "Nuevo tratamiento" : "Editar tratamiento"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                <input type="text" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duración (min) *</label>
                  <input type="number" min={5} step={5} value={form.durationMin ?? 30} onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Precio</label>
                  <input type="number" min={0} value={form.price ?? ""} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color ?? "#3B82F6"} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
                  <span className="text-xs text-gray-400">{form.color ?? "—"}</span>
                </div>
              </div>
              {/* Follow-up cycle */}
              <div className="border-t pt-3 mt-1">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input type="checkbox" checked={form.followUpEnabled ?? false} onChange={(e) => setForm((f) => ({ ...f, followUpEnabled: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
                  Seguimiento activo
                </label>
                {form.followUpEnabled && (
                  <div className="mt-2 ml-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-32">Frecuencia</label>
                      <input type="number" min={1} max={24} value={form.followUpMonths ?? 6} onChange={(e) => setForm((f) => ({ ...f, followUpMonths: Number(e.target.value) }))} className="w-16 text-sm border rounded px-2 py-1" />
                      <span className="text-xs text-gray-500">meses</span>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.postProcedureCheck ?? false} onChange={(e) => setForm((f) => ({ ...f, postProcedureCheck: e.target.checked }))} className="w-4 h-4 accent-primary-600" />
                      Control post-procedimiento
                    </label>
                    {form.postProcedureCheck && (
                      <div className="flex items-center gap-2 ml-6">
                        <label className="text-xs text-gray-500">A los</label>
                        <input type="number" min={1} max={30} value={form.postProcedureDays ?? 7} onChange={(e) => setForm((f) => ({ ...f, postProcedureDays: Number(e.target.value) }))} className="w-16 text-sm border rounded px-2 py-1" />
                        <span className="text-xs text-gray-500">días</span>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500">Mensaje de seguimiento</label>
                      <textarea value={form.followUpMessage ?? ""} onChange={(e) => setForm((f) => ({ ...f, followUpMessage: e.target.value || null }))} rows={2} className="mt-1 w-full text-sm border rounded-lg px-2.5 py-1.5 resize-none" placeholder="Mensaje personalizado..." />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !form.name?.trim()}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Sillones ────────────────────────────────────────────────────────────

function TabSillones() {
  const { toast, showToast } = useToast();
  const [chairs, setChairs] = useState<Chair[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Partial<Chair>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await apiFetch<{ chairs: Chair[] }>("/api/v1/chairs?includeInactive=true");
    setChairs(d.chairs);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name?.trim()) return;
    setSaving(true);
    try {
      if (editingId === "new") {
        await apiFetch("/api/v1/chairs", { method: "POST", body: JSON.stringify({ name: form.name }) });
        showToast({ type: "success", message: "Sillón creado." });
      } else {
        await apiFetch(`/api/v1/chairs/${editingId}`, { method: "PATCH", body: JSON.stringify({ name: form.name }) });
        showToast({ type: "success", message: "Cambios guardados." });
      }
      setEditingId(null);
      load();
    } catch {
      showToast({ type: "error", message: "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Chair) {
    try {
      await apiFetch(`/api/v1/chairs/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !c.isActive }) });
      showToast({ type: "success", message: c.isActive ? "Sillón desactivado." : "Sillón reactivado." });
      load();
    } catch {
      showToast({ type: "error", message: "Error al actualizar." });
    }
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{chairs.filter((c) => c.isActive).length} sillones activos</p>
        <Button size="sm" onClick={() => { setForm({ name: "" }); setEditingId("new"); }}>+ Agregar sillón</Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {chairs.map((c) => (
            <div key={c.id} className={`bg-white rounded-xl border px-5 py-3.5 flex items-center gap-4 ${!c.isActive ? "opacity-50" : ""}`}>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400">{c.isActive ? "Activo" : "Inactivo"}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setForm(c); setEditingId(c.id); }}>Editar</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(c)} className={c.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-700 border-green-200 hover:bg-green-50"}>
                  {c.isActive ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingId === "new" ? "Nuevo sillón" : "Editar sillón"}
            </h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
              <input type="text" value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej: Sillón 1, Consultorio A" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !form.name?.trim()}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Pipeline Config ─────────────────────────────────────────────────────

interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  order: number;
  autoMessageEnabled: boolean;
  autoMessageDelayHours: number;
  autoMessageTemplate: string | null;
  autoMessageMaxRetries: number;
  autoMoveEnabled: boolean;
  autoMoveDelayHours: number;
  autoMoveTargetStageId: string | null;
  discountEnabled: boolean;
  discountPercent: number;
  discountMessage: string | null;
  discountTemplate: string | null;
}

interface ApprovedTemplate {
  id: string;
  name: string;
  displayName: string;
  bodyText: string;
  status: string;
}

function TabPipelineConfig() {
  const { toast, showToast } = useToast();
  const [stages, setStages] = useState<PipelineStageConfig[]>([]);
  const [approvedTemplates, setApprovedTemplates] = useState<ApprovedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      apiFetch<{ stages: PipelineStageConfig[] }>("/api/v1/pipeline/stages"),
      apiFetch<{ templates: ApprovedTemplate[] }>("/api/v1/whatsapp-templates"),
    ]).then(([stagesRes, tplRes]) => {
      if (stagesRes.status === "fulfilled") setStages(stagesRes.value.stages);
      if (tplRes.status === "fulfilled") {
        setApprovedTemplates(tplRes.value.templates.filter((t) => t.status === "APPROVED"));
      }
      setLoading(false);
    });
  }, []);

  async function saveStage(stage: PipelineStageConfig) {
    setSaving(stage.id);
    try {
      await apiFetch(`/api/v1/pipeline/stages/${stage.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          autoMessageEnabled: stage.autoMessageEnabled,
          autoMessageDelayHours: stage.autoMessageDelayHours,
          autoMessageTemplate: stage.autoMessageTemplate,
          autoMessageMaxRetries: stage.autoMessageMaxRetries,
          autoMoveEnabled: stage.autoMoveEnabled,
          autoMoveDelayHours: stage.autoMoveDelayHours,
          autoMoveTargetStageId: stage.autoMoveTargetStageId,
          discountEnabled: stage.discountEnabled,
          discountPercent: stage.discountPercent,
          discountMessage: stage.discountMessage,
          discountTemplate: stage.discountTemplate,
        }),
      });
      showToast({ type: "success", message: `"${stage.name}" actualizado` });
    } catch {
      showToast({ type: "error", message: "Error al guardar" });
    } finally {
      setSaving(null);
    }
  }

  function updateStage(id: string, updates: Partial<PipelineStageConfig>) {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  if (loading) return <div className="text-sm text-gray-500">Cargando etapas...</div>;

  return (
    <>
      <Toast toast={toast} />
      <div className="space-y-3">
        {stages.map((stage) => {
          const isExpanded = expandedId === stage.id;
          return (
            <div key={stage.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : stage.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold text-gray-900 flex-1 text-left">{stage.name}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t space-y-4">
                  {/* Auto message */}
                  <div className="pt-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={stage.autoMessageEnabled} onChange={(e) => updateStage(stage.id, { autoMessageEnabled: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                      Enviar mensaje automático
                    </label>
                    {stage.autoMessageEnabled && (
                      <div className="mt-2 ml-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-24">Esperar</label>
                          <input type="number" value={stage.autoMessageDelayHours} onChange={(e) => updateStage(stage.id, { autoMessageDelayHours: parseInt(e.target.value) || 0 })} className="w-20 text-sm border rounded px-2 py-1" min={1} />
                          <span className="text-xs text-gray-500">horas</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Template a usar</label>
                          <select value={stage.autoMessageTemplate ?? ""} onChange={(e) => updateStage(stage.id, { autoMessageTemplate: e.target.value || null })} className="mt-1 w-full text-sm border rounded-lg px-2.5 py-1.5">
                            <option value="">Sin template — no se enviará mensaje</option>
                            {approvedTemplates.map((t) => (
                              <option key={t.id} value={t.name}>{t.displayName || t.name.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                          {stage.autoMessageTemplate && (
                            <p className="mt-1 text-xs text-gray-400 italic">
                              {approvedTemplates.find((t) => t.name === stage.autoMessageTemplate)?.bodyText?.slice(0, 100) ?? ""}...
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-24">Reintentos</label>
                          <input type="number" value={stage.autoMessageMaxRetries} onChange={(e) => updateStage(stage.id, { autoMessageMaxRetries: parseInt(e.target.value) || 1 })} className="w-20 text-sm border rounded px-2 py-1" min={0} max={5} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Auto move */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={stage.autoMoveEnabled} onChange={(e) => updateStage(stage.id, { autoMoveEnabled: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                      Mover automáticamente sin actividad
                    </label>
                    {stage.autoMoveEnabled && (
                      <div className="mt-2 ml-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-24">Después de</label>
                          <input type="number" value={stage.autoMoveDelayHours} onChange={(e) => updateStage(stage.id, { autoMoveDelayHours: parseInt(e.target.value) || 0 })} className="w-20 text-sm border rounded px-2 py-1" min={1} />
                          <span className="text-xs text-gray-500">horas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-24">Mover a</label>
                          <select value={stage.autoMoveTargetStageId ?? ""} onChange={(e) => updateStage(stage.id, { autoMoveTargetStageId: e.target.value || null })} className="text-sm border rounded px-2 py-1 flex-1">
                            <option value="">Seleccionar etapa...</option>
                            {stages.filter((s) => s.id !== stage.id).map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Discount */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input type="checkbox" checked={stage.discountEnabled} onChange={(e) => updateStage(stage.id, { discountEnabled: e.target.checked })} className="w-4 h-4 accent-primary-600" />
                      Ofrecer descuento
                    </label>
                    {stage.discountEnabled && (
                      <div className="mt-2 ml-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 w-24">Porcentaje</label>
                          <input type="number" value={stage.discountPercent} onChange={(e) => updateStage(stage.id, { discountPercent: parseInt(e.target.value) || 0 })} className="w-20 text-sm border rounded px-2 py-1" min={5} max={50} />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Mensaje de descuento</label>
                          <textarea value={stage.discountMessage ?? ""} onChange={(e) => updateStage(stage.id, { discountMessage: e.target.value || null })} rows={2} className="mt-1 w-full text-sm border rounded-lg px-2.5 py-1.5 resize-none" placeholder="Descuento especial del X%..." />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Save button */}
                  <button
                    onClick={() => saveStage(stage)}
                    disabled={saving === stage.id}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {saving === stage.id ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Tab: WhatsApp Templates ─────────────────────────────────────────────────

interface WATemplate {
  id: string;
  name: string;
  displayName: string;
  category: string;
  language: string;
  bodyText: string;
  headerText: string | null;
  footerText: string | null;
  status: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  suggestedTrigger: string | null;
}

function TabTemplates() {
  const { toast, showToast } = useToast();
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    apiFetch<{ templates: WATemplate[] }>("/api/v1/whatsapp-templates")
      .then((data) => setTemplates(data.templates))
      .catch(() => showToast({ type: "error", message: "Error al cargar templates" }))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await apiFetch(`/api/v1/whatsapp-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: !isActive } : t)));
    } catch {
      showToast({ type: "error", message: "Error al actualizar" });
    }
  }

  async function saveBody(id: string) {
    try {
      await apiFetch(`/api/v1/whatsapp-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ bodyText: editBody }),
      });
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, bodyText: editBody } : t)));
      setEditingId(null);
      showToast({ type: "success", message: "Template actualizado" });
    } catch {
      showToast({ type: "error", message: "Error al guardar" });
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  const CATEGORY_COLORS: Record<string, string> = {
    UTILITY: "bg-blue-50 text-blue-700",
    MARKETING: "bg-purple-50 text-purple-700",
  };

  const TRIGGER_LABELS: Record<string, string> = {
    auto_message: "Mensaje automático",
    reminder: "Recordatorio",
    follow_up: "Seguimiento",
    remarketing: "Remarketing",
    birthday: "Cumpleaños",
  };

  if (loading) return <div className="text-sm text-gray-500">Cargando templates...</div>;

  return (
    <>
      <Toast toast={toast} />
      <div className="space-y-3">
        <p className="text-sm text-gray-500 mb-4">Templates de WhatsApp para mensajes automatizados. Los cambios requieren re-aprobación de Meta.</p>
        {templates.map((tpl) => (
          <div key={tpl.id} className={`bg-white rounded-xl border overflow-hidden ${!tpl.isActive ? "opacity-60" : ""}`}>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{tpl.displayName || tpl.name.replace(/_/g, " ")}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[tpl.category] ?? "bg-gray-100 text-gray-700"}`}>{tpl.category}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[tpl.status] ?? STATUS_COLORS.DRAFT}`}>{tpl.status}</span>
                  {tpl.isSystemTemplate && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary-700">Sistema</span>}
                  {tpl.suggestedTrigger && <span className="text-[10px] text-gray-500">{TRIGGER_LABELS[tpl.suggestedTrigger] ?? tpl.suggestedTrigger}</span>}
                </div>
                {editingId === tpl.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className="w-full text-sm border rounded-lg px-2.5 py-1.5 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => saveBody(tpl.id)} className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">Guardar</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs border rounded-lg hover:bg-gray-50">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tpl.bodyText}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!tpl.isSystemTemplate && editingId !== tpl.id && (
                  <button onClick={() => { setEditingId(tpl.id); setEditBody(tpl.bodyText); }} className="text-xs text-primary-600 hover:text-primary-700">Editar</button>
                )}
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={tpl.isActive} onChange={() => toggleActive(tpl.id, tpl.isActive)} className="w-3.5 h-3.5 accent-primary-600" />
                  <span className="text-xs text-gray-500">Activo</span>
                </label>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No hay templates configurados</p>}
      </div>
    </>
  );
}

// ─── Tab: Integraciones ───────────────────────────────────────────────────────

function TabIntegraciones() {
  const searchParams = useSearchParams();
  const { toast, showToast } = useToast();
  const [gcalStatus, setGcalStatus] = useState<GCalStatus | null>(null);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const gcalResult = searchParams.get("gcal");
  useEffect(() => {
    if (gcalResult === "success") showToast({ type: "success", message: "Google Calendar conectado correctamente." });
    else if (gcalResult === "error") showToast({ type: "error", message: "Error al conectar Google Calendar. Intentá de nuevo." });
  }, [gcalResult]);

  useEffect(() => {
    Promise.allSettled([
      apiFetch<GCalStatus>("/api/v1/google-calendar/status"),
      apiFetch<{ dentists: Dentist[] }>("/api/v1/dentists"),
    ]).then(([s, d]) => {
      if (s.status === "fulfilled") setGcalStatus(s.value);
      if (d.status === "fulfilled") setDentists(d.value.dentists);
      setLoading(false);
    });
  }, []);

  async function handleConnect(dentistId: string) {
    setActionLoading(dentistId);
    try {
      const data = await apiFetch<{ url: string }>(`/api/v1/google-calendar/auth-url?dentistId=${dentistId}`);
      window.location.href = data.url;
    } catch {
      showToast({ type: "error", message: "No se pudo generar el enlace de autorización." });
      setActionLoading(null);
    }
  }

  async function handleDisconnect(dentistId: string) {
    setActionLoading(dentistId);
    try {
      await apiFetch(`/api/v1/google-calendar/disconnect/${dentistId}`, { method: "DELETE" });
      setGcalStatus((prev) => prev ? { ...prev, connected: prev.connected.filter((d) => d.dentistId !== dentistId) } : prev);
      showToast({ type: "success", message: "Google Calendar desconectado." });
    } catch {
      showToast({ type: "error", message: "Error al desconectar." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleSync(dentistId: string, currentSync: boolean) {
    try {
      await apiFetch(`/api/v1/google-calendar/sync/${dentistId}`, { method: "PATCH", body: JSON.stringify({ syncEnabled: !currentSync }) });
      setGcalStatus((prev) => prev ? { ...prev, connected: prev.connected.map((d) => d.dentistId === dentistId ? { ...d, syncEnabled: !currentSync } : d) } : prev);
    } catch {
      showToast({ type: "error", message: "Error al actualizar sincronización." });
    }
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.5" />
              <path d="M16 2v4M8 2v4M3 9h18" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="7" y="13" width="4" height="4" rx="0.5" fill="#EA4335" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Google Calendar</h3>
            <p className="text-xs text-gray-500">Sincronización bidireccional de citas por dentista</p>
          </div>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
              Cargando...
            </div>
          ) : !gcalStatus?.configured ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-amber-800 mb-1">Google Calendar no configurado</p>
              <p className="text-xs text-amber-700 mb-3">Agregá las siguientes variables de entorno al API:</p>
              <pre className="text-xs bg-amber-100 rounded px-3 py-2 text-amber-900 font-mono select-all">
{`GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/google-calendar/callback`}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              {dentists.length === 0 && <p className="text-sm text-gray-500">No hay profesionales activos.</p>}
              {dentists.map((dentist) => {
                const conn = gcalStatus.connected.find((d) => d.dentistId === dentist.id) ?? null;
                const isLoading = actionLoading === dentist.id;
                return (
                  <div key={dentist.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dentist.color }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dentist.name}</p>
                        {conn ? <p className="text-xs text-green-600 font-medium">● Conectado</p> : <p className="text-xs text-gray-400">No conectado</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {conn && (
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={conn.syncEnabled} onChange={() => handleToggleSync(dentist.id, conn.syncEnabled)} className="w-3.5 h-3.5 accent-primary-600" />
                          <span className="text-xs text-gray-600">Sincronizar</span>
                        </label>
                      )}
                      {conn ? (
                        <Button size="sm" variant="outline" onClick={() => handleDisconnect(dentist.id)} disabled={isLoading} className="text-red-600 border-red-200 hover:bg-red-50">
                          {isLoading ? "..." : "Desconectar"}
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleConnect(dentist.id)} disabled={isLoading}>
                          {isLoading ? "Redirigiendo..." : "Conectar"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Business Integration */}
      <WhatsAppConfig />
    </>
  );
}

// ─── WhatsApp Embedded Signup component ──────────────────────────────────────

interface WhatsAppConnectionStatus {
  status: "DISCONNECTED" | "CONNECTED" | "ERROR";
  displayNumber: string | null;
  phoneNumberId: string | null;
  wabaId: string | null;
  connectedAt: string | null;
  webhookUrl: string;
}

function WhatsAppConfig() {
  const { toast, showToast } = useToast();
  const [waStatus, setWaStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  useEffect(() => {
    apiFetch<WhatsAppConnectionStatus>("/api/v1/whatsapp/status")
      .then(setWaStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleEmbeddedSignup() {
    const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID;
    const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIGURATION_ID;

    if (!appId || !configId) {
      showToast({ type: "error", message: "WhatsApp Embedded Signup no está configurado. Contactá al soporte." });
      return;
    }

    setConnecting(true);

    try {
      // Load Facebook SDK dynamically if not loaded
      await loadFacebookSDK(appId);

      // Launch the Embedded Signup flow
      const result = await new Promise<{ authResponse?: { code?: string; accessToken?: string } }>((resolve, reject) => {
        window.FB.login(
          (response: { authResponse?: { code?: string; accessToken?: string } }) => {
            console.log("[EmbeddedSignup] FB.login response:", JSON.stringify(response));
            if (response.authResponse?.code) {
              resolve(response);
            } else {
              reject(new Error("El flujo fue cancelado o no se obtuvo autorización."));
            }
          },
          {
            config_id: configId,
            response_type: "code",
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: "",
              sessionInfoVersion: "2",
            },
          }
        );
      });

      const authResponse = result.authResponse!;

      // Send to backend — prefer token (no exchange needed), fallback to code
      const res = await apiFetch<{
        success: boolean;
        displayNumber: string;
        phoneNumberId: string;
        wabaId: string;
      }>("/api/v1/whatsapp/embedded-signup-complete", {
        method: "POST",
        body: JSON.stringify({
          code: authResponse.code,
          accessToken: authResponse.accessToken,
        }),
      });

      setWaStatus({
        status: "CONNECTED",
        displayNumber: res.displayNumber,
        phoneNumberId: res.phoneNumberId,
        wabaId: res.wabaId,
        connectedAt: new Date().toISOString(),
        webhookUrl: waStatus?.webhookUrl ?? "",
      });

      showToast({ type: "success", message: `WhatsApp conectado correctamente: ${res.displayNumber}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al conectar WhatsApp";
      showToast({ type: "error", message });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setShowDisconnectModal(false);
    setDisconnecting(true);
    try {
      await apiFetch("/api/v1/whatsapp/disconnect", { method: "DELETE", body: JSON.stringify({}) });
      setWaStatus((prev) => prev ? { ...prev, status: "DISCONNECTED", displayNumber: null, phoneNumberId: null, wabaId: null, connectedAt: null } : prev);
      showToast({ type: "success", message: "WhatsApp desconectado." });
    } catch {
      showToast({ type: "error", message: "Error al desconectar." });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSendTest() {
    setSendingTest(true);
    try {
      await apiFetch("/api/v1/whatsapp/send-test", { method: "POST", body: JSON.stringify({}) });
      showToast({ type: "success", message: "Mensaje de prueba enviado al teléfono de la clínica." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al enviar mensaje de prueba";
      showToast({ type: "error", message });
    } finally {
      setSendingTest(false);
    }
  }

  const isConnected = waStatus?.status === "CONNECTED";

  return (
    <div className="bg-white rounded-xl border overflow-hidden mt-5">
      <Toast toast={toast} />

      {/* ─── Disconnect confirmation modal ─── */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDisconnectModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Desconectar WhatsApp</h3>
              <p className="text-sm text-gray-500 mb-6">
                ¿Estás seguro? Se desactivarán el chatbot y las campañas por WhatsApp.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Desconectar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-4 border-b bg-gray-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.212l-.257-.154-2.87.852.852-2.87-.154-.257A8 8 0 1112 20z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">WhatsApp Business</h3>
          <p className="text-xs text-gray-500">Chatbot IA + mensajes automáticos por WhatsApp</p>
        </div>
        <div className="ml-auto">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Conectado
            </span>
          ) : waStatus?.status === "ERROR" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> No conectado
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            Cargando...
          </div>
        ) : isConnected ? (
          /* ─── Connected state ─── */
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Número:</span>
                <span className="ml-2 font-semibold text-gray-800">{waStatus.displayNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Conectado el:</span>
                <span className="ml-2 text-gray-800">
                  {waStatus.connectedAt
                    ? new Date(waStatus.connectedAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
                    : "—"}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSendTest} disabled={sendingTest}>
                {sendingTest ? "Enviando..." : "Enviar mensaje de prueba"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowDisconnectModal(true)} disabled={disconnecting} className="text-red-600 border-red-200 hover:bg-red-50">
                {disconnecting ? "Desconectando..." : "Desconectar"}
              </Button>
            </div>
          </div>
        ) : (
          /* ─── Disconnected state — Embedded Signup CTA ─── */
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Conectá tu número de WhatsApp para activar el chatbot IA, campañas automáticas y comunicación directa con tus pacientes.
            </p>
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-700">¿Qué necesitás?</p>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Una cuenta de Facebook (personal del propietario)</li>
                <li>Un número de teléfono para WhatsApp Business (que NO esté registrado en WhatsApp personal)</li>
                <li>Acceso al teléfono para recibir un código de verificación SMS</li>
              </ul>
            </div>
            <button
              onClick={handleEmbeddedSignup}
              disabled={connecting}
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE57] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm text-sm"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 01-4.243-1.212l-.257-.154-2.87.852.852-2.87-.154-.257A8 8 0 1112 20z"/>
                  </svg>
                  Conectar WhatsApp
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Facebook SDK loader ─────────────────────────────────────────────────────

declare global {
  interface Window {
    FB: {
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>
      ) => void;
      init: (params: Record<string, unknown>) => void;
    };
    fbAsyncInit: () => void;
  }
}

function loadFacebookSDK(appId: string): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      });
      resolve();
    };

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

// ─── Tab: Equipo / Mi Cuenta ──────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  DENTIST: "Dentista",
  RECEPTIONIST: "Recepcionista",
};

function TabEquipo() {
  const { toast, showToast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role: string; phone: string; password: string }>({
    name: "", email: "", role: "RECEPTIONIST", phone: "", password: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    const d = await apiFetch<{ users: TeamMember[] }>("/api/v1/configuracion/equipo");
    setMembers(d.users);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingId === "new" && !form.password.trim()) {
      showToast({ type: "error", message: "La contraseña es obligatoria para usuarios nuevos." });
      return;
    }
    setSaving(true);
    try {
      if (editingId === "new") {
        await apiFetch("/api/v1/configuracion/equipo", { method: "POST", body: JSON.stringify(form) });
        showToast({ type: "success", message: "Usuario creado." });
      } else {
        const payload: any = { name: form.name, role: form.role, phone: form.phone };
        if (form.password) payload.password = form.password;
        await apiFetch(`/api/v1/configuracion/equipo/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast({ type: "success", message: "Cambios guardados." });
      }
      setEditingId(null);
      load();
    } catch (err: any) {
      showToast({ type: "error", message: err?.code === "EMAIL_TAKEN" ? "Ya existe un usuario con ese email." : "Error al guardar." });
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    try {
      await apiFetch(`/api/v1/configuracion/equipo/${id}`, { method: "DELETE" });
      showToast({ type: "success", message: "Usuario desactivado." });
      load();
    } catch {
      showToast({ type: "error", message: "Error al desactivar." });
    }
  }

  return (
    <>
      <Toast toast={toast} />
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{members.length} miembros del equipo</p>
        <Button size="sm" onClick={() => { setForm({ name: "", email: "", role: "RECEPTIONIST", phone: "", password: "" }); setEditingId("new"); }}>
          + Agregar usuario
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border px-5 py-3.5 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-700">{m.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-400">{m.email} · {ROLE_LABELS[m.role] ?? m.role}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setForm({ name: m.name, email: m.email, role: m.role, phone: m.phone ?? "", password: "" }); setEditingId(m.id); }}>
                  Editar
                </Button>
                {m.role !== "OWNER" && (
                  <Button size="sm" variant="outline" onClick={() => deactivate(m.id)} className="text-red-600 border-red-200 hover:bg-red-50">
                    Desactivar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {editingId === "new" ? "Nuevo usuario" : "Editar usuario"}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email *{editingId !== "new" && " (no editable)"}</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} disabled={editingId !== "new"} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Rol *</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="ADMIN">Administrador</option>
                  <option value="DENTIST">Dentista</option>
                  <option value="RECEPTIONIST">Recepcionista</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {editingId === "new" ? "Contraseña *" : "Nueva contraseña (dejar en blanco para no cambiar)"}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
              <Button onClick={save} disabled={saving || !form.name.trim() || !form.email.trim()}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Chatbot IA ──────────────────────────────────────────────────────────

interface BotConfigData {
  welcomeMessage: string | null;
  botTone: string;
  botLanguage: string;
  askBirthdate: boolean;
  askInsurance: boolean;
  askEmail: boolean;
  offerDiscounts: boolean;
  maxDiscountPercent: number;
  proactiveFollowUp: boolean;
  leadRecontactHours: number;
  campaignBirthday: boolean;
  campaignPeriodicReminder: boolean;
  campaignReactivation: boolean;
  messageDebounceSeconds: number;
  // Registration config
  registrationEnabled: boolean;
  askFullName: boolean;
  askAddress: boolean;
  askMedicalConditions: boolean;
  askAllergies: boolean;
  askMedications: boolean;
  askHabits: boolean;
  registrationWelcomeMessage: string | null;
}

const TONE_LABELS: Record<string, { label: string; preview: string }> = {
  formal: {
    label: "Formal",
    preview: "Estimado/a paciente, le confirmamos su turno para el día...",
  },
  friendly: {
    label: "Amigable",
    preview: "¡Hola! 😊 Te confirmo tu turno para el...",
  },
  casual: {
    label: "Muy casual",
    preview: "¡Hola! 🎉 Ya quedó agendado tu turno, ¡nos vemos pronto! 💪🦷",
  },
};

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Español",
  pt: "Portugués",
  en: "Inglés",
};

const RECONTACT_OPTIONS = [
  { value: 0, label: "No recontactar" },
  { value: 2, label: "2 horas" },
  { value: 4, label: "4 horas" },
  { value: 12, label: "12 horas" },
  { value: 24, label: "24 horas" },
];

const DEBOUNCE_OPTIONS = [
  { value: 10, label: "10 segundos (rápido)" },
  { value: 12, label: "12 segundos (recomendado)" },
  { value: 15, label: "15 segundos (paciente)" },
  { value: 20, label: "20 segundos (muy paciente)" },
];

function TabChatbotIA() {
  const { toast, showToast } = useToast();
  const [config, setConfig] = useState<BotConfigData | null>(null);
  const [form, setForm] = useState<Partial<BotConfigData>>({});
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState<"general" | "horarios" | "reglas" | "campanas" | "registro">("general");
  const [workingHours, setWorkingHours] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string; breakStart: string; breakEnd: string; isActive: boolean }>
  >([]);

  const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  useEffect(() => {
    apiFetch("/api/v1/configuracion/bot")
      .then((data) => {
        const d = data as BotConfigData;
        setConfig(d);
        setForm(d);
      })
      .catch(() => showToast({ type: "error", message: "Error al cargar configuración del bot" }));

    apiFetch("/api/v1/configuracion/working-hours")
      .then((raw) => {
        const res = raw as { hours: typeof workingHours };
        if (res.hours.length > 0) {
          setWorkingHours(res.hours);
        } else {
          setWorkingHours(
            Array.from({ length: 7 }, (_, i) => ({
              dayOfWeek: i,
              startTime: "09:00",
              endTime: "18:00",
              breakStart: "",
              breakEnd: "",
              isActive: i >= 1 && i <= 5,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await apiFetch("/api/v1/configuracion/bot", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setConfig(updated as BotConfigData);
      setForm(updated as BotConfigData);
      showToast({ type: "success", message: "Configuración del bot guardada" });
    } catch {
      showToast({ type: "error", message: "Error al guardar configuración" });
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <div className="text-sm text-gray-500 py-8 text-center">Cargando...</div>;

  const SUB_TABS = [
    { key: "general" as const, label: "General" },
    { key: "horarios" as const, label: "Horarios" },
    { key: "reglas" as const, label: "Reglas del Bot" },
    { key: "campanas" as const, label: "Campañas" },
    { key: "registro" as const, label: "Registro" },
  ];

  return (
    <>
      <Toast toast={toast} />

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 border-b">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
              subTab === tab.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab: General */}
      {subTab === "general" && (
        <Section title="Configuración general del chatbot">
          <div className="space-y-5">
            {/* Welcome Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje de bienvenida</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
                maxLength={500}
                placeholder="¡Hola! Bienvenido/a a nuestra clínica dental. ¿En qué puedo ayudarte?"
                value={form.welcomeMessage ?? ""}
                onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value || null })}
              />
              <p className="text-xs text-gray-400 mt-1">{(form.welcomeMessage ?? "").length}/500 caracteres</p>
            </div>

            {/* Bot Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tono del bot</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(TONE_LABELS).map(([key, { label, preview }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, botTone: key })}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      form.botTone === key
                        ? "border-primary-500 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-sm font-medium text-gray-900">{label}</span>
                    <span className="block text-xs text-gray-500 mt-1 italic">&ldquo;{preview}&rdquo;</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bot Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idioma del bot</label>
              <select
                className="w-full sm:w-48 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                value={form.botLanguage ?? "es"}
                onChange={(e) => setForm({ ...form, botLanguage: e.target.value })}
              >
                {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>
      )}

      {/* Sub-tab: Horarios */}
      {subTab === "horarios" && (
        <Section title="Horarios de atención">
          <p className="text-xs text-gray-500 mb-4">
            Estos son los mismos horarios configurados en &ldquo;Datos de la clínica&rdquo;. El bot los usa para informar a los pacientes.
          </p>
          <div className="space-y-2">
            {workingHours
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((day) => (
                <div key={day.dayOfWeek} className="flex items-center gap-3 py-2">
                  <label className="w-24 text-sm font-medium text-gray-700">{DAY_NAMES[day.dayOfWeek]}</label>
                  <div
                    className={`flex items-center gap-2 ${!day.isActive ? "opacity-40" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={day.isActive}
                      disabled
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <span className="text-sm text-gray-600">
                      {day.isActive ? `${day.startTime} - ${day.endTime}` : "Cerrado"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Para modificar los horarios, andá a la pestaña &ldquo;Datos de la clínica&rdquo;.
          </p>
        </Section>
      )}

      {/* Sub-tab: Reglas del Bot */}
      {subTab === "reglas" && (
        <Section title="Reglas del bot">
          <div className="space-y-5">
            {/* Ask Birthdate */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Pedir fecha de nacimiento</label>
                <p className="text-xs text-gray-500 mt-0.5">Necesario para campañas de cumpleaños</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newVal = !form.askBirthdate;
                  setForm({
                    ...form,
                    askBirthdate: newVal,
                    // Auto-disable birthday campaign if birthdate is disabled
                    ...(newVal === false ? { campaignBirthday: false } : {}),
                  });
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.askBirthdate ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.askBirthdate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Ask Insurance */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Pedir obra social / seguro</label>
                <p className="text-xs text-gray-500 mt-0.5">El bot preguntará al paciente su cobertura médica</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, askInsurance: !form.askInsurance })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.askInsurance ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.askInsurance ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Offer Discounts */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Ofrecer descuentos a leads que no agendan</label>
                <p className="text-xs text-gray-500 mt-0.5">El bot ofrecerá un descuento para incentivar la reserva</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, offerDiscounts: !form.offerDiscounts })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.offerDiscounts ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.offerDiscounts ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Max Discount Slider — only visible when offerDiscounts is true */}
            {form.offerDiscounts && (
              <div className="pl-4 border-l-2 border-primary-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Porcentaje máximo de descuento: <span className="text-primary-600 font-bold">{form.maxDiscountPercent ?? 10}%</span>
                </label>
                <input
                  type="range"
                  min={5}
                  max={25}
                  step={5}
                  value={form.maxDiscountPercent ?? 10}
                  onChange={(e) => setForm({ ...form, maxDiscountPercent: parseInt(e.target.value) })}
                  className="w-full sm:w-64 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between w-full sm:w-64 text-xs text-gray-400 mt-1">
                  <span>5%</span>
                  <span>10%</span>
                  <span>15%</span>
                  <span>20%</span>
                  <span>25%</span>
                </div>
              </div>
            )}

            {/* Proactive Follow-Up */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-1.5">
                <div>
                  <label className="text-sm font-medium text-gray-900">Seguimiento proactivo de tratamientos</label>
                  <p className="text-xs text-gray-500 mt-0.5">El bot recordará al paciente cuándo le toca su próxima visita</p>
                </div>
                <span className="text-gray-400 cursor-help" title="El bot recordará al paciente cuándo le toca su próxima visita según el tratamiento realizado">ℹ️</span>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, proactiveFollowUp: !form.proactiveFollowUp })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.proactiveFollowUp ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.proactiveFollowUp ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Lead Recontact Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo de espera antes de recontactar lead
              </label>
              <select
                className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                value={form.leadRecontactHours ?? 4}
                onChange={(e) => setForm({ ...form, leadRecontactHours: parseInt(e.target.value) })}
              >
                {RECONTACT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Message Debounce Seconds */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiempo de espera entre mensajes
              </label>
              <select
                className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                value={form.messageDebounceSeconds ?? 12}
                onChange={(e) => setForm({ ...form, messageDebounceSeconds: parseInt(e.target.value) })}
              >
                {DEBOUNCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Cuánto espera el bot antes de responder, para dar tiempo a que el paciente termine de escribir. Recomendado: 12 segundos.
              </p>
            </div>
          </div>
        </Section>
      )}

      {/* Sub-tab: Campañas */}
      {subTab === "campanas" && (
        <Section title="Campañas automáticas">
          <div className="space-y-5">
            {/* Birthday Campaign */}
            <div className={`flex items-start justify-between ${!form.askBirthdate ? "opacity-50" : ""}`}>
              <div>
                <label className="text-sm font-medium text-gray-900">Campaña de cumpleaños</label>
                {!form.askBirthdate ? (
                  <p className="text-xs text-amber-600 mt-0.5">
                    Activá &ldquo;Pedir fecha de nacimiento&rdquo; en Reglas para habilitar esta campaña
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">Enviar saludo y promoción en el cumpleaños del paciente</p>
                )}
              </div>
              <button
                type="button"
                disabled={!form.askBirthdate}
                onClick={() => setForm({ ...form, campaignBirthday: !form.campaignBirthday })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.campaignBirthday && form.askBirthdate ? "bg-primary-600" : "bg-gray-300"
                } ${!form.askBirthdate ? "cursor-not-allowed" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.campaignBirthday && form.askBirthdate ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Periodic Reminder Campaign */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Recordatorio de control periódico</label>
                <p className="text-xs text-gray-500 mt-0.5">Recordar al paciente que le toca una visita de control</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, campaignPeriodicReminder: !form.campaignPeriodicReminder })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.campaignPeriodicReminder ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.campaignPeriodicReminder ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Reactivation Campaign */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Reactivación de pacientes inactivos</label>
                <p className="text-xs text-gray-500 mt-0.5">Enviar mensaje a pacientes que no visitan la clínica hace tiempo</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, campaignReactivation: !form.campaignReactivation })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.campaignReactivation ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.campaignReactivation ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </Section>
      )}

      {/* Sub-tab: Registro */}
      {subTab === "registro" && (
        <Section title="Registro de pacientes nuevos">
          <div className="space-y-5">
            {/* Registration Enabled */}
            <div className="flex items-start justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Pedir registro a pacientes nuevos</label>
                <p className="text-xs text-gray-500 mt-0.5">El bot registrará pacientes nuevos antes de atenderlos</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, registrationEnabled: !form.registrationEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.registrationEnabled ? "bg-primary-600" : "bg-gray-300"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.registrationEnabled ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {form.registrationEnabled && (
              <>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Datos a solicitar</p>
                  <div className="space-y-4">
                    {/* Full Name - always on */}
                    <div className="flex items-start justify-between opacity-75">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Nombre completo</label>
                        <p className="text-xs text-gray-500 mt-0.5">Siempre activo — obligatorio para el registro</p>
                      </div>
                      <button type="button" disabled className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 cursor-not-allowed">
                        <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                      </button>
                    </div>

                    {/* Birthdate */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Fecha de nacimiento</label>
                        <p className="text-xs text-gray-500 mt-0.5">Necesario para campañas de cumpleaños</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askBirthdate: !form.askBirthdate })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askBirthdate ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askBirthdate ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Insurance */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Obra social / seguro</label>
                        <p className="text-xs text-gray-500 mt-0.5">El bot preguntará por la cobertura médica</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askInsurance: !form.askInsurance })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askInsurance ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askInsurance ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Email */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Email</label>
                        <p className="text-xs text-gray-500 mt-0.5">Para enviar confirmaciones y recordatorios</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askEmail: !form.askEmail })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askEmail ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askEmail ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Address */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Dirección</label>
                        <p className="text-xs text-gray-500 mt-0.5">Dirección del paciente</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askAddress: !form.askAddress })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askAddress ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askAddress ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Medical Conditions */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Condiciones médicas</label>
                        <p className="text-xs text-gray-500 mt-0.5">Diabetes, hipertensión, cardiopatía, asma, epilepsia</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askMedicalConditions: !form.askMedicalConditions })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askMedicalConditions ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askMedicalConditions ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Allergies */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Alergias</label>
                        <p className="text-xs text-gray-500 mt-0.5">Alergias a medicamentos u otros</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askAllergies: !form.askAllergies })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askAllergies ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askAllergies ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Medications */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Medicamentos actuales</label>
                        <p className="text-xs text-gray-500 mt-0.5">Medicamentos que toma actualmente</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askMedications: !form.askMedications })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askMedications ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askMedications ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>

                    {/* Habits */}
                    <div className="flex items-start justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-900">Hábitos</label>
                        <p className="text-xs text-gray-500 mt-0.5">Bruxismo, fumador, embarazada</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, askHabits: !form.askHabits })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          form.askHabits ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.askHabits ? "translate-x-6" : "translate-x-1"
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-900">Mensaje de bienvenida</label>
                  <p className="text-xs text-gray-500 mt-0.5 mb-2">Mensaje personalizado para nuevos pacientes</p>
                  <textarea
                    value={form.registrationWelcomeMessage ?? ""}
                    onChange={(e) => setForm({ ...form, registrationWelcomeMessage: e.target.value || null })}
                    placeholder="¡Bienvenido/a a nuestra clínica!"
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}
          </div>
        </Section>
      )}

      {/* Save Button */}
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-700 text-white px-6">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </>
  );
}

// ─── Tab: Facturación ─────────────────────────────────────────────────────────

interface BillingInfo {
  plan: string;
  status: string;
  trialStartDate?: string;
  trialEndDate?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  paymentMethod?: string;
  cancelsAt?: string;
  failedPaymentAttempts?: number;
  mpConfigured: boolean;
  planPrice?: number;
  planCurrency?: string;
}

const PLAN_INFO: Record<string, { name: string; usd: number; features: string[] }> = {
  STARTER: {
    name: "Starter",
    usd: 89,
    features: ["5 usuarios", "2,000 msgs WhatsApp/mes", "2,000 interacciones IA/mes"],
  },
  PROFESSIONAL: {
    name: "Professional",
    usd: 149,
    features: ["10 usuarios", "5,000 msgs WhatsApp/mes", "5,000 interacciones IA/mes"],
  },
  ENTERPRISE: {
    name: "Enterprise",
    usd: 249,
    features: ["Usuarios ilimitados", "10,000 msgs WhatsApp/mes", "10,000 interacciones IA/mes"],
  },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TRIALING: { label: "Período de prueba", color: "bg-blue-100 text-blue-700" },
  ACTIVE: { label: "Activo", color: "bg-green-100 text-green-700" },
  TRIAL_EXPIRED: { label: "Trial vencido", color: "bg-orange-100 text-orange-700" },
  PAST_DUE: { label: "Pago pendiente", color: "bg-yellow-100 text-yellow-700" },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700" },
  PAUSED: { label: "Pausado", color: "bg-gray-100 text-gray-700" },
};

function TabFacturacion() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    apiFetch<BillingInfo>("/api/v1/billing/subscription")
      .then(setBilling)
      .catch(() => setBilling(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateSubscription = async (plan: string) => {
    setActionLoading(true);
    try {
      const result = await apiFetch<{ checkoutUrl: string | null; error?: string }>(
        "/api/v1/billing/create-subscription",
        { method: "POST", body: JSON.stringify({ plan }) }
      );
      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (err) {
      console.error("Error creating subscription:", err);
    } finally {
      setActionLoading(false);
      setChangePlanOpen(false);
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    setActionLoading(true);
    try {
      await apiFetch("/api/v1/billing/change-plan", {
        method: "POST",
        body: JSON.stringify({ newPlan }),
      });
      // Refresh billing info
      const updated = await apiFetch<BillingInfo>("/api/v1/billing/subscription");
      setBilling(updated);
    } catch (err) {
      console.error("Error changing plan:", err);
    } finally {
      setActionLoading(false);
      setChangePlanOpen(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await apiFetch("/api/v1/billing/cancel", { method: "POST", body: JSON.stringify({}) });
      const updated = await apiFetch<BillingInfo>("/api/v1/billing/subscription");
      setBilling(updated);
    } catch (err) {
      console.error("Error cancelling:", err);
    } finally {
      setActionLoading(false);
      setCancelOpen(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500 py-8 text-center">Cargando facturación...</div>;
  }

  const plan = billing?.plan ?? "STARTER";
  const status = billing?.status ?? "TRIALING";
  const planInfo = PLAN_INFO[plan] ?? PLAN_INFO.STARTER;
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.TRIALING;

  // Calculate trial days remaining
  const trialEnd = billing?.trialEndDate ? new Date(billing.trialEndDate) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <>
      {/* Trial banner */}
      {status === "TRIALING" && trialDaysLeft !== null && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Tu período de prueba vence en {trialDaysLeft} días
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Activá tu plan para no perder acceso
              </p>
            </div>
            <Button
              onClick={() => setChangePlanOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Activar plan
            </Button>
          </div>
        </div>
      )}

      {/* Past due banner */}
      {status === "PAST_DUE" && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm font-semibold text-yellow-800">
            Tu último pago fue rechazado ({billing?.failedPaymentAttempts ?? 0}/3 intentos)
          </p>
          <p className="text-xs text-yellow-600 mt-0.5">
            Actualizá tu método de pago para evitar la cancelación
          </p>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Plan {planInfo.name}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} mt-1`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">USD {planInfo.usd}</p>
            <p className="text-sm text-gray-500">/mes</p>
          </div>
        </div>

        <ul className="space-y-1.5 mb-4">
          {planInfo.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              {f}
            </li>
          ))}
        </ul>

        {billing?.currentPeriodEnd && status === "ACTIVE" && (
          <p className="text-xs text-gray-500 mb-4">
            Próximo cobro: {new Date(billing.currentPeriodEnd).toLocaleDateString("es-AR")}
          </p>
        )}

        {billing?.cancelsAt && status === "CANCELLED" && (
          <p className="text-xs text-red-500 mb-4">
            Acceso hasta: {new Date(billing.cancelsAt).toLocaleDateString("es-AR")}
          </p>
        )}

        <div className="flex gap-3">
          {status !== "CANCELLED" && (
            <Button
              onClick={() => setChangePlanOpen(true)}
              variant="outline"
              className="text-sm"
            >
              Cambiar plan
            </Button>
          )}
          {status === "ACTIVE" && (
            <Button
              onClick={() => setCancelOpen(true)}
              variant="outline"
              className="text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              Cancelar suscripción
            </Button>
          )}
        </div>
      </div>

      {!billing?.mpConfigured && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600">
          <p className="font-medium text-gray-800">Pagos no configurados</p>
          <p className="mt-1">
            Mercado Pago será habilitado próximamente. Por ahora, el acceso a tu clínica no se verá afectado.
          </p>
        </div>
      )}

      {/* Change plan modal */}
      {changePlanOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setChangePlanOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Elegí tu plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(PLAN_INFO).map(([key, info]) => (
                <div
                  key={key}
                  className={`border-2 rounded-xl p-4 transition-colors ${
                    key === plan ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <h4 className="font-semibold text-gray-900">{info.name}</h4>
                  <p className="text-2xl font-bold text-gray-900 mt-2">USD {info.usd}<span className="text-sm font-normal text-gray-500">/mes</span></p>
                  <ul className="mt-3 space-y-1">
                    {info.features.map((f) => (
                      <li key={f} className="text-xs text-gray-600 flex items-center gap-1">
                        <span className="text-green-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => {
                      if (billing?.mpConfigured) {
                        if (status === "TRIALING" || status === "TRIAL_EXPIRED" || status === "CANCELLED") {
                          handleCreateSubscription(key);
                        } else {
                          handleChangePlan(key);
                        }
                      } else {
                        handleChangePlan(key);
                      }
                    }}
                    disabled={(key === plan && status === "ACTIVE") || actionLoading}
                    className="w-full mt-4 text-sm"
                    variant={key === plan && status === "ACTIVE" ? "outline" : "default"}
                  >
                    {key === plan && status === "ACTIVE"
                      ? "Plan actual"
                      : key === plan && (status === "TRIALING" || status === "TRIAL_EXPIRED")
                        ? "Activar plan"
                        : "Seleccionar"}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={() => setChangePlanOpen(false)}
              variant="outline"
              className="mt-4 w-full text-sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setCancelOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Cancelar suscripción?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Tu acceso continuará hasta el final del período actual. Después de eso, perderás acceso a las funciones premium.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setCancelOpen(false)} variant="outline" className="flex-1 text-sm">
                No, mantener
              </Button>
              <Button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading ? "Cancelando..." : "Sí, cancelar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "clinica", label: "Datos de la clínica" },
  { key: "chatbot", label: "Chatbot IA" },
  { key: "profesionales", label: "Profesionales" },
  { key: "tratamientos", label: "Tratamientos" },
  { key: "sillones", label: "Sillones" },
  { key: "pipeline", label: "Pipeline" },
  { key: "integraciones", label: "Integraciones" },
  { key: "facturacion", label: "Facturación" },
  { key: "equipo", label: "Equipo" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function ConfiguracionContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>("clinica");

  // If coming back from GCal OAuth or ?tab=X, show the correct tab
  useEffect(() => {
    if (searchParams.get("gcal")) setActiveTab("integraciones");
    if (searchParams.get("mp")) setActiveTab("facturacion");
    const tabParam = searchParams.get("tab");
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setActiveTab(tabParam as TabKey);
    }
  }, []);

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-5">Configuración</h2>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "clinica" && <TabClinica />}
      {activeTab === "chatbot" && <TabChatbotIA />}
      {activeTab === "profesionales" && <TabProfesionales />}
      {activeTab === "tratamientos" && <TabTratamientos />}
      {activeTab === "sillones" && <TabSillones />}
      {activeTab === "pipeline" && <TabPipelineConfig />}
      {activeTab === "integraciones" && <TabIntegraciones />}
      {activeTab === "facturacion" && <TabFacturacion />}
      {activeTab === "equipo" && <TabEquipo />}
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500 py-8 text-center">Cargando...</div>}>
      <ConfiguracionContent />
    </Suspense>
  );
}
