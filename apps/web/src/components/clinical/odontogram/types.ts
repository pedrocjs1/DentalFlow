export type ToothCondition =
  | "HEALTHY"
  | "CARIES"
  | "RESTORATION_AMALGAM"
  | "RESTORATION_RESIN"
  | "RESTORATION_IONOMER"
  | "CROWN"
  | "ENDODONTICS"
  | "EXTRACTION"
  | "IMPLANT"
  | "PROSTHESIS"
  | "FRACTURE"
  | "SEALANT"
  | "ABSENT";

export type ToothSurface = "OCCLUSAL" | "MESIAL" | "DISTAL" | "VESTIBULAR" | "LINGUAL";
export type OdontogramStatus = "EXISTING" | "PLANNED";

export interface OdontogramFinding {
  id: string;
  toothFdi: number;
  surface: ToothSurface | null;
  condition: ToothCondition;
  status: OdontogramStatus;
  notes: string | null;
  createdAt: string;
}

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  HEALTHY: "#F9FAFB",
  CARIES: "#EF4444",
  RESTORATION_AMALGAM: "#6B7280",
  RESTORATION_RESIN: "#3B82F6",
  RESTORATION_IONOMER: "#06B6D4",
  CROWN: "#EAB308",
  ENDODONTICS: "#DC2626",
  EXTRACTION: "#1F2937",
  IMPLANT: "#8B5CF6",
  PROSTHESIS: "#1D4ED8",
  FRACTURE: "#F97316",
  SEALANT: "#86EFAC",
  ABSENT: "#9CA3AF",
};

export const CONDITION_LABELS: Record<ToothCondition, string> = {
  HEALTHY: "Sano",
  CARIES: "Caries",
  RESTORATION_AMALGAM: "Obturación Amalgama",
  RESTORATION_RESIN: "Obturación Resina",
  RESTORATION_IONOMER: "Obturación Ionómero",
  CROWN: "Corona",
  ENDODONTICS: "Endodoncia",
  EXTRACTION: "Extracción",
  IMPLANT: "Implante",
  PROSTHESIS: "Prótesis",
  FRACTURE: "Fractura",
  SEALANT: "Sellante",
  ABSENT: "Ausente",
};

// FDI arch layout
export const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
export const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_LEFT = [38, 37, 36, 35, 34, 33, 32, 31];
export const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];

// Whole-tooth conditions (no surface applies)
export const WHOLE_TOOTH_CONDITIONS: ToothCondition[] = [
  "CROWN", "ENDODONTICS", "EXTRACTION", "IMPLANT", "PROSTHESIS", "ABSENT",
];

// Surface conditions (specific surface)
export const SURFACE_CONDITIONS: ToothCondition[] = [
  "CARIES", "RESTORATION_AMALGAM", "RESTORATION_RESIN", "RESTORATION_IONOMER", "SEALANT", "FRACTURE",
];
