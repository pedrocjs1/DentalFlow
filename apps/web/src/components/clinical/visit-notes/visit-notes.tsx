"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";

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
  createdAt: string;
}

interface Props {
  patientId: string;
  initialNotes: VisitNote[];
  initialTotal: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function NoteCard({ note, patientId, onDelete }: { note: VisitNote; patientId: string; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [viewImg, setViewImg] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("¿Eliminar esta nota?")) return;
    setDeleting(true);
    await apiFetch(`/api/v1/patients/${patientId}/visit-notes/${note.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <div className="border rounded-xl p-4 space-y-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 capitalize">{formatDate(note.visitDate)}</p>
          {note.procedureName && (
            <p className="text-xs text-primary-600 font-medium mt-0.5">{note.procedureName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {note.toothNumbers.length > 0 && (
            <div className="flex gap-1">
              {note.toothNumbers.map((t) => (
                <span key={t} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-50 text-primary-700 text-xs font-bold">
                  {t}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-gray-300 hover:text-red-500 transition-colors"
          >
            {deleting ? "..." : "✕"}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>

      {note.materials && (
        <p className="text-xs text-gray-500">
          <span className="font-medium">Materiales:</span> {note.materials}
        </p>
      )}

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
  );
}

function AddNoteModal({ patientId, onSaved, onClose }: { patientId: string; onSaved: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().split("T")[0],
    toothNumbers: "",
    procedureName: "",
    materials: "",
    content: "",
    nextStep: "",
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
          attachments,
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
          <DialogTitle>Nueva nota de evolución</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Fecha de visita</label>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((p) => ({ ...p, visitDate: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Piezas tratadas (ej: 16,17)</label>
              <input
                type="text"
                value={form.toothNumbers}
                onChange={(e) => setForm((p) => ({ ...p, toothNumbers: e.target.value }))}
                placeholder="16, 17, 18"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Procedimiento</label>
              <input
                type="text"
                value={form.procedureName}
                onChange={(e) => setForm((p) => ({ ...p, procedureName: e.target.value }))}
                placeholder="Endodoncia, restauración..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Materiales usados</label>
              <input
                type="text"
                value={form.materials}
                onChange={(e) => setForm((p) => ({ ...p, materials: e.target.value }))}
                placeholder="Resina Z350, ionomero..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Evolución / Observaciones *</label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Descripción del procedimiento realizado, estado del paciente, observaciones clínicas..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Próximo paso / Indicaciones</label>
            <input
              type="text"
              value={form.nextStep}
              onChange={(e) => setForm((p) => ({ ...p, nextStep: e.target.value }))}
              placeholder="Control en 2 semanas, citar para corona..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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

export function VisitNotes({ patientId, initialNotes, initialTotal }: Props) {
  const [notes, setNotes] = useState<VisitNote[]>(initialNotes);
  const [total, setTotal] = useState(initialTotal);
  const [showAdd, setShowAdd] = useState(false);

  async function refresh() {
    const data = await apiFetch<{ notes: VisitNote[]; total: number }>(
      `/api/v1/patients/${patientId}/visit-notes`
    );
    setNotes(data.notes);
    setTotal(data.total);
  }

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

      {notes.length === 0 ? (
        <div className="bg-white rounded-xl border px-5 py-10 text-center text-gray-400 text-sm">
          No hay notas de evolución registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} patientId={patientId} onDelete={refresh} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddNoteModal
          patientId={patientId}
          onSaved={refresh}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
