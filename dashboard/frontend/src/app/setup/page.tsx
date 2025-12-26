'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  fetchInstallationStatus,
  fetchAvailableServices,
  applyInstallationPreset,
  applyCustomInstallation,
  completeSetup,
  updateUserProfile,
  InstallationPreset,
  ServiceDefinition,
  PresetInfo,
} from '@/lib/api';
import { WelcomeStep } from '@/components/setup/welcome-step';
import { ProfileStep } from '@/components/setup/profile-step';
import { LanguageStep } from '@/components/setup/language-step';
import { AppearanceStep } from '@/components/setup/appearance-step';
import { NetworkStep, BitcoinNetwork } from '@/components/setup/network-step';
import { PresetStep } from '@/components/setup/preset-step';
import { CustomStep } from '@/components/setup/custom-step';
import { ReviewStep } from '@/components/setup/review-step';
import { SecurityStep } from '@/components/setup/security-step';
import { InstallingStep } from '@/components/setup/installing-step';
import { CompleteStep } from '@/components/setup/complete-step';

type SetupStep =
  | 'welcome'
  | 'profile'
  | 'language'
  | 'appearance'
  | 'network'
  | 'preset'
  | 'custom'
  | 'review'
  | 'security'
  | 'installing'
  | 'complete';

const STEP_ORDER: SetupStep[] = [
  'welcome',
  'profile',
  'language',
  'appearance',
  'network',
  'preset',
  'custom', // conditional
  'review',
  'security',
  'installing',
  'complete',
];

export default function SetupPage() {
  const { i18n } = useTranslation();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [selectedPreset, setSelectedPreset] = useState<InstallationPreset>('default');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceDefinition[]>([]);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installProgress] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');
  const [selectedNetwork, setSelectedNetwork] = useState<BitcoinNetwork>('regtest');
  const [userName, setUserName] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Check if setup was already completed
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const status = await fetchInstallationStatus();
        if (status.setup_completed) {
          router.push('/');
          return;
        }

        const servicesData = await fetchAvailableServices();
        setAvailableServices(servicesData.services);
        setPresets(servicesData.presets);

        // Set default services based on default preset
        const defaultPreset = servicesData.presets.find((p) => p.id === 'default');
        if (defaultPreset) {
          setSelectedServices(defaultPreset.services);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to check setup status:', err);
        setIsLoading(false);
      }
    }

    checkSetupStatus();
  }, [router]);

  const handlePresetSelect = (preset: InstallationPreset) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      setCurrentStep('custom');
    } else {
      const presetInfo = presets.find((p) => p.id === preset);
      if (presetInfo) {
        setSelectedServices(presetInfo.services);
      }
      setCurrentStep('review');
    }
  };

  const handleCustomServicesSelect = (services: string[]) => {
    setSelectedServices(services);
    setCurrentStep('review');
  };

  const handleInstall = async () => {
    setError(null);

    try {
      // Save user profile first
      if (userName.trim()) {
        try {
          await updateUserProfile(userName.trim(), userAvatar || undefined);
        } catch (e) {
          console.warn('Failed to save profile:', e);
        }
      }

      // Apply the installation configuration
      if (selectedPreset === 'custom') {
        await applyCustomInstallation(selectedServices);
      } else {
        await applyInstallationPreset(selectedPreset);
      }

      // Complete setup (this triggers the docker compose build via SSE)
      await completeSetup();

      // Move to installing step - the SSE stream will handle progress
      setCurrentStep('installing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
      setCurrentStep('review');
    }
  };

  const handleInstallComplete = () => {
    // Redirect to dashboard
    window.location.href = '/';
  };

  const handleInstallError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const handleComplete = () => {
    router.push('/');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'profile':
        setCurrentStep('welcome');
        break;
      case 'language':
        setCurrentStep('profile');
        break;
      case 'appearance':
        setCurrentStep('language');
        break;
      case 'network':
        setCurrentStep('appearance');
        break;
      case 'preset':
        setCurrentStep('network');
        break;
      case 'custom':
        setCurrentStep('preset');
        break;
      case 'review':
        if (selectedPreset === 'custom') {
          setCurrentStep('custom');
        } else {
          setCurrentStep('preset');
        }
        break;
      case 'security':
        setCurrentStep('review');
        break;
      default:
        break;
    }
  };

  const handleProfileChange = (name: string, avatar: string | null) => {
    setUserName(name);
    setUserAvatar(avatar);
  };

  const getProgressPercentage = () => {
    const stepIndex = STEP_ORDER.indexOf(currentStep);
    const totalSteps = STEP_ORDER.length;
    return ((stepIndex + 1) / totalSteps) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-lg overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      <div className="p-8">
        {currentStep === 'welcome' && <WelcomeStep onNext={() => setCurrentStep('profile')} />}

        {currentStep === 'profile' && (
          <ProfileStep
            userName={userName}
            userAvatar={userAvatar}
            onProfileChange={handleProfileChange}
            onNext={() => setCurrentStep('language')}
          />
        )}

        {currentStep === 'language' && (
          <LanguageStep
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onNext={() => setCurrentStep('appearance')}
            onBack={handleBack}
          />
        )}

        {currentStep === 'appearance' && (
          <AppearanceStep onNext={() => setCurrentStep('network')} onBack={handleBack} />
        )}

        {currentStep === 'network' && (
          <NetworkStep
            selectedNetwork={selectedNetwork}
            onNetworkChange={setSelectedNetwork}
            onNext={() => setCurrentStep('preset')}
            onBack={handleBack}
          />
        )}

        {currentStep === 'preset' && (
          <PresetStep
            presets={presets}
            selectedPreset={selectedPreset}
            onSelect={handlePresetSelect}
            onBack={handleBack}
          />
        )}

        {currentStep === 'custom' && (
          <CustomStep
            services={availableServices}
            selectedServices={selectedServices}
            onServicesChange={setSelectedServices}
            onNext={handleCustomServicesSelect}
            onBack={handleBack}
          />
        )}

        {currentStep === 'review' && (
          <ReviewStep
            preset={selectedPreset}
            selectedServices={selectedServices}
            availableServices={availableServices}
            error={error}
            onInstall={() => setCurrentStep('security')}
            onBack={handleBack}
          />
        )}

        {currentStep === 'security' && (
          <SecurityStep onNext={handleInstall} onBack={handleBack} onSkip={handleInstall} />
        )}

        {currentStep === 'installing' && (
          <InstallingStep
            progress={installProgress}
            selectedServices={selectedServices}
            availableServices={availableServices}
            onComplete={handleInstallComplete}
            onError={handleInstallError}
          />
        )}

        {currentStep === 'complete' && (
          <CompleteStep
            selectedServices={selectedServices}
            availableServices={availableServices}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
