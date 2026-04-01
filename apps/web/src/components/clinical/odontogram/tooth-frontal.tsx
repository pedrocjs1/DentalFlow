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

// ─── Crown paths — anatomically accurate with smooth bezier curves ───────────
// All drawn in upper orientation (roots up, crown down).
// Crown occupies roughly the lower 40% of the viewBox.
// Inspired by dental anatomy textbook illustrations.

function getCrownPath(type: ToothType, W: number, H: number): string {
  const ct = H * 0.48; // crown top baseline
  const cb = H - 2;    // crown bottom
  switch (type) {
    case "molar":
      // Wide crown with 5 prominent cusps separated by deep fissures
      // Anatomical: mesiobuccal, distobuccal, mesiolingual, distolingual, (distal) cusps
      return `M ${W * 0.08},${ct + 10}
        C ${W * 0.08},${ct + 6} ${W * 0.09},${ct + 2} ${W * 0.13},${ct - 1}
        C ${W * 0.16},${ct - 3} ${W * 0.19},${ct - 6} ${W * 0.23},${ct - 8}
        C ${W * 0.26},${ct - 10} ${W * 0.28},${ct - 11} ${W * 0.30},${ct - 10}
        C ${W * 0.32},${ct - 8} ${W * 0.33},${ct - 5} ${W * 0.35},${ct - 4}
        C ${W * 0.37},${ct - 6} ${W * 0.39},${ct - 9} ${W * 0.42},${ct - 11}
        C ${W * 0.45},${ct - 13} ${W * 0.48},${ct - 13} ${W * 0.50},${ct - 12}
        C ${W * 0.52},${ct - 13} ${W * 0.55},${ct - 13} ${W * 0.58},${ct - 11}
        C ${W * 0.61},${ct - 9} ${W * 0.63},${ct - 6} ${W * 0.65},${ct - 4}
        C ${W * 0.67},${ct - 5} ${W * 0.68},${ct - 8} ${W * 0.70},${ct - 10}
        C ${W * 0.72},${ct - 11} ${W * 0.74},${ct - 10} ${W * 0.77},${ct - 8}
        C ${W * 0.81},${ct - 6} ${W * 0.84},${ct - 3} ${W * 0.87},${ct - 1}
        C ${W * 0.91},${ct + 2} ${W * 0.92},${ct + 6} ${W * 0.92},${ct + 10}
        C ${W * 0.92},${ct + 14} ${W * 0.93},${cb - 10} ${W * 0.91},${cb - 6}
        Q ${W * 0.90},${cb} ${W * 0.82},${cb}
        L ${W * 0.18},${cb}
        Q ${W * 0.10},${cb} ${W * 0.09},${cb - 6}
        C ${W * 0.07},${cb - 10} ${W * 0.08},${ct + 14} ${W * 0.08},${ct + 10} Z`;
    case "premolar":
      // Two distinct cusps (buccal taller than lingual) with clear central fissure
      return `M ${W * 0.14},${ct + 8}
        C ${W * 0.14},${ct + 4} ${W * 0.16},${ct} ${W * 0.20},${ct - 3}
        C ${W * 0.24},${ct - 6} ${W * 0.28},${ct - 9} ${W * 0.33},${ct - 11}
        C ${W * 0.37},${ct - 13} ${W * 0.40},${ct - 13} ${W * 0.43},${ct - 11}
        C ${W * 0.46},${ct - 9} ${W * 0.48},${ct - 6} ${W * 0.50},${ct - 5}
        C ${W * 0.52},${ct - 6} ${W * 0.54},${ct - 9} ${W * 0.57},${ct - 11}
        C ${W * 0.60},${ct - 13} ${W * 0.63},${ct - 13} ${W * 0.67},${ct - 11}
        C ${W * 0.72},${ct - 9} ${W * 0.76},${ct - 6} ${W * 0.80},${ct - 3}
        C ${W * 0.84},${ct} ${W * 0.86},${ct + 4} ${W * 0.86},${ct + 8}
        C ${W * 0.86},${ct + 12} ${W * 0.87},${cb - 8} ${W * 0.85},${cb - 5}
        Q ${W * 0.84},${cb} ${W * 0.76},${cb}
        L ${W * 0.24},${cb}
        Q ${W * 0.16},${cb} ${W * 0.15},${cb - 5}
        C ${W * 0.13},${cb - 8} ${W * 0.14},${ct + 12} ${W * 0.14},${ct + 8} Z`;
    case "canine":
      // Single prominent pointed cusp with mesial and distal shoulders
      // Triangular silhouette tapering to a sharp tip
      return `M ${W * 0.18},${ct + 10}
        C ${W * 0.18},${ct + 6} ${W * 0.20},${ct + 1} ${W * 0.24},${ct - 3}
        C ${W * 0.28},${ct - 7} ${W * 0.33},${ct - 11} ${W * 0.38},${ct - 14}
        C ${W * 0.42},${ct - 17} ${W * 0.46},${ct - 19} ${W * 0.48},${ct - 20}
        C ${W * 0.49},${ct - 20.5} ${W * 0.51},${ct - 20.5} ${W * 0.52},${ct - 20}
        C ${W * 0.54},${ct - 19} ${W * 0.58},${ct - 17} ${W * 0.62},${ct - 14}
        C ${W * 0.67},${ct - 11} ${W * 0.72},${ct - 7} ${W * 0.76},${ct - 3}
        C ${W * 0.80},${ct + 1} ${W * 0.82},${ct + 6} ${W * 0.82},${ct + 10}
        C ${W * 0.82},${ct + 14} ${W * 0.83},${cb - 8} ${W * 0.81},${cb - 5}
        Q ${W * 0.80},${cb} ${W * 0.73},${cb}
        L ${W * 0.27},${cb}
        Q ${W * 0.20},${cb} ${W * 0.19},${cb - 5}
        C ${W * 0.17},${cb - 8} ${W * 0.18},${ct + 14} ${W * 0.18},${ct + 10} Z`;
    case "incisor":
      // Chisel/shovel shape — flat incisal edge with slight mamelong bumps
      // Wider at incisal, narrowing toward cervical
      return `M ${W * 0.12},${ct + 4}
        C ${W * 0.12},${ct + 2} ${W * 0.14},${ct - 1} ${W * 0.18},${ct - 3}
        C ${W * 0.22},${ct - 4} ${W * 0.26},${ct - 5} ${W * 0.30},${ct - 5}
        C ${W * 0.35},${ct - 5.5} ${W * 0.40},${ct - 6} ${W * 0.44},${ct - 5.5}
        L ${W * 0.50},${ct - 5}
        C ${W * 0.54},${ct - 5} ${W * 0.56},${ct - 5.5} ${W * 0.60},${ct - 6}
        C ${W * 0.64},${ct - 5.5} ${W * 0.70},${ct - 5} ${W * 0.74},${ct - 4}
        C ${W * 0.78},${ct - 3} ${W * 0.82},${ct - 1} ${W * 0.86},${ct}
        C ${W * 0.88},${ct + 2} ${W * 0.88},${ct + 4} ${W * 0.88},${ct + 6}
        C ${W * 0.88},${ct + 10} ${W * 0.88},${cb - 8} ${W * 0.86},${cb - 5}
        Q ${W * 0.85},${cb} ${W * 0.78},${cb}
        L ${W * 0.22},${cb}
        Q ${W * 0.15},${cb} ${W * 0.14},${cb - 5}
        C ${W * 0.12},${cb - 8} ${W * 0.12},${ct + 10} ${W * 0.12},${ct + 4} Z`;
  }
}

