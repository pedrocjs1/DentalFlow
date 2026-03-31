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

function isUpperMolar3Root(fdi: number): boolean {
  const quad = Math.floor(fdi / 10);
  return quad === 1 || quad === 2;
}

// ─── SVG paths for lateral silhouettes (upper orientation: roots up, crown down) ─
// All paths drawn in a 40×70 viewBox. Flipped vertically for lower teeth.

function getCrownPath(type: ToothType): string {
  switch (type) {
    case "molar":
      return "M 4,35 C 4,33 5,28 8,26 C 10,24 12,22 14,23 C 16,21 18,20 20,22 C 22,20 24,21 26,23 C 28,22 30,24 32,26 C 35,28 36,33 36,35 L 36,44 C 36,48 34,50 30,50 L 10,50 C 6,50 4,48 4,44 Z";
    case "premolar":
      return "M 7,35 C 7,32 9,27 12,25 C 14,23 17,22 20,24 C 23,22 26,23 28,25 C 31,27 33,32 33,35 L 33,44 C 33,48 31,50 27,50 L 13,50 C 9,50 7,48 7,44 Z";
    case "canine":
      return "M 9,35 C 9,32 11,26 15,23 C 18,20 20,19 20,19 C 20,19 22,20 25,23 C 29,26 31,32 31,35 L 31,44 C 31,48 29,50 26,50 L 14,50 C 11,50 9,48 9,44 Z";
    case "incisor":
      return "M 8,32 C 8,30 9,27 12,25 L 12,25 C 14,24 17,24 20,24 C 23,24 26,24 28,25 C 31,27 32,30 32,32 L 32,44 C 32,48 30,50 27,50 L 13,50 C 10,50 8,48 8,44 Z";
  }
}

function getRootPaths(type: ToothType, isUpper: boolean): string[] {
  if (type === "molar" && isUpper) {
    // 3 roots for upper molar
    return [
      "M 10,35 C 10,28 8,18 7,10 C 6,6 8,4 10,5 C 12,6 13,12 14,20 L 14,35",
      "M 18,35 C 18,28 19,18 20,10 C 20,6 20,4 20,4 C 20,4 20,6 20,10 C 21,18 22,28 22,35",
      "M 26,35 C 27,28 28,18 30,10 C 31,6 33,4 31,5 C 29,6 28,12 27,20 L 26,35",
    ];
  }
  if (type === "molar") {
    // 2 roots for lower molar
    return [
      "M 12,35 C 12,28 10,18 9,10 C 8,6 10,4 12,5 C 14,6 14,12 14,20 L 14,35",
      "M 28,35 C 28,28 30,18 31,10 C 32,6 30,4 28,5 C 26,6 26,12 26,20 L 26,35",
    ];
  }
  if (type === "premolar") {
    if (isUpper) {
      return [
        "M 16,35 C 16,28 14,18 13,10 C 12,6 14,4 16,5 C 17,6 17,12 17,20 L 17,35",
        "M 24,35 C 24,28 26,18 27,10 C 28,6 26,4 24,5 C 23,6 23,12 23,20 L 23,35",
      ];
    }
    return [
      "M 20,35 C 20,28 20,18 20,10 C 20,6 20,4 20,4 C 20,4 20,6 20,10 C 20,18 20,28 20,35",
    ];
  }
  // Canine + incisor: single root
  return [
    "M 20,35 C 20,28 19,18 19,10 C 19,6 20,3 20,3 C 20,3 21,6 21,10 C 21,18 20,28 20,35",
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

  const W = type === "molar" ? 40 : type === "premolar" ? 34 : type === "canine" ? 30 : 28;
  const H = 54;

  const crownPath = getCrownPath(type);
  const rootPaths = getRootPaths(type, isUpper);

  // For upper: roots on top (normal), crown on bottom
  // For lower: flip vertically
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
          /* Implant icon: screw + abutment + crown */
          <g>
            {/* Screw (root area) */}
            <path d={`M 17,4 L 23,4 L 22,30 L 18,30 Z`} fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
            {[10, 14, 18, 22, 26].map((y) => (
              <line key={y} x1={17} y1={y} x2={23} y2={y} stroke="#8B5CF6" strokeWidth={0.8} />
            ))}
            {/* Abutment */}
            <path d="M 15,30 L 25,30 L 24,36 L 16,36 Z" fill="#8B5CF6" opacity={0.3} stroke="#8B5CF6" strokeWidth={1} />
            {/* Crown */}
            <rect x={10} y={36} width={20} height={14} rx={3} fill="white" stroke="#8B5CF6" strokeWidth={1.2} />
          </g>
        ) : (
          <>
            {/* Roots */}
            {rootPaths.map((p, i) => (
              <path key={i} d={p} fill="white" stroke="#8B7355" strokeWidth={1.3} strokeLinejoin="round" />
            ))}

            {/* Endodontics: red line inside root canal */}
            {isEndodontics && rootPaths.map((_, i) => (
              <line
                key={`endo-${i}`}
                x1={W / 2 + (i - (rootPaths.length - 1) / 2) * 8}
                y1={8}
                x2={W / 2 + (i - (rootPaths.length - 1) / 2) * 4}
                y2={34}
                stroke="#DC2626"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            ))}

            {/* Crown */}
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

        {/* Extraction: red X */}
        {isExtraction && (
          <g>
            <line x1={4} y1={4} x2={W - 4} y2={H - 4} stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" />
            <line x1={W - 4} y1={4} x2={4} y2={H - 4} stroke="#EF4444" strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )}
      </g>

      {/* Planned border */}
      {isPlanned && (
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={3} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3 2" />
      )}
    </svg>
  );
}
