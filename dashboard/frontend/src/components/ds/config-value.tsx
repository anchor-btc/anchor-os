"use client";

import * as React from "react";
import { useState } from "react";
import { Copy, Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfigValueProps {
  /** Label for the value */
  label: string;
  /** The value to display */
  value: string;
  /** Enable copy to clipboard */
  copyable?: boolean;
  /** Use monospace font */
  mono?: boolean;
  /** Mark as default/primary */
  isDefault?: boolean;
  /** Highlight the container */
  highlighted?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * ConfigValue - Display config/connection values with copy functionality.
 *
 * @example
 * ```tsx
 * <ConfigValue
 *   label="Docker Host"
 *   value="core-electrs:50001"
 *   copyable
 *   mono
 * />
 *
 * <ConfigValue
 *   label="Electrs (Default)"
 *   value="localhost:50001"
 *   copyable
 *   mono
 *   isDefault
 * />
 * ```
 */
export function ConfigValue({
  label,
  value,
  copyable = false,
  mono = false,
  isDefault = false,
  highlighted = false,
  className,
}: ConfigValueProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg",
        isDefault || highlighted
          ? "bg-primary/5 border border-primary/20"
          : "bg-muted/50",
        className
      )}
    >
      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {isDefault && <Star className="w-3 h-3 text-primary" />}
      </p>
      <div className="flex items-center gap-2">
        <p
          className={cn(
            "text-foreground text-sm flex-1",
            mono && "font-mono font-medium"
          )}
        >
          {value}
        </p>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-muted rounded transition-colors shrink-0"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

