"use client";

import { useEffect, useState, useCallback } from "react";
import { ADMIN_API_BASE } from "@/lib/admin-api";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface Variable {
  position: number;
  field: string;
  example: string;
}

interface TemplateEvent {
  id: string;
  event: string;
  details: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Template {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: string;
  language: string;
  headerType: string | null;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  buttonsJson: unknown;
  variablesJson: Variable[] | null;
  status: string;
  metaTemplateId: string | null;
  metaStatus: string | null;
  rejectionReason: string | null;
  qualityScore: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  lastCheckedAt: string | null;
  isSystemTemplate: boolean;
  isActive: boolean;
  version: number;
  suggestedTrigger: string | null;
  createdAt: string;
  updatedAt: string;
  events?: TemplateEvent[];
}

interface ConnectedWaba {
  id: string;
  name: string;
  wabaId: string;
  whatsappDisplayNumber: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function adminFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("df_admin_token") : null;
  return fetch(`${ADMIN_API_BASE}${url}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  }).then(async (r) => {
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message ?? `Error ${r.status}`);
    }
    if (r.status === 204) return undefined as T;
    return r.json() as T;
  });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Borrador", color: "text-gray-400", bg: "bg-gray-700" },
  SUBMITTED: { label: "Enviado", color: "text-blue-400", bg: "bg-blue-900/50" },
  PENDING: { label: "En revisión", color: "text-yellow-400", bg: "bg-yellow-900/50" },
  APPROVED: { label: "Aprobado", color: "text-green-400", bg: "bg-green-900/50" },
  REJECTED: { label: "Rechazado", color: "text-red-400", bg: "bg-red-900/50" },
  PAUSED: { label: "Pausado", color: "text-orange-400", bg: "bg-orange-900/50" },
  DISABLED: { label: "Deshabilitado", color: "text-gray-500", bg: "bg-gray-800" },
};

const QUALITY_COLORS: Record<string, string> = {
  GREEN: "text-green-400",
  YELLOW: "text-yellow-400",
  RED: "text-red-400",
};

const EVENT_ICONS: Record<string, string> = {
  created: "📝",
  submitted: "📤",
  resubmitted: "🔄",
  approved: "✅",
  rejected: "❌",
  paused: "⏸️",
  disabled: "🚫",
  edited: "✏️",
  status_check: "🔍",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderPreview(template: { bodyText: string; variablesJson?: Variable[] | null }): string {
  let text = template.bodyText;
  const vars = template.variablesJson ?? [];
  for (const v of vars) {
    text = text.replace(`{{${v.position}}}`, v.example);
  }
  return text;
}

// ─── Variable Fields ────────────────────────────────────────────────────────────

const VARIABLE_FIELDS = [
  "firstName",
  "lastName",
  "clinicName",
  "dentistName",
  "treatmentName",
  "time",
  "date",
  "months",
  "days",
  "discountPercent",
  "appointmentDate",
  "appointmentTime",
  "custom",
];

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [connectedWabas, setConnectedWabas] = useState<ConnectedWaba[]>([]);
  const [selectedWabaId, setSelectedWabaId] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Detail view
  const [detailTemplate, setDetailTemplate] = useState<Template | null>(null);
  const [timeline, setTimeline] = useState<TemplateEvent[]>([]);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("UTILITY");
  const [formLanguage, setFormLanguage] = useState("es_AR");
  const [formBodyText, setFormBodyText] = useState("");
  const [formFooterText, setFormFooterText] = useState("");
  const [formVariables, setFormVariables] = useState<Variable[]>([]);
  const [formSuggestedTrigger, setFormSuggestedTrigger] = useState("");

  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      const data = await adminFetch<{ templates: Template[] }>(
        `/api/v1/admin/templates?status=${filter}`
      );
      setTemplates(data.templates);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando templates");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadWabas = useCallback(async () => {
    try {
      const data = await adminFetch<{ tenants: ConnectedWaba[] }>("/api/v1/admin/connected-wabas");
      setConnectedWabas(data.tenants);
      if (data.tenants.length > 0 && !selectedWabaId) {
        setSelectedWabaId(data.tenants[0].id);
      }
    } catch {
      // Silently fail — not critical
    }
  }, [selectedWabaId]);

  useEffect(() => {
    loadTemplates();
    loadWabas();
  }, [loadTemplates, loadWabas]);

  // Polling every 15s (for Meta approval status updates)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadTemplates();
    }, 15_000);
    return () => clearInterval(interval);
  }, [loadTemplates]);

  // Keep detail view in sync with list data
  useEffect(() => {
    if (detailTemplate) {
      const updated = templates.find((t) => t.id === detailTemplate.id);
      if (updated && updated.status !== detailTemplate.status) {
        setDetailTemplate(updated);
      }
    }
  }, [templates, detailTemplate]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    setError("");
    if (!formName || !formDisplayName || !formBodyText) {
      setError("Nombre, nombre visible y cuerpo del mensaje son obligatorios");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(formName)) {
      setError("El nombre solo puede contener minúsculas, números y guiones bajos");
      return;
    }
    if (formBodyText.length > 1024) {
      setError("El cuerpo no puede exceder 1024 caracteres");
      return;
    }

    setActionLoading("create");
    try {
      await adminFetch("/api/v1/admin/templates", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          displayName: formDisplayName,
          description: formDescription || undefined,
          category: formCategory,
          language: formLanguage,
          bodyText: formBodyText,
          footerText: formFooterText || undefined,
          variablesJson: formVariables.length > 0 ? formVariables : undefined,
          suggestedTrigger: formSuggestedTrigger || undefined,
        }),
      });
      setSuccess("Template creado correctamente");
      setShowModal(false);
      resetForm();
      loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error creando template");
    } finally {
      setActionLoading("");
    }
  }

  async function handleUpdate() {
    if (!editingTemplate) return;
    setError("");
    setActionLoading("update");
    try {
      await adminFetch(`/api/v1/admin/templates/${editingTemplate.id}`, {
        method: "PUT",
        body: JSON.stringify({
          displayName: formDisplayName,
          description: formDescription || undefined,
          category: formCategory,
          bodyText: formBodyText,
          footerText: formFooterText || undefined,
          variablesJson: formVariables.length > 0 ? formVariables : undefined,
          suggestedTrigger: formSuggestedTrigger || undefined,
        }),
      });
      setSuccess("Template actualizado correctamente");
      setShowModal(false);
      resetForm();
      loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error actualizando template");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSubmitToMeta(templateId: string) {
    if (!selectedWabaId) {
      setError("Seleccioná una clínica con WhatsApp conectado");
      return;
    }
    setActionLoading(`submit-${templateId}`);
    setError("");
    try {
      await adminFetch(`/api/v1/admin/templates/${templateId}/submit`, {
        method: "POST",
        body: JSON.stringify({ tenantId: selectedWabaId }),
      });
      setSuccess("Template enviado a Meta para aprobación");
      setFilter("ALL"); // Show all so PENDING template is visible
      // loadTemplates will fire via the filter useEffect dependency
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error enviando a Meta");
    } finally {
      setActionLoading("");
    }
  }

  async function handleCheckStatus(templateId: string) {
    if (!selectedWabaId) {
      setError("Seleccioná una clínica con WhatsApp conectado");
      return;
    }
    setActionLoading(`check-${templateId}`);
    setError("");
    try {
      await adminFetch(`/api/v1/admin/templates/${templateId}/check`, {
        method: "POST",
        body: JSON.stringify({ tenantId: selectedWabaId }),
      });
      setSuccess("Estado verificado");
      loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error verificando estado");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSync() {
    if (!selectedWabaId) {
      setError("Seleccioná una clínica con WhatsApp conectado");
      return;
    }
    setActionLoading("sync");
    setError("");
    try {
      const data = await adminFetch<{ updated: number }>("/api/v1/admin/templates/sync", {
        method: "POST",
        body: JSON.stringify({ tenantId: selectedWabaId }),
      });
      setSuccess(`Sincronización completada. ${data.updated} templates actualizados.`);
      loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error sincronizando");
    } finally {
      setActionLoading("");
    }
  }

  async function handleDelete(templateId: string) {
    if (!confirm("¿Estás seguro de eliminar este template?")) return;
    setActionLoading(`delete-${templateId}`);
    try {
      await adminFetch(`/api/v1/admin/templates/${templateId}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      setSuccess("Template eliminado");
      setDetailTemplate(null);
      loadTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error eliminando");
    } finally {
      setActionLoading("");
    }
  }

