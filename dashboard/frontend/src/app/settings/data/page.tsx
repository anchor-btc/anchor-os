'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n/config';
import { useRouter } from 'next/navigation';
import {
  Database,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Check,
  Loader2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { resetInstallation } from '@/lib/api';

const DASHBOARD_BACKEND_URL =
  process.env.NEXT_PUBLIC_DASHBOARD_BACKEND_URL || 'http://localhost:8010';

export default function DataPage() {
  const { t } = useTranslation();
  useRouter(); // Keep for potential navigation
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Factory reset state
  const [showFactoryReset, setShowFactoryReset] = useState(false);
  const [factoryResetConfirm, setFactoryResetConfirm] = useState(false);
  const [factoryResetAuth, setFactoryResetAuth] = useState(true);
  const [factoryResetServices, setFactoryResetServices] = useState(true);
  const [resetting, setResetting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      // Export backend settings
      const res = await fetch(`${DASHBOARD_BACKEND_URL}/settings/export`);
      const backendSettings = res.ok ? await res.json() : { settings: [] };

      // Export localStorage settings
      const localSettings: Record<string, unknown> = {};
      const keys = [
        'anchor-os-theme',
        'anchor-os-theme-auto',
        'anchor-os-language',
        'anchor-dashboard-widgets',
      ];

      keys.forEach((key) => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            localSettings[key] = JSON.parse(value);
          } catch {
            localSettings[key] = value;
          }
        }
      });

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        backend: backendSettings,
        local: localSettings,
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `anchor-os-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(t('data.exportSuccess'));
    } catch {
      setError(t('common.error'));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate format
      if (!data.version || !data.exportedAt) {
        throw new Error(t('data.importError'));
      }

      // Import backend settings
      if (data.backend?.settings?.length > 0) {
        await fetch(`${DASHBOARD_BACKEND_URL}/settings/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: data.backend.settings }),
        });
      }

      // Import localStorage settings
      if (data.local) {
        Object.entries(data.local).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
      }

      setSuccess(t('data.importSuccess'));
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('data.importError'));
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleReset = async () => {
    if (!confirm(t('data.resetConfirm'))) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      // Clear localStorage
      const keys = [
        'anchor-os-theme',
        'anchor-os-theme-auto',
        'anchor-os-language',
        'anchor-dashboard-widgets',
        'anchor-os-token',
        'anchor-os-last-activity',
      ];
      keys.forEach((key) => localStorage.removeItem(key));

      // Reset backend settings (disable auth, reset to defaults)
      await fetch(`${DASHBOARD_BACKEND_URL}/auth/disable`, { method: 'DELETE' });

      setSuccess(t('data.resetSuccess'));
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError(t('common.error'));
    }
  };

  const handleFactoryReset = async () => {
    if (!factoryResetConfirm) {
      setError(t('data.factoryReset.confirmRequired'));
      return;
    }

    setResetting(true);
    setError(null);
    setSuccess(null);

    try {
      // Call backend to reset installation
      await resetInstallation({
        confirmation: 'RESET',
        reset_auth: factoryResetAuth,
        reset_services: factoryResetServices,
      });

      // Clear ALL localStorage - complete reset
      localStorage.clear();

      // Also clear sessionStorage
      sessionStorage.clear();

      // Force language back to English (default)
      await i18n.changeLanguage('en');

      setSuccess('Factory reset complete! Redirecting to setup...');

      // Force a hard reload to clear all cached state and redirect to setup
      setTimeout(() => {
        window.location.href = '/setup';
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Export Settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{t('data.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('data.description')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Export */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">{t('data.export')}</div>
                <div className="text-sm text-muted-foreground">{t('data.exportDesc')}</div>
              </div>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {t('data.export')}
            </button>
          </div>

          {/* Import */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="font-medium text-foreground">{t('data.import')}</div>
                <div className="text-sm text-muted-foreground">{t('data.importDesc')}</div>
              </div>
            </div>
            <label
              className={`
                px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium 
                hover:bg-secondary/80 transition-colors cursor-pointer flex items-center gap-2
                ${importing ? 'opacity-50 pointer-events-none' : ''}
              `}
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {t('data.import')}
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Reset to Defaults */}
      <div className="bg-card border border-error/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-error/10">
            <RotateCcw className="w-5 h-5 text-error" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t('data.dangerZone')}</h3>
            <p className="text-sm text-muted-foreground">{t('data.dangerZoneDesc')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-error/30 bg-error/5">
          <div>
            <div className="font-medium text-foreground">{t('data.reset')}</div>
            <div className="text-sm text-muted-foreground">{t('data.resetDesc')}</div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t('data.reset')}
          </button>
        </div>
      </div>

      {/* Factory Reset - Start Fresh */}
      <div className="bg-card border-2 border-error/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-error/20">
            <Trash2 className="w-5 h-5 text-error" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {t('data.factoryReset.title', 'Factory Reset')}
              <span className="text-xs px-2 py-0.5 rounded-full bg-error/20 text-error">
                {t('data.factoryReset.devMode', 'Dev Mode')}
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              {t(
                'data.factoryReset.description',
                'Reset everything and start the setup wizard from scratch'
              )}
            </p>
          </div>
        </div>

        {!showFactoryReset ? (
          <button
            onClick={() => setShowFactoryReset(true)}
            className="w-full px-4 py-3 border-2 border-dashed border-error/30 rounded-lg text-sm text-error hover:bg-error/5 transition-colors flex items-center justify-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            {t('data.factoryReset.showOptions', 'Show Factory Reset Options')}
          </button>
        ) : (
          <div className="space-y-4">
            {/* Warning */}
            <div className="p-4 rounded-lg bg-error/10 border border-error/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-error">
                  {t('data.factoryReset.warning', 'Warning: This action cannot be undone!')}
                </p>
                <p className="text-sm text-error/80 mt-1">
                  {t(
                    'data.factoryReset.warningDesc',
                    'All settings and installation configuration will be reset. Backup data will be preserved.'
                  )}
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={factoryResetAuth}
                  onChange={(e) => setFactoryResetAuth(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  {t('data.factoryReset.resetAuth', 'Reset password and authentication')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={factoryResetServices}
                  onChange={(e) => setFactoryResetServices(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">
                  {t('data.factoryReset.resetServices', 'Reset service installation status')}
                </span>
              </label>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  {t(
                    'data.factoryReset.preserved',
                    '✓ Backup data and Electrum settings will be preserved'
                  )}
                </p>
              </div>
            </div>

            {/* Confirmation */}
            <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-error/30 bg-error/5">
              <input
                type="checkbox"
                checked={factoryResetConfirm}
                onChange={(e) => setFactoryResetConfirm(e.target.checked)}
                className="w-5 h-5 rounded border-error text-error focus:ring-error"
              />
              <span className="text-sm font-medium text-error">
                {t(
                  'data.factoryReset.confirmCheck',
                  'I understand this will reset everything and start the setup wizard'
                )}
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFactoryReset(false);
                  setFactoryResetConfirm(false);
                }}
                className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleFactoryReset}
                disabled={!factoryResetConfirm || resetting}
                className="flex-1 px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {resetting
                  ? t('data.factoryReset.resetting', 'Resetting...')
                  : t('data.factoryReset.button', 'Factory Reset')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-foreground mb-2">{t('data.whatExported')}</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>{t('data.exportedItems.theme')}</li>
          <li>{t('data.exportedItems.language')}</li>
          <li>{t('data.exportedItems.widgets')}</li>
          <li>{t('data.exportedItems.notifications')}</li>
          <li>{t('data.exportedItems.network')}</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          <strong>{t('common.note')}:</strong> {t('data.passwordNote')}
        </p>
      </div>
    </div>
  );
}
