"use client";

import {
  type OdontogramFinding,
  type ToothSurface,
  CONDITION_COLORS,
  CONDITION_LABELS,
  WHOLE_TOOTH_CONDITIONS,
} from "./types";

interface ToothProps {
  fdi: number;
  findings: OdontogramFinding[];
  onClick: (fdi: number) => void;
  size?: number;
  orientation?: "upper" | "lower";
}

// ─── Tooth type classification by FDI ────────────────────────────────────────

type ToothType = "molar" | "premolar" | "canine" | "incisor";

function getToothType(fdi: number): ToothType {
  const pos = fdi % 10;
  if (pos >= 6) return "molar";
  if (pos >= 4) return "premolar";
  if (pos === 3) return "canine";
  return "incisor";
}

// ─── Oclusal surface paths per tooth type ────────────────────────────────────
// Each returns 5 SVG paths for: VESTIBULAR, LINGUAL, MESIAL, DISTAL, OCCLUSAL
// All paths are defined in a normalized viewBox; the component scales via width/height.

function getMolarPaths(W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const iw = W * 0.32, ih = H * 0.32; // inner rect half-sizes

  return {
    VESTIBULAR: `M 0,0 L ${W},0 L ${cx + iw},${cy - ih} L ${cx - iw},${cy - ih} Z`,
    LINGUAL:    `M 0,${H} L ${W},${H} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
    MESIAL:     `M 0,0 L ${cx - iw},${cy - ih} L ${cx - iw},${cy + ih} L 0,${H} Z`,
    DISTAL:     `M ${W},0 L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${W},${H} Z`,
    OCCLUSAL:   `M ${cx - iw},${cy - ih} L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
  };
}

function getPremolarPaths(W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const iw = W * 0.28, ih = H * 0.28;

  return {
    VESTIBULAR: `M ${W * 0.05},0 L ${W * 0.95},0 L ${cx + iw},${cy - ih} L ${cx - iw},${cy - ih} Z`,
    LINGUAL:    `M ${W * 0.05},${H} L ${W * 0.95},${H} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
    MESIAL:     `M ${W * 0.05},0 L ${cx - iw},${cy - ih} L ${cx - iw},${cy + ih} L ${W * 0.05},${H} Z`,
    DISTAL:     `M ${W * 0.95},0 L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${W * 0.95},${H} Z`,
    OCCLUSAL:   `M ${cx - iw},${cy - ih} L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
  };
}

function getCaninePaths(W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const iw = W * 0.24, ih = H * 0.24;

  return {
    VESTIBULAR: `M ${W * 0.12},0 L ${W * 0.88},0 L ${cx + iw},${cy - ih} L ${cx - iw},${cy - ih} Z`,
    LINGUAL:    `M ${W * 0.12},${H} L ${W * 0.88},${H} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
    MESIAL:     `M ${W * 0.12},0 L ${cx - iw},${cy - ih} L ${cx - iw},${cy + ih} L ${W * 0.12},${H} Z`,
    DISTAL:     `M ${W * 0.88},0 L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${W * 0.88},${H} Z`,
    OCCLUSAL:   `M ${cx - iw},${cy - ih} L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
  };
}

