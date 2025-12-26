'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { execContainer } from '@/lib/api';
import { Loader2, Terminal, X, Send, Trash2 } from 'lucide-react';

interface TerminalModalProps {
  containerName: string | null;
  onClose: () => void;
}

interface HistoryEntry {
  command: string;
  output: string;
  exitCode: number | null;
  timestamp: Date;
}

export function TerminalModal({ containerName, onClose }: TerminalModalProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const execMutation = useMutation({
    mutationFn: (cmd: string) => execContainer(containerName!, cmd),
    onSuccess: (data, cmd) => {
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: data.output,
          exitCode: data.exit_code,
          timestamp: new Date(),
        },
      ]);
      setCommandHistory((prev) => [...prev, cmd]);
      setHistoryIndex(-1);
      // Focus input after command execution
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    onError: () => {
      // Focus input even on error
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // Reset state and focus input when container changes
  useEffect(() => {
    if (containerName) {
      // Clear state when switching containers
      setHistory([]);
      setCommand('');
      setCommandHistory([]);
      setHistoryIndex(-1);
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [containerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || execMutation.isPending) return;
    execMutation.mutate(command);
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  if (!containerName) return null;

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
              <h3 className="font-semibold text-foreground">{containerName}</h3>
              <p className="text-xs text-muted-foreground">Container terminal</p>
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

        {/* Terminal output */}
        <div
          className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-sm leading-relaxed min-h-[300px]"
          onClick={() => inputRef.current?.focus()}
        >
          {history.length === 0 ? (
            <div className="text-slate-500">
              <p>Welcome to {containerName} terminal</p>
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
          <span>Use ↑↓ for command history</span>
          <span>Commands run as container default user</span>
        </div>
      </div>
    </div>
  );
}
