"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Check, RefreshCw } from "lucide-react";
import { supportedLanguages } from "@/lib/i18n/config";

export default function LanguagePage() {
  const { t, i18n } = useTranslation();
  const [hasChanges, setHasChanges] = useState(false);

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("anchor-os-language", code);
    setHasChanges(true);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Languages className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("language.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("language.description")}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`
                w-full flex items-center justify-between p-4 rounded-lg border transition-colors text-left
                ${
                  i18n.language === lang.code
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{lang.flag}</span>
                <div>
                  <div className="font-medium text-foreground">{lang.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {lang.nativeName}
                  </div>
                </div>
              </div>
              {i18n.language === lang.code && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {hasChanges && (
          <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">
                {t("language.reloadRequired")}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("language.reloadRequiredDesc")}
              </p>
            </div>
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {t("language.reload")}
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          {t("common.note", "Note")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("language.note")}</p>
      </div>

      {/* Transifex Integration Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">
          Transifex Integration
        </h3>
        <p className="text-sm text-muted-foreground">
          Translation files are located at{" "}
          <code className="px-1 py-0.5 bg-muted rounded text-xs">
            /public/locales/[lang]/common.json
          </code>
          . These can be synced with Transifex for collaborative translation
          management.
        </p>
      </div>
    </div>
  );
}





