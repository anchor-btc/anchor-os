'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Check, Network, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BitcoinNetwork = 'regtest' | 'testnet' | 'mainnet';

interface NetworkOption {
  id: BitcoinNetwork;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  comingSoon?: boolean;
  color: string;
}

interface NetworkStepProps {
  selectedNetwork: BitcoinNetwork;
  onNetworkChange: (network: BitcoinNetwork) => void;
  onNext: () => void;
  onBack: () => void;
}

export function NetworkStep({
  selectedNetwork,
  onNetworkChange,
  onNext,
  onBack,
}: NetworkStepProps) {
  const { t } = useTranslation();

  const networks: NetworkOption[] = [
    {
      id: 'regtest',
      name: t('setup.network.regtest.name', 'Regtest'),
      description: t(
        'setup.network.regtest.description',
        'Local development network. Perfect for testing and building applications without real Bitcoin.'
      ),
      icon: '🧪',
      enabled: true,
      color: 'from-emerald-500/20 to-emerald-600/10',
    },
    {
      id: 'testnet',
      name: t('setup.network.testnet.name', 'Testnet'),
      description: t(
        'setup.network.testnet.description',
        'Bitcoin test network. Use test coins to experiment with real network conditions.'
      ),
      icon: '🔬',
      enabled: false,
      comingSoon: true,
      color: 'from-amber-500/20 to-amber-600/10',
    },
    {
      id: 'mainnet',
      name: t('setup.network.mainnet.name', 'Mainnet'),
      description: t(
        'setup.network.mainnet.description',
        'Bitcoin main network. The real deal - use with actual Bitcoin.'
      ),
      icon: '₿',
      enabled: false,
      comingSoon: true,
      color: 'from-orange-500/20 to-orange-600/10',
    },
  ];

  const handleNetworkSelect = (network: NetworkOption) => {
    if (network.enabled) {
      onNetworkChange(network.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Network className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t('setup.network.title', 'Select Network')}</h2>
        <p className="text-muted-foreground">
          {t('setup.network.description', 'Choose which Bitcoin network to connect to')}
        </p>
      </div>

      {/* Network Cards */}
      <div className="grid gap-4 max-w-2xl mx-auto">
        {networks.map((network) => (
          <button
            key={network.id}
            onClick={() => handleNetworkSelect(network)}
            disabled={!network.enabled}
            className={cn(
              'relative flex items-start gap-4 p-5 rounded-xl border-2 transition-all text-left',
              network.enabled
                ? selectedNetwork === network.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
                : 'border-border/50 opacity-60 cursor-not-allowed'
            )}
          >
            {/* Gradient Background */}
            <div
              className={cn(
                'absolute inset-0 rounded-xl bg-gradient-to-br opacity-50',
                network.color
              )}
            />

            {/* Icon */}
            <div className="relative z-10 text-3xl flex-shrink-0 mt-1">{network.icon}</div>

            {/* Content */}
            <div className="relative z-10 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground text-lg">{network.name}</span>
                {network.comingSoon && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Sparkles className="w-3 h-3" />
                    {t('setup.network.comingSoon', 'Coming Soon')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{network.description}</p>

              {/* Coming Soon overlay message */}
              {network.comingSoon && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  <span>
                    {t(
                      'setup.network.comingSoonHint',
                      'This network will be available in a future update'
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Selection Indicator */}
            {network.enabled && selectedNetwork === network.id && (
              <div className="relative z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-1">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}

            {/* Disabled Lock */}
            {!network.enabled && (
              <div className="relative z-10 w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                <Lock className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 max-w-2xl mx-auto">
        <span className="text-xl">🧪</span>
        <div>
          <p className="text-sm font-medium text-foreground">
            {t('setup.network.regtestInfo.title', 'Why Regtest?')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'setup.network.regtestInfo.description',
              'Regtest is a local blockchain that lets you generate blocks instantly. Perfect for development and testing Anchor apps without waiting for confirmations or spending real Bitcoin.'
            )}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <Button onClick={onNext}>{t('common.continue', 'Continue')}</Button>
      </div>
    </div>
  );
}
