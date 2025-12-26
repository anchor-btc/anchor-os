'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
  className?: string;
}

export function SortableItem({ id, children, isEditMode, className }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', isDragging && 'z-50 opacity-90', className)}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="w-3 h-3" />
        </div>
      )}
      <div className={cn(isEditMode && 'ml-4')}>{children}</div>
    </div>
  );
}

interface SortableCategoryProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
}

export function SortableCategory({ id, children, isEditMode }: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('relative', isDragging && 'z-50 opacity-90 bg-card rounded-lg shadow-lg')}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}
      {children}
    </div>
  );
}