  async function handleViewDetail(template: Template) {
    setDetailTemplate(template);
    try {
      const data = await adminFetch<{ events: TemplateEvent[] }>(
        `/api/v1/admin/templates/${template.id}/timeline`
      );
      setTimeline(data.events);
    } catch {
      setTimeline([]);
    }
  }

  // ─── Form Helpers ───────────────────────────────────────────────────────────

  function resetForm() {
    setFormName("");
    setFormDisplayName("");
    setFormDescription("");
    setFormCategory("UTILITY");
    setFormLanguage("es_AR");
    setFormBodyText("");
    setFormFooterText("");
    setFormVariables([]);
    setFormSuggestedTrigger("");
    setEditingTemplate(null);
  }

  function openCreate() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(template: Template) {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormDisplayName(template.displayName);
    setFormDescription(template.description ?? "");
    setFormCategory(template.category);
    setFormLanguage(template.language);
    setFormBodyText(template.bodyText);
    setFormFooterText(template.footerText ?? "");
    setFormVariables((template.variablesJson as Variable[]) ?? []);
    setFormSuggestedTrigger(template.suggestedTrigger ?? "");
    setShowModal(true);
  }

  // Detect {{N}} variables in body text
  function detectVariables(text: string): number[] {
    const matches = text.match(/\{\{(\d+)\}\}/g) ?? [];
    return [...new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""))))].sort(
      (a, b) => a - b
    );
  }

  function updateVariablesFromBody(text: string) {
    const positions = detectVariables(text);
    setFormVariables((prev) => {
      const existing = new Map(prev.map((v) => [v.position, v]));
      return positions.map((pos) => existing.get(pos) ?? { position: pos, field: "firstName", example: "" });
    });
  }

  // ─── Auto-dismiss messages ──────────────────────────────────────────────────

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // DETAIL VIEW
  if (detailTemplate) {
    const st = STATUS_CONFIG[detailTemplate.status] ?? STATUS_CONFIG.DRAFT;
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => setDetailTemplate(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a la lista
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">{detailTemplate.displayName}</h1>
            <p className="text-gray-400 text-sm mt-1">
              {detailTemplate.name} &middot; {detailTemplate.category} &middot; {detailTemplate.language}
            </p>
            {detailTemplate.description && (
              <p className="text-gray-500 text-sm mt-1">{detailTemplate.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${st.color} ${st.bg}`}>
              {st.label}
            </span>
            {detailTemplate.qualityScore && (
              <span className={`text-sm ${QUALITY_COLORS[detailTemplate.qualityScore] ?? "text-gray-400"}`}>
                Quality: {detailTemplate.qualityScore}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {["DRAFT", "REJECTED"].includes(detailTemplate.status) && (
            <>
              <button
                onClick={() => handleSubmitToMeta(detailTemplate.id)}
                disabled={!selectedWabaId || actionLoading === `submit-${detailTemplate.id}`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
              >
                {actionLoading === `submit-${detailTemplate.id}` ? "Enviando..." : "Enviar a Meta"}
              </button>
              <button
                onClick={() => openEdit(detailTemplate)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600"
              >
                Editar
              </button>
            </>
          )}
          {["PENDING", "SUBMITTED", "APPROVED", "PAUSED"].includes(detailTemplate.status) && (
            <button
              onClick={() => handleCheckStatus(detailTemplate.id)}
              disabled={!selectedWabaId || actionLoading === `check-${detailTemplate.id}`}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50"
            >
              {actionLoading === `check-${detailTemplate.id}` ? "Verificando..." : "Verificar estado"}
            </button>
          )}
          <button
            onClick={() => handleDelete(detailTemplate.id)}
            disabled={actionLoading === `delete-${detailTemplate.id}`}
            className="px-4 py-2 bg-red-900/50 text-red-300 rounded-lg text-sm hover:bg-red-900/80"
          >
            Eliminar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Vista previa</h3>
            <div className="bg-gray-800 rounded-xl p-4 max-w-sm">
              <div className="bg-green-900/30 rounded-lg p-3">
                <p className="text-white text-sm whitespace-pre-wrap">
                  {renderPreview(detailTemplate)}
                </p>
                {detailTemplate.footerText && (
                  <p className="text-gray-400 text-xs mt-2">{detailTemplate.footerText}</p>
                )}
              </div>
            </div>

            {/* Variables */}
            {detailTemplate.variablesJson && (detailTemplate.variablesJson as Variable[]).length > 0 && (
              <div className="mt-4">
                <h4 className="text-gray-400 text-xs uppercase font-medium mb-2">Variables</h4>
                <div className="space-y-1">
                  {(detailTemplate.variablesJson as Variable[]).map((v) => (
                    <div key={v.position} className="flex gap-2 text-sm">
                      <span className="text-primary-400">{`{{${v.position}}}`}</span>
                      <span className="text-gray-500">&rarr;</span>
                      <span className="text-gray-300">{v.field}</span>
                      <span className="text-gray-600">({v.example})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <h4 className="text-gray-400 text-xs uppercase font-medium mb-2">Información de Meta</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Meta ID:</span>
                <span className="text-gray-300">{detailTemplate.metaTemplateId ?? "—"}</span>
                <span className="text-gray-500">Enviado:</span>
                <span className="text-gray-300">{formatDate(detailTemplate.submittedAt)}</span>
                <span className="text-gray-500">Aprobado:</span>
                <span className="text-gray-300">{formatDate(detailTemplate.approvedAt)}</span>
                {detailTemplate.rejectionReason && (
                  <>
                    <span className="text-gray-500">Motivo rechazo:</span>
                    <span className="text-red-400">{detailTemplate.rejectionReason}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">Timeline</h3>
            {timeline.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin eventos registrados</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((evt) => (
                  <div key={evt.id} className="flex gap-3">
                    <span className="text-lg flex-shrink-0">
                      {EVENT_ICONS[evt.event] ?? "📋"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{evt.details ?? evt.event}</p>
                      <p className="text-gray-500 text-xs">{formatDate(evt.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Templates de WhatsApp</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestión de templates para enviar a Meta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={!selectedWabaId || actionLoading === "sync"}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${actionLoading === "sync" ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {actionLoading === "sync" ? "Sincronizando..." : "Sincronizar con Meta"}
          </button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear template
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* WABA Selector */}
      <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
        <span className="text-gray-400 text-sm">Enviar desde:</span>
        <select
          value={selectedWabaId}
          onChange={(e) => setSelectedWabaId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white flex-1 max-w-md"
        >
          {connectedWabas.length === 0 ? (
            <option value="">No hay clínicas con WhatsApp conectado</option>
          ) : (
            connectedWabas.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.whatsappDisplayNumber ? `- ${w.whatsappDisplayNumber}` : ""}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["ALL", "DRAFT", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === s
                ? "bg-primary-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
          >
            {s === "ALL" ? "Todos" : (STATUS_CONFIG[s]?.label ?? s)}
          </button>
        ))}
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>No hay templates{filter !== "ALL" ? ` con estado ${STATUS_CONFIG[filter]?.label ?? filter}` : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => {
            const st = STATUS_CONFIG[tpl.status] ?? STATUS_CONFIG.DRAFT;
            return (
              <div
                key={tpl.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-medium">{tpl.displayName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color} ${st.bg}`}>
                        {st.label}
                      </span>
                      {tpl.qualityScore && (
                        <span className={`text-xs ${QUALITY_COLORS[tpl.qualityScore] ?? "text-gray-400"}`}>
                          Quality: {tpl.qualityScore}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {tpl.name} &middot; {tpl.category} &middot; {tpl.language}
                    </p>
                    {tpl.description && (
                      <p className="text-gray-600 text-xs mt-1">{tpl.description}</p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-600 mt-2">
                      {tpl.submittedAt && <span>Enviado: {formatDate(tpl.submittedAt)}</span>}
                      {tpl.approvedAt && <span>Aprobado: {formatDate(tpl.approvedAt)}</span>}
                      {tpl.rejectedAt && (
                        <span className="text-red-500">
                          Rechazado: {formatDate(tpl.rejectedAt)}
                          {tpl.rejectionReason ? ` — "${tpl.rejectionReason}"` : ""}
                        </span>
                      )}
                      {!tpl.submittedAt && <span>Creado: {formatDate(tpl.createdAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleViewDetail(tpl)}
                      className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700"
                    >
                      Ver detalle
                    </button>
                    {tpl.status === "DRAFT" && (
                      <>
                        <button
                          onClick={() => openEdit(tpl)}
                          className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleSubmitToMeta(tpl.id)}
                          disabled={!selectedWabaId || actionLoading === `submit-${tpl.id}`}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 disabled:opacity-50"
                        >
                          {actionLoading === `submit-${tpl.id}` ? "..." : "Enviar a Meta"}
                        </button>
                      </>
                    )}
                    {tpl.status === "REJECTED" && (
                      <button
                        onClick={() => openEdit(tpl)}
                        className="px-3 py-1.5 bg-orange-900/50 text-orange-300 rounded-lg text-xs hover:bg-orange-900/80"
                      >
                        Editar y reenviar
                      </button>
                    )}
                    {["PENDING", "SUBMITTED"].includes(tpl.status) && (
                      <button
                        onClick={() => handleCheckStatus(tpl.id)}
                        disabled={!selectedWabaId || actionLoading === `check-${tpl.id}`}
                        className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700 disabled:opacity-50"
                      >
                        {actionLoading === `check-${tpl.id}` ? "..." : "Verificar estado"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {editingTemplate ? "Editar template" : "Crear nuevo template"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-300 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Nombre interno *
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    disabled={!!editingTemplate}
                    placeholder="appointment_reminder_24h"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50"
                  />
                  <p className="text-gray-600 text-xs mt-1">Solo minúsculas, números, _</p>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    Nombre visible *
                  </label>
                  <input
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Recordatorio de cita 24hs"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Descripción</label>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Se envía 24hs antes de la cita"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Category & Language */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Categoría *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="UTILITY">UTILITY (transaccional)</option>
                    <option value="MARKETING">MARKETING (promocional)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Idioma</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="es_AR">Español (Argentina)</option>
                    <option value="es">Español</option>
                    <option value="pt_BR">Portugués (Brasil)</option>
                    <option value="en_US">English (US)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Trigger sugerido</label>
                  <select
                    value={formSuggestedTrigger}
                    onChange={(e) => setFormSuggestedTrigger(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">Ninguno</option>
                    <option value="appointment_reminder">Recordatorio de cita</option>
                    <option value="post_visit">Post-visita</option>
                    <option value="follow_up">Seguimiento periódico</option>
                    <option value="interested_not_booked">Interesado sin agendar</option>
                    <option value="reactivation">Reactivación</option>
                    <option value="birthday">Cumpleaños</option>
                    <option value="no_show">No asistió</option>
                    <option value="post_procedure">Post-procedimiento</option>
                    <option value="welcome">Bienvenida</option>
                  </select>
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">
                  Cuerpo del mensaje *
                </label>
                <textarea
                  value={formBodyText}
                  onChange={(e) => {
                    setFormBodyText(e.target.value);
                    updateVariablesFromBody(e.target.value);
                  }}
                  rows={4}
                  placeholder="¡Hola {{1}}! Te recordamos tu cita..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-y"
                  maxLength={1024}
                />
                <p className="text-gray-600 text-xs mt-1">
                  {formBodyText.length}/1024 caracteres. Usá {"{{1}}"}, {"{{2}}"}, etc. para variables.
                </p>
              </div>

              {/* Variables */}
              {formVariables.length > 0 && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Variables</label>
                  <div className="space-y-2">
                    {formVariables.map((v, i) => (
                      <div key={v.position} className="flex items-center gap-3">
                        <span className="text-primary-400 text-sm w-12">{`{{${v.position}}}`}</span>
                        <select
                          value={v.field}
                          onChange={(e) => {
                            const updated = [...formVariables];
                            updated[i] = { ...v, field: e.target.value };
                            setFormVariables(updated);
                          }}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white flex-1"
                        >
                          {VARIABLE_FIELDS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                        <input
                          value={v.example}
                          onChange={(e) => {
                            const updated = [...formVariables];
                            updated[i] = { ...v, example: e.target.value };
                            setFormVariables(updated);
                          }}
                          placeholder="Ejemplo: Pedro"
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Footer (opcional)</label>
                <input
                  value={formFooterText}
                  onChange={(e) => setFormFooterText(e.target.value)}
                  placeholder="Responda CANCELAR para cancelar su cita"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              {/* Preview */}
              {formBodyText && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Vista previa</label>
                  <div className="bg-gray-800 rounded-xl p-4 max-w-sm">
                    <div className="bg-green-900/30 rounded-lg p-3">
                      <p className="text-white text-sm whitespace-pre-wrap">
                        {renderPreview({ bodyText: formBodyText, variablesJson: formVariables })}
                      </p>
                      {formFooterText && (
                        <p className="text-gray-400 text-xs mt-2">{formFooterText}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700"
                >
                  Cancelar
                </button>
                {editingTemplate ? (
                  <button
                    onClick={handleUpdate}
                    disabled={actionLoading === "update"}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    {actionLoading === "update" ? "Guardando..." : "Guardar cambios"}
                  </button>
                ) : (
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading === "create"}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    {actionLoading === "create" ? "Creando..." : "Crear template"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
