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
// Outlines derived from biomathcode/react-odontogram (NewTeethPaths),
// normalized and scaled to our viewBox dimensions.
// Zone paths use simple geometry clipped by the organic outline.
// Fissure lines follow real anatomical patterns per tooth type.

interface ZoneData {
  outline: string;
  zones: Record<ToothSurface, string>;
  crossLines: string[]; // explicit lines for the inner cross — ALWAYS visible
}

// ─── Anatomical outlines from biomathcode/react-odontogram ──────────────────
// Normalized from NewTeethPaths, scaled to our target viewBox per tooth type.
// Source: https://github.com/biomathcode/react-odontogram (MIT license)

// First Molar outline → 46x46
const MOLAR_OUTLINE = "M7.8 33.2C9.3 34.2 22.3 45.0 36.1 32.7C37.1 31.8 45.0 20.6 36.9 6.8C36.0 5.3 35.4 3.9 34.6 3.2C33.4 2.1 32.8 1.6 31.4 1.5C30.2 1.4 28.9 1.8 26.0 2.4C24.5 2.7 23.5 2.9 20.9 2.0C19.9 1.7 18.5 1.1 16.8 1.1C15.4 1.0 14.4 1.1 13.2 1.7C11.4 2.8 10.1 4.0 9.0 6.0C8.7 6.5 8.0 7.5 6.7 9.7C5.9 11.2 4.8 13.1 4.0 14.9C3.1 16.7 2.5 18.3 2.1 19.4C1.6 21.2 1.0 23.0 1.5 24.7L1.5 24.7C1.8 25.8 2.2 27.2 3.4 28.8C4.6 30.3 6.0 32.0 7.8 33.2Z";
// First Molar fissures — Y-shaped central fissure pattern
const MOLAR_FISSURES = "M29.1 19.7C25.3 19.1 20.7 20.0 19.6 22.0C20.1 18.1 15.6 16.9 12.1 16.8M29.1 19.7C31.5 20.1 33.5 21.2 33.9 23.0M29.1 19.7C30.5 19.9 33.7 19.8 34.8 18.1M8.0 17.7C8.3 17.3 9.9 16.8 12.1 16.8M12.1 16.8C10.9 16.2 8.5 14.5 8.9 13.2";

// Second Premolar outline → 40x38
const PREMOLAR_OUTLINE = "M7.9 32.3C10.0 33.3 17.0 36.7 20.2 37.0C23.0 37.3 34.9 31.4 37.6 26.6C38.2 25.5 39.0 12.2 32.0 5.0C25.1 1.0 10.9 1.8 6.7 9.5C4.3 13.9 1.5 22.3 1.3 23.3C1.0 24.4 1.0 25.8 1.4 27.2C1.6 28.0 1.7 28.5 2.1 28.8C2.7 29.3 4.3 30.5 7.9 32.3Z";
// Second Premolar fissures — central buccolingual groove
const PREMOLAR_FISSURES = "M6.9 27.7C23.6 33.4 27.8 26.9 31.8 24.6M13.4 9.6C19.0 7.0 24.5 8.1 25.4 8.1";

// Canine outline → 34x34
const CANINE_OUTLINE = "M1.6 22.0C1.7 20.9 2.0 11.4 10.4 3.8C12.8 1.6 21.5 1.0 24.7 2.8C30.5 6.0 33.0 17.5 30.5 22.4C29.3 24.8 19.6 33.0 14.9 31.5C10.4 30.0 1.0 26.3 1.6 22.0Z";
// Canine fissures — cingulum ridge and marginal ridges
const CANINE_FISSURES = "M6.5 21.4C6.9 21.7 8.7 23.1 10.6 24.2C13.6 25.8 13.9 26.0 15.3 26.6C16.4 27.1 18.8 27.6 25.9 21.8M11.5 11.9C11.7 11.8 15.2 12.9 19.4 10.8";

// Central Incisor outline → 32x36
const INCISOR_OUTLINE = "M12.8 34.5C11.5 34.4 9.7 34.0 9.7 34.0C9.7 34.0 6.4 33.3 5.0 32.6C3.6 31.9 1.7 30.7 1.4 29.6C1.2 28.6 1.0 26.9 1.2 25.8L1.2 25.6C1.4 24.2 1.8 22.1 2.0 19.8C2.1 18.7 2.0 18.0 2.5 16.3C3.0 14.6 3.4 13.8 3.7 13.1C4.1 12.5 4.6 12.0 5.0 11.3C5.5 10.2 6.4 8.9 7.3 7.9C7.8 7.3 8.3 6.8 8.8 6.4C9.4 5.8 10.5 4.6 11.1 3.9C12.1 3.0 13.0 2.1 13.8 1.9C14.5 1.6 15.4 1.5 16.1 1.3C16.9 1.1 17.6 1.0 18.8 1.4C19.8 1.6 20.5 1.7 21.5 2.8C22.7 4.1 23.1 4.8 23.5 5.5C24.2 6.6 25.0 8.1 25.6 9.1C26.0 9.7 26.9 10.9 28.0 14.1C28.9 16.8 29.4 18.5 29.6 19.2C29.8 20.0 30.2 21.3 30.4 22.8C30.6 25.1 31.0 27.0 30.9 29.0C30.9 30.7 31.0 31.8 30.3 32.6C29.7 33.1 29.1 33.7 28.3 34.0C27.1 34.4 26.0 34.7 25.1 34.8C24.3 34.9 20.9 35.0 18.4 34.8C17.4 34.7 16.2 34.7 12.8 34.5Z";
// Central Incisor fissures — cingulum and marginal ridges
const INCISOR_FISSURES = "M4.8 27.0C5.1 27.3 7.4 28.9 10.2 30.2C12.0 31.0 14.8 31.1 16.9 31.2C22.1 31.5 22.9 30.8 24.5 30.5C24.8 30.4 25.0 30.3 25.5 30.1";

