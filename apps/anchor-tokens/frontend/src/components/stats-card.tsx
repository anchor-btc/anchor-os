import { ReactNode } from "react";
import { formatNumber } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  change?: number;
}

export function StatsCard({ title, value, icon, change }: StatsCardProps) {
  const displayValue = typeof value === "number" ? formatNumber(value) : value;

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
      <div className="flex items-start justify-between mb-2">
        <span className="text-gray-400 text-sm">{title}</span>
        {icon}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold">{displayValue}</span>
        {change !== undefined && (
          <span
            className={`text-sm ${
              change >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </span>
        )}
      </div>
    </div>
  );
}
