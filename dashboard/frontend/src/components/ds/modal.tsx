"use client";

import * as React from "react";
import { LucideIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconBox } from "./icon-box";
import { type DSColor } from "./colors";

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal content */
  children: React.ReactNode;
  /** Max width class */
  maxWidth?: "sm" | "md" | "lg" | "xl";
  /** Additional class names */
  className?: string;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

/**
 * Modal - Consistent modal wrapper with backdrop.
 *
 * @example
 * ```tsx
 * <Modal open={show} onClose={handleClose}>
 *   <ModalHeader icon={AlertTriangle} iconColor="warning" title="Confirm Action" />
 *   <ModalContent>Are you sure you want to proceed?</ModalContent>
 *   <ModalFooter>
 *     <Button variant="outline" onClick={handleClose}>Cancel</Button>
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  children,
  maxWidth = "md",
  className,
}: ModalProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent scroll when modal is open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={cn(
          "relative bg-card border border-border rounded-xl mx-4",
          maxWidthClasses[maxWidth],
          "animate-fade-in",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

export interface ModalHeaderProps {
  /** Title text (optional if using children) */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Icon color variant */
  iconColor?: DSColor;
  /** Show close button */
  showClose?: boolean;
  /** Close handler (required if showClose is true) */
  onClose?: () => void;
  /** Additional class names */
  className?: string;
  /** Custom children (alternative to title/subtitle) */
  children?: React.ReactNode;
}

/**
 * ModalHeader - Header section for a Modal.
 */
export function ModalHeader({
  title,
  subtitle,
  icon,
  iconColor = "primary",
  showClose = false,
  onClose,
  className,
  children,
}: ModalHeaderProps) {
  return (
    <div className={cn("flex items-start gap-3 p-6 pb-4", className)}>
      {icon && !children && <IconBox icon={icon} color={iconColor} size="md" />}
      {children ? (
        <div className="flex-1 min-w-0">{children}</div>
      ) : (
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {showClose && onClose && (
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export interface ModalContentProps {
  /** Content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * ModalContent - Content section for a Modal.
 */
export function ModalContent({ children, className }: ModalContentProps) {
  return (
    <div className={cn("px-6 pb-4 text-sm text-muted-foreground", className)}>
      {children}
    </div>
  );
}

export interface ModalFooterProps {
  /** Footer content (buttons) */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * ModalFooter - Footer section for a Modal with action buttons.
 */
export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("flex gap-3 p-6 pt-2", className)}>
      {children}
    </div>
  );
}

