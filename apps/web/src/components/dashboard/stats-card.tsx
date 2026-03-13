import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  teal: { badge: "bg-primary-50 text-primary-700", border: "border-l-4 border-l-primary-400" },
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
    <div className={cn("bg-white rounded-xl border p-5", styles.border, className)}>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      )}
    </div>
  );
}
