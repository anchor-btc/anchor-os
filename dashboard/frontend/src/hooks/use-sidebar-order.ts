"use client";

import { useState, useEffect, useCallback } from "react";

// Category keys in default order
export const DEFAULT_CATEGORY_ORDER = [
  "protocol",
  "apps",
  "explorers",
  "networking",
  "electrum",
  "storage",
  "monitoring",
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
    networking: [],
    electrum: [],
    storage: [],
    monitoring: [],
  },
});

export function useSidebarOrder() {
  const [state, setState] = useState<SidebarOrderState>(getDefaultState);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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

  // Save to localStorage whenever state changes
  const saveState = useCallback((newState: SidebarOrderState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  // Reorder categories
  const reorderCategories = useCallback(
    (fromIndex: number, toIndex: number) => {
      setState((prev) => {
        const newOrder = [...prev.categoryOrder];
        const [removed] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, removed);
        const newState = { ...prev, categoryOrder: newOrder };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
      });
    },
    []
  );

  // Set category order directly (for dnd-kit)
  const setCategoryOrder = useCallback((newOrder: CategoryKey[]) => {
    setState((prev) => {
      const newState = { ...prev, categoryOrder: newOrder };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });
  }, []);

  // Reorder items within a category
  const reorderItems = useCallback(
    (category: CategoryKey, fromIndex: number, toIndex: number) => {
      setState((prev) => {
        const items = [...(prev.itemOrder[category] || [])];
        const [removed] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, removed);
        const newState = {
          ...prev,
          itemOrder: { ...prev.itemOrder, [category]: items },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
      });
    },
    []
  );

  // Set item order for a category directly (for dnd-kit)
  const setItemOrder = useCallback(
    (category: CategoryKey, newOrder: string[]) => {
      setState((prev) => {
        const newState = {
          ...prev,
          itemOrder: { ...prev.itemOrder, [category]: newOrder },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  }, []);

  // Toggle edit mode
  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
  }, []);

  return {
    categoryOrder: state.categoryOrder,
    itemOrder: state.itemOrder,
    isEditMode,
    isLoaded,
    reorderCategories,
    setCategoryOrder,
    reorderItems,
    setItemOrder,
    getSortedItems,
    resetOrder,
    toggleEditMode,
  };
}

