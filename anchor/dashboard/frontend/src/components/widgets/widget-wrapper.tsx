"use client";

import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { WidgetConfig, WIDGET_DEFINITIONS } from "@/types/widgets";
import { cn } from "@/lib/utils";

interface WidgetWrapperProps {
  widget: WidgetConfig;
  isEditMode: boolean;
  onRemove: () => void;
  onChangeSize: (size: WidgetConfig["size"]) => void;
  children: ReactNode;
}

export function WidgetWrapper({
  widget,
  isEditMode,
  onRemove,
  onChangeSize,
  children,
}: WidgetWrapperProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const definition = WIDGET_DEFINITIONS.find((d) => d.type === widget.type);
  const canGrow = definition?.allowedSizes.includes(
    widget.size === "small" ? "medium" : widget.size === "medium" ? "large" : "large"
  );
  const canShrink = definition?.allowedSizes.includes(
    widget.size === "large" ? "medium" : widget.size === "medium" ? "small" : "small"
  );

  const handleGrow = () => {
    if (widget.size === "small") onChangeSize("medium");
    else if (widget.size === "medium") onChangeSize("large");
  };

  const handleShrink = () => {
    if (widget.size === "large") onChangeSize("medium");
    else if (widget.size === "medium") onChangeSize("small");
  };

  const widgetName = definition ? t(definition.nameKey, definition.name) : widget.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative transition-all duration-200",
        isDragging && "z-50 opacity-50",
        isEditMode && "animate-wiggle"
      )}
    >
      {/* Edit mode overlay and controls */}
      {isEditMode && (
        <>
          {/* Dashed border */}
          <div className="absolute inset-0 border-2 border-dashed border-primary/50 rounded-xl pointer-events-none z-10" />

          {/* Remove button */}
          <button
            onClick={onRemove}
            className="absolute -top-2 -left-2 z-20 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-card border border-border rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:bg-muted transition-colors flex items-center gap-1"
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {widgetName}
            </span>
          </div>

          {/* Size controls */}
          <div className="absolute -top-2 -right-2 z-20 flex gap-1">
            {canShrink && widget.size !== "small" && (
              <button
                onClick={handleShrink}
                className="w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
                title={t("widgetWrapper.shrink")}
              >
                <Minimize2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
            {canGrow && widget.size !== "large" && (
              <button
                onClick={handleGrow}
                className="w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
                title={t("widgetWrapper.expand")}
              >
                <Maximize2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </>
      )}

      {/* Widget content */}
      <div className={cn(isEditMode && "pointer-events-none select-none")}>
        {children}
      </div>
    </div>
  );
}
