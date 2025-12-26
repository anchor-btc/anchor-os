'use client';

import { ExternalLink } from 'lucide-react';
import type { UtxoProtocolInfo } from '@/lib/api';
import { PROTOCOL_APPS, getAppUrl } from '@/lib/utils';

interface ProtocolTagProps {
  protocolInfo: UtxoProtocolInfo;
  showLink?: boolean;
  size?: 'sm' | 'md';
}

export function ProtocolTag({ protocolInfo, showLink = true, size = 'sm' }: ProtocolTagProps) {
  const appConfig = protocolInfo.app ? PROTOCOL_APPS[protocolInfo.app.app_id] : null;

  if (!appConfig) {
    return null;
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs';

  const appUrl = getAppUrl(appConfig.id);

  const tag = (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded ${sizeClasses}`}
      style={{
        backgroundColor: `${appConfig.color}20`,
        color: appConfig.color,
      }}
    >
      <span>{appConfig.icon}</span>
      <span>{protocolInfo.kind_name}</span>
      {showLink && <ExternalLink className="w-2.5 h-2.5" />}
    </span>
  );

  if (showLink) {
    return (
      <a
        href={appUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
        title={`Open in ${appConfig.name}`}
      >
        {tag}
      </a>
    );
  }

  return tag;
}

interface ProtocolTagsListProps {
  protocolInfoMap: Map<string, UtxoProtocolInfo>;
  txid: string;
}

export function ProtocolTagsList({ protocolInfoMap, txid }: ProtocolTagsListProps) {
  const info = protocolInfoMap.get(txid);

  if (!info) {
    return null;
  }

  return <ProtocolTag protocolInfo={info} />;
}
