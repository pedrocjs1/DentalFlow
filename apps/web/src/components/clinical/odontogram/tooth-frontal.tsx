"use client";

import {
  type OdontogramFinding,
  CONDITION_COLORS,
  WHOLE_TOOTH_CONDITIONS,
} from "./types";

type ToothType = "molar" | "premolar" | "canine" | "incisor";
type Orientation = "upper" | "lower";

interface Props {
  fdi: number;
  findings: OdontogramFinding[];
  onClick: (fdi: number) => void;
  orientation: Orientation;
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
    case "molar":    return { w: 50, h: 68 };
    case "premolar": return { w: 42, h: 65 };
    case "canine":   return { w: 36, h: 70 };
    case "incisor":  return { w: 34, h: 62 };
  }
}

// ─── Crown paths — more anatomically distinct ────────────────────────────────
// All drawn in upper orientation (roots up, crown down).
// Crown occupies roughly the lower 40% of the viewBox.

function getCrownPath(type: ToothType, W: number, H: number): string {
  const crownTop = H * 0.48;
  const crownBot = H - 2;
  switch (type) {
    case "molar":
      // Wide, squared crown with 3 prominent cusps
      return `M ${W * 0.08},${crownTop + 8}
        C ${W * 0.08},${crownTop + 4} ${W * 0.12},${crownTop} ${W * 0.2},${crownTop - 2}
        C ${W * 0.26},${crownTop - 5} ${W * 0.3},${crownTop - 3} ${W * 0.36},${crownTop}
        C ${W * 0.42},${crownTop - 6} ${W * 0.48},${crownTop - 6} ${W * 0.5},${crownTop - 3}
        C ${W * 0.52},${crownTop - 6} ${W * 0.58},${crownTop - 6} ${W * 0.64},${crownTop}
        C ${W * 0.7},${crownTop - 3} ${W * 0.74},${crownTop - 5} ${W * 0.8},${crownTop - 2}
        C ${W * 0.88},${crownTop} ${W * 0.92},${crownTop + 4} ${W * 0.92},${crownTop + 8}
        L ${W * 0.92},${crownBot - 4}
        Q ${W * 0.92},${crownBot} ${W * 0.84},${crownBot}
        L ${W * 0.16},${crownBot}
        Q ${W * 0.08},${crownBot} ${W * 0.08},${crownBot - 4} Z`;
    case "premolar":
      // Narrower crown with 2 clear cusps
      return `M ${W * 0.14},${crownTop + 6}
        C ${W * 0.14},${crownTop + 2} ${W * 0.2},${crownTop - 2} ${W * 0.3},${crownTop - 4}
        C ${W * 0.38},${crownTop - 7} ${W * 0.44},${crownTop - 4} ${W * 0.5},${crownTop - 2}
        C ${W * 0.56},${crownTop - 4} ${W * 0.62},${crownTop - 7} ${W * 0.7},${crownTop - 4}
        C ${W * 0.8},${crownTop - 2} ${W * 0.86},${crownTop + 2} ${W * 0.86},${crownTop + 6}
        L ${W * 0.86},${crownBot - 4}
        Q ${W * 0.86},${crownBot} ${W * 0.78},${crownBot}
        L ${W * 0.22},${crownBot}
        Q ${W * 0.14},${crownBot} ${W * 0.14},${crownBot - 4} Z`;
    case "canine":
      // Triangular crown with single sharp cusp
      return `M ${W * 0.18},${crownTop + 8}
        C ${W * 0.18},${crownTop + 4} ${W * 0.24},${crownTop - 2} ${W * 0.35},${crownTop - 8}
        C ${W * 0.42},${crownTop - 14} ${W * 0.48},${crownTop - 16} ${W * 0.5},${crownTop - 16}
        C ${W * 0.52},${crownTop - 16} ${W * 0.58},${crownTop - 14} ${W * 0.65},${crownTop - 8}
        C ${W * 0.76},${crownTop - 2} ${W * 0.82},${crownTop + 4} ${W * 0.82},${crownTop + 8}
        L ${W * 0.82},${crownBot - 4}
        Q ${W * 0.82},${crownBot} ${W * 0.74},${crownBot}
        L ${W * 0.26},${crownBot}
        Q ${W * 0.18},${crownBot} ${W * 0.18},${crownBot - 4} Z`;
    case "incisor":
      // Chisel/shovel shape with flat incisal edge
      return `M ${W * 0.14},${crownTop + 2}
        C ${W * 0.14},${crownTop} ${W * 0.18},${crownTop - 2} ${W * 0.24},${crownTop - 3}
        L ${W * 0.76},${crownTop - 3}
        C ${W * 0.82},${crownTop - 2} ${W * 0.86},${crownTop} ${W * 0.86},${crownTop + 2}
        L ${W * 0.86},${crownBot - 4}
        Q ${W * 0.86},${crownBot} ${W * 0.78},${crownBot}
        L ${W * 0.22},${crownBot}
        Q ${W * 0.14},${crownBot} ${W * 0.14},${crownBot - 4} Z`;
  }
}

