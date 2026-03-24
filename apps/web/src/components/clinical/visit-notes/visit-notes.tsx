"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import {
  FileText, Search, Filter, ChevronDown, ChevronUp, Eraser,
  CheckCircle2, Clock, User, Stethoscope, ClipboardList,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Attachment {
  type: string;
  name: string;
  dataUrl: string;
  uploadedAt: string;
}

interface VisitNote {
  id: string;
  visitDate: string;
  toothNumbers: number[];
  procedureName: string | null;
  materials: string | null;
  content: string;
  nextStep: string | null;
  attachments: Attachment[];
  authorId: string;
  dentistId?: string | null;
  diagnosis?: string | null;
  treatmentPlanId?: string | null;
  signatureDentist?: string | null;
  signaturePatient?: string | null;
  templateUsed?: string | null;
  createdAt: string;
}

interface Dentist {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string | null;
}

interface TreatmentPlan {
  id: string;
  name?: string | null;
  description?: string | null;
  status?: string | null;
}

interface EvolutionTemplate {
  id: string;
  name: string;
  description?: string | null;
  procedureName?: string | null;
  materials?: string | null;
  instructions?: string | null;
}

interface Props {
  patientId: string;
  initialNotes: VisitNote[];
  initialTotal: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-AR", {
    hour: "2-digit", minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Signature Canvas                                                   */
/* ------------------------------------------------------------------ */

function SignatureCanvas({
  label,
  onSignatureChange,
}: {
  label: string;
  onSignatureChange: (base64: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function getPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  }

  function draw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
  }

  function stopDrawing() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    emitSignature();
  }

