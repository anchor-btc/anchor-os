"use client";

import { useState, useEffect, ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Check, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// ============================
// Types
// ============================

export type CardSize = 1 | 2 | 3 | 4; // Column span

export interface IndexerCard {
  id: string;
  size: CardSize;
}

export interface IndexerCardDefinition {
  id: string;
  name: string;
  defaultSize: CardSize;
  minSize: CardSize;
  maxSize: CardSize;
  render: () => ReactNode;
}

// ============================
// Layout Hook
// ============================

const STORAGE_KEY = "indexer-layout";

const DEFAULT_LAYOUT: IndexerCard[] = [
  { id: "stats", size: 4 },
  { id: "message-types", size: 2 },
  { id: "carrier-types", size: 2 },
  { id: "anchor-resolution", size: 2 },
  { id: "live-feed", size: 2 },
  { id: "total-messages", size: 2 },
  { id: "messages-by-kind", size: 2 },
  { id: "messages-by-carrier", size: 2 },
  { id: "performance", size: 2 },
  { id: "message-explorer", size: 4 },
];

export function useIndexerLayout() {
  const [layout, setLayout] = useState<IndexerCard[]>(DEFAULT_LAYOUT);
  const [isEditMode, setIsEditMode] = useState(false);

  // Load layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate and merge with defaults (in case new cards are added)
        const defaultIds = new Set(DEFAULT_LAYOUT.map(c => c.id));
        const savedIds = new Set(parsed.map((c: IndexerCard) => c.id));
        
        // Keep saved order but add any missing cards
        const merged = [
          ...parsed.filter((c: IndexerCard) => defaultIds.has(c.id)),
          ...DEFAULT_LAYOUT.filter(c => !savedIds.has(c.id)),
        ];
        setLayout(merged);
      } catch {
        setLayout(DEFAULT_LAYOUT);
      }
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = (newLayout: IndexerCard[]) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLayout));
  };

  const reorderCards = (activeId: string, overId: string) => {
    const oldIndex = layout.findIndex(c => c.id === activeId);
    const newIndex = layout.findIndex(c => c.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      saveLayout(arrayMove(layout, oldIndex, newIndex));
    }
  };

  const changeCardSize = (id: string, size: CardSize) => {
    saveLayout(layout.map(c => c.id === id ? { ...c, size } : c));
  };

  const resetToDefaults = () => {
    saveLayout(DEFAULT_LAYOUT);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return {
    layout,
    isEditMode,
    reorderCards,
    changeCardSize,
    resetToDefaults,
    toggleEditMode,
  };
}

// ============================
// Sortable Card Wrapper
// ============================

interface SortableCardProps {
  card: IndexerCard;
  definition: IndexerCardDefinition;
  isEditMode: boolean;
  onChangeSize: (size: CardSize) => void;
}

function SortableCard({ card, definition, isEditMode, onChangeSize }: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Column span classes
  const colSpanClasses: Record<CardSize, string> = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
    4: "col-span-4",
  };

  const canGrow = card.size < definition.maxSize;
  const canShrink = card.size > definition.minSize;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        colSpanClasses[card.size],
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

          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-card border border-border rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:bg-muted transition-colors flex items-center gap-1"
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
              {definition.name}
            </span>
          </div>

          {/* Size controls */}
          <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1">
            {canShrink && (
              <button
                onClick={() => onChangeSize((card.size - 1) as CardSize)}
                className="w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
                title="Shrink"
              >
                <Minimize2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
            {canGrow && (
              <button
                onClick={() => onChangeSize((card.size + 1) as CardSize)}
                className="w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </>
      )}

      {/* Card content */}
      <div className={cn(isEditMode && "pointer-events-none")}>
        {definition.render()}
      </div>
    </div>
  );
}

// ============================
// Grid Layout Component
// ============================

interface IndexerGridLayoutProps {
  cardDefinitions: IndexerCardDefinition[];
  layout: IndexerCard[];
  isEditMode: boolean;
  onReorder: (activeId: string, overId: string) => void;
  onChangeSize: (id: string, size: CardSize) => void;
  onResetToDefaults: () => void;
  onToggleEditMode: () => void;
}

export function IndexerGridLayout({
  cardDefinitions,
  layout,
  isEditMode,
  onReorder,
  onChangeSize,
  onResetToDefaults,
  onToggleEditMode,
}: IndexerGridLayoutProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
    setActiveId(null);
  };

  const activeCard = activeId ? layout.find(c => c.id === activeId) : null;
  const activeDefinition = activeCard ? cardDefinitions.find(d => d.id === activeCard.id) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={layout.map(c => c.id)}
        strategy={rectSortingStrategy}
      >
        {/* Edit Controls */}
        <div className="flex items-center justify-end gap-2 mb-4">
          {isEditMode && (
            <button
              onClick={onResetToDefaults}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {t("dashboard.resetWidgets", "Reset Layout")}
            </button>
          )}
          <button
            onClick={onToggleEditMode}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
              isEditMode
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            )}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                {t("dashboard.doneEditing", "Done")}
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                {t("dashboard.editWidgets", "Edit Layout")}
              </>
            )}
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-4">
          {layout.map((card) => {
            const definition = cardDefinitions.find(d => d.id === card.id);
            if (!definition) return null;

            return (
              <SortableCard
                key={card.id}
                card={card}
                definition={definition}
                isEditMode={isEditMode}
                onChangeSize={(size) => onChangeSize(card.id, size)}
              />
            );
          })}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeCard && activeDefinition ? (
          <div className={cn(
            "opacity-80 rotate-2",
            activeCard.size === 1 && "w-[25%]",
            activeCard.size === 2 && "w-[50%]",
            activeCard.size === 3 && "w-[75%]",
            activeCard.size === 4 && "w-full",
          )}>
            {activeDefinition.render()}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