// ─── Root paths ──────────────────────────────────────────────────────────────

function getRootPaths(type: ToothType, isUpper: boolean, W: number, H: number): string[] {
  const rootTop = 3;
  const rootBot = H * 0.52;
  if (type === "molar" && isUpper) {
    return [
      `M ${W * 0.2},${rootBot} C ${W * 0.2},${rootBot - 10} ${W * 0.15},${rootBot - 22} ${W * 0.13},${rootTop + 6} C ${W * 0.12},${rootTop} ${W * 0.18},${rootTop} ${W * 0.2},${rootTop + 4} C ${W * 0.22},${rootTop + 8} ${W * 0.24},${rootBot - 16} ${W * 0.26},${rootBot}`,
      `M ${W * 0.42},${rootBot} C ${W * 0.42},${rootBot - 8} ${W * 0.46},${rootBot - 20} ${W * 0.48},${rootTop + 4} C ${W * 0.49},${rootTop} ${W * 0.51},${rootTop} ${W * 0.52},${rootTop + 4} C ${W * 0.54},${rootBot - 20} ${W * 0.58},${rootBot - 8} ${W * 0.58},${rootBot}`,
      `M ${W * 0.74},${rootBot} C ${W * 0.76},${rootBot - 16} ${W * 0.78},${rootTop + 8} ${W * 0.8},${rootTop + 4} C ${W * 0.82},${rootTop} ${W * 0.88},${rootTop} ${W * 0.87},${rootTop + 6} C ${W * 0.85},${rootBot - 22} ${W * 0.8},${rootBot - 10} ${W * 0.8},${rootBot}`,
    ];
  }
  if (type === "molar") {
    return [
      `M ${W * 0.22},${rootBot} C ${W * 0.22},${rootBot - 10} ${W * 0.18},${rootBot - 22} ${W * 0.16},${rootTop + 6} C ${W * 0.15},${rootTop} ${W * 0.2},${rootTop} ${W * 0.22},${rootTop + 4} C ${W * 0.24},${rootTop + 8} ${W * 0.28},${rootBot - 16} ${W * 0.3},${rootBot}`,
      `M ${W * 0.7},${rootBot} C ${W * 0.72},${rootBot - 16} ${W * 0.76},${rootTop + 8} ${W * 0.78},${rootTop + 4} C ${W * 0.8},${rootTop} ${W * 0.85},${rootTop} ${W * 0.84},${rootTop + 6} C ${W * 0.82},${rootBot - 22} ${W * 0.78},${rootBot - 10} ${W * 0.78},${rootBot}`,
    ];
  }
  if (type === "premolar" && isUpper) {
    return [
      `M ${W * 0.32},${rootBot} C ${W * 0.32},${rootBot - 10} ${W * 0.28},${rootBot - 22} ${W * 0.26},${rootTop + 6} C ${W * 0.25},${rootTop} ${W * 0.3},${rootTop} ${W * 0.32},${rootTop + 4} C ${W * 0.34},${rootTop + 8} ${W * 0.36},${rootBot - 16} ${W * 0.38},${rootBot}`,
      `M ${W * 0.62},${rootBot} C ${W * 0.64},${rootBot - 16} ${W * 0.66},${rootTop + 8} ${W * 0.68},${rootTop + 4} C ${W * 0.7},${rootTop} ${W * 0.75},${rootTop} ${W * 0.74},${rootTop + 6} C ${W * 0.72},${rootBot - 22} ${W * 0.68},${rootBot - 10} ${W * 0.68},${rootBot}`,
    ];
  }
  if (type === "premolar") {
    return [
      `M ${W * 0.44},${rootBot} C ${W * 0.44},${rootBot - 12} ${W * 0.46},${rootBot - 24} ${W * 0.48},${rootTop + 4} C ${W * 0.49},${rootTop} ${W * 0.51},${rootTop} ${W * 0.52},${rootTop + 4} C ${W * 0.54},${rootBot - 24} ${W * 0.56},${rootBot - 12} ${W * 0.56},${rootBot}`,
    ];
  }
  // Canine: long single root
  if (type === "canine") {
    return [
      `M ${W * 0.4},${rootBot} C ${W * 0.4},${rootBot - 14} ${W * 0.42},${rootBot - 28} ${W * 0.46},${rootTop + 4} C ${W * 0.48},${rootTop} ${W * 0.52},${rootTop} ${W * 0.54},${rootTop + 4} C ${W * 0.58},${rootBot - 28} ${W * 0.6},${rootBot - 14} ${W * 0.6},${rootBot}`,
    ];
  }
  // Incisor: single shorter root
  return [
    `M ${W * 0.4},${rootBot} C ${W * 0.4},${rootBot - 12} ${W * 0.42},${rootBot - 24} ${W * 0.46},${rootTop + 6} C ${W * 0.48},${rootTop + 2} ${W * 0.52},${rootTop + 2} ${W * 0.54},${rootTop + 6} C ${W * 0.58},${rootBot - 24} ${W * 0.6},${rootBot - 12} ${W * 0.6},${rootBot}`,
  ];
}

