'use client';

import { useState } from 'react';
import { App, getAppStatus } from '@/lib/apps';
import { Container, startContainer, stopContainer } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Search,
  Grid3X3,
  MapPin,
  Bitcoin,
  Wallet,
  Database,
  Pickaxe,
  Terminal,
  Server,
  Loader2,
  Play,
  Square,
  Layers,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Search,
  Grid3X3,
  MapPin,
  Bitcoin,
  Wallet,
  Database,
  Pickaxe,
  Layers,
};

interface InfraCardProps {
  app: App;
  containers: Container[];
  onToggle?: () => void;
  onShowLogs?: (name: string) => void;
}

export function InfraCard({ app, containers, onToggle, onShowLogs }: InfraCardProps) {
  const [loading, setLoading] = useState(false);
  const Icon = iconMap[app.icon] || Server;
  const mainContainer = app.containers[0];

  const status = getAppStatus(
    app.containers,
    containers.map((c) => ({ name: c.name, state: c.state }))
  );

  const isRunning = status === 'running';

  const handleToggle = async () => {
    setLoading(true);
    try {
      for (const containerName of app.containers) {
        if (isRunning) {
          await stopContainer(containerName);
        } else {
          await startContainer(containerName);
        }
      }
      onToggle?.();
    } catch (error) {
      console.error('Failed to toggle:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-card border rounded-xl p-4 transition-all',
        isRunning ? 'border-success/30' : 'border-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            isRunning ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-foreground truncate">{app.name}</h3>
            <div
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                isRunning ? 'bg-success' : 'bg-muted-foreground/30'
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {app.port ? `Port ${app.port}` : isRunning ? 'Running' : 'Stopped'}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onShowLogs?.(mainContainer)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          Logs
        </button>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
            isRunning
              ? 'bg-muted/50 hover:bg-error/10 text-muted-foreground hover:text-error'
              : 'bg-success/10 text-success hover:bg-success/20'
          )}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isRunning ? (
            <Square className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isRunning ? 'Stop' : 'Start'}
        </button>
      </div>
    </div>
  );
}
