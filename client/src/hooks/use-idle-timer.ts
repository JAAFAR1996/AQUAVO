/**
 * ⏱️ useIdleTimer Hook
 * Detects user inactivity after a specified duration
 * Used for the algae takeover feature
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // milliseconds
  onIdle?: () => void;
  onActive?: () => void;
  events?: string[]; // DOM events to listen for
}

// Default events outside component to maintain stable reference
const DEFAULT_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export function useIdleTimer({
  timeout = 15000, // Default: 15 seconds
  onIdle,
  onActive,
  events = DEFAULT_EVENTS,
}: UseIdleTimerOptions) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);

  // Store callbacks in refs to avoid dependency issues
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);

  // Update refs when callbacks change
  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
  }, [onIdle, onActive]);

  // Create stable reference for events array
  const eventsKey = events.join(',');
  const stableEvents = useMemo(() => events, [eventsKey]);

  // Reset the timer
  const resetTimer = useCallback(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // If was idle, trigger active callback
    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      onActiveRef.current?.();
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
      onIdleRef.current?.();
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    // Start timer on mount
    resetTimer();

    // Add event listeners
    stableEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      stableEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [stableEvents, resetTimer]);

  return { isIdle, resetTimer };
}
