'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useTheme, ThemeInfo } from '@/contexts/theme-context';
import { ChevronLeft, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppearanceStepProps {
  onNext: () => void;
  onBack: () => void;
}

function ThemeCard({
  theme,
  isSelected,
  onSelect,
  t,
}: {
  theme: ThemeInfo;
  isSelected: boolean;
  onSelect: () => void;
  t: (key: string, fallback: string) => string;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-3 rounded-xl border-2 transition-all text-left',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50'
      )}
    >
      {/* Theme Preview */}
      <div
        className="w-full h-16 rounded-lg mb-2 overflow-hidden border border-border/50"
        style={{ backgroundColor: theme.preview.background }}
      >
        {/* Mock UI */}
        <div className="h-full flex">
          {/* Sidebar mock */}
          <div
            className="w-5 h-full"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            }}
          />
          {/* Content area */}
          <div className="flex-1 p-1.5">
            {/* Header bar */}
            <div
              className="h-1.5 w-8 rounded-full mb-1.5"
              style={{ backgroundColor: theme.preview.primary }}
            />
            {/* Cards */}
            <div className="flex gap-1">
              <div className="w-5 h-4 rounded" style={{ backgroundColor: theme.preview.card }} />
              <div className="w-5 h-4 rounded" style={{ backgroundColor: theme.preview.card }} />
            </div>
          </div>
        </div>
      </div>

      {/* Theme Info */}
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-medium text-foreground text-sm truncate">{theme.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {t(theme.descriptionKey, theme.description)}
          </div>
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
            <Check className="w-3 h-3 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}

export function AppearanceStep({ onNext, onBack }: AppearanceStepProps) {
  const { t } = useTranslation();
  const { theme, setTheme, themes } = useTheme();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
          <Palette className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t('setup.appearance.title', 'Choose Theme')}</h2>
        <p className="text-muted-foreground text-sm">
          {t('setup.appearance.description', 'Select a visual theme for your dashboard')}
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {themes.map((themeItem) => (
          <ThemeCard
            key={themeItem.id}
            theme={themeItem}
            isSelected={theme === themeItem.id}
            onSelect={() => setTheme(themeItem.id)}
            t={t}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <Button onClick={onNext}>{t('common.continue', 'Continue')}</Button>
      </div>
    </div>
  );
}
