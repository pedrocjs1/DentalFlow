"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import {
  FileText,
  Shield,
  Pen,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  XCircle,
  Eraser,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Medication {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  route: string;
  instructions: string;
}

interface Prescription {
  id: string;
  number: string;
  date: string;
  diagnosis: string;
  notes: string | null;
  signature: string | null;
  medications: Medication[];
  dentist: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

interface Consent {
  id: string;
  title: string;
  content: string;
  status: "DRAFT" | "SIGNED" | "REVOKED";
  patientSignature: string | null;
  professionalSignature: string | null;
  revokedReason: string | null;
  signedAt: string | null;
  revokedAt: string | null;
  dentist: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

interface Dentist {
  id: string;
  firstName: string;
  lastName: string;
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  medications: Medication[];
}

interface ConsentTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusBadge(status: Consent["status"]) {
  const map = {
    DRAFT: { label: "Borrador", cls: "bg-gray-100 text-gray-600" },
    SIGNED: { label: "Firmado", cls: "bg-green-100 text-green-700" },
    REVOKED: { label: "Revocado", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
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
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
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
        height={150}
        className="w-full border border-gray-200 rounded-lg bg-white cursor-crosshair touch-none"
        style={{ height: 150 }}
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
/*  Prescription Card                                                  */
/* ------------------------------------------------------------------ */

function PrescriptionCard({
  rx,
  patientId,
  onDelete,
}: {
  rx: Prescription;
  patientId: string;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar esta receta?")) return;
    setDeleting(true);
    try {
      await apiFetch(
        `/api/v1/patients/${patientId}/prescriptions/${rx.id}`,
        { method: "DELETE", body: JSON.stringify({}) }
      );
      onDelete();
    } finally {
      setDeleting(false);
    }
  }

  const dentistName = rx.dentist
    ? `Dr/a. ${rx.dentist.firstName} ${rx.dentist.lastName}`.trim()
    : "Sin asignar";

  return (
    <div className="bg-white border rounded-xl hover:border-gray-300 transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                Receta #{rx.number}
              </span>
              <span className="text-xs text-gray-400">
                {formatDate(rx.date || rx.createdAt)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {dentistName} &middot; {rx.diagnosis || "Sin diagnóstico"} &middot;{" "}
              {rx.medications.length} medicamento
              {rx.medications.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {rx.medications.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 uppercase tracking-wider">
                    <th className="pb-2 pr-3 font-medium">Medicamento</th>
                    <th className="pb-2 pr-3 font-medium">Dosis</th>
                    <th className="pb-2 pr-3 font-medium">Frecuencia</th>
                    <th className="pb-2 pr-3 font-medium">Duración</th>
                    <th className="pb-2 pr-3 font-medium">Vía</th>
                    <th className="pb-2 font-medium">Indicaciones</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {rx.medications.map((med, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-2 pr-3 font-medium">{med.name}</td>
                      <td className="py-2 pr-3">{med.dose}</td>
                      <td className="py-2 pr-3">{med.frequency}</td>
                      <td className="py-2 pr-3">{med.duration}</td>
                      <td className="py-2 pr-3">{med.route}</td>
                      <td className="py-2">{med.instructions || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rx.notes && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
              <span className="font-medium">Notas:</span> {rx.notes}
            </div>
          )}

          {rx.signature && (
            <div>
              <p className="text-xs text-gray-400 mb-1">
                Firma del profesional
              </p>
              <img
                src={rx.signature}
                alt="Firma"
                className="h-16 border rounded-lg bg-white p-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Consent Card                                                       */
/* ------------------------------------------------------------------ */

function ConsentCard({
  consent,
  patientId,
  onRefresh,
}: {
  consent: Consent;
  patientId: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSign, setShowSign] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);

  const dentistName = consent.dentist
    ? `Dr/a. ${consent.dentist.firstName} ${consent.dentist.lastName}`.trim()
    : "Sin asignar";

  return (
    <>
      <div className="bg-white border rounded-xl hover:border-gray-300 transition-colors">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {consent.title}
                </span>
                {statusBadge(consent.status)}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {dentistName} &middot;{" "}
                {formatDate(consent.signedAt || consent.createdAt)}
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
            <div className="bg-gray-50 rounded-lg px-3 py-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {consent.content}
            </div>

            {consent.status === "SIGNED" && (
              <div className="grid grid-cols-2 gap-4">
                {consent.patientSignature && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Firma del paciente
                    </p>
                    <img
                      src={consent.patientSignature}
                      alt="Firma paciente"
                      className="h-16 border rounded-lg bg-white p-1"
                    />
                  </div>
                )}
                {consent.professionalSignature && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Firma del profesional
                    </p>
                    <img
                      src={consent.professionalSignature}
                      alt="Firma profesional"
                      className="h-16 border rounded-lg bg-white p-1"
                    />
                  </div>
                )}
              </div>
            )}

            {consent.status === "REVOKED" && consent.revokedReason && (
              <div className="bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700">
                <span className="font-medium">Motivo de revocación:</span>{" "}
                {consent.revokedReason}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {consent.status === "DRAFT" && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSign(true);
                  }}
                  className="gap-1.5"
                >
                  <Pen className="w-3.5 h-3.5" />
                  Firmar
                </Button>
              )}
              {consent.status === "SIGNED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRevoke(true);
                  }}
                  className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Revocar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {showSign && (
        <SignConsentModal
          patientId={patientId}
          consentId={consent.id}
          onSigned={() => {
            setShowSign(false);
            onRefresh();
          }}
          onClose={() => setShowSign(false)}
        />
      )}

      {showRevoke && (
        <RevokeConsentModal
          patientId={patientId}
          consentId={consent.id}
          onRevoked={() => {
            setShowRevoke(false);
            onRefresh();
          }}
          onClose={() => setShowRevoke(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Prescription Modal                                             */
/* ------------------------------------------------------------------ */

const EMPTY_MED: Medication = {
  name: "",
  dose: "",
  frequency: "",
  duration: "",
  route: "Oral",
  instructions: "",
};

const ROUTE_OPTIONS = ["Oral", "Tópica", "Sublingual", "Inyectable"];

function AddPrescriptionModal({
  patientId,
  onSaved,
  onClose,
}: {
  patientId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [dentistId, setDentistId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<Medication[]>([
    { ...EMPTY_MED },
  ]);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Dentist[]>("/api/v1/dentists")
      .then((d) => {
        const list = Array.isArray(d) ? d : (d as any).dentists ?? [];
        setDentists(list);
        if (list.length > 0) setDentistId(list[0].id);
      })
      .catch(() => {});
    apiFetch<PrescriptionTemplate[]>("/api/v1/prescription-templates")
      .then((t) => setTemplates(Array.isArray(t) ? t : []))
      .catch(() => {});
  }, []);

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl && tpl.medications?.length) {
      setMedications(tpl.medications.map((m) => ({ ...m })));
    }
  }

  function updateMed(index: number, field: keyof Medication, value: string) {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  function addMed() {
    setMedications((prev) => [...prev, { ...EMPTY_MED }]);
  }

  function removeMed(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!dentistId || !diagnosis.trim()) return;
    const validMeds = medications.filter((m) => m.name.trim());
    if (validMeds.length === 0) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/prescriptions`, {
        method: "POST",
        body: JSON.stringify({
          dentistId,
          diagnosis: diagnosis.trim(),
          medications: validMeds,
          notes: notes.trim() || undefined,
          signature: signature || undefined,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Nueva receta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Plantilla (opcional)
              </label>
              <select
                onChange={(e) => applyTemplate(e.target.value)}
                defaultValue=""
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Seleccionar plantilla --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Dentist */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Profesional *
              </label>
              <select
                value={dentistId}
                onChange={(e) => setDentistId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Seleccionar...</option>
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr/a. {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Diagnosis */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Diagnóstico *
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Ej: Periodontitis crónica"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">
                Medicamentos *
              </label>
              <button
                type="button"
                onClick={addMed}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
              >
                <Plus className="w-3 h-3" />
                Agregar
              </button>
            </div>
            <div className="space-y-3">
              {medications.map((med, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">
                      Medicamento {i + 1}
                    </span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMed(i)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={med.name}
                      onChange={(e) => updateMed(i, "name", e.target.value)}
                      placeholder="Nombre"
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={med.dose}
                      onChange={(e) => updateMed(i, "dose", e.target.value)}
                      placeholder="Dosis (ej: 500mg)"
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={med.frequency}
                      onChange={(e) =>
                        updateMed(i, "frequency", e.target.value)
                      }
                      placeholder="Frecuencia (ej: c/8h)"
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={med.duration}
                      onChange={(e) => updateMed(i, "duration", e.target.value)}
                      placeholder="Duración (ej: 7 días)"
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={med.route}
                      onChange={(e) => updateMed(i, "route", e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {ROUTE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) =>
                        updateMed(i, "instructions", e.target.value)
                      }
                      placeholder="Indicaciones"
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notas</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Indicaciones adicionales, contraindicaciones..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Signature */}
          <SignatureCanvas
            label="Firma del profesional"
            onSignatureChange={setSignature}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !dentistId ||
              !diagnosis.trim() ||
              !medications.some((m) => m.name.trim())
            }
          >
            {saving ? "Guardando..." : "Guardar receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Consent Modal                                                  */
/* ------------------------------------------------------------------ */

function AddConsentModal({
  patientId,
  onSaved,
  onClose,
}: {
  patientId: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [templates, setTemplates] = useState<ConsentTemplate[]>([]);
  const [dentistId, setDentistId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<Dentist[]>("/api/v1/dentists")
      .then((d) => {
        const list = Array.isArray(d) ? d : (d as any).dentists ?? [];
        setDentists(list);
        if (list.length > 0) setDentistId(list[0].id);
      })
      .catch(() => {});
    apiFetch<ConsentTemplate[]>("/api/v1/consent-templates")
      .then((t) => setTemplates(Array.isArray(t) ? t : []))
      .catch(() => {});
  }, []);

  function applyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setTitle(tpl.title);
      setContent(tpl.content);
    }
  }

  async function handleSave() {
    if (!dentistId || !title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/consents`, {
        method: "POST",
        body: JSON.stringify({
          dentistId,
          title: title.trim(),
          content: content.trim(),
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Nuevo consentimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Plantilla (opcional)
              </label>
              <select
                onChange={(e) => applyTemplate(e.target.value)}
                defaultValue=""
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Seleccionar plantilla --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dentist */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Profesional *
            </label>
            <select
              value={dentistId}
              onChange={(e) => setDentistId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Seleccionar...</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr/a. {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Consentimiento para extracción dental"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Contenido *
            </label>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Texto del consentimiento informado..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving || !dentistId || !title.trim() || !content.trim()
            }
          >
            {saving ? "Guardando..." : "Guardar consentimiento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Sign Consent Modal                                                 */
/* ------------------------------------------------------------------ */

function SignConsentModal({
  patientId,
  consentId,
  onSigned,
  onClose,
}: {
  patientId: string;
  consentId: string;
  onSigned: () => void;
  onClose: () => void;
}) {
  const [patientSig, setPatientSig] = useState<string | null>(null);
  const [professionalSig, setProfessionalSig] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSign() {
    if (!patientSig || !professionalSig) return;
    setSaving(true);
    try {
      await apiFetch(
        `/api/v1/patients/${patientId}/consents/${consentId}/sign`,
        {
          method: "PATCH",
          body: JSON.stringify({
            patientSignature: patientSig,
            professionalSignature: professionalSig,
          }),
        }
      );
      onSigned();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="w-5 h-5 text-blue-600" />
            Firmar consentimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <SignatureCanvas
            label="Firma del paciente"
            onSignatureChange={setPatientSig}
          />
          <SignatureCanvas
            label="Firma del profesional"
            onSignatureChange={setProfessionalSig}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSign}
            disabled={saving || !patientSig || !professionalSig}
            className="gap-1.5"
          >
            <Check className="w-4 h-4" />
            {saving ? "Firmando..." : "Confirmar firma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Revoke Consent Modal                                               */
/* ------------------------------------------------------------------ */

function RevokeConsentModal({
  patientId,
  consentId,
  onRevoked,
  onClose,
}: {
  patientId: string;
  consentId: string;
  onRevoked: () => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleRevoke() {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await apiFetch(
        `/api/v1/patients/${patientId}/consents/${consentId}/revoke`,
        {
          method: "PATCH",
          body: JSON.stringify({ reason: reason.trim() }),
        }
      );
      onRevoked();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Revocar consentimiento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Esta acción no se puede deshacer. El consentimiento quedará marcado
            como revocado.
          </p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Motivo de revocación *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique el motivo de la revocación..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleRevoke}
            disabled={saving || !reason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving ? "Revocando..." : "Revocar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component: DocumentsTab                                       */
/* ------------------------------------------------------------------ */

type SubTab = "recetas" | "consentimientos";

export function DocumentsTab({ patientId }: { patientId: string }) {
  const [activeTab, setActiveTab] = useState<SubTab>("recetas");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loadingRx, setLoadingRx] = useState(true);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [showAddRx, setShowAddRx] = useState(false);
  const [showAddConsent, setShowAddConsent] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    setLoadingRx(true);
    try {
      const data = await apiFetch<any>(
        `/api/v1/patients/${patientId}/prescriptions`
      );
      setPrescriptions(
        Array.isArray(data) ? data : data.prescriptions ?? []
      );
    } catch {
      setPrescriptions([]);
    } finally {
      setLoadingRx(false);
    }
  }, [patientId]);

  const fetchConsents = useCallback(async () => {
    setLoadingConsent(true);
    try {
      const data = await apiFetch<any>(
        `/api/v1/patients/${patientId}/consents`
      );
      setConsents(Array.isArray(data) ? data : data.consents ?? []);
    } catch {
      setConsents([]);
    } finally {
      setLoadingConsent(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPrescriptions();
    fetchConsents();
  }, [fetchPrescriptions, fetchConsents]);

  const tabs: { key: SubTab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      key: "recetas",
      label: "Recetas",
      icon: <FileText className="w-4 h-4" />,
      count: prescriptions.length,
    },
    {
      key: "consentimientos",
      label: "Consentimientos",
      icon: <Shield className="w-4 h-4" />,
      count: consents.length,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tab selector */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
              <span
                className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {activeTab === "recetas" ? (
          <Button size="sm" onClick={() => setShowAddRx(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nueva receta
          </Button>
        ) : (
          <Button size="sm" onClick={() => setShowAddConsent(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Nuevo consentimiento
          </Button>
        )}
      </div>

      {/* Recetas sub-tab */}
      {activeTab === "recetas" && (
        <div>
          {loadingRx ? (
            <div className="bg-white rounded-xl border px-5 py-10 text-center text-gray-400 text-sm">
              Cargando recetas...
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="bg-white rounded-xl border px-5 py-10 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No hay recetas registradas.
              </p>
              <p className="text-gray-300 text-xs mt-1">
                Creá una nueva receta para este paciente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <PrescriptionCard
                  key={rx.id}
                  rx={rx}
                  patientId={patientId}
                  onDelete={fetchPrescriptions}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consentimientos sub-tab */}
      {activeTab === "consentimientos" && (
        <div>
          {loadingConsent ? (
            <div className="bg-white rounded-xl border px-5 py-10 text-center text-gray-400 text-sm">
              Cargando consentimientos...
            </div>
          ) : consents.length === 0 ? (
            <div className="bg-white rounded-xl border px-5 py-10 text-center">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                No hay consentimientos registrados.
              </p>
              <p className="text-gray-300 text-xs mt-1">
                Creá un nuevo consentimiento informado.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {consents.map((c) => (
                <ConsentCard
                  key={c.id}
                  consent={c}
                  patientId={patientId}
                  onRefresh={fetchConsents}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddRx && (
        <AddPrescriptionModal
          patientId={patientId}
          onSaved={fetchPrescriptions}
          onClose={() => setShowAddRx(false)}
        />
      )}
      {showAddConsent && (
        <AddConsentModal
          patientId={patientId}
          onSaved={fetchConsents}
          onClose={() => setShowAddConsent(false)}
        />
      )}
    </div>
  );
}
