"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { InstallationPreset, PresetInfo } from "@/lib/api";
import { Check, AlertTriangle, ChevronLeft, Cpu, Gauge, Layers, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresetStepProps {
  presets: PresetInfo[];
  selectedPreset: InstallationPreset;
  onSelect: (preset: InstallationPreset) => void;
  onBack: () => void;
}

const presetIcons: Record<InstallationPreset, React.ReactNode> = {
  minimum: <Gauge className="w-6 h-6" />,
  default: <Cpu className="w-6 h-6" />,
  full: <Layers className="w-6 h-6" />,
  custom: <Settings className="w-6 h-6" />,
};

const presetColors: Record<InstallationPreset, string> = {
  minimum: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  default: "bg-primary/10 text-primary border-primary/30",
  full: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  custom: "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

export function PresetStep({ presets, selectedPreset, onSelect, onBack }: PresetStepProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("setup.preset.title", "Choose Your Setup")}</h2>
        <p className="text-muted-foreground">
          {t("setup.preset.description", "Select a configuration that matches your needs")}
        </p>
      </div>

      {/* Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset.id)}
            className={cn(
              "p-6 rounded-xl border-2 text-left transition-all hover:shadow-md",
              selectedPreset === preset.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn("p-3 rounded-lg", presetColors[preset.id])}>
                {presetIcons[preset.id]}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{preset.name}</h3>
                  {selectedPreset === preset.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
                
                {preset.id !== "custom" && (
                  <p className="text-xs text-muted-foreground">
                    {t("setup.preset.servicesCount", "{{count}} services", { count: preset.services.length })}
                  </p>
                )}
                
                {preset.warning && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{preset.warning}</p>
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("common.back", "Back")}
        </Button>
        <Button onClick={() => onSelect(selectedPreset)}>
          {t("common.continue", "Continue")}
        </Button>
      </div>
    </div>
  );
}
