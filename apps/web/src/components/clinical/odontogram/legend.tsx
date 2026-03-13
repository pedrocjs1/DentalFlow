import { CONDITION_COLORS, CONDITION_LABELS, type ToothCondition } from "./types";

const LEGEND_ITEMS: ToothCondition[] = [
  "CARIES", "RESTORATION_AMALGAM", "RESTORATION_RESIN", "RESTORATION_IONOMER",
  "CROWN", "ENDODONTICS", "EXTRACTION", "IMPLANT", "PROSTHESIS", "FRACTURE", "SEALANT", "ABSENT",
];

export function OdontogramLegend() {
  return (
    <div className="mt-4 pt-4 border-t">
      <p className="text-xs font-medium text-gray-500 mb-2">Leyenda</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {LEGEND_ITEMS.map((condition) => (
          <div key={condition} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: CONDITION_COLORS[condition] }}
            />
            <span className="text-[11px] text-gray-500">{CONDITION_LABELS[condition]}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-dashed border-green-500 flex-shrink-0" />
          <span className="text-[11px] text-gray-500">Planificado</span>
        </div>
      </div>
    </div>
  );
}