function getIncisorPaths(W: number, H: number) {
  const cx = W / 2, cy = H / 2;
  const iw = W * 0.22, ih = H * 0.22;

  return {
    VESTIBULAR: `M ${W * 0.1},0 L ${W * 0.9},0 L ${cx + iw},${cy - ih} L ${cx - iw},${cy - ih} Z`,
    LINGUAL:    `M ${W * 0.1},${H} L ${W * 0.9},${H} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
    MESIAL:     `M ${W * 0.1},0 L ${cx - iw},${cy - ih} L ${cx - iw},${cy + ih} L ${W * 0.1},${H} Z`,
    DISTAL:     `M ${W * 0.9},0 L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${W * 0.9},${H} Z`,
    OCCLUSAL:   `M ${cx - iw},${cy - ih} L ${cx + iw},${cy - ih} L ${cx + iw},${cy + ih} L ${cx - iw},${cy + ih} Z`,
  };
}

// ─── Outer tooth outline per type (rounded anatomical shapes) ────────────────

function getOutlinePath(type: ToothType, W: number, H: number): string {
  switch (type) {
    case "molar":
      return `M 2,4 Q 2,1 ${W * 0.2},1 L ${W * 0.8},1 Q ${W - 2},1 ${W - 2},4 L ${W - 2},${H - 4} Q ${W - 2},${H - 1} ${W * 0.8},${H - 1} L ${W * 0.2},${H - 1} Q 2,${H - 1} 2,${H - 4} Z`;
    case "premolar":
      return `M ${W * 0.05},4 Q ${W * 0.05},1 ${W * 0.2},1 L ${W * 0.8},1 Q ${W * 0.95},1 ${W * 0.95},4 L ${W * 0.95},${H - 4} Q ${W * 0.95},${H - 1} ${W * 0.8},${H - 1} L ${W * 0.2},${H - 1} Q ${W * 0.05},${H - 1} ${W * 0.05},${H - 4} Z`;
    case "canine":
      return `M ${W * 0.12},5 Q ${W * 0.12},1 ${W * 0.28},1 L ${W * 0.72},1 Q ${W * 0.88},1 ${W * 0.88},5 L ${W * 0.88},${H - 5} Q ${W * 0.88},${H - 1} ${W * 0.72},${H - 1} L ${W * 0.28},${H - 1} Q ${W * 0.12},${H - 1} ${W * 0.12},${H - 5} Z`;
    case "incisor":
      return `M ${W * 0.1},5 Q ${W * 0.1},1 ${W * 0.25},1 L ${W * 0.75},1 Q ${W * 0.9},1 ${W * 0.9},5 L ${W * 0.9},${H - 5} Q ${W * 0.9},${H - 1} ${W * 0.75},${H - 1} L ${W * 0.25},${H - 1} Q ${W * 0.1},${H - 1} ${W * 0.1},${H - 5} Z`;
  }
}

// ─── Dimension by type ───────────────────────────────────────────────────────

function getToothDimensions(type: ToothType, baseSize: number): { w: number; h: number } {
  switch (type) {
    case "molar":    return { w: baseSize, h: baseSize };
    case "premolar": return { w: baseSize * 0.82, h: baseSize };
    case "canine":   return { w: baseSize * 0.7, h: baseSize * 1.05 };
    case "incisor":  return { w: baseSize * 0.65, h: baseSize * 0.95 };
  }
}

function getSurfacePaths(type: ToothType, W: number, H: number) {
  switch (type) {
    case "molar":    return getMolarPaths(W, H);
    case "premolar": return getPremolarPaths(W, H);
    case "canine":   return getCaninePaths(W, H);
    case "incisor":  return getIncisorPaths(W, H);
  }
}

// ─── Color helpers ───────────────────────────────────────────────────────────

function getSurfaceColor(surface: ToothSurface, findings: OdontogramFinding[]): string {
  const wholeFinding = findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
  if (wholeFinding) return CONDITION_COLORS[wholeFinding.condition];

  const surfFinding = findings.find((f) => f.surface === surface);
  if (surfFinding) return CONDITION_COLORS[surfFinding.condition];

  return "#FFFFFF";
}

function getWholeTooth(findings: OdontogramFinding[]): OdontogramFinding | undefined {
  return findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
}

function hasPlanned(findings: OdontogramFinding[]): boolean {
  return findings.some((f) => f.status === "PLANNED");
}

function getSurfaceTooltip(surface: ToothSurface, findings: OdontogramFinding[]): string | undefined {
  const surfFinding = findings.find((f) => f.surface === surface);
  if (surfFinding) return CONDITION_LABELS[surfFinding.condition];
  return undefined;
}

// ─── Tooth SVG Component ─────────────────────────────────────────────────────

export function Tooth({ fdi, findings, onClick, size = 44, orientation = "upper" }: ToothProps) {
  const type = getToothType(fdi);
  const { w: W, h: H } = getToothDimensions(type, size);
  const paths = getSurfacePaths(type, W, H);
  const outline = getOutlinePath(type, W, H);
  const wholeFinding = getWholeTooth(findings);
  const isPlanned = hasPlanned(findings);
  const surfaces: ToothSurface[] = ["VESTIBULAR", "LINGUAL", "MESIAL", "DISTAL", "OCCLUSAL"];

  const isUpper = orientation === "upper";
  const numberPos = isUpper ? "above" : "below";

  // Root hint: small lines below (upper) or above (lower) the crown
  const rootY1 = isUpper ? H : 0;
  const rootY2 = isUpper ? H + 8 : -8;
  const rootCount = type === "molar" ? 3 : type === "premolar" ? 2 : 1;

  const rootLines = [];
  if (rootCount === 3) {
    rootLines.push({ x: W * 0.25 }, { x: W * 0.5 }, { x: W * 0.75 });
  } else if (rootCount === 2) {
    rootLines.push({ x: W * 0.35 }, { x: W * 0.65 });
  } else {
    rootLines.push({ x: W * 0.5 });
  }

  const svgH = H + 10; // extra for root hints
  const crownY = isUpper ? 0 : 10;
  const rootHintY = isUpper ? H : 0;

  return (
    <div className="flex flex-col items-center gap-0">
      {/* FDI number - above for upper, below for lower */}
      {numberPos === "above" && (
        <span className="text-[9px] font-semibold text-gray-400 leading-none mb-0.5 select-none">{fdi}</span>
      )}

      <svg
        width={W}
        height={svgH}
        viewBox={`0 0 ${W} ${svgH}`}
        className="cursor-pointer transition-[filter] duration-200 hover:brightness-95"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.06))" }}
        onClick={() => onClick(fdi)}
      >
        {/* Root hints */}
        <g opacity={0.3}>
          {rootLines.map((r, i) => (
            <line
              key={i}
              x1={r.x}
              y1={rootHintY + (isUpper ? 1 : 9)}
              x2={r.x + (i === 0 ? -2 : i === rootLines.length - 1 ? 2 : 0)}
              y2={rootHintY + (isUpper ? 9 : 1)}
              stroke="#C4B5A0"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Tooth crown group */}
        <g transform={`translate(0, ${crownY})`}>
          {/* Clip path for tooth shape */}
          <defs>
            <clipPath id={`clip-${fdi}`}>
              <path d={outline} />
            </clipPath>
          </defs>

          {/* Background fill */}
          <path d={outline} fill="#FFFFFF" />

          {wholeFinding ? (
            /* Whole-tooth condition overlay */
            <g clipPath={`url(#clip-${fdi})`}>
              <path d={outline} fill={CONDITION_COLORS[wholeFinding.condition]} opacity={0.85} />
              {(wholeFinding.condition === "EXTRACTION" || wholeFinding.condition === "ABSENT") && (
                <>
                  <line x1={W * 0.15} y1={H * 0.15} x2={W * 0.85} y2={H * 0.85} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
                  <line x1={W * 0.85} y1={H * 0.15} x2={W * 0.15} y2={H * 0.85} stroke="white" strokeWidth={2.5} strokeLinecap="round" />
                </>
              )}
              {wholeFinding.condition === "ENDODONTICS" && (
                <>
                  <path d={outline} fill="#FEF2F2" />
                  <circle cx={W / 2} cy={H / 2} r={W * 0.16} fill="#DC2626" />
                </>
              )}
              {wholeFinding.condition === "IMPLANT" && (
                <>
                  <path d={outline} fill={CONDITION_COLORS.IMPLANT} opacity={0.15} />
                  <circle cx={W / 2} cy={H / 2} r={W * 0.26} fill="none" stroke={CONDITION_COLORS.IMPLANT} strokeWidth={1.8} />
                  <circle cx={W / 2} cy={H / 2} r={W * 0.08} fill={CONDITION_COLORS.IMPLANT} />
                </>
              )}
            </g>
          ) : (
            /* Surface-by-surface rendering */
            <g clipPath={`url(#clip-${fdi})`}>
              {surfaces.map((surface) => (
                <path
                  key={surface}
                  d={paths[surface]}
                  fill={getSurfaceColor(surface, findings)}
                  className="transition-[fill] duration-200"
                >
                  {getSurfaceTooltip(surface, findings) && (
                    <title>{getSurfaceTooltip(surface, findings)}</title>
                  )}
                </path>
              ))}
              {/* Inner division lines */}
              {surfaces.map((surface) => (
                <path
                  key={`stroke-${surface}`}
                  d={paths[surface]}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth={0.5}
                />
              ))}
            </g>
          )}

          {/* Tooth outline */}
          <path
            d={outline}
            fill="none"
            stroke={isPlanned ? "#22C55E" : "#C4B5A0"}
            strokeWidth={isPlanned ? 1.8 : 1.2}
            strokeDasharray={isPlanned ? "3 2" : undefined}
          />
        </g>
      </svg>

      {numberPos === "below" && (
        <span className="text-[9px] font-semibold text-gray-400 leading-none mt-0.5 select-none">{fdi}</span>
      )}
    </div>
  );
}
