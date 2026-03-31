"use client";

import {
  type OdontogramFinding,
  type ToothSurface,
  CONDITION_COLORS,
  CONDITION_LABELS,
  WHOLE_TOOTH_CONDITIONS,
} from "./types";

type ToothType = "molar" | "premolar" | "canine" | "incisor";

interface Props {
  fdi: number;
  findings: OdontogramFinding[];
  onZoneClick: (fdi: number, surface: ToothSurface) => void;
}

function getToothType(fdi: number): ToothType {
  const pos = fdi % 10;
  if (pos >= 6) return "molar";
  if (pos >= 4) return "premolar";
  if (pos === 3) return "canine";
  return "incisor";
}

// ─── Occlusal shapes & zone paths ────────────────────────────────────────────
// Molar: rounded square | Premolar: horizontal oval | Canine: diamond | Incisor: vertical oval

interface ZonePaths {
  VESTIBULAR: string;
  LINGUAL: string;
  MESIAL: string;
  DISTAL: string;
  OCCLUSAL: string;
  outline: string;
}

function getMolarZones(W: number, H: number): ZonePaths {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.3, iy = H * 0.3; // inner offsets
  const r = 4;
  return {
    outline: `M ${r},0 L ${W - r},0 Q ${W},0 ${W},${r} L ${W},${H - r} Q ${W},${H} ${W - r},${H} L ${r},${H} Q 0,${H} 0,${H - r} L 0,${r} Q 0,0 ${r},0 Z`,
    VESTIBULAR: `M 0,0 L ${W},0 L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} Z`,
    LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    MESIAL:     `M 0,0 L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 0,${H} Z`,
    DISTAL:     `M ${W},0 L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W},${H} Z`,
    OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
  };
}

function getPremolarZones(W: number, H: number): ZonePaths {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.26, iy = H * 0.26;
  return {
    outline: `M ${cx},0 C ${W * 0.8},0 ${W},${H * 0.2} ${W},${cy} C ${W},${H * 0.8} ${W * 0.8},${H} ${cx},${H} C ${W * 0.2},${H} 0,${H * 0.8} 0,${cy} C 0,${H * 0.2} ${W * 0.2},0 ${cx},0 Z`,
    VESTIBULAR: `M ${cx},0 C ${W * 0.8},0 ${W},${H * 0.2} ${W},${cy} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L 0,${cy} C 0,${H * 0.2} ${W * 0.2},0 ${cx},0 Z`,
    LINGUAL:    `M ${cx},${H} C ${W * 0.8},${H} ${W},${H * 0.8} ${W},${cy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} L 0,${cy} C 0,${H * 0.8} ${W * 0.2},${H} ${cx},${H} Z`,
    MESIAL:     `M ${cx},0 C ${W * 0.2},0 0,${H * 0.2} 0,${cy} L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 0,${cy} C 0,${H * 0.8} ${W * 0.2},${H} ${cx},${H} L ${cx - ix},${cy + iy} L ${cx - ix},${cy - iy} Z`,
    DISTAL:     `M ${cx},0 C ${W * 0.8},0 ${W},${H * 0.2} ${W},${cy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W},${cy} C ${W},${H * 0.8} ${W * 0.8},${H} ${cx},${H} L ${cx + ix},${cy + iy} L ${cx + ix},${cy - iy} Z`,
    OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
  };
}

function getCanineZones(W: number, H: number): ZonePaths {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.22, iy = H * 0.22;
  // Diamond shape
  return {
    outline: `M ${cx},1 L ${W - 1},${cy} L ${cx},${H - 1} L 1,${cy} Z`,
    VESTIBULAR: `M ${cx},1 L ${W - 1},${cy} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L 1,${cy} Z`,
    LINGUAL:    `M ${cx},${H - 1} L ${W - 1},${cy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} L 1,${cy} Z`,
    MESIAL:     `M ${cx},1 L 1,${cy} L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 1,${cy} L ${cx},${H - 1} L ${cx - ix},${cy + iy} L ${cx - ix},${cy - iy} Z`,
    DISTAL:     `M ${cx},1 L ${W - 1},${cy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W - 1},${cy} L ${cx},${H - 1} L ${cx + ix},${cy + iy} L ${cx + ix},${cy - iy} Z`,
    OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
  };
}

