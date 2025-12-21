"use client";

import { CATEGORIES, type Category } from "@/lib/api";
import {
  MapPin,
  Camera,
  ShoppingBag,
  Calendar,
  AlertTriangle,
  Landmark,
} from "lucide-react";
import { clsx } from "clsx";

interface CategoryFilterProps {
  selectedCategory: number | null;
  onCategoryChange: (category: number | null) => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "map-pin": MapPin,
  "camera": Camera,
  "shopping-bag": ShoppingBag,
  "calendar": Calendar,
  "alert-triangle": AlertTriangle,
  "landmark": Landmark,
};

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
}: CategoryFilterProps) {
  return (
    <div className="flex items-center gap-1.5 bg-secondary/90 backdrop-blur-sm rounded-xl border border-map-border p-1.5">
      {/* All button */}
      <button
        onClick={() => onCategoryChange(null)}
        className={clsx(
          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
          selectedCategory === null
            ? "bg-primary text-white shadow-sm"
            : "text-secondary-foreground hover:bg-map-bg hover:text-foreground"
        )}
      >
        All
      </button>

      {/* Category buttons */}
      {CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.icon] || MapPin;
        const isSelected = selectedCategory === category.id;

        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            title={category.name}
            className={clsx(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all",
              isSelected
                ? "text-white shadow-sm"
                : "text-secondary-foreground hover:bg-map-bg hover:text-foreground"
            )}
            style={{
              backgroundColor: isSelected ? category.color : undefined,
            }}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  const Icon = CATEGORY_ICONS[category.icon] || MapPin;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: category.color }}
    >
      <Icon className="w-3 h-3" />
      {category.name}
    </span>
  );
}

