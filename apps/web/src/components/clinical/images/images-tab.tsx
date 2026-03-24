"use client";

import { useState, useEffect, useCallback, useRef, DragEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Image as ImageIcon,
  Camera,
  FileText,
  Trash2,
  ZoomIn,
  RotateCw,
  X,
  Loader2,
  CheckSquare,
  Square,
  Columns2,
  FolderOpen,
  Film,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ImageCategory = "RADIOGRAPHY" | "INTRAORAL" | "EXTRAORAL" | "DOCUMENT" | "OTHER";

interface PatientImage {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: ImageCategory;
  description: string | null;
  toothNumbers: number[];
  uploadedBy: string | null;
  createdAt: string;
}

interface PatientImageFull extends PatientImage {
  imageData: string; // base64
}

interface FilterTab {
  label: string;
  value: ImageCategory | "all";
}

const CATEGORY_TABS: FilterTab[] = [
  { label: "Todos", value: "all" },
  { label: "Radiografias", value: "RADIOGRAPHY" },
  { label: "Fotos Intraorales", value: "INTRAORAL" },
  { label: "Fotos Extraorales", value: "EXTRAORAL" },
  { label: "Documentos", value: "DOCUMENT" },
  { label: "Otros", value: "OTHER" },
];

const CATEGORY_LABELS: Record<ImageCategory, string> = {
  RADIOGRAPHY: "Radiografia",
  INTRAORAL: "Intraoral",
  EXTRAORAL: "Extraoral",
  DOCUMENT: "Documento",
  OTHER: "Otro",
};

const CATEGORY_COLORS: Record<ImageCategory, string> = {
  RADIOGRAPHY: "bg-blue-100 text-blue-700",
  INTRAORAL: "bg-emerald-100 text-emerald-700",
  EXTRAORAL: "bg-purple-100 text-purple-700",
  DOCUMENT: "bg-amber-100 text-amber-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function categoryIcon(cat: ImageCategory) {
  switch (cat) {
    case "RADIOGRAPHY":
      return <Film className="w-4 h-4" />;
    case "INTRAORAL":
      return <Camera className="w-4 h-4" />;
    case "EXTRAORAL":
      return <ImageIcon className="w-4 h-4" />;
    case "DOCUMENT":
      return <FileText className="w-4 h-4" />;
    default:
      return <FolderOpen className="w-4 h-4" />;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ImagesTab({ patientId }: { patientId: string }) {
  /* ---- state ---- */
  const [images, setImages] = useState<PatientImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ImageCategory | "all">("all");

  // upload
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [uploadCategory, setUploadCategory] = useState<ImageCategory>("RADIOGRAPHY");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // viewer
  const [viewerImage, setViewerImage] = useState<PatientImageFull | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // compare
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [compareImages, setCompareImages] = useState<PatientImageFull[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);

  /* ---- data fetch ---- */
  const fetchImages = useCallback(async () => {
    try {
      const data = await apiFetch<{ images: PatientImage[] }>(
        `/api/v1/patients/${patientId}/images`
      );
      setImages(data.images ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  /* ---- filtered ---- */
  const filtered = activeTab === "all" ? images : images.filter((i) => i.category === activeTab);

  /* ---- upload handlers ---- */
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
  }
  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await prepareFile(file);
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) prepareFile(file);
    e.target.value = "";
  }
  async function prepareFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      alert("Formato no soportado. Usa JPG, PNG o PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo supera el limite de 10 MB.");
      return;
    }
    const base64 = await fileToBase64(file);
    setUploadFile({ name: file.name, base64, type: file.type });
    setUploadCategory("RADIOGRAPHY");
    setUploadDescription("");
  }

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    try {
      await apiFetch(`/api/v1/patients/${patientId}/images`, {
        method: "POST",
        body: JSON.stringify({
          fileName: uploadFile.name,
          fileType: uploadFile.type,
          imageData: uploadFile.base64,
          category: uploadCategory,
          description: uploadDescription || null,
        }),
      });
      setUploadFile(null);
      setUploadDescription("");
      await fetchImages();
    } catch {
      alert("Error al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  /* ---- viewer ---- */
  async function openViewer(img: PatientImage) {
    setViewerLoading(true);
    setZoom(1);
    setRotation(0);
    try {
      const full = await apiFetch<PatientImageFull>(
        `/api/v1/patients/${patientId}/images/${img.id}`
      );
      setViewerImage(full);
    } catch {
      alert("Error al cargar la imagen.");
    } finally {
      setViewerLoading(false);
    }
  }

  function closeViewer() {
    setViewerImage(null);
    setZoom(1);
    setRotation(0);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta imagen permanentemente?")) return;
    try {
      await apiFetch(`/api/v1/patients/${patientId}/images/${id}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      closeViewer();
      await fetchImages();
    } catch {
      alert("Error al eliminar.");
    }
  }

  /* ---- compare ---- */
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 2) return prev;
        next.add(id);
      }
      return next;
    });
  }

  async function openCompare() {
    const ids = Array.from(selectedIds);
    if (ids.length !== 2) return;
    setCompareLoading(true);
    setCompareOpen(true);
    try {
      const [a, b] = await Promise.all(
        ids.map((id) =>
          apiFetch<PatientImageFull>(`/api/v1/patients/${patientId}/images/${id}`)
        )
      );
      setCompareImages([a, b]);
    } catch {
      alert("Error al cargar imagenes para comparar.");
      setCompareOpen(false);
    } finally {
      setCompareLoading(false);
    }
  }

  function closeCompare() {
    setCompareOpen(false);
    setCompareImages([]);
    setCompareMode(false);
    setSelectedIds(new Set());
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* ---------- Upload area ---------- */}
      {uploadFile ? (
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Subir archivo</h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <FileText className="w-5 h-5 text-blue-500 shrink-0" />
            <span className="truncate">{uploadFile.name}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as ImageCategory)}
              >
                {(Object.keys(CATEGORY_LABELS) as ImageCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Descripcion (opcional)</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Panoramica inicial"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setUploadFile(null)} disabled={uploading}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" /> Subir
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`bg-white rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 font-medium">
            Arrastra archivos aqui o <span className="text-blue-600 underline">selecciona</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG o PDF (max 10 MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* ---------- Category filter + compare toggle ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === t.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {compareMode && selectedIds.size === 2 && (
            <Button size="sm" onClick={openCompare}>
              <Columns2 className="w-4 h-4 mr-1" /> Comparar
            </Button>
          )}
          <Button
            size="sm"
            variant={compareMode ? "default" : "outline"}
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedIds(new Set());
            }}
          >
            {compareMode ? "Cancelar seleccion" : "Comparar"}
          </Button>
        </div>
      </div>

      {/* ---------- Gallery grid ---------- */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        /* empty state */
        <div className="bg-white rounded-xl border p-12 text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay imagenes</p>
          <p className="text-sm text-gray-400 mt-1">
            Arrastra archivos aqui o usa el boton de carga
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((img) => {
            const isSelected = selectedIds.has(img.id);
            const isPdf = img.fileType === "application/pdf";

            return (
              <div
                key={img.id}
                onClick={() => (compareMode ? toggleSelect(img.id) : openViewer(img))}
                className={`bg-white rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-md group relative ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {/* compare checkbox */}
                {compareMode && (
                  <div className="absolute top-2 left-2 z-10">
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                )}

                {/* thumbnail area */}
                <div className="h-36 bg-gray-50 flex items-center justify-center">
                  {isPdf ? (
                    <FileText className="w-12 h-12 text-red-400" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      {categoryIcon(img.category)}
                      <span className="ml-2 text-xs text-gray-400 uppercase">{img.fileType.split("/")[1]}</span>
                    </div>
                  )}
                </div>

                {/* info */}
                <div className="p-3 space-y-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{img.fileName}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[img.category]}`}
                    >
                      {CATEGORY_LABELS[img.category]}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatSize(img.fileSize)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">{formatDate(img.createdAt)}</p>
                  {img.description && (
                    <p className="text-xs text-gray-500 truncate">{img.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Image Viewer Modal ---------- */}
      {(viewerImage || viewerLoading) && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {viewerImage?.fileName ?? "Cargando..."}
                </p>
                {viewerImage && (
                  <p className="text-xs text-gray-400">
                    {CATEGORY_LABELS[viewerImage.category]} &middot; {formatSize(viewerImage.fileSize)} &middot;{" "}
                    {formatDate(viewerImage.createdAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {viewerImage && viewerImage.fileType !== "application/pdf" && (
                  <>
                    <button
                      onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      title="Zoom"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                      title="Rotar"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </>
                )}
                {viewerImage && (
                  <button
                    onClick={() => handleDelete(viewerImage.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={closeViewer}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* body */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4">
              {viewerLoading && !viewerImage ? (
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              ) : viewerImage?.fileType === "application/pdf" ? (
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto text-red-400 mb-3" />
                  <p className="text-sm text-gray-500">{viewerImage.fileName}</p>
                  <p className="text-xs text-gray-400 mt-1">Vista previa no disponible para PDF</p>
                </div>
              ) : viewerImage ? (
                <img
                  src={viewerImage.imageData}
                  alt={viewerImage.fileName}
                  className="max-w-full max-h-[65vh] object-contain transition-transform duration-200 cursor-pointer"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                  onClick={() => setZoom((z) => (z === 1 ? 2 : 1))}
                />
              ) : null}
            </div>

            {/* footer / description */}
            {viewerImage?.description && (
              <div className="px-5 py-3 border-t bg-white">
                <p className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Descripcion:</span> {viewerImage.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- Compare Modal ---------- */}
      {compareOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="text-sm font-semibold text-gray-800">Comparar imagenes</p>
              <button
                onClick={closeCompare}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-auto">
              {compareLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row">
                  {compareImages.map((img) => (
                    <div key={img.id} className="flex-1 p-4 flex flex-col items-center gap-2 border-b sm:border-b-0 sm:border-r last:border-r-0 last:border-b-0">
                      {img.fileType === "application/pdf" ? (
                        <div className="h-64 flex items-center justify-center">
                          <FileText className="w-16 h-16 text-red-400" />
                        </div>
                      ) : (
                        <img
                          src={img.imageData}
                          alt={img.fileName}
                          className="max-h-[60vh] object-contain"
                        />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{img.fileName}</p>
                        <p className="text-xs text-gray-400">
                          {CATEGORY_LABELS[img.category]} &middot; {formatDate(img.createdAt)}
                        </p>
                        {img.description && (
                          <p className="text-xs text-gray-500 mt-1">{img.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