function getWholeFinding(findings: OdontogramFinding[]): OdontogramFinding | undefined {
  return findings.find((f) => f.surface === null && WHOLE_TOOTH_CONDITIONS.includes(f.condition));
}

export function ToothFrontalSVG({ fdi, findings, onClick, orientation }: Props) {
  const type = getToothType(fdi);
  const isUpper = orientation === "upper";
  const wholeFinding = getWholeFinding(findings);
  const isAbsent = wholeFinding?.condition === "ABSENT";
  const isExtraction = wholeFinding?.condition === "EXTRACTION";
  const isCrown = wholeFinding?.condition === "CROWN";
  const isImplant = wholeFinding?.condition === "IMPLANT";
  const isEndodontics = wholeFinding?.condition === "ENDODONTICS";
  const isProsthesis = wholeFinding?.condition === "PROSTHESIS";
  const isPlanned = findings.some((f) => f.status === "PLANNED");

  const { w: W, h: H } = getDimensions(type);
  const crownPath = getCrownPath(type, W, H);
  const rootPaths = getRootPaths(type, isUpper, W, H);

  // Upper: normal (roots up). Lower: flip vertically.
  const transform = isUpper ? "" : `scale(1,-1) translate(0,-${H})`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="cursor-pointer"
      onClick={() => onClick(fdi)}
      style={{ opacity: isAbsent ? 0.25 : 1 }}
    >
      <g transform={transform}>
        {isImplant ? (
          <g>
            <path d={`M ${W * 0.42},5 L ${W * 0.58},5 L ${W * 0.55},${H * 0.48} L ${W * 0.45},${H * 0.48} Z`} fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
            {[0.12, 0.2, 0.28, 0.36, 0.44].map((r) => (
              <line key={r} x1={W * 0.42} y1={H * r} x2={W * 0.58} y2={H * r} stroke="#8B5CF6" strokeWidth={0.8} />
            ))}
            <path d={`M ${W * 0.36},${H * 0.48} L ${W * 0.64},${H * 0.48} L ${W * 0.6},${H * 0.56} L ${W * 0.4},${H * 0.56} Z`} fill="#8B5CF6" opacity={0.3} stroke="#8B5CF6" strokeWidth={1} />
            <rect x={W * 0.2} y={H * 0.56} width={W * 0.6} height={H * 0.38} rx={4} fill="white" stroke="#8B5CF6" strokeWidth={1.3} />
          </g>
        ) : (
          <>
            {rootPaths.map((p, i) => (
              <path key={i} d={p} fill="white" stroke="#8B7355" strokeWidth={1.3} strokeLinejoin="round" />
            ))}
            {isEndodontics && rootPaths.map((_, i) => (
              <line
                key={`endo-${i}`}
                x1={W * 0.5 + (i - (rootPaths.length - 1) / 2) * W * 0.18}
                y1={H * 0.08}
                x2={W * 0.5 + (i - (rootPaths.length - 1) / 2) * W * 0.1}
                y2={H * 0.48}
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))}
            <path
              d={crownPath}
              fill={isCrown ? "#F59E0B" : isProsthesis ? "#4F46E5" : "white"}
              stroke="#8B7355"
              strokeWidth={1.5}
              strokeLinejoin="round"
              opacity={isCrown || isProsthesis ? 0.85 : 1}
            />
          </>
        )}
        {isExtraction && (
          <g>
            <line x1={W * 0.1} y1={4} x2={W * 0.9} y2={H - 4} stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={W * 0.9} y1={4} x2={W * 0.1} y2={H - 4} stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )}
      </g>
      {isPlanned && (
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={3} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3 2" />
      )}
    </svg>
  );
}
