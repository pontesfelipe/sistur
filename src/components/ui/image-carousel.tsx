import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  className?: string;
  maxHeight?: string;
}

export function ImageCarousel({ images, className, maxHeight = 'h-48' }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(i => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(i => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <div className={cn('rounded-lg overflow-hidden', className)}>
        <img src={images[0]} alt="" className={cn('w-full object-cover', maxHeight)} />
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-lg overflow-hidden group', className)}>
      <img
        src={images[currentIndex]}
        alt=""
        className={cn('w-full object-cover transition-opacity duration-200', maxHeight)}
      />

      {/* Navigation arrows */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
        onClick={prev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
        onClick={next}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); goTo(idx); }}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              idx === currentIndex
                ? 'bg-white w-4'
                : 'bg-white/50 hover:bg-white/75'
            )}
          />
        ))}
      </div>

      {/* Counter badge */}
      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2 py-1 rounded-full">
        {currentIndex + 1}/{images.length}
      </div>
    </div>
  );
}
