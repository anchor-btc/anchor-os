'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTorStatus,
  newTorCircuit,
  startContainer,
  stopContainer,
  fetchContainers,
} from '@/lib/api';
import {
  Loader2,
  Shield,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Zap,
  Server,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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

export default function TorPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showAddresses, setShowAddresses] = useState(true);

  const {
    data: status,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['tor-status'],
    queryFn: fetchTorStatus,
    refetchInterval: 5000,
  });

  const { data: containersData } = useQuery({
    queryKey: ['containers'],
    queryFn: fetchContainers,
    refetchInterval: 5000,
  });

  const TOR_CONTAINER = 'anchor-networking-tor';

  const torContainer = containersData?.containers?.find((c) => c.name === TOR_CONTAINER);
  const isContainerRunning = torContainer?.state === 'running';

  const newCircuitMutation = useMutation({
    mutationFn: newTorCircuit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tor-status'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: () => startContainer(TOR_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      queryClient.invalidateQueries({ queryKey: ['tor-status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => stopContainer(TOR_CONTAINER),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      queryClient.invalidateQueries({ queryKey: ['tor-status'] });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status?.circuit_established;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Shield}
        iconColor="purple"
        title={t('tor.title')}
        subtitle={t('tor.subtitle')}
        actions={<RefreshButton loading={isRefetching} onClick={() => refetch()} />}
      />

      {/* Status Card */}
      <Section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">{t('tor.connectionStatus')}</h2>
          <div className="flex items-center gap-2">
            {isContainerRunning ? (
              isConnected ? (
                <span className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  {t('tor.connectedToTor')}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-sm text-warning">
                  <AlertCircle className="w-4 h-4" />
                  {t('tor.establishingCircuit')}
                </span>
              )
            ) : (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="w-4 h-4" />
                {t('tor.containerStopped')}
              </span>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <Grid cols={{ default: 2, md: 4 }} gap="md" className="mb-6">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Server className="w-4 h-4" />
              {t('tor.container')}
            </div>
            <div
              className={cn(
                'font-medium',
                isContainerRunning ? 'text-success' : 'text-muted-foreground'
              )}
            >
              {isContainerRunning ? t('tor.running') : t('tor.stopped')}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Shield className="w-4 h-4" />
              {t('tor.circuit')}
            </div>
            <div
              className={cn('font-medium', isConnected ? 'text-success' : 'text-muted-foreground')}
            >
              {isConnected ? t('tor.established') : t('tor.notReady')}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Globe className="w-4 h-4" />
              {t('tor.exitIP')}
            </div>
            <div className="font-medium font-mono text-foreground text-sm truncate">
              {status?.external_ip || '-'}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Zap className="w-4 h-4" />
              {t('tor.version')}
            </div>
            <div className="font-medium text-foreground truncate">{status?.tor_version || '-'}</div>
          </div>
        </Grid>

        {/* Info when connected */}
        {isConnected && (
          <InfoBox
            variant="success"
            icon={CheckCircle2}
            title={t('tor.connectedInfo')}
            className="mb-6"
          >
            {t('tor.trafficRouted')}{' '}
            <code className="bg-success/20 px-1.5 py-0.5 rounded font-mono">
              {status?.external_ip}
            </code>
          </InfoBox>
        )}

        {/* Container Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {isContainerRunning ? (
            <ActionButton
              variant="stop"
              loading={stopMutation.isPending}
              onClick={() => stopMutation.mutate()}
              label={t('tor.stopContainer')}
            />
          ) : (
            <ActionButton
              variant="start"
              loading={startMutation.isPending}
              onClick={() => startMutation.mutate()}
              label={t('tor.startContainer')}
            />
          )}

          {isConnected && (
            <ActionButton
              variant="restart"
              loading={newCircuitMutation.isPending}
              onClick={() => newCircuitMutation.mutate()}
              icon={RefreshCw}
              label={t('tor.newCircuit')}
            />
          )}
        </div>

        {newCircuitMutation.isSuccess && (
          <InfoBox variant="success" className="mt-4">
            {newCircuitMutation.data?.message}
          </InfoBox>
        )}
      </Section>

      {/* Hidden Services */}
      {isContainerRunning && (
        <Section>
          <SectionHeader
            icon={Globe}
            iconColor="purple"
            title={t('tor.hiddenServices')}
            subtitle={t('tor.hiddenServicesDesc')}
            actions={
              <button
                onClick={() => setShowAddresses(!showAddresses)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAddresses ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    {t('tor.hide')}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    {t('tor.show')}
                  </>
                )}
              </button>
            }
          />

          <div className="space-y-4">
            {/* Bitcoin Node */}
            <OnionServiceRow
              title={t('tor.bitcoinNode')}
              subtitle={t('tor.p2pConnections')}
              address={status?.onion_addresses?.bitcoin}
              showAddress={showAddresses}
              onCopy={() => copyToClipboard(status?.onion_addresses?.bitcoin || '', 'bitcoin')}
              copied={copiedAddress === 'bitcoin'}
              notAvailableText={t('tor.notAvailableYet')}
              copyTitle={t('tor.copyAddress')}
            />

            {/* Electrs */}
            <OnionServiceRow
              title={t('tor.electrumServer')}
              subtitle={t('tor.walletConnections')}
              address={status?.onion_addresses?.electrs}
              showAddress={showAddresses}
              onCopy={() => copyToClipboard(status?.onion_addresses?.electrs || '', 'electrs')}
              copied={copiedAddress === 'electrs'}
              notAvailableText={t('tor.notAvailableYet')}
              copyTitle={t('tor.copyAddress')}
            />

            {/* Dashboard */}
            <OnionServiceRow
              title={t('tor.dashboard')}
              subtitle={t('tor.webInterface')}
              address={status?.onion_addresses?.dashboard}
              showAddress={showAddresses}
              onCopy={() => copyToClipboard(status?.onion_addresses?.dashboard || '', 'dashboard')}
              copied={copiedAddress === 'dashboard'}
              notAvailableText={t('tor.notAvailableYet')}
              copyTitle={t('tor.copyAddress')}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-4">{t('tor.addressesPersist')}</p>
        </Section>
      )}

      {/* Help Section */}
      <Section className="bg-muted/30">
        <h3 className="font-semibold text-foreground mb-3">{t('tor.aboutTor')}</h3>
        <div className="text-sm text-muted-foreground space-y-3">
          <p>
            <strong>Tor (The Onion Router)</strong> {t('tor.torDescription')}
          </p>
          <p>{t('tor.whenEnabled')}</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>{t('tor.connectAnonymously')}</li>
            <li>{t('tor.acceptConnections')}</li>
            <li>{t('tor.hideRealIP')}</li>
          </ul>
          <p className="mt-4">
            <strong>{t('tor.hiddenServicesLabel')}</strong> {t('tor.hiddenServicesInfo')}
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <a
            href="https://www.torproject.org/about/history/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-400 hover:text-purple-300 inline-flex items-center gap-1"
          >
            {t('tor.learnMore')}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </Section>
    </div>
  );
}

function OnionServiceRow({
  title,
  subtitle,
  address,
  showAddress,
  onCopy,
  copied,
  notAvailableText,
  copyTitle,
}: {
  title: string;
  subtitle: string;
  address?: string;
  showAddress: boolean;
  onCopy: () => void;
  copied: boolean;
  notAvailableText: string;
  copyTitle: string;
}) {
  return (
    <div className="bg-muted/50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-foreground">{title}</div>
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </div>
        {address ? (
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-foreground bg-muted px-2 py-1 rounded max-w-[200px] truncate">
              {showAddress ? address : '••••••••••••••••.onion'}
            </code>
            <button
              onClick={onCopy}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title={copyTitle}
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{notAvailableText}</span>
        )}
      </div>
    </div>
  );
}
