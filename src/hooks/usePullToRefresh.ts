import { useRef, useCallback, useState } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // px to pull before triggering (default 80)
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: UsePullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start pull if scrolled to top
    const el = e.currentTarget;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const el = e.currentTarget;
    if (el.scrollTop > 0) {
      isDragging.current = false;
      setPulling(false);
      setPullDistance(0);
      return;
    }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Apply resistance — diminishing returns as you pull further
      const distance = Math.min(diff * 0.5, 120);
      setPullDistance(distance);
      setPulling(true);
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(threshold * 0.5);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setPullDistance(0);
  }, [pullDistance, threshold, onRefresh]);

  return {
    pulling,
    refreshing,
    pullDistance,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
