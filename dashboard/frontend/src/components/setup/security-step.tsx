'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Shield, Eye, EyeOff, Lock, SkipForward } from 'lucide-react';

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || 'http://localhost:8010';

interface SecurityStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function SecurityStep({ onNext, onBack, onSkip }: SecurityStepProps) {
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const TIMEOUT_OPTIONS = [
    { value: 60, label: t('security.timeouts.1min', '1 minute') },
    { value: 300, label: t('security.timeouts.5min', '5 minutes') },
    { value: 900, label: t('security.timeouts.15min', '15 minutes') },
    { value: 1800, label: t('security.timeouts.30min', '30 minutes') },
    { value: 3600, label: t('security.timeouts.1hour', '1 hour') },
    { value: -1, label: t('security.timeouts.never', 'Never') },
  ];

  const [selectedTimeout, setSelectedTimeout] = useState(300);

  const handleSetupPassword = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError(t('security.passwordsDontMatch', 'Passwords do not match'));
      return;
    }
    if (password.length < 4) {
      setError(t('security.passwordTooShort', 'Password must be at least 4 characters'));
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          inactivity_timeout: selectedTimeout === -1 ? null : selectedTimeout,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onNext();
      } else {
        setError(data.message || t('common.error', 'An error occurred'));
      }
    } catch {
      setError(t('common.error', 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t('setup.security.title', 'Secure Your Dashboard')}</h2>
        <p className="text-muted-foreground">
          {t('setup.security.description', 'Set up a password to protect your Anchor OS dashboard')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {/* Password Form */}
      <div className="space-y-4 max-w-md mx-auto">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('security.newPassword', 'New Password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={t('setup.security.passwordPlaceholder', 'Enter a secure password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('security.confirmPassword', 'Confirm Password')}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={t('setup.security.confirmPlaceholder', 'Confirm your password')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            {t('security.autoLock', 'Auto-Lock')}
          </label>
          <select
            value={selectedTimeout}
            onChange={(e) => setSelectedTimeout(Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {t('security.autoLockDesc', 'Lock screen after period of inactivity')}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 max-w-md mx-auto">
        <Lock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          {t(
            'setup.security.info',
            'Password protection is optional but recommended to prevent unauthorized access to your Bitcoin node.'
          )}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {t('common.back', 'Back')}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip}>
            <SkipForward className="w-4 h-4 mr-2" />
            {t('setup.security.skip', 'Skip for now')}
          </Button>
          <Button onClick={handleSetupPassword} disabled={saving || !password}>
            {t('setup.security.setPassword', 'Set Password')}
          </Button>
        </div>
      </div>
    </div>
  );
}
