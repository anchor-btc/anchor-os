'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCloudflareStatus,
  connectCloudflare,
  disconnectCloudflare,
  fetchExposableServices,
} from '@/lib/api';
import {
  Loader2,
  Cloud,
  Key,
  Server,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Play,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Import DS components
import {
  PageHeader,
  RefreshButton,
  Section,
  SectionHeader,
  Grid,
  ActionButton,
  InfoBox,
} from '@/components/ds';

export default function CloudflarePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const {
    data: status,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['cloudflare-status'],
    queryFn: fetchCloudflareStatus,
    refetchInterval: 5000,
  });

  const { data: servicesData } = useQuery({
    queryKey: ['cloudflare-services'],
    queryFn: fetchExposableServices,
  });

  const connectMutation = useMutation({
    mutationFn: connectCloudflare,
    onSuccess: (data) => {
      if (data.success) {
        setToken('');
      }
      queryClient.invalidateQueries({ queryKey: ['cloudflare-status'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectCloudflare,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudflare-status'] });
    },
  });

  const handleConnect = () => {
    if (!token.trim()) return;
    connectMutation.mutate({ token });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status?.running && status?.connected;
  const isRunning = status?.running;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Cloud}
        iconColor="orange"
        title={t('cloudflare.title')}
        subtitle={t('cloudflare.subtitle')}
        actions={<RefreshButton loading={isRefetching} onClick={() => refetch()} />}
      />

      {/* Status Card */}
      <Section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t('cloudflare.connectionStatus')}
          </h2>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="w-4 h-4" />
                {t('cloudflare.connected')}
              </span>
            ) : isRunning ? (
              <span className="flex items-center gap-2 text-sm text-warning">
                <AlertCircle className="w-4 h-4" />
                {t('cloudflare.connecting')}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4" />
                {t('cloudflare.notRunning')}
              </span>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <Grid cols={{ default: 2, md: 3 }} gap="md" className="mb-6">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Server className="w-4 h-4" />
              {t('cloudflare.container')}
            </div>
            <div
              className={cn('font-medium', isRunning ? 'text-success' : 'text-muted-foreground')}
            >
              {isRunning ? t('cloudflare.running') : t('cloudflare.stopped')}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Cloud className="w-4 h-4" />
              {t('cloudflare.tunnel')}
            </div>
            <div
              className={cn('font-medium', isConnected ? 'text-success' : 'text-muted-foreground')}
            >
              {isConnected
                ? t('cloudflare.connected')
                : isRunning
                  ? t('cloudflare.connecting')
                  : t('cloudflare.disconnected')}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="w-4 h-4" />
              {t('cloudflare.status')}
            </div>
            <div className="font-medium text-foreground text-sm">
              {status?.container_status || '-'}
            </div>
          </div>
        </Grid>

        {/* Info when connected */}
        {isConnected && (
          <InfoBox
            variant="success"
            icon={CheckCircle2}
            title={t('cloudflare.tunnelConnected')}
            className="mb-6"
          >
            {status?.tunnel_info || t('cloudflare.tunnelInfo')}
          </InfoBox>
        )}

        {/* Container Controls */}
        {isRunning && (
          <ActionButton
            variant="stop"
            loading={disconnectMutation.isPending}
            onClick={handleDisconnect}
            label={t('cloudflare.stopTunnel')}
          />
        )}
      </Section>

      {/* Connect Form */}
      {!isRunning && (
        <Section>
          <SectionHeader
            icon={Key}
            iconColor="orange"
            title={t('cloudflare.connectToCloudflare')}
          />

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('cloudflare.tunnelToken')}
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="eyJhIjoiNz..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t('cloudflare.getToken')}{' '}
                <a
                  href="https://one.dash.cloudflare.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline inline-flex items-center gap-1"
                >
                  {t('cloudflare.zeroTrustDashboard')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>

            {connectMutation.isError && (
              <InfoBox variant="error">{t('cloudflare.connectError')}</InfoBox>
            )}

            {connectMutation.data && !connectMutation.data.success && (
              <InfoBox variant="error">{connectMutation.data.message}</InfoBox>
            )}

            <ActionButton
              variant="primary"
              loading={connectMutation.isPending}
              onClick={handleConnect}
              disabled={!token.trim() || connectMutation.isPending}
              icon={Play}
              label={
                connectMutation.isPending ? t('cloudflare.connecting') : t('cloudflare.startTunnel')
              }
              fullWidth
            />
          </div>
        </Section>
      )}

      {/* Available Services */}
      <Section>
        <SectionHeader
          icon={Server}
          iconColor="muted"
          title={t('cloudflare.availableServices')}
          subtitle={
            <>
              {t('cloudflare.configureHostnames')}{' '}
              <a
                href="https://one.dash.cloudflare.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 hover:underline"
              >
                {t('cloudflare.cloudflareDashboard')}
              </a>
              . {t('cloudflare.useInternalUrls')}
            </>
          }
        />

        <div className="space-y-3 mt-4">
          {servicesData?.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
            >
              <div>
                <div className="font-medium text-foreground">{service.name}</div>
                <div className="text-xs text-muted-foreground">{service.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {service.local_url}
                </code>
                <button
                  onClick={() => copyToClipboard(service.local_url, service.name)}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title={t('cloudflare.copyUrl')}
                >
                  {copied === service.name ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Help Section */}
      <Section className="bg-muted/30">
        <h3 className="font-semibold text-foreground mb-3">{t('cloudflare.howToUse')}</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            {t('cloudflare.step1')}{' '}
            <a
              href="https://one.dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:underline"
            >
              {t('cloudflare.zeroTrustDashboard')}
            </a>
          </li>
          <li>{t('cloudflare.step2')}</li>
          <li>{t('cloudflare.step3')}</li>
          <li>{t('cloudflare.step4')}</li>
          <li>{t('cloudflare.step5')}</li>
          <li>{t('cloudflare.step6')}</li>
        </ol>
      </Section>
    </div>
  );
}
