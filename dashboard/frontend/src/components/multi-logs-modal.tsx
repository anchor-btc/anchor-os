'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchContainerLogs } from '@/lib/api';
import { apps } from '@/lib/apps';
import { Loader2, Terminal, X, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiLogsModalProps {
  containerNames: string[] | null;
  onClose: () => void;
}

function getContainerLabel(containerName: string): string {
  // Find the app that has this container and get its label
  for (const app of apps) {
    const config = app.containerConfigs?.find((c) => c.name === containerName);
    if (config) {
      return config.label;
    }
  }
  // Fallback: extract a readable name from container name
  const parts = containerName.split('-');
  return parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);
}

function getAppName(containerNames: string[]): string {
  if (!containerNames.length) return '';
  // Find the app that contains these containers
  const app = apps.find((a) => containerNames.some((name) => a.containers.includes(name)));
  return app?.name || containerNames[0];
}

export function MultiLogsModal({ containerNames, onClose }: MultiLogsModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Reset active tab when containers change
  useEffect(() => {
    setActiveTab(0);
  }, [containerNames]);

  const activeContainer = containerNames?.[activeTab];

  const {
    data: logsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['logs', activeContainer],
    queryFn: () => fetchContainerLogs(activeContainer!, 500),
    enabled: !!activeContainer,
    refetchInterval: 3000,
  });

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logsData]);

  if (!containerNames || containerNames.length === 0) return null;

  const appName = getAppName(containerNames);
  const hasTabs = containerNames.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[85vh] bg-card border border-border rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{appName}</h3>
              <p className="text-xs text-muted-foreground">
                {hasTabs ? `${containerNames.length} containers` : 'Container logs'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Refresh logs"
            >
              <RefreshCw
                className={`w-4 h-4 text-muted-foreground ${isRefetching ? 'animate-spin' : ''}`}
              />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Tabs (if multiple containers) */}
        {hasTabs && (
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border-b border-slate-700">
            {containerNames.map((name, index) => (
              <button
                key={name}
                onClick={() => setActiveTab(index)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                  activeTab === index
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                )}
              >
                {getContainerLabel(name)}
              </button>
            ))}
          </div>
        )}

        {/* Logs content - terminal style dark background */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-xs leading-relaxed">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !logsData?.logs || logsData.logs.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
              No logs available
            </div>
          ) : (
            <div className="space-y-0.5">
              {logsData.logs.map((line, index) => (
                <LogLine key={index} line={line} />
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-secondary text-xs text-muted-foreground flex justify-between">
          <span>
            {activeContainer && <span className="font-mono text-primary">{activeContainer}</span>}
          </span>
          <span>Showing last 500 lines • Auto-refreshing every 3s</span>
        </div>
      </div>
    </div>
  );
}

function LogLine({ line }: { line: string }) {
  // Color code based on log level
  const isError = /error|err|fail|fatal/i.test(line);
  const isWarning = /warn|warning/i.test(line);
  const isInfo = /info/i.test(line);
  const isDebug = /debug|trace/i.test(line);

  let colorClass = 'text-slate-300';
  if (isError) colorClass = 'text-red-400';
  else if (isWarning) colorClass = 'text-amber-400';
  else if (isInfo) colorClass = 'text-emerald-400';
  else if (isDebug) colorClass = 'text-sky-400';

  // Clean up ANSI codes and format
  const cleanLine = line
    .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
    .replace(/^\s+/, ''); // Trim leading whitespace

  return (
    <div
      className={`${colorClass} hover:bg-white/10 px-2 py-0.5 rounded whitespace-pre-wrap break-all`}
    >
      {cleanLine || ' '}
    </div>
  );
}