function getIncisorZones(W: number, H: number): ZonePaths {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.22, iy = H * 0.20;
  // Vertical oval
  return {
    outline: `M ${cx},1 C ${W * 0.85},1 ${W - 1},${H * 0.25} ${W - 1},${cy} C ${W - 1},${H * 0.75} ${W * 0.85},${H - 1} ${cx},${H - 1} C ${W * 0.15},${H - 1} 1,${H * 0.75} 1,${cy} C 1,${H * 0.25} ${W * 0.15},1 ${cx},1 Z`,
    VESTIBULAR: `M ${cx},1 C ${W * 0.85},1 ${W - 1},${H * 0.25} ${W - 1},${cy} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L 1,${cy} C 1,${H * 0.25} ${W * 0.15},1 ${cx},1 Z`,
    LINGUAL:    `M ${cx},${H - 1} C ${W * 0.85},${H - 1} ${W - 1},${H * 0.75} ${W - 1},${cy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} L 1,${cy} C 1,${H * 0.75} ${W * 0.15},${H - 1} ${cx},${H - 1} Z`,
    MESIAL:     `M ${cx},1 C ${W * 0.15},1 1,${H * 0.25} 1,${cy} L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 1,${cy} C 1,${H * 0.75} ${W * 0.15},${H - 1} ${cx},${H - 1} L ${cx - ix},${cy + iy} L ${cx - ix},${cy - iy} Z`,
    DISTAL:     `M ${cx},1 C ${W * 0.85},1 ${W - 1},${H * 0.25} ${W - 1},${cy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W - 1},${cy} C ${W - 1},${H * 0.75} ${W * 0.85},${H - 1} ${cx},${H - 1} L ${cx + ix},${cy + iy} L ${cx + ix},${cy - iy} Z`,
    OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDimensions(type: ToothType): { w: number; h: number } {
  switch (type) {
    case "molar":    return { w: 36, h: 36 };
    case "premolar": return { w: 30, h: 28 };
    case "canine":   return { w: 26, h: 26 };
    case "incisor":  return { w: 24, h: 28 };
  }
}

function getZones(type: ToothType, W: number, H: number): ZonePaths {
  switch (type) {
    case "molar":    return getMolarZones(W, H);
    case "premolar": return getPremolarZones(W, H);
    case "canine":   return getCanineZones(W, H);
    case "incisor":  return getIncisorZones(W, H);
  }
}

function getSurfaceColor(surface: ToothSurface, findings: OdontogramFinding[]): string {
  const wholeFinding = findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
  if (wholeFinding) return CONDITION_COLORS[wholeFinding.condition];
  const surfFinding = findings.find((f) => f.surface === surface);
  if (surfFinding) return CONDITION_COLORS[surfFinding.condition];
  return "#FFFFFF";
}

function getSurfaceTooltip(surface: ToothSurface, findings: OdontogramFinding[]): string | undefined {
  const wholeFinding = findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
  if (wholeFinding) return CONDITION_LABELS[wholeFinding.condition];
  const surfFinding = findings.find((f) => f.surface === surface);
  if (surfFinding) return CONDITION_LABELS[surfFinding.condition];
  return undefined;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SURFACES: ToothSurface[] = ["VESTIBULAR", "LINGUAL", "MESIAL", "DISTAL", "OCCLUSAL"];

export function ToothOcclusalSVG({ fdi, findings, onZoneClick }: Props) {
  const type = getToothType(fdi);
  const { w: W, h: H } = getDimensions(type);
  const zones = getZones(type, W, H);
  const isAbsent = findings.some((f) => f.condition === "ABSENT" && f.surface === null);
  const isPlanned = findings.some((f) => f.status === "PLANNED");
  const wholeFinding = findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="cursor-pointer"
      style={{ opacity: isAbsent ? 0.25 : 1 }}
    >
      {/* Clip to outline shape */}
      <defs>
        <clipPath id={`oc-${fdi}`}>
          <path d={zones.outline} />
        </clipPath>
      </defs>

      {/* Background */}
      <path d={zones.outline} fill="#FFFFFF" />

      {wholeFinding && (wholeFinding.condition === "EXTRACTION" || wholeFinding.condition === "ABSENT") ? (
        /* Show X over oclusal for extraction/absent */
        <g clipPath={`url(#oc-${fdi})`}>
          <path d={zones.outline} fill={CONDITION_COLORS[wholeFinding.condition]} opacity={0.3} />
          <line x1={2} y1={2} x2={W - 2} y2={H - 2} stroke="white" strokeWidth={2} strokeLinecap="round" />
          <line x1={W - 2} y1={2} x2={2} y2={H - 2} stroke="white" strokeWidth={2} strokeLinecap="round" />
        </g>
      ) : (
        /* Surface zones */
        <g clipPath={`url(#oc-${fdi})`}>
          {SURFACES.map((surface) => (
            <path
              key={surface}
              d={zones[surface]}
              fill={getSurfaceColor(surface, findings)}
              className="transition-[fill] duration-200 hover:brightness-90 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onZoneClick(fdi, surface); }}
            >
              <title>{getSurfaceTooltip(surface, findings) ?? surface.toLowerCase()}</title>
            </path>
          ))}
          {/* Division lines */}
          {SURFACES.map((surface) => (
            <path
              key={`s-${surface}`}
              d={zones[surface]}
              fill="none"
              stroke="#C4B5A0"
              strokeWidth={0.8}
              pointerEvents="none"
            />
          ))}
        </g>
      )}

      {/* Outline */}
      <path
        d={zones.outline}
        fill="none"
        stroke={isPlanned ? "#3B82F6" : "#8B7355"}
        strokeWidth={isPlanned ? 1.5 : 1.2}
        strokeDasharray={isPlanned ? "3 2" : undefined}
        pointerEvents="none"
      />
    </svg>
  );
}
