import * as React from "react";
import { cn } from "@/lib/utils";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useHaptic } from "@/hooks/useHaptic";

interface SwipeableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeThreshold?: number;
  showSwipeIndicator?: boolean;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  hapticOnSwipe?: boolean;
}

const SwipeableCard = React.forwardRef<HTMLDivElement, SwipeableCardProps>(
  ({ 
    className, 
    children, 
    onSwipeLeft, 
    onSwipeRight, 
    swipeThreshold = 80,
    showSwipeIndicator = false,
    leftAction,
    rightAction,
    hapticOnSwipe = true,
    ...props 
  }, ref) => {
    const [swipeOffset, setSwipeOffset] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false);
    const startXRef = React.useRef(0);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const { mediumTap } = useHaptic();

    const handleSwipeLeft = React.useCallback(() => {
      if (hapticOnSwipe) mediumTap();
      onSwipeLeft?.();
      setSwipeOffset(0);
    }, [onSwipeLeft, hapticOnSwipe, mediumTap]);

    const handleSwipeRight = React.useCallback(() => {
      if (hapticOnSwipe) mediumTap();
      onSwipeRight?.();
      setSwipeOffset(0);
    }, [onSwipeRight, hapticOnSwipe, mediumTap]);

    const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
      setIsDragging(true);
      startXRef.current = e.touches[0].clientX;
    }, []);

    const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
      if (!isDragging) return;
      
      const currentX = e.touches[0].clientX;
      const diff = currentX - startXRef.current;
      
      // Limit the swipe offset with resistance
      const maxOffset = 120;
      const resistance = 0.5;
      let offset = diff;
      
      if (Math.abs(offset) > maxOffset) {
        const overflow = Math.abs(offset) - maxOffset;
        offset = (offset > 0 ? 1 : -1) * (maxOffset + overflow * resistance);
      }
      
      // Only allow swipe in directions that have handlers
      if (offset < 0 && !onSwipeLeft) offset = 0;
      if (offset > 0 && !onSwipeRight) offset = 0;
      
      setSwipeOffset(offset);
    }, [isDragging, onSwipeLeft, onSwipeRight]);

    const handleTouchEnd = React.useCallback(() => {
      setIsDragging(false);
      
      if (Math.abs(swipeOffset) > swipeThreshold) {
        if (swipeOffset < 0 && onSwipeLeft) {
          handleSwipeLeft();
        } else if (swipeOffset > 0 && onSwipeRight) {
          handleSwipeRight();
        }
      }
      
      setSwipeOffset(0);
    }, [swipeOffset, swipeThreshold, onSwipeLeft, onSwipeRight, handleSwipeLeft, handleSwipeRight]);

    return (
      <div className="relative overflow-hidden rounded-lg" ref={ref}>
        {/* Left action background */}
        {rightAction && (
          <div 
            className={cn(
              "absolute inset-y-0 left-0 flex items-center justify-start px-4 bg-primary text-primary-foreground transition-opacity",
              swipeOffset > 20 ? "opacity-100" : "opacity-0"
            )}
            style={{ width: Math.abs(swipeOffset) }}
          >
            {rightAction}
          </div>
        )}
        
        {/* Right action background */}
        {leftAction && (
          <div 
            className={cn(
              "absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive text-destructive-foreground transition-opacity",
              swipeOffset < -20 ? "opacity-100" : "opacity-0"
            )}
            style={{ width: Math.abs(swipeOffset) }}
          >
            {leftAction}
          </div>
        )}
        
        {/* Main card content */}
        <div
          ref={cardRef}
          className={cn(
            "relative bg-card rounded-lg border shadow-sm transition-transform",
            isDragging ? "transition-none" : "transition-transform duration-200",
            className
          )}
          style={{ transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);
SwipeableCard.displayName = "SwipeableCard";

export { SwipeableCard };