// ─── Zone data generators ───────────────────────────────────────────────────
// Zone paths use simple straight-line geometry extending to viewBox edges.
// The clipPath (using the organic outline above) clips them to the tooth shape.
// This ensures full coverage regardless of the organic outline's irregularity.

function getMolarZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.28, iy = H * 0.28;
  return {
    outline: MOLAR_OUTLINE,
    zones: {
      VESTIBULAR: `M 0,0 L ${W},0 L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} Z`,
      LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      MESIAL:     `M 0,0 L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 0,${H} Z`,
      DISTAL:     `M ${W},0 L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W},${H} Z`,
      OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle — zone boundary, always visible
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Zone dividers from corners to inner rectangle (clipped by outline)
      `M 0,0 L ${cx - ix},${cy - iy}`,
      `M ${W},0 L ${cx + ix},${cy - iy}`,
      `M ${W},${H} L ${cx + ix},${cy + iy}`,
      `M 0,${H} L ${cx - ix},${cy + iy}`,
      // Anatomical fissure pattern — Y-shaped central fissure
      MOLAR_FISSURES,
    ],
  };
}

function getPremolarZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.24, iy = H * 0.24;
  return {
    outline: PREMOLAR_OUTLINE,
    zones: {
      VESTIBULAR: `M 0,0 L ${W},0 L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} Z`,
      LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      MESIAL:     `M 0,0 L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 0,${H} Z`,
      DISTAL:     `M ${W},0 L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W},${H} Z`,
      OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Zone dividers
      `M 0,0 L ${cx - ix},${cy - iy}`,
      `M ${W},0 L ${cx + ix},${cy - iy}`,
      `M ${W},${H} L ${cx + ix},${cy + iy}`,
      `M 0,${H} L ${cx - ix},${cy + iy}`,
      // Anatomical fissure — central buccolingual groove
      PREMOLAR_FISSURES,
    ],
  };
}

function getCanineZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.22, iy = H * 0.22;
  return {
    outline: CANINE_OUTLINE,
    zones: {
      VESTIBULAR: `M 0,0 L ${W},0 L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} Z`,
      LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      MESIAL:     `M 0,0 L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 0,${H} Z`,
      DISTAL:     `M ${W},0 L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W},${H} Z`,
      OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Zone dividers
      `M 0,0 L ${cx - ix},${cy - iy}`,
      `M ${W},0 L ${cx + ix},${cy - iy}`,
      `M ${W},${H} L ${cx + ix},${cy + iy}`,
      `M 0,${H} L ${cx - ix},${cy + iy}`,
      // Anatomical fissure — cingulum ridge
      CANINE_FISSURES,
    ],
  };
}

function getIncisorZones(W: number, H: number): ZoneData {
  const cx = W / 2, cy = H / 2;
  const ix = W * 0.22, iy = H * 0.20;
  return {
    outline: INCISOR_OUTLINE,
    zones: {
      VESTIBULAR: `M 0,0 L ${W},0 L ${cx + ix},${cy - iy} L ${cx - ix},${cy - iy} Z`,
      LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      MESIAL:     `M 0,0 L ${cx - ix},${cy - iy} L ${cx - ix},${cy + iy} L 0,${H} Z`,
      DISTAL:     `M ${W},0 L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${W},${H} Z`,
      OCCLUSAL:   `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
    },
    crossLines: [
      // Inner rectangle
      `M ${cx - ix},${cy - iy} L ${cx + ix},${cy - iy} L ${cx + ix},${cy + iy} L ${cx - ix},${cy + iy} Z`,
      // Zone dividers
      `M 0,0 L ${cx - ix},${cy - iy}`,
      `M ${W},0 L ${cx + ix},${cy - iy}`,
      `M ${W},${H} L ${cx + ix},${cy + iy}`,
      `M 0,${H} L ${cx - ix},${cy + iy}`,
      // Anatomical fissure — cingulum and marginal ridges
      INCISOR_FISSURES,
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
