import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface FilmDbCarouselProps {
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export const FilmDbCarousel = forwardRef<HTMLDivElement, FilmDbCarouselProps>(
  ({ children, ariaLabel, className = '' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // 2px tolerance for subpixel calculations
      setCanScrollLeft(scrollLeft > 2);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
    }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      updateScrollState();

      const handleScroll = () => {
        updateScrollState();
      };

      el.addEventListener('scroll', handleScroll, { passive: true });

      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          updateScrollState();
        });
        ro.observe(el);
      }

      return () => {
        el.removeEventListener('scroll', handleScroll);
        if (ro) ro.disconnect();
      };
    }, [updateScrollState, children]);

    // Recompute scrollability after children layout render
    useEffect(() => {
      const timer = setTimeout(() => {
        updateScrollState();
      }, 50);
      return () => clearTimeout(timer);
    }, [children, updateScrollState]);

    const handleScroll = (direction: 'left' | 'right') => {
      const el = containerRef.current;
      if (!el) return;
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    };

    return (
      <div className={`relative group ${className}`}>
        {/* Subtle Edge Fades */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          aria-label="Geser ke kiri"
          className={`absolute -left-3 lg:-left-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 hover:bg-[#FF2E7E] text-white hover:text-slate-950 border border-slate-700 hover:border-[#FF2E7E] shadow-xl backdrop-blur-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] cursor-pointer disabled:cursor-not-allowed ${
            !canScrollLeft ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Carousel Scroll Container (ONE row only, flex no wrap, scroll-snap) */}
        <div
          ref={containerRef}
          role="region"
          aria-label={ariaLabel}
          className="flex items-stretch gap-4 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory touch-pan-x py-1"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {React.Children.map(children, (child, index) => (
            <div
              key={index}
              className="w-[calc((100%-1rem)/2)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-5rem)/6)] flex-none shrink-0 snap-start"
            >
              {child}
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          aria-label="Geser ke kanan"
          className={`absolute -right-3 lg:-right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 hover:bg-[#FF2E7E] text-white hover:text-slate-950 border border-slate-700 hover:border-[#FF2E7E] shadow-xl backdrop-blur-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E7E] cursor-pointer disabled:cursor-not-allowed ${
            !canScrollRight ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }
);

FilmDbCarousel.displayName = 'FilmDbCarousel';
