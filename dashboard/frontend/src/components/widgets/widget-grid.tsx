'use client';

import { ReactNode } from 'react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Masonry from 'react-masonry-css';
import { useState } from 'react';
import { WidgetConfig } from '@/types/widgets';
import { WidgetWrapper } from './widget-wrapper';
import { cn } from '@/lib/utils';

interface WidgetGridProps {
  widgets: WidgetConfig[];
  isEditMode: boolean;
  onReorder: (activeId: string, overId: string) => void;
  onRemove: (id: string) => void;
  onChangeSize: (id: string, size: WidgetConfig['size']) => void;
  renderWidget: (widget: WidgetConfig) => ReactNode;
}

// Breakpoints for masonry columns
const breakpointColumns = {
  default: 3,
  1280: 3,
  1024: 2,
  768: 2,
  640: 1,
};

export function WidgetGrid({
  widgets,
  isEditMode,
  onReorder,
  onRemove,
  onChangeSize,
  renderWidget,
}: WidgetGridProps) {
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

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  // Separate large widgets (full width) from smaller ones
  const largeWidgets = widgets.filter((w) => w.size === 'large');
  const smallMediumWidgets = widgets.filter((w) => w.size !== 'large');

  // Calculate columns based on widget sizes
  const getBreakpoints = () => {
    // If we have medium widgets, use 2 columns max
    const hasMedium = smallMediumWidgets.some((w) => w.size === 'medium');
    if (hasMedium) {
      return {
        default: 2,
        1280: 2,
        1024: 2,
        768: 1,
        640: 1,
      };
    }
    return breakpointColumns;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <div className={cn('space-y-4', isEditMode && 'min-h-[200px]')}>
          {/* Large widgets - full width */}
          {largeWidgets.map((widget) => (
            <div key={widget.id} className="w-full">
              <WidgetWrapper
                widget={widget}
                isEditMode={isEditMode}
                onRemove={() => onRemove(widget.id)}
                onChangeSize={(size) => onChangeSize(widget.id, size)}
              >
                {renderWidget(widget)}
              </WidgetWrapper>
            </div>
          ))}

          {/* Small/Medium widgets - masonry layout */}
          {smallMediumWidgets.length > 0 && (
            <Masonry
              breakpointCols={getBreakpoints()}
              className="masonry-grid"
              columnClassName="masonry-grid-column"
            >
              {smallMediumWidgets.map((widget) => (
                <div key={widget.id} className="mb-4">
                  <WidgetWrapper
                    widget={widget}
                    isEditMode={isEditMode}
                    onRemove={() => onRemove(widget.id)}
                    onChangeSize={(size) => onChangeSize(widget.id, size)}
                  >
                    {renderWidget(widget)}
                  </WidgetWrapper>
                </div>
              ))}
            </Masonry>
          )}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeWidget ? (
          <div
            className={cn(
              'opacity-80',
              activeWidget.size === 'small' && 'w-[300px]',
              activeWidget.size === 'medium' && 'w-[450px]',
              activeWidget.size === 'large' && 'w-[800px]'
            )}
          >
            <div className="bg-card border border-primary rounded-xl p-4 shadow-2xl">
              {renderWidget(activeWidget)}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
