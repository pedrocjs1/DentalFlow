"use client";

import { useState } from "react";
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

// ─── Dimensions (30% bigger) ─────────────────────────────────────────────────

function getDimensions(type: ToothType): { w: number; h: number } {
  switch (type) {
    case "molar":    return { w: 46, h: 46 };
    case "premolar": return { w: 40, h: 38 };
    case "canine":   return { w: 34, h: 34 };
    case "incisor":  return { w: 32, h: 36 };
  }
}

// ─── Zone paths + explicit inner cross lines ─────────────────────────────────
// Anatomically shaped outlines with clear internal fissure cross pattern.
// Each tooth type has a distinct occlusal morphology.

interface ZoneData {
  outline: string;
  zones: Record<ToothSurface, string>;
  crossLines: string[]; // explicit lines for the inner cross — ALWAYS visible
}

function getMolarZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  // Inner rectangle for fissure pattern — slightly larger for visibility
  const ix = W * 0.28, iy = H * 0.28;
  // Anatomical: rounded trapezoid, wider on buccal (top), slightly narrower on lingual
  const r = 6;
  const bw = W * 0.04; // buccal extra width
  const outline = `M ${r + bw},0
    L ${W - r - bw},0
    Q ${W - bw},0 ${W - bw},${r}
    L ${W},${H * 0.15}
    L ${W},${H - r}
    Q ${W},${H} ${W - r},${H}
    L ${r},${H}
    Q 0,${H} 0,${H - r}
    L 0,${H * 0.15}
    L ${bw},${r}
    Q ${bw},0 ${r + bw},0 Z`;
  return {
    outline,
    zones: {
      VESTIBULAR: `M 0,0 L ${W},0 L ${W},${H * 0.15} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L 0,${H * 0.15} Z`,
      LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      MESIAL:     `M 0,0 L 0,${H} L ${cx - ix},${cy + iy} L ${cx - ix},${cy - iy} L 0,${H * 0.15} Z`,
      DISTAL:     `M ${W},0 L ${W},${H} L ${cx + ix},${cy + iy} L ${cx + ix},${cy - iy} L ${W},${H * 0.15} Z`,
      OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle (central fossa)
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Diagonal fissures from corners to inner rectangle
      `M 0,0 L ${cx - ix},${cy - iy}`,
      `M ${W},0 L ${cx + ix},${cy - iy}`,
      `M ${W},${H} L ${cx + ix},${cy + iy}`,
      `M 0,${H} L ${cx - ix},${cy + iy}`,
    ],
  };
}

function getPremolarZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.24, iy = H * 0.24;
  // Anatomical: oval shape, slightly wider buccolingually
  const outline = `M ${cx},1
    C ${W * 0.78},1 ${W - 1},${H * 0.18} ${W - 1},${cy}
    C ${W - 1},${H * 0.82} ${W * 0.78},${H - 1} ${cx},${H - 1}
    C ${W * 0.22},${H - 1} 1,${H * 0.82} 1,${cy}
    C 1,${H * 0.18} ${W * 0.22},1 ${cx},1 Z`;
  return {
    outline,
    zones: {
      VESTIBULAR: `M ${cx},1 C ${W * 0.78},1 ${W - 1},${H * 0.18} ${W - 1},${cy}
        L ${cx + ix},${cy} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L ${cx - ix},${cy}
        L 1,${cy} C 1,${H * 0.18} ${W * 0.22},1 ${cx},1 Z`,
      LINGUAL: `M ${cx},${H - 1} C ${W * 0.78},${H - 1} ${W - 1},${H * 0.82} ${W - 1},${cy}
        L ${cx + ix},${cy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} L ${cx - ix},${cy}
        L 1,${cy} C 1,${H * 0.82} ${W * 0.22},${H - 1} ${cx},${H - 1} Z`,
      MESIAL: `M 1,${cy} C 1,${H * 0.18} ${W * 0.22},1 ${cx},1
        L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy}
        L ${cx},${H - 1} C ${W * 0.22},${H - 1} 1,${H * 0.82} 1,${cy} Z`,
      DISTAL: `M ${W - 1},${cy} C ${W - 1},${H * 0.18} ${W * 0.78},1 ${cx},1
        L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy}
        L ${cx},${H - 1} C ${W * 0.78},${H - 1} ${W - 1},${H * 0.82} ${W - 1},${cy} Z`,
      OCCLUSAL: `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Lines from inner rect to outline
      `M ${cx - ix},${cy - iy} L ${cx},1`, `M ${cx + ix},${cy - iy} L ${cx},1`,
      `M ${cx - ix},${cy + iy} L ${cx},${H - 1}`, `M ${cx + ix},${cy + iy} L ${cx},${H - 1}`,
      `M ${cx - ix},${cy} L 1,${cy}`, `M ${cx + ix},${cy} L ${W - 1},${cy}`,
    ],
  };
}

function getCanineZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.22, iy = H * 0.22;
  // Anatomical: pointed oval — buccal tip at top, lingual cingulum rounded at bottom
  const outline = `M ${cx},2
    C ${W * 0.72},2 ${W - 1},${H * 0.25} ${W - 1},${cy}
    C ${W - 1},${H * 0.75} ${W * 0.72},${H - 2} ${cx},${H - 2}
    C ${W * 0.28},${H - 2} 1,${H * 0.75} 1,${cy}
    C 1,${H * 0.25} ${W * 0.28},2 ${cx},2 Z`;
  return {
    outline,
    zones: {
      VESTIBULAR: `M ${cx},2 C ${W * 0.72},2 ${W - 1},${H * 0.25} ${W - 1},${cy}
        L ${cx + ix},${cy} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L ${cx - ix},${cy}
        L 1,${cy} C 1,${H * 0.25} ${W * 0.28},2 ${cx},2 Z`,
      LINGUAL: `M ${cx},${H - 2} C ${W * 0.72},${H - 2} ${W - 1},${H * 0.75} ${W - 1},${cy}
        L ${cx + ix},${cy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} L ${cx - ix},${cy}
        L 1,${cy} C 1,${H * 0.75} ${W * 0.28},${H - 2} ${cx},${H - 2} Z`,
      MESIAL: `M 1,${cy} C 1,${H * 0.25} ${W * 0.28},2 ${cx},2
        L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy}
        L ${cx},${H - 2} C ${W * 0.28},${H - 2} 1,${H * 0.75} 1,${cy} Z`,
      DISTAL: `M ${W - 1},${cy} C ${W - 1},${H * 0.25} ${W * 0.72},2 ${cx},2
        L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy}
        L ${cx},${H - 2} C ${W * 0.72},${H - 2} ${W - 1},${H * 0.75} ${W - 1},${cy} Z`,
      OCCLUSAL: `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Lines from inner rect to outline
      `M ${cx},${cy - iy} L ${cx},2`, `M ${cx},${cy + iy} L ${cx},${H - 2}`,
      `M ${cx - ix},${cy} L 1,${cy}`, `M ${cx + ix},${cy} L ${W - 1},${cy}`,
    ],
  };
}

function getIncisorZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.22, iy = H * 0.20;
  // Anatomical: elongated oval, wider mesiodistally, narrower labiolingually
  // Slight cingulum bulge on lingual (bottom)
  const outline = `M ${cx},1
    C ${W * 0.82},1 ${W - 1},${H * 0.22} ${W - 1},${cy}
    C ${W - 1},${H * 0.78} ${W * 0.82},${H - 1} ${cx},${H - 1}
    C ${W * 0.18},${H - 1} 1,${H * 0.78} 1,${cy}
    C 1,${H * 0.22} ${W * 0.18},1 ${cx},1 Z`;
  return {
    outline,
    zones: {
      VESTIBULAR: `M ${cx},1 C ${W * 0.82},1 ${W - 1},${H * 0.22} ${W - 1},${cy}
        L ${cx + ix},${cy} L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} L ${cx - ix},${cy}
        L 1,${cy} C 1,${H * 0.22} ${W * 0.18},1 ${cx},1 Z`,
      LINGUAL: `M ${cx},${H - 1} C ${W * 0.82},${H - 1} ${W - 1},${H * 0.78} ${W - 1},${cy}
        L ${cx + ix},${cy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} L ${cx - ix},${cy}
        L 1,${cy} C 1,${H * 0.78} ${W * 0.18},${H - 1} ${cx},${H - 1} Z`,
      MESIAL: `M 1,${cy} C 1,${H * 0.22} ${W * 0.18},1 ${cx},1
        L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy}
        L ${cx},${H - 1} C ${W * 0.18},${H - 1} 1,${H * 0.78} 1,${cy} Z`,
      DISTAL: `M ${W - 1},${cy} C ${W - 1},${H * 0.22} ${W * 0.82},1 ${cx},1
        L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy}
        L ${cx},${H - 1} C ${W * 0.82},${H - 1} ${W - 1},${H * 0.78} ${W - 1},${cy} Z`,
      OCCLUSAL: `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Lines from inner rect to outline — clean cross pattern
      `M ${cx - ix},${cy} L 1,${cy}`, `M ${cx + ix},${cy} L ${W - 1},${cy}`,
      `M ${cx},${cy - iy} L ${cx},1`, `M ${cx},${cy + iy} L ${cx},${H - 1}`,
    ],
  };
}

function getZoneData(type: ToothType, W: number, H: number): ZoneData {
  switch (type) {
    case "molar":    return getMolarZones(W, H);
    case "premolar": return getPremolarZones(W, H);
    case "canine":   return getCanineZones(W, H);
    case "incisor":  return getIncisorZones(W, H);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function hasFinding(surface: ToothSurface, findings: OdontogramFinding[]): boolean {
  return findings.some((f) => f.surface === surface || (f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition)));
}

// ─── Component ───────────────────────────────────────────────────────────────

const SURFACES: ToothSurface[] = ["VESTIBULAR", "LINGUAL", "MESIAL", "DISTAL", "OCCLUSAL"];

export function ToothOcclusalSVG({ fdi, findings, onZoneClick }: Props) {
  const [hoveredZone, setHoveredZone] = useState<ToothSurface | null>(null);
  const type = getToothType(fdi);
  const { w: W, h: H } = getDimensions(type);
  const data = getZoneData(type, W, H);
  const isAbsent = findings.some((f) => f.condition === "ABSENT" && f.surface === null);
  const isPlanned = findings.some((f) => f.status === "PLANNED");
  const wholeFinding = findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));

  function getZoneFill(surface: ToothSurface): string {
    const base = getSurfaceColor(surface, findings);
    if (hoveredZone === surface && base === "#FFFFFF") return "#F0F0F0";
    return base;
  }

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="cursor-pointer"
      style={{ opacity: isAbsent ? 0.25 : 1 }}
    >
      <defs>
        <clipPath id={`oc-${fdi}`}>
          <path d={data.outline} />
        </clipPath>
      </defs>

      {/* Background */}
      <path d={data.outline} fill="#FFFFFF" />

      {wholeFinding && (wholeFinding.condition === "EXTRACTION" || wholeFinding.condition === "ABSENT") ? (
        <g clipPath={`url(#oc-${fdi})`}>
          <path d={data.outline} fill={CONDITION_COLORS[wholeFinding.condition]} opacity={0.3} />
          <line x1={3} y1={3} x2={W - 3} y2={H - 3} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
          <line x1={W - 3} y1={3} x2={3} y2={H - 3} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      ) : (
        <g clipPath={`url(#oc-${fdi})`}>
          {/* Zone fills */}
          {SURFACES.map((surface) => (
            <path
              key={surface}
              d={data.zones[surface]}
              fill={getZoneFill(surface)}
              className="transition-[fill] duration-150 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onZoneClick(fdi, surface); }}
              onMouseEnter={() => setHoveredZone(surface)}
              onMouseLeave={() => setHoveredZone(null)}
            >
              <title>{getSurfaceTooltip(surface, findings) ?? surface.toLowerCase()}</title>
            </path>
          ))}

          {/* Cross lines — ALWAYS visible, prominent */}
          {data.crossLines.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#9E8E78"
              strokeWidth={1.2}
              pointerEvents="none"
            />
          ))}
        </g>
      )}

      {/* Outline */}
      <path
        d={data.outline}
        fill="none"
        stroke={isPlanned ? "#3B82F6" : "#8B7355"}
        strokeWidth={isPlanned ? 1.8 : 1.3}
        strokeDasharray={isPlanned ? "3 2" : undefined}
        pointerEvents="none"
      />
    </svg>
  );
}
