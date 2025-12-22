"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ServiceDefinition } from "@/lib/api";
import { CheckCircle2, Rocket, Terminal, ExternalLink } from "lucide-react";

interface CompleteStepProps {
  selectedServices: string[];
  availableServices: ServiceDefinition[];
  onComplete: () => void;
}

export function CompleteStep({
  selectedServices,
  availableServices,
  onComplete,
}: CompleteStepProps) {
  const { t } = useTranslation();

  const selectedServiceDetails = availableServices.filter((s) =>
    selectedServices.includes(s.id)
  );

  return (
    <div className="space-y-8 text-center">
      {/* Success Icon */}
      <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{t("setup.complete.title", "Setup Complete!")}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {t(
            "setup.complete.description",
            "Your Anchor OS configuration has been saved. You're ready to start your Bitcoin node."
          )}
        </p>
      </div>

      {/* Summary */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
        <span className="text-sm font-medium">
          {t("setup.complete.servicesConfigured", "{{count}} services configured", {
            count: selectedServices.length,
          })}
        </span>
      </div>

      {/* Next steps */}
      <div className="max-w-md mx-auto bg-muted/50 rounded-xl p-6 text-left space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          {t("setup.complete.nextSteps", "Next Steps")}
        </h3>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium">
                {t("setup.complete.step1Title", "Start the services")}
              </p>
              <div className="mt-1 p-2 bg-background rounded-lg font-mono text-xs flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                <code>docker compose --profile default up -d</code>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium">
                {t("setup.complete.step2Title", "Access the dashboard")}
              </p>
              <p className="text-muted-foreground">
                {t("setup.complete.step2Description", "Open http://localhost:8000 in your browser")}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium">
                {t("setup.complete.step3Title", "Wait for sync")}
              </p>
              <p className="text-muted-foreground">
                {t("setup.complete.step3Description", "Your Bitcoin node will start syncing the blockchain")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="pt-4">
        <Button size="lg" onClick={onComplete} className="px-8">
          {t("setup.complete.goToDashboard", "Go to Dashboard")}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
