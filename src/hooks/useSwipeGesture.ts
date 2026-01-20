import { useRef, useCallback, useEffect, TouchEvent as ReactTouchEvent } from 'react';

export interface SwipeConfig {
  threshold?: number;
  preventScroll?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export function useSwipeGesture(config: SwipeConfig = {}) {
  const {
    threshold = 50,
    preventScroll = false,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = config;

  const startRef = useRef<TouchPoint | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: ReactTouchEvent | globalThis.TouchEvent) => {
    const touch = e.touches[0];
    startRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent | globalThis.TouchEvent) => {
    if (preventScroll && startRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - startRef.current.x);
      const deltaY = Math.abs(touch.clientY - startRef.current.y);
      
      // If horizontal swipe is dominant, prevent scroll
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }
  }, [preventScroll]);

  const handleTouchEnd = useCallback((e: ReactTouchEvent | globalThis.TouchEvent) => {
    if (!startRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startRef.current.x;
    const deltaY = touch.clientY - startRef.current.y;
    const deltaTime = Date.now() - startRef.current.time;

    // Only register swipe if it's fast enough (within 300ms)
    if (deltaTime > 300) {
      startRef.current = null;
      return;
    }

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Determine swipe direction
    if (absX > absY && absX > threshold) {
      // Horizontal swipe
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (absY > absX && absY > threshold) {
      // Vertical swipe
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    startRef.current = null;
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  // Bind handlers for use with ref
  const bind = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  }), [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // For imperative ref usage
  const setRef = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart as any);
      elementRef.current.removeEventListener('touchmove', handleTouchMove as any);
      elementRef.current.removeEventListener('touchend', handleTouchEnd as any);
    }

    elementRef.current = element;

    if (element) {
      element.addEventListener('touchstart', handleTouchStart as any, { passive: !preventScroll });
      element.addEventListener('touchmove', handleTouchMove as any, { passive: !preventScroll });
      element.addEventListener('touchend', handleTouchEnd as any);
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart as any);
        elementRef.current.removeEventListener('touchmove', handleTouchMove as any);
        elementRef.current.removeEventListener('touchend', handleTouchEnd as any);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { bind, setRef };
}
