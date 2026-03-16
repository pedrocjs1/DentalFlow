import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  teal: { badge: "bg-emerald-50 text-emerald-700", border: "border-l-4 border-l-emerald-400" },
  blue: { badge: "bg-blue-50 text-blue-700", border: "border-l-4 border-l-blue-400" },
  amber: { badge: "bg-amber-50 text-amber-700", border: "border-l-4 border-l-amber-400" },
  purple: { badge: "bg-purple-50 text-purple-700", border: "border-l-4 border-l-purple-400" },
};

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  accent?: keyof typeof ACCENT_STYLES;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  accent = "teal",
  className,
}: StatsCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200/80 p-5 hover:shadow-md transition-all duration-200", styles.border, className)}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
    </div>
  );
}