  function emitSignature() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some(
      (_, i) => i % 4 === 3 && imageData.data[i] !== 0
    );
    onSignatureChange(hasContent ? canvas.toDataURL("image/png") : null);
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSignatureChange(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-gray-500 font-medium">{label}</label>
        <button
          type="button"
          onClick={clear}
          className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
        >
          <Eraser className="w-3 h-3" />
          Limpiar
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full border border-gray-200 rounded-lg bg-white cursor-crosshair touch-none"
        style={{ height: 120 }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Timeline Note Card                                                 */
/* ------------------------------------------------------------------ */

function NoteCard({
  note,
  patientId,
  dentists,
  onDelete,
}: {
  note: VisitNote;
  patientId: string;
  dentists: Dentist[];
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const contentIsLong = note.content.length > 200;
  const dentist = note.dentistId
    ? dentists.find((d) => d.id === note.dentistId)
    : null;
  const dentistName = dentist
    ? `${dentist.firstName} ${dentist.lastName}`
    : null;

  async function handleDelete() {
    if (!confirm("¿Eliminar esta nota?")) return;
    setDeleting(true);
    await apiFetch(`/api/v1/patients/${patientId}/visit-notes/${note.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-primary-500 border-2 border-white shadow-sm z-10" />

      <div className="border rounded-xl p-4 space-y-3 hover:border-primary-200 hover:shadow-sm transition-all bg-white">
        {/* Header: date + time + dentist + delete */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 capitalize">
                {formatDate(note.visitDate)}
              </p>
              <span className="text-xs text-gray-400">
                {formatTime(note.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              <span>{dentistName || "—"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {note.templateUsed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-[10px] font-medium">
                <FileText className="w-3 h-3" />
                {note.templateUsed}
              </span>
            )}
            {note.signatureDentist && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[10px] font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Firmado
              </span>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-gray-300 hover:text-red-500 transition-colors ml-1"
            >
              {deleting ? "..." : "✕"}
            </button>
          </div>
        </div>

        {/* Procedure name as title */}
        {note.procedureName && (
          <p className="text-sm font-semibold text-primary-700 flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" />
            {note.procedureName}
          </p>
        )}

        {/* Tooth numbers as badges */}
        {note.toothNumbers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.toothNumbers.map((t) => (
              <span
                key={t}
                className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md bg-primary-50 text-primary-700 text-xs font-bold"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Diagnosis */}
        {note.diagnosis && (
          <div className="flex items-start gap-1.5 text-xs text-gray-600">
            <ClipboardList className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <span><span className="font-medium">Diagnóstico:</span> {note.diagnosis}</span>
          </div>
        )}

        {/* Content (collapsible if long) */}
        <div className="text-sm text-gray-700 leading-relaxed">
          {contentIsLong && !expanded ? (
            <>
              {note.content.slice(0, 200)}...
              <button
                onClick={() => setExpanded(true)}
                className="ml-1 text-primary-600 hover:text-primary-700 text-xs font-medium inline-flex items-center gap-0.5"
              >
                Ver más <ChevronDown className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              {note.content}
              {contentIsLong && (
                <button
                  onClick={() => setExpanded(false)}
                  className="ml-1 text-primary-600 hover:text-primary-700 text-xs font-medium inline-flex items-center gap-0.5"
                >
                  Ver menos <ChevronUp className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Materials as tags */}
        {note.materials && (
          <div className="flex flex-wrap gap-1.5">
            {note.materials.split(",").map((mat, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium"
              >
                {mat.trim()}
              </span>
            ))}
          </div>
        )}

        {/* Next step */}
        {note.nextStep && (
          <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800">
            <span className="font-medium">Próximo paso:</span> {note.nextStep}
          </div>
        )}

        {/* Attachments */}
        {note.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {note.attachments.map((att, i) => (
              <button
                key={i}
                onClick={() => setViewImg(att.dataUrl)}
                className="group relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-primary-400 transition-colors"
                title={att.name}
              >
                {att.dataUrl.startsWith("data:image") ? (
                  <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-gray-500 font-medium">
                      {att.type === "XRAY_PANORAMIC" ? "Panorámica" :
                       att.type === "XRAY_PERIAPICAL" ? "Periapical" :
                       att.type === "XRAY_BITEWING" ? "Bitewing" : "Foto"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Image viewer */}
        {viewImg && (
          <Dialog open onOpenChange={() => setViewImg(null)}>
            <DialogContent className="max-w-3xl">
              <img src={viewImg} alt="Imagen adjunta" className="w-full rounded-lg" />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Bar                                                         */
/* ------------------------------------------------------------------ */

function FilterBar({
  dentists,
  filters,
  onFiltersChange,
}: {
  dentists: Dentist[];
  filters: { dateFrom: string; dateTo: string; dentistId: string; search: string };
  onFiltersChange: (f: typeof filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasActiveFilters =
    filters.dateFrom || filters.dateTo || filters.dentistId || filters.search;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Buscar en notas..."
            className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
            hasActiveFilters
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary-500" />
          )}
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Profesional</label>
            <select
              value={filters.dentistId}
              onChange={(e) => onFiltersChange({ ...filters, dentistId: e.target.value })}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Todos</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() =>
                onFiltersChange({ dateFrom: "", dateTo: "", dentistId: "", search: "" })
              }
              className="text-xs text-red-500 hover:text-red-600 underline pb-1"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Note Modal                                                     */
/* ------------------------------------------------------------------ */

function AddNoteModal({
  patientId,
  dentists,
  treatmentPlans,
  templates,
  onSaved,
  onClose,
}: {
  patientId: string;
  dentists: Dentist[];
  treatmentPlans: TreatmentPlan[];
  templates: EvolutionTemplate[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split("T")[0],
    toothNumbers: "",
    procedureName: "",
    materials: "",
    content: "",
    nextStep: "",
    dentistId: "",
    diagnosis: "",
    treatmentPlanId: "",
    templateUsed: "",
  });
  const [signatureDentist, setSignatureDentist] = useState<string | null>(null);
  const [signaturePatient, setSignaturePatient] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleTemplateSelect(templateId: string) {
    if (!templateId) {
      setForm((p) => ({ ...p, templateUsed: "" }));
      return;
    }
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((p) => ({
      ...p,
      templateUsed: tpl.name,
      procedureName: tpl.procedureName || p.procedureName,
      materials: tpl.materials || p.materials,
      content: tpl.description || p.content,
      nextStep: tpl.instructions || p.nextStep,
    }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const type = file.type.startsWith("image/") ? "PHOTO" : "XRAY_PERIAPICAL";
        setAttachments((prev) => [...prev, { type, name: file.name, dataUrl, uploadedAt: new Date().toISOString() }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function handleSave() {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/visit-notes`, {
        method: "POST",
        body: JSON.stringify({
          visitDate: new Date(form.visitDate).toISOString(),
          toothNumbers: form.toothNumbers
            ? form.toothNumbers.split(",").map((n) => parseInt(n.trim())).filter(Boolean)
            : [],
          procedureName: form.procedureName || undefined,
          materials: form.materials || undefined,
          content: form.content,
          nextStep: form.nextStep || undefined,
          dentistId: form.dentistId || undefined,
          diagnosis: form.diagnosis || undefined,
          treatmentPlanId: form.treatmentPlanId || undefined,
          templateUsed: form.templateUsed || undefined,
          signatureDentist: signatureDentist || undefined,
          signaturePatient: signaturePatient || undefined,
          attachments,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500";
  const selectCls =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva nota de evolución</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          {templates.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <label className="text-xs text-violet-600 font-medium mb-1.5 block flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Usar plantilla
              </label>
              <select
                value={templates.find((t) => t.name === form.templateUsed)?.id || ""}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className={selectCls}
              >
                <option value="">Sin plantilla</option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 1: Date + Dentist */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha de visita</label>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((p) => ({ ...p, visitDate: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Profesional</label>
              <select
                value={form.dentistId}
                onChange={(e) => setForm((p) => ({ ...p, dentistId: e.target.value }))}
                className={selectCls}
              >
                <option value="">Seleccionar profesional</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}{d.specialty ? ` — ${d.specialty}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Teeth + Procedure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Piezas tratadas (ej: 16,17)</label>
              <input
                type="text"
                value={form.toothNumbers}
                onChange={(e) => setForm((p) => ({ ...p, toothNumbers: e.target.value }))}
                placeholder="16, 17, 18"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Procedimiento</label>
              <input
                type="text"
                value={form.procedureName}
                onChange={(e) => setForm((p) => ({ ...p, procedureName: e.target.value }))}
                placeholder="Endodoncia, restauración..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Row 3: Diagnosis + Treatment plan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Diagnóstico</label>
              <input
                type="text"
                value={form.diagnosis}
                onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
                placeholder="Caries oclusal, pulpitis..."
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Plan vinculado</label>
              <select
                value={form.treatmentPlanId}
                onChange={(e) => setForm((p) => ({ ...p, treatmentPlanId: e.target.value }))}
                className={selectCls}
              >
                <option value="">Sin plan vinculado</option>
                {treatmentPlans.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name || tp.description || tp.id.slice(0, 8)}
                    {tp.status ? ` (${tp.status})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Materials */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Materiales usados</label>
            <input
              type="text"
              value={form.materials}
              onChange={(e) => setForm((p) => ({ ...p, materials: e.target.value }))}
              placeholder="Resina Z350, ionomero..."
              className={inputCls}
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Evolución / Observaciones *</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Descripción del procedimiento realizado, estado del paciente, observaciones clínicas..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Next step */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Próximo paso / Indicaciones</label>
            <input
              type="text"
              value={form.nextStep}
              onChange={(e) => setForm((p) => ({ ...p, nextStep: e.target.value }))}
              placeholder="Control en 2 semanas, citar para corona..."
              className={inputCls}
            />
          </div>

          {/* File attachments */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">Fotos / Radiografías</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                  {att.dataUrl.startsWith("data:image") ? (
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                      <span className="text-[9px] text-gray-400 font-medium text-center px-1">{att.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-primary-400 flex items-center justify-center text-gray-300 hover:text-primary-500 transition-colors text-2xl"
              >
                +
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Signatures */}
          <div className="border-t pt-4 space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Firmas</p>
            <SignatureCanvas
              label="Firma del profesional"
              onSignatureChange={setSignatureDentist}
            />
            <SignatureCanvas
              label="Firma del paciente"
              onSignatureChange={setSignaturePatient}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.content.trim()}>
            {saving ? "Guardando..." : "Guardar nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function VisitNotes({ patientId, initialNotes, initialTotal }: Props) {
  const [notes, setNotes] = useState<VisitNote[]>(initialNotes);
  const [total, setTotal] = useState(initialTotal);
  const [showAdd, setShowAdd] = useState(false);

  // Lookup data
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [templates, setTemplates] = useState<EvolutionTemplate[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    dentistId: "",
    search: "",
  });

  // Fetch lookup data on mount
  useEffect(() => {
    apiFetch<Dentist[]>("/api/v1/dentists")
      .then((data) => setDentists(Array.isArray(data) ? data : []))
      .catch(() => {});

    apiFetch<TreatmentPlan[]>(`/api/v1/patients/${patientId}/treatment-plans`)
      .then((data) => setTreatmentPlans(Array.isArray(data) ? data : []))
      .catch(() => {});

    apiFetch<EvolutionTemplate[]>("/api/v1/evolution-templates")
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [patientId]);

  async function refresh() {
    const data = await apiFetch<{ notes: VisitNote[]; total: number }>(
      `/api/v1/patients/${patientId}/visit-notes`
    );
    setNotes(data.notes);
    setTotal(data.total);
  }

  // Client-side filtering
  const filteredNotes = useCallback(() => {
    let result = notes;

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((n) => new Date(n.visitDate) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((n) => new Date(n.visitDate) <= to);
    }
    if (filters.dentistId) {
      result = result.filter((n) => n.dentistId === filters.dentistId);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.content.toLowerCase().includes(q) ||
          (n.procedureName && n.procedureName.toLowerCase().includes(q)) ||
          (n.diagnosis && n.diagnosis.toLowerCase().includes(q)) ||
          (n.materials && n.materials.toLowerCase().includes(q)) ||
          (n.nextStep && n.nextStep.toLowerCase().includes(q))
      );
    }

    return result;
  }, [notes, filters])();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Notas de Evolución
          <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Nueva nota
        </Button>
      </div>

      {/* Filter bar */}
      <FilterBar
        dentists={dentists}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Timeline */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-xl border px-5 py-10 text-center text-gray-400 text-sm">
          {notes.length === 0
            ? "No hay notas de evolución registradas."
            : "No se encontraron notas con los filtros seleccionados."}
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                patientId={patientId}
                dentists={dentists}
                onDelete={refresh}
              />
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddNoteModal
          patientId={patientId}
          dentists={dentists}
          treatmentPlans={treatmentPlans}
          templates={templates}
          onSaved={refresh}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
