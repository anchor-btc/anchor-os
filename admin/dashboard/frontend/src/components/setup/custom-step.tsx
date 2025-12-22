"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceDefinition, ServiceCategory } from "@/lib/api";
import {
  categoryLabels,
  categoryDescriptions,
  checkIncompatibility,
  getAllDependencies,
  requiredServices,
} from "@/lib/service-rules";
import { ChevronLeft, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomStepProps {
  services: ServiceDefinition[];
  selectedServices: string[];
  onServicesChange: (services: string[]) => void;
  onNext: (services: string[]) => void;
  onBack: () => void;
}

const categoryOrder: ServiceCategory[] = [
  "core",
  "explorer",
  "networking",
  "monitoring",
  "app",
];

export function CustomStep({
  services,
  selectedServices,
  onServicesChange,
  onNext,
  onBack,
}: CustomStepProps) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<ServiceCategory, ServiceDefinition[]>);

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    setError(null);

    if (checked) {
      // Check for incompatibilities
      const incompatible = checkIncompatibility(serviceId, selectedServices);
      if (incompatible) {
        setError(
          t("setup.custom.incompatibleError", 
            "Cannot select {{service}} - it is incompatible with {{incompatible}}", 
            { service: serviceId, incompatible }
          )
        );
        return;
      }

      // Add service and its dependencies
      const dependencies = getAllDependencies(serviceId);
      const newServices = [...selectedServices, serviceId];
      for (const dep of dependencies) {
        if (!newServices.includes(dep)) {
          newServices.push(dep);
        }
      }
      onServicesChange(newServices);
    } else {
      // Check if service is required
      if (requiredServices.includes(serviceId)) {
        setError(t("setup.custom.requiredError", "This service is required and cannot be removed"));
        return;
      }

      // Check if other selected services depend on this one
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        for (const selectedId of selectedServices) {
          const selectedService = services.find((s) => s.id === selectedId);
          if (selectedService?.depends_on.includes(serviceId)) {
            setError(
              t("setup.custom.dependencyError",
                "Cannot remove {{service}} - {{dependent}} depends on it",
                { service: serviceId, dependent: selectedId }
              )
            );
            return;
          }
        }
      }

      onServicesChange(selectedServices.filter((id) => id !== serviceId));
    }
  };

  const handleContinue = () => {
    // Ensure required services are included
    let finalServices = [...selectedServices];
    for (const required of requiredServices) {
      if (!finalServices.includes(required)) {
        finalServices.push(required);
      }
    }
    onNext(finalServices);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("setup.custom.title", "Custom Installation")}</h2>
        <p className="text-muted-foreground">
          {t("setup.custom.description", "Choose which services to install")}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Services by category */}
      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
        {categoryOrder.map((category) => {
          const categoryServices = groupedServices[category];
          if (!categoryServices || categoryServices.length === 0) return null;

          return (
            <div key={category} className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{categoryLabels[category]}</h3>
                <p className="text-sm text-muted-foreground">
                  {categoryDescriptions[category]}
                </p>
              </div>
              
              <div className="space-y-2">
                {categoryServices.map((service) => {
                  const isSelected = selectedServices.includes(service.id);
                  const isRequired = service.required;
                  const hasIncompatibility = service.incompatible_with.some((id) =>
                    selectedServices.includes(id)
                  );

                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        isSelected
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:border-primary/30",
                        hasIncompatibility && "opacity-50"
                      )}
                    >
                      <Checkbox
                        id={service.id}
                        checked={isSelected}
                        disabled={isRequired || hasIncompatibility}
                        onCheckedChange={(checked) =>
                          handleServiceToggle(service.id, checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={service.id}
                          className="font-medium cursor-pointer flex items-center gap-2"
                        >
                          {service.name}
                          {isRequired && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {t("setup.custom.required", "Required")}
                            </span>
                          )}
                        </label>
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                        {service.incompatible_with.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Info className="w-3 h-3" />
                            <span>
                              {t("setup.custom.incompatibleWith", "Incompatible with: {{services}}", {
                                services: service.incompatible_with.join(", "),
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected count */}
      <div className="text-center text-sm text-muted-foreground">
        {t("setup.custom.selectedCount", "{{count}} services selected", {
          count: selectedServices.length,
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("common.back", "Back")}
        </Button>
        <Button onClick={handleContinue}>
          {t("common.continue", "Continue")}
        </Button>
      </div>
    </div>
  );
}
