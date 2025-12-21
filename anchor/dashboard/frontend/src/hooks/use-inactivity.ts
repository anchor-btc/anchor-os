"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseInactivityOptions {
  timeout: number; // in seconds
  onTimeout: () => void;
  enabled?: boolean;
}

export function useInactivity({
  timeout,
  onTimeout,
  enabled = true,
}: UseInactivityOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    lastActivityRef.current = Date.now();

    if (enabled && timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        onTimeout();
      }, timeout * 1000);
    }
  }, [timeout, onTimeout, enabled]);

  useEffect(() => {
    if (!enabled || timeout <= 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Activity events to track
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      // Clean up
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, timeout, resetTimer]);

  return {
    resetTimer,
    getLastActivity: () => lastActivityRef.current,
    getTimeRemaining: () => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeout * 1000 - elapsed;
      return Math.max(0, remaining);
    },
  };
}





