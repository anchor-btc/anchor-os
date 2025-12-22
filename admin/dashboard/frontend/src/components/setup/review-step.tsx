"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { InstallationPreset, ServiceDefinition, ServiceCategory } from "@/lib/api";
import { categoryLabels } from "@/lib/service-rules";
import { ChevronLeft, AlertCircle, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewStepProps {
  preset: InstallationPreset;
  selectedServices: string[];
  availableServices: ServiceDefinition[];
  error: string | null;
  onInstall: () => void;
  onBack: () => void;
}

const categoryOrder: ServiceCategory[] = [
  "core",
  "dashboard",
  "explorer",
  "networking",
  "monitoring",
  "app",
];

export function ReviewStep({
  preset,
  selectedServices,
  availableServices,
  error,
  onInstall,
  onBack,
}: ReviewStepProps) {
  const { t } = useTranslation();

  const selectedServiceDetails = availableServices.filter((s) =>
    selectedServices.includes(s.id)
  );

  const groupedServices = selectedServiceDetails.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<ServiceCategory, ServiceDefinition[]>);

  const presetNames: Record<InstallationPreset, string> = {
    minimum: t("setup.preset.minimum", "Minimum"),
    default: t("setup.preset.default", "Default"),
    full: t("setup.preset.full", "Full"),
    custom: t("setup.preset.custom", "Custom"),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("setup.review.title", "Review Installation")}</h2>
        <p className="text-muted-foreground">
          {t("setup.review.description", "Review the services that will be installed")}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Preset badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <span className="text-sm font-medium">
            {t("setup.review.preset", "Preset")}: {presetNames[preset]}
          </span>
        </div>
      </div>

      {/* Services summary */}
      <div className="bg-muted/50 rounded-xl p-4 max-h-[300px] overflow-y-auto">
        <div className="space-y-4">
          {categoryOrder.map((category) => {
            const categoryServices = groupedServices[category];
            if (!categoryServices || categoryServices.length === 0) return null;

            return (
              <div key={category}>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {categoryLabels[category]}
                </h4>
                <div className="space-y-1">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                      <span>{service.name}</span>
                      {service.required && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {t("setup.review.required", "Required")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex justify-center gap-8 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">{selectedServices.length}</div>
          <div className="text-sm text-muted-foreground">
            {t("setup.review.services", "Services")}
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-primary">
            {selectedServiceDetails.reduce((acc, s) => acc + s.containers.length, 0)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("setup.review.containers", "Containers")}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("common.back", "Back")}
        </Button>
        <Button onClick={onInstall} className="px-6">
          <Download className="w-4 h-4 mr-2" />
          {t("setup.review.install", "Install")}
        </Button>
      </div>
    </div>
  );
}
