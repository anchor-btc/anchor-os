"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supportedLanguages } from "@/lib/i18n/config";
import { ChevronLeft, Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageStepProps {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function LanguageStep({
  selectedLanguage,
  onLanguageChange,
  onNext,
  onBack,
}: LanguageStepProps) {
  const { t, i18n } = useTranslation();

  const handleLanguageSelect = (code: string) => {
    onLanguageChange(code);
    i18n.changeLanguage(code);
    localStorage.setItem("anchor-os-language", code);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Languages className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t("setup.language.title", "Select Language")}</h2>
        <p className="text-muted-foreground">
          {t("setup.language.description", "Choose your preferred interface language")}
        </p>
      </div>

      {/* Language Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-2">
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
              selectedLanguage === lang.code
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground truncate">{lang.name}</div>
              <div className="text-sm text-muted-foreground truncate">{lang.nativeName}</div>
            </div>
            {selectedLanguage === lang.code && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t("common.back", "Back")}
        </Button>
        <Button onClick={onNext}>
          {t("common.continue", "Continue")}
        </Button>
      </div>
    </div>
  );
}
