"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  X,
  Wallet,
  Bitcoin,
  Database,
  Activity,
  ArrowLeftRight,
  HardDrive,
  Layers,
  TrendingUp,
  Rocket,
  AppWindow,
  Search,
  Network,
  Server,
} from "lucide-react";
import { WidgetType, WidgetDefinition } from "@/types/widgets";

const iconMap: Record<string, React.ElementType> = {
  Rocket,
  Activity,
  Wallet,
  ArrowLeftRight,
  Bitcoin,
  Database,
  HardDrive,
  Layers,
  TrendingUp,
  AppWindow,
  Search,
  Network,
  Server,
};

interface WidgetPickerProps {
  availableWidgets: WidgetDefinition[];
  onAddWidget: (type: WidgetType) => void;
}

export function WidgetPicker({ availableWidgets, onAddWidget }: WidgetPickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleAdd = (type: WidgetType) => {
    onAddWidget(type);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        {t("dashboard.addWidget")}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">{t("dashboard.addWidget")}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {availableWidgets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {t("widgetPicker.allAdded")}
                </p>
              ) : (
                <div className="space-y-1">
                  {availableWidgets.map((widget) => {
                    const Icon = iconMap[widget.icon] || Activity;
                    return (
                      <button
                        key={widget.type}
                        onClick={() => handleAdd(widget.type)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground text-sm">
                            {t(widget.nameKey, widget.name)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t(widget.descriptionKey, widget.description)}
                          </p>
                        </div>
                        <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
