import { useRef, useCallback } from 'react';

interface DoubleTapConfig {
  delay?: number;
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
}

export const useDoubleTap = (config: DoubleTapConfig) => {
  const { delay = 300, onSingleTap, onDoubleTap } = config;
  const lastTap = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = delay;

    if (lastTap.current && (now - lastTap.current) < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      onDoubleTap?.();
      lastTap.current = 0;
    } else {
      // Single tap - wait to see if it becomes a double tap
      lastTap.current = now;
      timeoutRef.current = setTimeout(() => {
        onSingleTap?.();
        lastTap.current = 0;
      }, DOUBLE_TAP_DELAY);
    }
  }, [delay, onSingleTap, onDoubleTap]);

  return handleTap;
};
