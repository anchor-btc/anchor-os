"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Category keys in default order
export const DEFAULT_CATEGORY_ORDER = [
  "protocol",
  "apps",
  "explorers",
  "kernel",
  "network",
] as const;

export type CategoryKey = (typeof DEFAULT_CATEGORY_ORDER)[number];

interface SidebarOrderState {
  categoryOrder: CategoryKey[];
  itemOrder: Record<CategoryKey, string[]>; // appId[] per category
}

const STORAGE_KEY = "anchor-sidebar-order";

const getDefaultState = (): SidebarOrderState => ({
  categoryOrder: [...DEFAULT_CATEGORY_ORDER],
  itemOrder: {
    protocol: [],
    apps: [],
    explorers: [],
    kernel: [],
    network: [],
  },
});

export function useSidebarOrder() {
  const [state, setState] = useState<SidebarOrderState>(getDefaultState);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Snapshot of state before entering edit mode (for cancel functionality)
  const snapshotRef = useRef<SidebarOrderState | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SidebarOrderState;
        // Merge with defaults to handle new categories
        setState({
          categoryOrder: parsed.categoryOrder?.length 
            ? parsed.categoryOrder 
            : [...DEFAULT_CATEGORY_ORDER],
          itemOrder: {
            ...getDefaultState().itemOrder,
            ...parsed.itemOrder,
          },
        });
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setIsLoaded(true);
  }, []);

  // Set category order directly (for dnd-kit)
  const setCategoryOrder = useCallback((newOrder: CategoryKey[]) => {
    setState((prev) => {
      const newState = { ...prev, categoryOrder: newOrder };
      // Don't save to localStorage during edit - only on confirm
      return newState;
    });
  }, []);

  // Set item order for a category directly (for dnd-kit)
  const setItemOrder = useCallback(
    (category: CategoryKey, newOrder: string[]) => {
      setState((prev) => {
        const newState = {
          ...prev,
          itemOrder: { ...prev.itemOrder, [category]: newOrder },
        };
        // Don't save to localStorage during edit - only on confirm
        return newState;
      });
    },
    []
  );

  // Get sorted items for a category
  const getSortedItems = useCallback(
    <T extends { id: string }>(category: CategoryKey, items: T[]): T[] => {
      const order = state.itemOrder[category] || [];
      if (order.length === 0) return items;

      // Sort items based on saved order, put unknown items at the end
      return [...items].sort((a, b) => {
        const aIndex = order.indexOf(a.id);
        const bIndex = order.indexOf(b.id);
        
        // If both are in order, sort by their position
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        // If only a is in order, a comes first
        if (aIndex !== -1) return -1;
        // If only b is in order, b comes first
        if (bIndex !== -1) return 1;
        // Neither is in order, maintain original order
        return 0;
      });
    },
    [state.itemOrder]
  );

  // Reset to defaults
  const resetOrder = useCallback(() => {
    const defaultState = getDefaultState();
    setState(defaultState);
    // If in edit mode, don't save yet - will save on confirm
    if (!isEditMode) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    }
  }, [isEditMode]);

  // Enter edit mode - save current state as snapshot
  const startEdit = useCallback(() => {
    snapshotRef.current = JSON.parse(JSON.stringify(state));
    setIsEditMode(true);
  }, [state]);

  // Confirm changes - save to localStorage and exit edit mode
  const confirmEdit = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    snapshotRef.current = null;
    setIsEditMode(false);
  }, [state]);

  // Cancel changes - restore snapshot and exit edit mode
  const cancelEdit = useCallback(() => {
    if (snapshotRef.current) {
      setState(snapshotRef.current);
    }
    snapshotRef.current = null;
    setIsEditMode(false);
  }, []);

  // Toggle edit mode (legacy - prefer startEdit/confirmEdit/cancelEdit)
  const toggleEditMode = useCallback(() => {
    if (isEditMode) {
      confirmEdit();
    } else {
      startEdit();
    }
  }, [isEditMode, confirmEdit, startEdit]);

  return {
    categoryOrder: state.categoryOrder,
    itemOrder: state.itemOrder,
    isEditMode,
    isLoaded,
    setCategoryOrder,
    setItemOrder,
    getSortedItems,
    resetOrder,
    toggleEditMode,
    startEdit,
    confirmEdit,
    cancelEdit,
  };
}
