'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { execContainer } from '@/lib/api';
import { apps } from '@/lib/apps';
import { Loader2, Terminal, X, Send, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiTerminalModalProps {
  containerNames: string[] | null;
  onClose: () => void;
}

interface HistoryEntry {
  command: string;
  output: string;
  exitCode: number | null;
  timestamp: Date;
}

interface TabState {
  history: HistoryEntry[];
  commandHistory: string[];
  historyIndex: number;
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

export function MultiTerminalModal({ containerNames, onClose }: MultiTerminalModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [command, setCommand] = useState('');
  const [tabStates, setTabStates] = useState<Record<string, TabState>>({});
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeContainer = containerNames?.[activeTab];

  // Initialize tab state for new containers
  useEffect(() => {
    if (containerNames) {
      setTabStates((prev) => {
        const newState = { ...prev };
        for (const name of containerNames) {
          if (!newState[name]) {
            newState[name] = {
              history: [],
              commandHistory: [],
              historyIndex: -1,
            };
          }
        }
        return newState;
      });
      setActiveTab(0);
      setCommand('');
    }
  }, [containerNames]);

  // Focus input when switching tabs
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeTab]);

  const currentTabState = activeContainer ? tabStates[activeContainer] : null;

  const execMutation = useMutation({
    mutationFn: (cmd: string) => execContainer(activeContainer!, cmd),
    onSuccess: (data, cmd) => {
      if (activeContainer) {
        setTabStates((prev) => ({
          ...prev,
          [activeContainer]: {
            ...prev[activeContainer],
            history: [
              ...(prev[activeContainer]?.history || []),
              {
                command: cmd,
                output: data.output,
                exitCode: data.exit_code,
                timestamp: new Date(),
              },
            ],
            commandHistory: [...(prev[activeContainer]?.commandHistory || []), cmd],
            historyIndex: -1,
          },
        }));
      }
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: () => {
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentTabState?.history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || execMutation.isPending) return;
    execMutation.mutate(command);
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!currentTabState) return;
    const { commandHistory, historyIndex } = currentTabState;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        if (activeContainer) {
          setTabStates((prev) => ({
            ...prev,
            [activeContainer]: { ...prev[activeContainer], historyIndex: newIndex },
          }));
        }
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        if (activeContainer) {
          setTabStates((prev) => ({
            ...prev,
            [activeContainer]: { ...prev[activeContainer], historyIndex: newIndex },
          }));
        }
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        if (activeContainer) {
          setTabStates((prev) => ({
            ...prev,
            [activeContainer]: { ...prev[activeContainer], historyIndex: -1 },
          }));
        }
        setCommand('');
      }
    }
  };

  const clearHistory = () => {
    if (activeContainer) {
      setTabStates((prev) => ({
        ...prev,
        [activeContainer]: { ...prev[activeContainer], history: [] },
      }));
    }
  };

  if (!containerNames || containerNames.length === 0) return null;

  const appName = getAppName(containerNames);
  const hasTabs = containerNames.length > 1;
  const history = currentTabState?.history || [];

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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{appName}</h3>
              <p className="text-xs text-muted-foreground">
                {hasTabs ? `${containerNames.length} containers` : 'Container terminal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearHistory}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Clear terminal"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
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
                onClick={() => {
                  setActiveTab(index);
                  setCommand('');
                }}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                  activeTab === index
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                )}
              >
                {getContainerLabel(name)}
              </button>
            ))}
          </div>
        )}

        {/* Terminal output */}
        <div
          className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-sm leading-relaxed min-h-[300px]"
          onClick={() => inputRef.current?.focus()}
        >
          {history.length === 0 ? (
            <div className="text-slate-500">
              <p>Welcome to {activeContainer} terminal</p>
              <p className="mt-2">Type a command and press Enter to execute.</p>
              <p className="mt-1 text-xs">Examples: ls, pwd, cat /etc/os-release, ps aux</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={index}>
                  {/* Command */}
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="text-slate-500">$</span>
                    <span>{entry.command}</span>
                  </div>
                  {/* Output */}
                  <div
                    className={`mt-1 whitespace-pre-wrap break-all ${
                      entry.exitCode !== 0 && entry.exitCode !== null
                        ? 'text-red-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {entry.output || <span className="text-slate-500">(no output)</span>}
                  </div>
                  {/* Exit code if non-zero */}
                  {entry.exitCode !== null && entry.exitCode !== 0 && (
                    <div className="text-xs text-red-400 mt-1">Exit code: {entry.exitCode}</div>
                  )}
                </div>
              ))}
              <div ref={outputEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-border bg-slate-800">
          <div className="flex items-center gap-2 p-3">
            <span className="text-emerald-400 font-mono">$</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command..."
              className="flex-1 bg-transparent text-slate-100 font-mono text-sm placeholder:text-slate-500 focus:outline-none"
              disabled={execMutation.isPending}
            />
            <button
              type="submit"
              disabled={!command.trim() || execMutation.isPending}
              className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
            >
              {execMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="p-2 border-t border-border bg-secondary text-xs text-muted-foreground flex justify-between">
          <span>
            {activeContainer && (
              <span className="font-mono text-emerald-400">{activeContainer}</span>
            )}
          </span>
          <span>Use ↑↓ for command history</span>
        </div>
      </div>
    </div>
  );
}
