import { useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';

const THRESHOLD = 80; // 당겨야 하는 거리 (px)

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const isAtTop = useCallback(() => {
    // 스크롤이 최상단인지 체크
    const scrollable = document.querySelector('[data-pull-scroll]');
    if (scrollable) return scrollable.scrollTop <= 0;
    return window.scrollY <= 0;
  }, []);

  const onTouchStart = useCallback((e: any) => {
    if (Platform.OS !== 'web' || refreshing) return;
    if (!isAtTop()) return;
    startY.current = e.touches?.[0]?.clientY ?? e.nativeEvent?.pageY ?? 0;
    isPulling.current = true;
  }, [refreshing, isAtTop]);

  const onTouchMove = useCallback((e: any) => {
    if (!isPulling.current || refreshing) return;
    const currentY = e.touches?.[0]?.clientY ?? e.nativeEvent?.pageY ?? 0;
    const diff = currentY - startY.current;
    if (diff > 0 && isAtTop()) {
      const distance = Math.min(diff * 0.5, THRESHOLD * 1.5);
      setPullDistance(distance);
      setPulling(true);
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [refreshing, isAtTop]);

  const onTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
    setPulling(false);
  }, [pullDistance, onRefresh]);

  return {
    refreshing,
    pullDistance,
    pulling: pulling || refreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