// ─── Root paths — anatomically accurate with natural curvature ───────────────
// Roots taper naturally with slight curves, divergence angles match dental anatomy.

function getRootPaths(type: ToothType, isUpper: boolean, W: number, H: number): string[] {
  const rt = 2;          // root tip (top of viewBox)
  const rb = H * 0.52;   // root base (junction with crown)
  const rm = (rt + rb) / 2; // root midpoint

  if (type === "molar" && isUpper) {
    // Upper molar: 3 roots — mesiobuccal (left, curved mesially), palatal (center, straight),
    // distobuccal (right, curved distally)
    return [
      // Mesiobuccal root — curves slightly to the left
      `M ${W * 0.18},${rb}
       C ${W * 0.18},${rb - 6} ${W * 0.16},${rb - 12} ${W * 0.14},${rm + 4}
       C ${W * 0.12},${rm - 4} ${W * 0.11},${rm - 10} ${W * 0.12},${rt + 8}
       C ${W * 0.12},${rt + 4} ${W * 0.14},${rt + 1} ${W * 0.16},${rt}
       C ${W * 0.18},${rt + 1} ${W * 0.20},${rt + 4} ${W * 0.20},${rt + 8}
       C ${W * 0.21},${rm - 10} ${W * 0.22},${rm - 2} ${W * 0.24},${rm + 4}
       C ${W * 0.26},${rb - 12} ${W * 0.28},${rb - 6} ${W * 0.30},${rb}`,
      // Palatal root — center, slightly longer, straighter
      `M ${W * 0.40},${rb}
       C ${W * 0.40},${rb - 8} ${W * 0.42},${rb - 16} ${W * 0.44},${rm}
       C ${W * 0.46},${rm - 10} ${W * 0.47},${rt + 8} ${W * 0.48},${rt + 3}
       C ${W * 0.49},${rt} ${W * 0.51},${rt} ${W * 0.52},${rt + 3}
       C ${W * 0.53},${rt + 8} ${W * 0.54},${rm - 10} ${W * 0.56},${rm}
       C ${W * 0.58},${rb - 16} ${W * 0.60},${rb - 8} ${W * 0.60},${rb}`,
      // Distobuccal root — curves slightly to the right
      `M ${W * 0.70},${rb}
       C ${W * 0.72},${rb - 6} ${W * 0.74},${rb - 12} ${W * 0.76},${rm + 4}
       C ${W * 0.78},${rm - 4} ${W * 0.80},${rm - 10} ${W * 0.82},${rt + 8}
       C ${W * 0.83},${rt + 4} ${W * 0.86},${rt + 1} ${W * 0.84},${rt}
       C ${W * 0.82},${rt + 1} ${W * 0.80},${rt + 4} ${W * 0.80},${rt + 8}
       C ${W * 0.79},${rm - 8} ${W * 0.78},${rm - 2} ${W * 0.78},${rm + 4}
       C ${W * 0.78},${rb - 12} ${W * 0.76},${rb - 6} ${W * 0.76},${rb}`,
    ];
  }
  if (type === "molar") {
    // Lower molar: 2 roots — mesial (left, wider) and distal (right, narrower)
    // Roots curve toward each other at tips
    return [
      // Mesial root — wider, curves slightly mesially
      `M ${W * 0.18},${rb}
       C ${W * 0.18},${rb - 8} ${W * 0.16},${rb - 16} ${W * 0.15},${rm + 2}
       C ${W * 0.14},${rm - 6} ${W * 0.16},${rm - 12} ${W * 0.18},${rt + 6}
       C ${W * 0.19},${rt + 2} ${W * 0.22},${rt} ${W * 0.24},${rt + 2}
       C ${W * 0.26},${rt + 6} ${W * 0.28},${rm - 12} ${W * 0.30},${rm - 4}
       C ${W * 0.32},${rm + 4} ${W * 0.34},${rb - 12} ${W * 0.36},${rb}`,
      // Distal root — narrower, slightly curved distally
      `M ${W * 0.64},${rb}
       C ${W * 0.66},${rb - 10} ${W * 0.68},${rb - 18} ${W * 0.72},${rm}
       C ${W * 0.76},${rm - 10} ${W * 0.78},${rt + 8} ${W * 0.79},${rt + 4}
       C ${W * 0.80},${rt + 1} ${W * 0.82},${rt + 1} ${W * 0.81},${rt + 4}
       C ${W * 0.80},${rt + 8} ${W * 0.78},${rm - 6} ${W * 0.76},${rm + 2}
       C ${W * 0.74},${rb - 14} ${W * 0.72},${rb - 8} ${W * 0.72},${rb}`,
    ];
  }
  if (type === "premolar" && isUpper) {
    // Upper premolar: 2 thin roots, slightly divergent
    return [
      `M ${W * 0.28},${rb}
       C ${W * 0.28},${rb - 8} ${W * 0.26},${rb - 16} ${W * 0.24},${rm + 2}
       C ${W * 0.22},${rm - 8} ${W * 0.24},${rt + 10} ${W * 0.26},${rt + 4}
       C ${W * 0.27},${rt + 1} ${W * 0.30},${rt + 1} ${W * 0.31},${rt + 4}
       C ${W * 0.33},${rt + 10} ${W * 0.35},${rm - 6} ${W * 0.36},${rm + 2}
       C ${W * 0.37},${rb - 14} ${W * 0.38},${rb - 6} ${W * 0.40},${rb}`,
      `M ${W * 0.60},${rb}
       C ${W * 0.62},${rb - 6} ${W * 0.63},${rb - 14} ${W * 0.64},${rm + 2}
       C ${W * 0.65},${rm - 6} ${W * 0.67},${rt + 10} ${W * 0.69},${rt + 4}
       C ${W * 0.70},${rt + 1} ${W * 0.73},${rt + 1} ${W * 0.74},${rt + 4}
       C ${W * 0.76},${rt + 10} ${W * 0.78},${rm - 8} ${W * 0.76},${rm + 2}
       C ${W * 0.74},${rb - 16} ${W * 0.72},${rb - 8} ${W * 0.72},${rb}`,
    ];
  }
  if (type === "premolar") {
    // Lower premolar: single conical root
    return [
      `M ${W * 0.38},${rb}
       C ${W * 0.38},${rb - 8} ${W * 0.40},${rb - 18} ${W * 0.42},${rm}
       C ${W * 0.44},${rm - 10} ${W * 0.46},${rt + 8} ${W * 0.48},${rt + 3}
       C ${W * 0.49},${rt} ${W * 0.51},${rt} ${W * 0.52},${rt + 3}
       C ${W * 0.54},${rt + 8} ${W * 0.56},${rm - 10} ${W * 0.58},${rm}
       C ${W * 0.60},${rb - 18} ${W * 0.62},${rb - 8} ${W * 0.62},${rb}`,
    ];
  }
  // Canine: single long thick root — longest root of all teeth
  if (type === "canine") {
    return [
      `M ${W * 0.34},${rb}
       C ${W * 0.34},${rb - 8} ${W * 0.36},${rb - 18} ${W * 0.38},${rm + 2}
       C ${W * 0.40},${rm - 8} ${W * 0.42},${rm - 16} ${W * 0.44},${rt + 6}
       C ${W * 0.46},${rt + 2} ${W * 0.48},${rt} ${W * 0.50},${rt}
       C ${W * 0.52},${rt} ${W * 0.54},${rt + 2} ${W * 0.56},${rt + 6}
       C ${W * 0.58},${rm - 16} ${W * 0.60},${rm - 8} ${W * 0.62},${rm + 2}
       C ${W * 0.64},${rb - 18} ${W * 0.66},${rb - 8} ${W * 0.66},${rb}`,
    ];
  }
  // Incisor: single shorter conical root
  return [
    `M ${W * 0.36},${rb}
     C ${W * 0.36},${rb - 6} ${W * 0.38},${rb - 14} ${W * 0.40},${rm + 4}
     C ${W * 0.42},${rm - 4} ${W * 0.44},${rm - 12} ${W * 0.46},${rt + 6}
     C ${W * 0.47},${rt + 2} ${W * 0.49},${rt + 1} ${W * 0.50},${rt + 1}
     C ${W * 0.51},${rt + 1} ${W * 0.53},${rt + 2} ${W * 0.54},${rt + 6}
     C ${W * 0.56},${rm - 12} ${W * 0.58},${rm - 4} ${W * 0.60},${rm + 4}
     C ${W * 0.62},${rb - 14} ${W * 0.64},${rb - 6} ${W * 0.64},${rb}`,
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
