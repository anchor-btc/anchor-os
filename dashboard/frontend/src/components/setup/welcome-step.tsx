'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Bitcoin, Rocket, Shield, Zap } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const { t } = useTranslation();

  return (
    <div className="text-center space-y-8">
      {/* Logo and Title */}
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bitcoin className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t('setup.welcome.title', 'Welcome to Anchor OS')}</h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          {t(
            'setup.welcome.description',
            "Your personal Bitcoin operating system. Let's set up your node in just a few steps."
          )}
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold">{t('setup.welcome.feature1Title', 'Fast Setup')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('setup.welcome.feature1Description', 'Get your Bitcoin node running in minutes')}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold">{t('setup.welcome.feature2Title', 'Secure')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('setup.welcome.feature2Description', 'Self-custody with optional Tor privacy')}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold">{t('setup.welcome.feature3Title', 'Powerful')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('setup.welcome.feature3Description', 'Block explorers, apps, and more')}
          </p>
        </div>
      </div>

      {/* Action */}
      <div className="pt-4">
        <Button size="lg" onClick={onNext} className="px-8">
          {t('setup.welcome.getStarted', 'Get Started')}
        </Button>
      </div>
    </div>
  );
}
