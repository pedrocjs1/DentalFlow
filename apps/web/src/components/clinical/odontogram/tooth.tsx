"use client";

import {
  type OdontogramFinding,
  type ToothSurface,
  type ToothCondition,
  CONDITION_COLORS,
  WHOLE_TOOTH_CONDITIONS,
} from "./types";

interface ToothProps {
  fdi: number;
  findings: OdontogramFinding[];
  onClick: (fdi: number) => void;
  size?: number;
}

// For a tooth box of size S, the 5 polygon regions:
// VESTIBULAR: top strip
// LINGUAL:    bottom strip
// MESIAL:     left strip
// DISTAL:     right strip
// OCCLUSAL:   center square
// All coordinates in a S×S viewBox.
function getPolygons(S: number) {
  const p = S * 0.28; // indent from edge to center region
  return {
    VESTIBULAR: `0,0 ${S},0 ${S - p},${p} ${p},${p}`,
    LINGUAL:    `0,${S} ${S},${S} ${S - p},${S - p} ${p},${S - p}`,
    MESIAL:     `0,0 ${p},${p} ${p},${S - p} 0,${S}`,
    DISTAL:     `${S},0 ${S - p},${p} ${S - p},${S - p} ${S},${S}`,
    OCCLUSAL:   `${p},${p} ${S - p},${p} ${S - p},${S - p} ${p},${S - p}`,
  };
}

function getSurfaceColor(surface: ToothSurface, findings: OdontogramFinding[]): string {
  // Check for a whole-tooth condition first
  const wholeFinding = findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
  if (wholeFinding) return CONDITION_COLORS[wholeFinding.condition];

  // Check surface-specific finding
  const surfFinding = findings.find((f) => f.surface === surface);
  if (surfFinding) return CONDITION_COLORS[surfFinding.condition];

  return CONDITION_COLORS.HEALTHY;
}

function getWholeTooth(findings: OdontogramFinding[]): OdontogramFinding | undefined {
  return findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
}

function hasPlanned(findings: OdontogramFinding[]): boolean {
  return findings.some((f) => f.status === "PLANNED");
}

export function Tooth({ fdi, findings, onClick, size = 44 }: ToothProps) {
  const S = size;
  const polys = getPolygons(S);
  const wholeFinding = getWholeTooth(findings);
  const isPlanned = hasPlanned(findings);
  const surfaces: ToothSurface[] = ["VESTIBULAR", "LINGUAL", "MESIAL", "DISTAL", "OCCLUSAL"];

  // Tooth number label: is it a molar (3 roots), premolar, canine, or incisor?
  const isRoot = fdi % 10 >= 6; // 6,7,8 = molar/premolar

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* FDI number */}
      <span className="text-[9px] font-medium text-gray-400 leading-none">{fdi}</span>

      <svg
        width={S}
        height={S}
        viewBox={`0 0 ${S} ${S}`}
        className="cursor-pointer"
        onClick={() => onClick(fdi)}
        style={{ display: "block" }}
      >
        {/* Outer border */}
        <rect
          x={0.5}
          y={0.5}
          width={S - 1}
          height={S - 1}
          fill="none"
          stroke={isPlanned ? "#22C55E" : "#D1D5DB"}
          strokeWidth={isPlanned ? 1.5 : 1}
          strokeDasharray={isPlanned ? "3 2" : undefined}
          rx={2}
        />

        {wholeFinding ? (
          // Whole-tooth condition overlay
          <>
            <rect x={1} y={1} width={S - 2} height={S - 2} fill={CONDITION_COLORS[wholeFinding.condition]} rx={2} />
            {wholeFinding.condition === "EXTRACTION" || wholeFinding.condition === "ABSENT" ? (
              // X mark
              <>
                <line x1={S * 0.2} y1={S * 0.2} x2={S * 0.8} y2={S * 0.8} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
                <line x1={S * 0.8} y1={S * 0.2} x2={S * 0.2} y2={S * 0.8} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
              </>
            ) : wholeFinding.condition === "ENDODONTICS" ? (
              // Red dot in center
              <>
                <rect x={1} y={1} width={S - 2} height={S - 2} fill="#FEF2F2" rx={2} />
                <circle cx={S / 2} cy={S / 2} r={S * 0.18} fill="#DC2626" />
              </>
            ) : wholeFinding.condition === "IMPLANT" ? (
              // Implant symbol
              <>
                <rect x={1} y={1} width={S - 2} height={S - 2} fill={CONDITION_COLORS.IMPLANT} opacity={0.2} rx={2} />
                <circle cx={S / 2} cy={S / 2} r={S * 0.28} fill="none" stroke={CONDITION_COLORS.IMPLANT} strokeWidth={2} />
                <circle cx={S / 2} cy={S / 2} r={S * 0.1} fill={CONDITION_COLORS.IMPLANT} />
              </>
            ) : null}
          </>
        ) : (
          // Surface-by-surface rendering
          surfaces.map((surface) => (
            <polygon
              key={surface}
              points={polys[surface]}
              fill={getSurfaceColor(surface, findings)}
              stroke="#D1D5DB"
              strokeWidth={0.5}
            />
          ))
        )}
      </svg>
    </div>
  );
}
