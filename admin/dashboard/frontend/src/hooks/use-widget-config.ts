"use client";

import { useState, useEffect, useCallback } from "react";
import {
  WidgetConfig,
  WidgetType,
  WidgetSize,
  DEFAULT_WIDGETS,
  WIDGET_DEFINITIONS,
} from "@/types/widgets";

const STORAGE_KEY = "anchor-dashboard-widgets";

function generateId(): string {
  return `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useWidgetConfig() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as WidgetConfig[];
        setWidgets(parsed);
      } catch {
        setWidgets(DEFAULT_WIDGETS);
      }
    } else {
      setWidgets(DEFAULT_WIDGETS);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when widgets change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    }
  }, [widgets, isLoaded]);

  // Get enabled widgets sorted by order
  const enabledWidgets = widgets
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  // Add a new widget
  const addWidget = useCallback((type: WidgetType) => {
    const definition = WIDGET_DEFINITIONS.find((d) => d.type === type);
    if (!definition) return;

    const newWidget: WidgetConfig = {
      id: generateId(),
      type,
      size: definition.defaultSize,
      enabled: true,
      order: widgets.length,
    };

    setWidgets((prev) => [...prev, newWidget]);
  }, [widgets.length]);

  // Remove a widget
  const removeWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  // Toggle widget enabled state
  const toggleWidget = useCallback((id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  }, []);

  // Change widget size
  const changeSize = useCallback((id: string, size: WidgetSize) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size } : w))
    );
  }, []);

  // Reorder widgets (called after drag-and-drop)
  const reorderWidgets = useCallback((activeId: string, overId: string) => {
    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === activeId);
      const newIndex = prev.findIndex((w) => w.id === overId);

      if (oldIndex === -1 || newIndex === -1) return prev;

      const newWidgets = [...prev];
      const [removed] = newWidgets.splice(oldIndex, 1);
      newWidgets.splice(newIndex, 0, removed);

      // Update order values
      return newWidgets.map((w, i) => ({ ...w, order: i }));
    });
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  // Get available widgets (not yet added)
  const availableWidgets = WIDGET_DEFINITIONS.filter(
    (def) => !widgets.some((w) => w.type === def.type && w.enabled)
  );

  return {
    widgets: enabledWidgets,
    allWidgets: widgets,
    isEditMode,
    isLoaded,
    availableWidgets,
    addWidget,
    removeWidget,
    toggleWidget,
    changeSize,
    reorderWidgets,
    resetToDefaults,
    toggleEditMode,
    setIsEditMode,
  };
}
